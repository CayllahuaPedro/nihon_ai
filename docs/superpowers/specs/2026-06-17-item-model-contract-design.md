# Item Model Contract — Identity & Comprehension Aggregation

Status: design, approved (2026-06-17). Not yet implemented.

This is the cross-cutting contract every module shares: rarity profiler, KT learner
model, mining engine, known-set, and tutor all key off the same item identity, and all
read the same comprehension aggregation. Defining it once, before module code, prevents
each module lemmatizing differently and silently desyncing.

## 1. Item identity

### Canonical key

An item key is the tuple `(lemma, lemma_reading, POS)`, serialized as `lemma|reading|POS`:

```
本|ホン|名詞
入る|ハイル|動詞     ≠     入る|イル|動詞
```

- The reading is the **lemma reading** (`語彙素読み`, katakana), not the surface reading.
  So 食べる / 食べた / 食べて / たべる all collapse to `食べる|タベル|動詞`.
- POS (`品詞`) disambiguates homographs that are genuinely different words.
- Produced by `fugashi` + UniDic. There is exactly one function, `item_key(token) -> str`,
  and every module calls it. No module re-derives identity.

### Granularity

Short-unit words (SUW, UniDic default) are the base, plus a bounded, deterministic set of
**fusion rules** — no long-unit model in v1:

- 名詞 + する → single suru-verb item (勉強する).
- Productive affixes (お〜, 〜的, 〜性).

Long-unit words (経済成長 as one item) are deferred to v2, only if Phase 0 EDA shows SUW
splitting causes real pain.

### What is a trackable item

The tracked item space is **learnable content words**. A token is trackable iff its POS is
one of: 名詞 動詞 形容詞 形状詞 副詞 連体詞 接続詞 感動詞.

Not trackable:

- 助詞 (particles), 助動詞 (auxiliaries) → these are the **grammar detector's** domain, not
  vocabulary. Treating them as vocab items contaminates both models.
- 固有名詞 (proper nouns) and 数詞 (numerals) → they **count toward the OOV gate** (are they
  in-frame?) but are **not tracked in KT** (no per-item mastery; infinite long tail, not
  "vocabulary you learn"). This is a deliberate departure from Migaku, which lets proper
  nouns be farmed as vocabulary.
- 補助記号 / 空白 / 記号 (punctuation, whitespace) → ignored.

### Kanji

Individual kanji live in a **separate prior space**: kanji frequency + the Joyo (2,136)
frame feed absolute difficulty and the KT cold-start prior. In v1 a kanji is a
prior/feature, **not** an item with its own mastery. Per-kanji KT is v2.

## 2. Comprehension aggregation (item mastery → text comprehension)

### Two separate numbers

Following the same "don't fuse axes" principle as the difficulty model, the product
reports two distinct numbers:

- **Vocabulary coverage** — token-weighted mean of `p_know` over content tokens. Linear,
  raw, straight from KT. "You know 93% of the words."
- **Expected comprehension** — coverage passed through the non-linear Hu & Nation reading
  curve (~98% coverage needed to read comfortably; comprehension drops steeply between
  95–98%, near-opaque below ~90%). "93% coverage → ~55% expected comprehension."

Display shows both. **Content recommendation ranks by expected comprehension, not
coverage** (coverage is the diagnostic "which words you're missing"; comprehension predicts
whether you'll actually understand/enjoy the text).

### Unit of computation = sentence

Comprehension is computed **per sentence**, then the text aggregates from there:

- Per sentence: coverage (token-weighted over content words) → comprehension via the curve,
  plus a count of unknown words (`p_know` below threshold).
- Per text: report **mean comprehension + worst-N** (the spike sentences), not just the
  mean. "Mean 78%, but 4 sentences below 40%."

Sentence-level is required, not cosmetic: a text at 95% global coverage could be 10 easy
sentences + 1 impossible one, vs. one unknown word scattered through every sentence —
document-level coverage can't tell these apart, but the reading experience is opposite.
The sentence unit also feeds the two downstream goals from one computation:

- **Mining (1T principle):** sentences with exactly one unknown word — a per-sentence metric.
- **Recommendation:** the distribution of per-sentence comprehension, not a single mean.

### Cold-start prior (unseen item)

KT gives `p_know` only for items the learner has actually touched (Anki / read). Any new
text is full of never-seen words, so the function needs a prior for them.

The prior is **derived from the absolute axes** (frequency + JLPT/Joyo): common/basic word
→ high prior (probably known even if never formally studied); rare/high-level → low prior.
This is where the JLPT classifier and rarity profiler earn their place — they are the KT's
cold-start prior, not just display. (A fixed prior would treat 食べる like 憂鬱; a learned
per-user prior is v2.)

### Grammar in v1

v1 comprehension is **vocabulary only**. The grammar detector runs in parallel as a
**diagnostic layer beside** the number ("this text uses 〜ように, 〜たところ, +3 points"), but
is **not folded into** the comprehension number — there is no per-grammar-point mastery in
v1 (KT v1 trains on Anki vocab grades). Folding grammar in honestly requires a grammar KT.

## 3. Deferred to v2

- **Grammar KT** — per-grammar-point mastery, to fold grammar into the comprehension number
  with the same honesty as vocab. Today grammar is diagnostic-only.
- Long-unit words.
- Per-kanji KT.
- Learned per-user cold-start prior.
