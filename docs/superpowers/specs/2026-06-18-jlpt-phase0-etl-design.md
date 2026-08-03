# JLPT Classifier — Phase 0: shared item_key() core + weak-label ETL

Status: design, approved (2026-06-18). Implementation started 2026-06-18.

> **Role updated (2026-06-18, see `ROADMAP.private.md` → "v1 RECUT (ACTIVE)").** BERT fine-tune
> left the v1 critical path. The labeling function built here is **no longer just a teacher for a
> downstream BERT — it is the vocab-difficulty estimator that ships in v1 and feeds the tutor.**
> There is no BERT below it cleaning up noise, so its product-facing quality bar is higher: the
> OOV-gate (abstention) and label-quality spot-check in §7 are now product criteria, not just
> training-data sanity checks. The technical design below is unchanged; only the role of its output is.

Phase 0 (v1.0) of the vocab-difficulty estimator: data-first. This session builds the
cross-cutting tokenization core (`item_key()`) and the full ETL that turns Tatoeba Japanese
sentences into a weak-labeled JLPT dataset, ending in an EDA notebook whose job is to **decide**
open thresholds — not to explore for its own sake. The fine-tuned BERT that would generalize past
this labeling function is **post-launch roadmap**, not the immediate next step.

Builds on the approved [item model contract](2026-06-17-item-model-contract-design.md):
this spec is the first implementation of that contract's `item_key()`.

## 1. Scope & deliverables

In scope:

- `nihon_ml/` — an importable, tested package implementing the contract's tokenization
  identity (`item_key()`), trackability filter, and suru-fusion.
- The weak-label ETL: Tatoeba (jpn, CC-BY) + a JLPT labeling function built from Tanos
  vocab/kanji lists, producing a clean dataset plus per-run stats.
- An EDA notebook that **produces decisions**: class balance N5→N1, the OOV-gate threshold
  `τ_oov`, the coverage parameter `X`, labeling-function abstention rate, and a spot-check
  of label quality.

Out of scope (later phases): BERT fine-tuning (v1.1), the logistic-regression baseline
(v1.1), the gold eval set (v1.1), the rarity/frequency index (v1.1b). The rarity profiler
reuses `item_key()` but is a separate session.

## 2. Repository layout

`ml/` currently has empty `scripts/` and `notebooks/` (`.gitkeep` only) and no Python
package. This spec adds:

```
ml/
  nihon_ml/
    __init__.py
    tokenize.py          # item_key(token)->str, trackability, suru-fusion, fugashi wrapper
    jlpt/
      __init__.py
      lists.py           # load Tanos N5..N1 lists -> dict {item_key: level}
      labeling.py        # sentence -> LabelResult(label|ABSTAIN, oov_rate, level_counts)
  scripts/
    fetch_tatoeba.py     # download jpn dump (CC-BY), extract JP sentences
    fetch_jlpt_lists.py  # download/normalize Tanos lists -> csv keyed by item_key
    build_jlpt_dataset.py# tatoeba + labeling -> data/jlpt/weak_labels.parquet + stats.json
  notebooks/
    jlpt_weak_labels_eda.ipynb
  tests/
    __init__.py
    test_tokenize.py     # contract cases
    test_labeling.py     # coverage + OOV gate on synthetic sentences
  data/                  # gitignored, built by scripts
```

Changes to [ml/pyproject.toml](../../../ml/pyproject.toml): add `pytest` to the `dev`
optional-dependencies; add setuptools package discovery for the flat `nihon_ml/` layout;
add `pyarrow` (parquet) and `requests` (downloads) to runtime dependencies.

## 3. Shared core — `item_key()`

One function, `item_key(token) -> "lemma|reading|POS"`, over fugashi + UniDic. Every module
calls it; no module re-derives identity. Implements the contract:

- **Reading = lemma reading** (`語彙素読み`, katakana). 食べる / 食べた / 食べて / たべる all
  collapse to `食べる|タベル|動詞`. POS disambiguates homographs: `入る|ハイル|動詞` ≠
  `入る|イル|動詞`.
- **Trackability filter.** A token is trackable iff its POS (`品詞` pos1) is one of:
  名詞 動詞 形容詞 形状詞 副詞 連体詞 接続詞 感動詞. Not trackable: 助詞 助動詞 (grammar
  detector's domain), 補助記号 空白 記号 (ignored). 固有名詞 and 数詞 are not trackable for
  KT but **do count toward the OOV gate** — so the tokenizer exposes enough to distinguish
  these three buckets (trackable / oov-frame-only / ignored).
- **Suru-fusion.** 名詞 + する collapses to one suru-verb item (勉強 + する → 勉強する as a
  single key). This is the only fusion rule in this pass.
- **Deferred:** productive affixes (お〜, 〜的, 〜性) are a documented TODO, implemented only
  if the EDA spot-check shows they cause real lookup pain — matching the contract's own
  YAGNI stance on long-units.

Public surface of `tokenize.py`:

- `item_key(token) -> str` — the canonical key.
- `tokens(text) -> list[Token]` — fugashi parse with suru-fusion applied, each Token
  carrying its `item_key`, `pos1`, and a `frame_bucket` ∈ {`trackable`, `oov_frame`,
  `ignore`}.

**Risk to verify in code:** that `unidic-lite` exposes the lemma-reading field (`lForm`)
and lemma (`lemma`). If a field is missing or unreliable, escalate to the full `unidic`
dictionary. Covered by `test_tokenize.py`; does not block the design.

## 4. JLPT list ingestion — the matching crux

Tanos lists give kanji + kana reading + English gloss, with **no POS**. Naive surface-form
lookup would silently miss (different conjugation, no POS to split homographs). Rule: **run
every list headword through the same fugashi pipeline** to derive its `item_key`, and key
the lookup table by the full tuple. This keeps a single identity function across list and
corpus (the contract's core invariant).

- A headword that tokenizes to multiple tokens (e.g. a compound) is keyed by its fused /
  lemma form where unambiguous; entries that don't resolve to a single content token are
  logged and skipped (counted in stats, not silently dropped).
- **Fallback** if the full-tuple match loses too many lookups (visible as an inflated
  abstention rate in the EDA): relax the lookup key to `(lemma, reading)` without POS. The
  EDA decides whether the fallback is needed.

`fetch_jlpt_lists.py` writes one normalized CSV per level (`n5..n1`) with columns
`[item_key, lemma, reading, pos, level, source_surface, source_reading]`, so the
normalization is auditable. `lists.py` loads these into `{item_key: level}` where level is
an ordinal N5=0 … N1=4 (easiest→hardest), matching the eventual classifier's label space.

## 5. Labeling function — coverage + OOV gate

Two separate numbers, axes never fused (same principle as the difficulty model). Per
sentence, over its tokens:

1. **OOV rate** = (vocab-frame tokens not found in the lists, *including* 固有名詞/数詞)
   / (all vocab-frame tokens). Vocab-frame = trackable ∪ oov_frame buckets; particles,
   auxiliaries, punctuation are excluded from both numerator and denominator.
2. **Gate:** if `oov_rate > τ_oov` → **ABSTAIN** (label = "outside JLPT frame", no level).
3. **Label** (only if the gate passes): over the in-frame trackable tokens (those with a
   JLPT level), the sentence level is the lowest `L` such that cumulative coverage
   (fraction of in-frame tokens with level ≤ L) ≥ `X`.

`τ_oov` and `X` are **decided by the EDA**, not hard-coded. The ETL does not pick them; it
**computes and stores the ingredients** (per-sentence `oov_rate` and the per-level token
counts) so the notebook can sweep thresholds without re-tokenizing the corpus.

`labeling.py` exposes `label_sentence(text) -> LabelResult` where `LabelResult` carries:
`oov_rate: float`, `n_content: int`, `n_in_frame: int`, `level_counts: dict[level,int]`,
and a method `weak_label(tau_oov, X) -> int | ABSTAIN` so threshold choice is a pure
function of stored ingredients.

## 6. ETL pipeline & output

`fetch_tatoeba.py`: download the Tatoeba per-language sentence dump, filter `lang == jpn`,
write raw JP sentences to `data/raw/tatoeba_jpn.tsv`. Records the Tatoeba CC-BY attribution
in a sidecar.

`build_jlpt_dataset.py`: read the raw sentences, tokenize, run `label_sentence`, and write
`data/jlpt/weak_labels.parquet` with columns:

```
sentence_id, text, n_content, n_in_frame, oov_rate,
n5_count, n4_count, n3_count, n2_count, n1_count
```

The parquet stores **ingredients, not a frozen label** — the `weak_label` column is
materialized in the notebook (or a thin follow-up pass) once `τ_oov` and `X` are chosen, so
re-deciding a threshold never re-runs tokenization. Also writes `data/jlpt/stats.json`
(corpus size, token counts, mean/var of oov_rate, list-match drop count). The script is
idempotent and takes `--limit N` for fast iteration.

## 7. EDA notebook — decisions it must produce

`jlpt_weak_labels_eda.ipynb` loads the parquet and produces, as written conclusions:

- **Class balance N5→N1** under candidate `(τ_oov, X)` — expect a heavy easy-skew → name a
  rebalancing strategy for v1.1.
- **OOV-rate distribution → fixes `τ_oov`** (currently unset). The gate threshold is read
  off this distribution, not guessed.
- **Coverage sweep → fixes `X`**, showing how the label distribution shifts with `X`.
- **Abstention rate** at the chosen `τ_oov` (also the signal for whether the section-4
  fallback keying is needed).
- **Label-quality spot-check (now a product gate, not a data sanity check):** ~50–80 sentences,
  weak-label vs. human judgment, drawn from the N5/N4 band where Pedro is a reliable labeler.
  Because this labeling function *ships* (no BERT downstream to clean noise), the notebook must
  state an explicit accept criterion — a minimum spot-check agreement and a maximum tolerable
  abstention rate — and a fallback if it isn't met (relax the §4 lookup keying, or narrow the
  served range to the bands that do meet the bar).

Deliverable: a short written findings note (in the notebook) carrying these conclusions forward —
both to the shipped v1 estimator and to the post-launch BERT fine-tune.

## 8. Testing (TDD)

- `test_tokenize.py` — the contract's exact cases: conjugation collapse
  (食べる/食べた/たべる → one key), homograph split (入る ハイル vs イル), suru-fusion
  (勉強する one item), trackability buckets (particle → ignore, proper noun → oov_frame,
  noun → trackable).
- `test_labeling.py` — synthetic sentences built from words of known level: cumulative
  coverage picks the expected `L`; a sentence stuffed with OOV words trips the gate
  (ABSTAIN); the two-number separation holds (a single rare in-list word does not inflate
  OOV).

## 9. Open items & risks

- **Tanos license** for an AGPL public repo: verify before redistributing. If unclear, the
  raw lists stay gitignored and `fetch_jlpt_lists.py` documents how to fetch them; only the
  normalized derived form (if license permits) or nothing is committed.
- **unidic-lite fields** (section 3): may force the full `unidic` dependency.
- **Productive affixes** deferred (section 3) pending the spot-check.
- **Tanos 4-level vs 5-level:** verify whether Tanos already ships reconstructed N5–N1
  lists; if only the old 4-level lists exist, document the mapping to the 5-level space.
```
