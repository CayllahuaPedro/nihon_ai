# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
import json

import pytest
from fastapi.testclient import TestClient

from app.api.tutor import get_anthropic_client
from app.main import app

from .conftest import FakeAnthropic

ASK = {"question": "Why 〜ていった?", "level": "N4", "known_words": 1842}
PROSE = '{"kind":"prose","text":"It adds direction."}\n'
EXAMPLE = '{"kind":"example","japanese":"色が消えていった","gloss":"kept fading"}\n'


def client_with(fake: FakeAnthropic) -> TestClient:
    app.dependency_overrides[get_anthropic_client] = lambda: fake
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def events(body: str) -> list[tuple[str, dict]]:
    """Parse an SSE body into (event name, decoded data) pairs."""
    parsed = []
    for frame in body.strip().split("\n\n"):
        name, data = None, None
        for line in frame.splitlines():
            if line.startswith("event: "):
                name = line.removeprefix("event: ")
            elif line.startswith("data: "):
                data = json.loads(line.removeprefix("data: "))
        if name is not None:
            parsed.append((name, data))
    return parsed


def ask(chunks: list[str]) -> list[tuple[str, dict]]:
    return events(client_with(FakeAnthropic(chunks)).post("/tutor", json=ASK).text)


def test_responds_as_an_event_stream():
    response = client_with(FakeAnthropic([PROSE])).post("/tutor", json=ASK)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")


def test_a_prose_block_opens_streams_and_closes():
    assert [name for name, _ in ask([PROSE])] == ["start", "delta", "end", "done"]


def test_a_start_carries_the_kind_before_any_text():
    name, data = ask([PROSE])[0]

    assert (name, data) == ("start", {"type": "start", "index": 0, "kind": "prose"})


def test_deltas_carry_the_text_as_it_arrives():
    parsed = ask(['{"kind":"prose","te', 'xt":"It adds', ' direction."}\n'])
    deltas = [data for name, data in parsed if name == "delta"]

    assert len(deltas) > 1
    assert "".join(d["text"] for d in deltas) == "It adds direction."


def test_an_end_carries_the_validated_block():
    _, data = next((n, d) for n, d in ask([PROSE]) if n == "end")

    assert data["block"] == {"kind": "prose", "text": "It adds direction."}


def test_japanese_is_delivered_whole():
    names = [name for name, _ in ask([EXAMPLE])]

    assert names == ["start", "end", "done"]


def test_a_block_that_fails_validation_is_withdrawn():
    parsed = ask(['{"kind":"prose","text":""}\n'])

    assert [name for name, _ in parsed] == ["start", "drop", "done"]


def test_closes_the_stream_with_a_done_event():
    assert ask([PROSE])[-1][0] == "done"


def test_reports_an_upstream_failure_as_an_error_event():
    """The status line is already sent by then, so the failure rides the stream."""
    fake = FakeAnthropic([PROSE], error=RuntimeError("upstream exploded"))

    parsed = events(client_with(fake).post("/tutor", json=ASK).text)

    assert parsed[-1][0] == "error"
    assert "message" in parsed[-1][1]


def test_does_not_leak_the_upstream_message_to_the_client():
    fake = FakeAnthropic([], error=RuntimeError("key sk-ant-secret rejected"))

    parsed = events(client_with(fake).post("/tutor", json=ASK).text)

    assert "sk-ant-secret" not in json.dumps(parsed[-1][1])


def test_rejects_an_empty_question():
    response = client_with(FakeAnthropic([PROSE])).post("/tutor", json={**ASK, "question": ""})

    assert response.status_code == 422


def test_reports_a_missing_api_key_as_service_unavailable(monkeypatch):
    """Without a key this is a deployment problem, not a bad request."""
    from app.core import config

    monkeypatch.setattr(config.settings, "anthropic_api_key", "")

    response = TestClient(app).post("/tutor", json=ASK)

    assert response.status_code == 503
    assert "ANTHROPIC_API_KEY" in response.json()["detail"]


def test_allows_the_frontend_origin():
    response = client_with(FakeAnthropic([PROSE])).post(
        "/tutor", json=ASK, headers={"Origin": "http://localhost:3000"}
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
