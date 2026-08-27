# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
"""Decoding a JSON string value that has not finished arriving.

Token streaming can stop at any byte, including halfway through an escape
sequence. Emitting `\\u96` as literal text would be wrong and unrecoverable, so
this decoder consumes only what is unambiguously complete and reports how far
it got; the caller keeps the remainder and tries again with the next chunk.
"""

_SIMPLE_ESCAPES = {
    '"': '"',
    "\\": "\\",
    "/": "/",
    "b": "\b",
    "f": "\f",
    "n": "\n",
    "r": "\r",
    "t": "\t",
}

_UNICODE_ESCAPE_LEN = 4


def decode_partial_string(prefix: str) -> tuple[str, bool, int]:
    """Decode the start of a JSON string body, without its opening quote.

    Returns the decoded text, whether the closing quote was reached, and how
    many characters of `prefix` were consumed — including the closing quote
    when one was found. Anything not consumed is an incomplete escape that the
    next chunk will finish.
    """
    out: list[str] = []
    index = 0
    length = len(prefix)

    while index < length:
        char = prefix[index]

        if char == '"':
            # The closing quote is consumed too: the caller is done with this
            # value and must not be handed a stray quote to re-parse.
            return "".join(out), True, index + 1

        if char != "\\":
            out.append(char)
            index += 1
            continue

        # An escape needs at least one more character to be readable.
        if index + 1 >= length:
            break

        marker = prefix[index + 1]

        if marker in _SIMPLE_ESCAPES:
            out.append(_SIMPLE_ESCAPES[marker])
            index += 2
            continue

        if marker == "u":
            digits = prefix[index + 2 : index + 2 + _UNICODE_ESCAPE_LEN]
            if len(digits) < _UNICODE_ESCAPE_LEN:
                break
            try:
                out.append(chr(int(digits, 16)))
            except ValueError:
                # Not a real escape. Pass it through rather than lose the text.
                out.append(prefix[index : index + 2 + _UNICODE_ESCAPE_LEN])
            index += 2 + _UNICODE_ESCAPE_LEN
            continue

        # Unknown escape: keep both characters rather than silently drop them.
        out.append(char)
        out.append(marker)
        index += 2

    return "".join(out), False, index
