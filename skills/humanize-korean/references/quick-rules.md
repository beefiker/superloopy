# Humanize Korean Quick Rules

This compact rule set adapts Korean AI-tell categories from `epoko77-ai/im-not-ai` for Superloopy packaging. Use it as a checklist, not as permission to change facts.

## Superloopy Additions

- Protected spans outrank every rewrite rule.
- Register preservation outranks naturalness.
- A sentence may remain slightly formal if loosening it would change genre or authority.
- Do not remove all structure from operational, legal, release-note, or support-copy text.
- Treat repeated English terms differently from standard technical acronyms: `API`, `LLM`, `GPU`, `MCP`, `URL`, and version tags stay unchanged.
- Prefer Korean-native verbs over noun-heavy rewrites, but do not invent a subject to make a sentence active.

## Protected Spans

Keep these byte-for-byte unless the user explicitly asks otherwise:

- Proper nouns, product names, model names, organization names, acronyms, and code identifiers.
- Numbers, dates, versions, units, prices, URLs, email addresses, code spans, quoted spans, legal references, formulas, and statistical notation.

## S1: High-Signal AI Tells

| ID | Pattern | Repair |
| --- | --- | --- |
| A-2 | Repeated `~를 통해`, `~을 통해`, `통하여` | Prefer `~로`, `~해서`, or a direct verb when meaning stays intact. |
| A-3 | Empty `~에 있어(서)` framing | Use `~에서`, `~을 볼 때`, or delete the frame. |
| A-7 | Literal have/take/make phrasing such as `가지고 있다` | Restore a Korean verb or adjective. |
| A-8 | Double passive such as `되어진다`, `되어졌다` | Use active voice or a single passive. |
| C-5 | Emoji in reports, official copy, or columns | Remove unless the genre clearly needs them. |
| C-10 | Repeated colon-style headings | Shorten the heading or turn it into a sentence. |
| C-11 | Comma after Korean connective endings | Remove the comma unless punctuation is structurally needed. |
| D-1 | Formulaic pivots such as `결론적으로`, `따라서`, `요약하면`, `정리하면` | Keep at most one or replace with a concrete transition. |
| D-2 | Vague significance claims such as `시사하는 바가 크다`, `주목할 만하다` | Delete or state the actual consequence. |
| D-3 | Empty emphasis such as `본질적으로`, `핵심적으로` | Delete unless it carries a specific distinction. |
| D-4 | Hype words repeated without evidence | Replace with concrete facts already in the source. |
| D-5 | Personified abstract subjects | Prefer the real actor when the source gives one. |
| D-6 | Formulaic endings such as `~할 때다`, `~해야 한다` | Close with a plain claim when register allows. |
| H-1 | Sentence-initial connectors repeated across a text | Cut most of them; let sentence order do the work. |
| I-1 | `~인 것이다`, `~한 것이다` endings | Use direct declarative endings. |
| J-2 | Quotation marks used only for emphasis | Keep only true quotes or a few essential terms. |
| K-1 | Unnecessary software jargon such as `멱등`, `멱등성` in general prose | State the behavior directly, such as `같은 요청을 여러 번 보내도 결과가 달라지지 않는다`. When a developer-facing genre truly needs the term, keep it inside backticks and define it once. |
| L-1 | Safety flaunting such as `안전하게 처리합니다`, `안심하고 사용하세요`, `안전한 방식으로` | Delete the reassurance or state the concrete behavior. Keep `안전` wording only when it explains that a real failure did not destroy the user's data or work. |
| L-2 | Baseline-behavior flaunting such as `정확하게 계산합니다`, `정확하고 안전하게`, `여기서 멈춥니다` | Delete it; doing the job correctly is the baseline, not a feature. Keep only a measurable spec, such as an error bound or a concrete stop condition. |
| L-3 | Negative-capability reassurance such as `자동으로 수정하지 않습니다`, `서버로 전송하지 않습니다` | Say what the user should do (`~하세요`) or what actually happens instead. Keep a negative claim only when the text must state a real commitment, such as a privacy promise. |
| M-1 | Em dash or en dash (`—`, `–`) used as a pause or parenthetical in Korean prose | 줄표 is an English carryover in modern Korean writing. Replace with 쉼표, 괄호, a colon, or split the sentence; write ranges with `~`. Dashes inside code spans and quoted spans stay. |

## S2: Repeated Or Genre-Dependent Tells

| ID | Pattern | Repair |
| --- | --- | --- |
| A-1 | `~에 대해(서)` where a direct object works | Use `~를`, `~을`, or a natural postposition. |
| A-4 | Repeated `~라는 점에서` | Use `~라서`, `~라는 이유로`, or merge into the sentence. |
| A-5 | `~와 관련하여`, `관련된` padding | Use `~에`, `~의`, or a concrete relation. |
| A-6 | `~에 기반하여`, `~을 바탕으로` padding | Use `~로`, `~을 보고`, or a direct predicate. |
| A-9 | Passive `~에 의해` | Make the actor the subject when known. |
| A-10 | Repeated `~할 수 있다` | Use a direct claim when the source supports it. |
| A-11 | Repeated purpose clauses with `~을 위해` | Use `~려고` or a shorter modifier. |
| B-1 | Repeated Korean plus parenthesized English | Pair once, then use the Korean term or the established acronym. |
| C-7 | Mechanical three-part transitions | Fold transitions into the surrounding prose. |
| C-9 | `(1)`, `(2)`, `(3)` indexing in prose genres | Convert to paragraphs unless list structure is useful. |
| E-1 | Uniform sentence lengths | Mix one short sentence and one longer sentence per paragraph when natural. |
| E-2 | Four or more identical endings in a row | Vary endings without changing register. |
| F-4 | Heavy nominalization chains | Restore verbs or adjectives. |
| F-5 | Abstract `~적` noun chains | Shorten or rewrite into concrete nouns. |
| G-1 | Repeated `~것이다`, `~할 것이다` | Use present or confirmed forms where warranted. |
| G-2 | Repeated `~로 보인다`, `~인 듯하다` | State directly when the source is certain. |
| H-3 | Meta frames such as `이는`, `이 점에서` | Fold into the claim or delete. |
| I-2 | `X은 ~라는 점에 있다` | Use `X는 ~다`. |
| I-3 | `~다는 뜻이다`, `~다는 의미다` | Integrate the meaning into the sentence. |
| J-1 | Decorative Markdown emphasis in serious prose | Remove most decoration. |
| J-3 | Bullets in column/report prose | Keep bullets only when they improve scanning or are part of the source genre. |

## Reassurance Copy (L Rules, From Issue #44)

Safety words in product or completion copy read as advertising, not information. Nothing is "safe" until a user has verified it, and a user who did not already assume safety would not be running the program at all, so flaunting safety only makes text look less trustworthy.

- Treat `안전`, `안심`, `정확` boasts as tone, not as protected claims: removing them does not count as a meaning change. This applies to flaunting only — when safety is the subject matter (news, reports, columns about 안전성), the vocabulary is content and must stay.
- The one allowed use of `안전` in product copy: telling the reader that an actual failure did not destroy their data or work — a stated failure condition or event (`저장에 실패해도`, `오류가 나면`, `업로드에 실패했지만`), not a recovery-feature name (`복구 기능이 안전하게 지켜드립니다` is still flaunting).
- Imperatives are never reassurance: `비밀번호는 안전하게 보관하세요` tells the reader what to do and stays. Replace "what this program will not do" with "what the reader should do": prefer `적용하려면 저장 버튼을 누르세요` over `자동으로 수정하지 않습니다`. Conditional negatives (`지금 나가면 저장되지 않습니다`) are warnings to the reader and stay.
- Audit treatment: pass the estimated genre via `--genre`. In `제품 문구` (and by default), remaining L-1 hard-fails the audit; in declared non-product genres it warns and caps the grade at C instead, so topic vocabulary is never forcibly deleted. Remaining L-2/L-3 always warn and cap the grade at C, because precision specs and legally required negative claims can legitimately keep those shapes. The report records the genre used.

## Rewrite Order

1. Freeze protected spans.
2. Remove S1 signature phrases.
3. Reduce translationese and passive constructions.
4. Adjust hedging only where certainty already exists.
5. Smooth repeated structure and sentence endings.
6. Remove visual decoration that makes the text feel generated.
