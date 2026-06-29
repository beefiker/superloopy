# Loopy Crew Lines

Crew lines are short, original status lines for known Loopy crew handoffs. They make the fleet feel less mechanical, but they are never evidence and never replace the normalized verdict.

## Precedent Pattern

The checked product-writing precedent converges on the same rule: voice helps only when it improves scanning, confidence, and next action. Operational status still needs a stable label, a clear outcome, and a visible repair path.

Loopy applies that pattern by keeping the mechanical status first in the data model and adding personality only in the presentation layer.

## Policy

- Lines are Loopy-original. Do not copy source-character quotes.
- Lines emit only for terminal handoff states: `accept`, `reject`, or `needs-context`.
- `pending` handoffs stay quiet, because the crew member has not finished.
- Lines follow the user's language when Loopy can infer a supported catalog language from the handoff assignment or scoped brief: `en`, `ko`, `ja`, `zh`, `es`, `fr`, `de`, `it`, `pt`, `id`, `hi`, `tr`, `vi`, `ru`, `ar`, and `th`.
- Unknown languages fall back to English. Use `--language <tag>` or `LOOPY_CREW_LANGUAGE=<tag>` only when automatic prompt-language inference is not enough.
- Evidence artifacts, `normalizedVerdict`, `attention`, and `outstanding` remain the authority.
- Persisted handoff JSON stays plain; crew lines are computed for output so old state files remain stable.

## Runtime Contract

`loopy loop handoff` returns `crewLine` for known crew members when a terminal verdict is recorded, and the text output prints that line before the normal `loopy handoff:` status. `loopy loop fleet` decorates each returned handoff the same way and prints one line per completed known crew lane before the outstanding and attention lists. The returned `crewLine.language` is the selected catalog language tag.

Unknown agents and still-running lanes produce no crew line.
