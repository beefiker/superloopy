# Humanize Korean Quality Rubric

## Required Gates

- Korean source ratio: at least 0.2 Hangul characters over all letters.
- Protected tokens: 100% preserved.
- Change rate: pass at 0.3 or lower, warn above 0.3, fail above 0.5.
- S1 AI-tell count: lower after rewrite, target zero when possible.
- S2 repeated-pattern count: lower after rewrite unless the pattern is genre-appropriate.
- Safety flaunting (L-1): zero `안전`/`안심` boasts after rewrite in `제품 문구` and by default; a declared non-product genre (`--genre`) demotes this to a warning that caps the grade at C. Imperative sentences and concrete recovery or fallback outcomes paired with a stated failure are exempt everywhere.
- Accuracy flaunting and negative-capability reassurance (L-2, L-3): warn when any remains; a remaining count caps the grade at C. Imperatives and conditional negatives (reader warnings) are exempt from L-3.
- Em dash (M-1): zero `—`/`–` in Korean prose after rewrite; dashes inside code spans and quoted spans are exempt.
- Register: unchanged.
- Added claims: zero.

## Grades

- A: all gates pass, S1 and reassurance (L-2, L-3) after counts are zero, change rate is 0.1 to 0.3.
- B: all required gates pass, S1 and reassurance after counts are zero, S2 after count is four or fewer.
- C: protected tokens pass, but change rate warns, reassurance copy remains, or some S1 remains after a real reduction.
- D: protected tokens changed, non-Korean input, change rate above 0.5, S1 count is not reduced, safety flaunting remains, or new claims were added.

## Notes

- Quoted spans (J-2) are protected byte-for-byte, so the audit reports them without letting them affect the grade.
- The change rate divides edit distance by the longer of source and final, so explanation-style repairs that expand text are not over-penalized.
