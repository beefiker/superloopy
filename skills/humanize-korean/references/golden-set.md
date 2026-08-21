# Humanize Korean Golden Set

Calibration pairs for the humanize-korean skill. Each `before` is intentionally AI-flavored; each `after` shows the target repair shape at the intended edit size. Every pair must pass `scripts/audit-humanize-output.mjs` — rewrite pairs at grade `A` or `B`, must-not-change pairs accepted with their vocabulary intact; `test/humanize-korean-golden.test.js` enforces this, so keep the format below intact when adding pairs.

Entry format:

- Heading: `### G-NN · rule IDs · genre`. The genre is passed to the audit script as `--genre`, so `제품 문구` pairs are graded under the strict issue-#44 safety gate and other genres under the relaxed (warn-and-cap) gate.
- `audit:` line: comma-separated pattern IDs the audit script must detect in `before` and clear in `after`; `none` for rules without a deterministic pattern; or `keep` plus pattern IDs for must-not-change pairs whose vocabulary must survive the rewrite and still pass.
- One `before` fence and one `after` fence.

Do not copy the product claims in these pairs into unrelated text; use them only as rewrite-shape references.

## Translationese (A Rules)

### G-01 · A-2 · 리포트
audit: A-2

```before
팀은 자동화 스크립트를 통해 배포 시간을 절반으로 줄였습니다.
```

```after
팀은 자동화 스크립트로 배포 시간을 절반으로 줄였습니다.
```

### G-02 · A-2 · 블로그
audit: A-2

```before
우리는 사용자 인터뷰를 통해 온보딩 문제를 찾았고 로그 분석을 통해 이탈 구간을 좁혔습니다.
```

```after
우리는 사용자 인터뷰로 온보딩 문제를 찾았고 로그 분석으로 이탈 구간을 좁혔습니다.
```

### G-03 · A-3 · 공적
audit: A-3

```before
심사 과정에 있어서 가장 중요한 기준은 재현 가능성입니다.
```

```after
심사 과정에서 가장 중요한 기준은 재현 가능성입니다.
```

### G-04 · A-7 · 리포트
audit: A-7

```before
이 라이브러리는 자체 캐시 계층을 가지고 있습니다.
```

```after
이 라이브러리에는 자체 캐시 계층이 있습니다.
```

### G-05 · A-8 · 공적
audit: A-8

```before
개정된 약관은 다음 달부터 적용되어집니다.
```

```after
개정된 약관은 다음 달부터 적용됩니다.
```

### G-06 · A-10 · 블로그
audit: A-10

```before
새 대시보드에서는 지표 변화를 실시간으로 확인할 수 있습니다.
```

```after
새 대시보드에서는 지표 변화가 실시간으로 보입니다.
```

### G-07 · A-1 · 리포트
audit: none

```before
이번 회의에서는 남은 예산에 대해 논의했습니다.
```

```after
이번 회의에서는 남은 예산을 논의했습니다.
```

### G-08 · A-4 · 칼럼
audit: none

```before
이 방식은 별도 설정이 필요 없다는 점에서 도입 부담이 적습니다.
```

```after
이 방식은 별도 설정이 필요 없어서 도입 부담이 적습니다.
```

### G-09 · A-5 · 리포트
audit: none

```before
결제 오류와 관련하여 접수된 문의가 지난주보다 늘었습니다.
```

```after
결제 오류로 접수된 문의가 지난주보다 늘었습니다.
```

### G-10 · A-6 · 블로그
audit: none

```before
사용 로그를 바탕으로 기본 설정값을 다시 조정했습니다.
```

```after
사용 로그를 보고 기본 설정값을 다시 조정했습니다.
```

### G-11 · A-9 · 리포트
audit: none

```before
장애 원인은 모니터링 담당자에 의해 이미 확인됐습니다.
```

```after
장애 원인은 모니터링 담당자가 이미 확인했습니다.
```

### G-12 · A-11 · 대화체
audit: none

```before
응답 속도를 높이기 위해 캐시를 새로 넣었어요.
```

```after
응답 속도를 높이려고 캐시를 새로 넣었어요.
```

## Sentence Endings (I, E Rules)

### G-13 · I-1 · 블로그
audit: I-1

```before
이번 분기 성장은 결국 신규 추천 기능 덕분인 것입니다.
```

```after
이번 분기 성장은 결국 신규 추천 기능 덕분입니다.
```

### G-14 · I-2 · 리포트
audit: none

```before
이 요금제의 장점은 초기 비용이 없다는 점에 있습니다.
```

```after
이 요금제는 초기 비용이 없다는 게 장점입니다.
```

### G-15 · I-3 · 칼럼
audit: none

```before
문의가 줄었다는 것은 새 문서가 효과를 냈다는 의미입니다.
```

```after
문의가 준 만큼 새 문서가 효과를 낸 셈입니다.
```

### G-16 · E-2 · 리포트
audit: none

```before
가입 전환율이 올랐습니다. 결제 실패율은 내렸습니다. 문의량은 줄었습니다. 응답 시간은 짧아졌습니다.
```

```after
가입 전환율이 오르고 결제 실패율은 내렸습니다. 문의량이 줄면서 응답 시간도 짧아졌습니다.
```

## Transitions And Significance (D, H Rules)

### G-17 · D-1, H-1 · 리포트
audit: D-1, H-1

```before
따라서 이번 분기에는 온보딩 개선을 최우선으로 진행합니다.
```

```after
이번 분기에는 온보딩 개선을 최우선으로 진행합니다.
```

### G-18 · D-1, H-1 · 공적
audit: D-1, H-1

```before
검토 결과 요건을 모두 충족했습니다. 따라서 신청을 승인합니다.
```

```after
검토 결과 요건을 모두 충족해 신청을 승인합니다.
```

### G-19 · D-2 · 리포트
audit: D-2

```before
지난 분기 재구매율이 40%에서 62%로 올랐고 신규 유입도 함께 늘었습니다. 이는 주목할 만합니다.
```

```after
지난 분기 재구매율이 40%에서 62%로 올랐고 신규 유입도 함께 늘었습니다.
```

### G-20 · H-1 · 블로그
audit: H-1

```before
이번 업데이트로 시작 화면이 가벼워졌습니다. 또한 알림 설정 화면도 새로 정리했습니다.
```

```after
이번 업데이트로 시작 화면이 가벼워졌습니다. 알림 설정 화면도 새로 정리했습니다.
```

### G-21 · D-3 · 칼럼
audit: none

```before
본질적으로 이 문제는 캐시 만료 정책이 문서와 달랐던 데서 시작됐습니다.
```

```after
이 문제는 캐시 만료 정책이 문서와 달랐던 데서 시작됐습니다.
```

### G-22 · D-4 · 블로그
audit: none

```before
매우 강력한 자동 분류 기능으로 받은편지함을 정리해 보세요.
```

```after
자동 분류 기능으로 받은편지함을 정리해 보세요.
```

## Structure And Jargon (B, C, F, K Rules)

### G-23 · B-1 · 리포트
audit: none

```before
우리 팀은 검색 증강 생성(RAG) 파이프라인을 도입했습니다. 검색 증강 생성(RAG)은 답변 품질을 높였고 검색 증강 생성(RAG) 운영 비용은 예상보다 낮았습니다.
```

```after
우리 팀은 검색 증강 생성(RAG) 파이프라인을 도입했습니다. RAG는 답변 품질을 높였고 운영 비용은 예상보다 낮았습니다.
```

### G-24 · C-11 · 공적
audit: C-11

```before
신청 절차는 간단하지만, 제출 서류는 꼼꼼히 확인해야 합니다.
```

```after
신청 절차는 간단하지만 제출 서류는 꼼꼼히 확인해야 합니다.
```

### G-25 · F-4 · 공적
audit: none

```before
접수 지연의 재발 방지를 위한 처리 절차의 단순화가 필요합니다. 관련 서식은 다음 주에 공지합니다.
```

```after
접수 지연이 되풀이되지 않도록 처리 절차를 단순하게 바꿔야 합니다. 관련 서식은 다음 주에 공지합니다.
```

### G-26 · F-5 · 칼럼
audit: none

```before
장기적 관점에서 지속적 개선을 추진해야 합니다. 우선순위는 분기마다 다시 정합니다.
```

```after
길게 보고 꾸준히 개선해야 합니다. 우선순위는 분기마다 다시 정합니다.
```

### G-27 · K-1 · 리포트
audit: K-1

```before
이 엔드포인트는 멱등이라 같은 요청을 여러 번 보내도 결과가 달라지지 않습니다.
```

```after
이 엔드포인트는 같은 요청을 여러 번 보내도 결과가 달라지지 않습니다.
```

## Reassurance Copy (L Rules, Issue #44)

Safety, accuracy, and negative-capability boasts read as advertising. Delete them or replace them with the concrete behavior or the reader's next action. `안전` may stay only when a stated failure is paired with a concrete recovery action or fallback state.

### G-28 · L-1 · 제품 문구
audit: L-1

```before
백업 파일을 안전하게 저장합니다.
```

```after
백업 파일을 저장합니다.
```

### G-29 · L-1 · 제품 문구
audit: L-1

```before
메모는 안전한 방식으로 암호화되어 기기 안에만 보관됩니다.
```

```after
메모는 암호화되어 기기 안에만 보관됩니다.
```

### G-30 · L-1, A-10 · 제품 문구
audit: L-1, A-10

```before
내보내기 기능은 설정 화면 아래쪽에 있습니다. 누구나 안심하고 사용할 수 있습니다.
```

```after
내보내기 기능은 설정 화면 아래쪽에 있습니다.
```

### G-31 · L-1 · 제품 문구
audit: L-1

```before
이 변환기는 원본을 안전하게 지켜 줍니다. 변환에 실패해도 원본 파일은 안전하게 유지됩니다.
```

```after
이 변환기는 원본을 지켜 줍니다. 변환에 실패하면 원본 파일을 그대로 사용합니다.
```

The repair states what happens after the failure instead of merely promising that the original remains safe.

### G-32 · L-2 · 제품 문구
audit: L-2

```before
월 사용량은 매일 자정에 정확하게 계산됩니다.
```

```after
월 사용량은 매일 자정에 계산됩니다.
```

### G-33 · L-1, L-2 · 제품 문구
audit: L-1, L-2

```before
마이그레이션은 정확하고 안전하게 진행됩니다. 진행 상황은 화면 위쪽 막대에 표시됩니다.
```

```after
마이그레이션 진행 상황은 화면 위쪽 막대에 표시됩니다.
```

### G-34 · L-3 · 제품 문구
audit: L-3

```before
설정을 적용하려면 편집이 끝난 뒤 화면 오른쪽 위 저장 버튼을 누르세요. 이 프로그램은 설정 파일을 자동으로 수정하지 않습니다.
```

```after
설정을 적용하려면 편집이 끝난 뒤 화면 오른쪽 위 저장 버튼을 누르세요.
```

When the manual action is already stated, the "will not do" sentence adds nothing; delete it.

### G-35 · L-3 · 제품 문구
audit: L-3

```before
즐겨찾기는 브라우저 안에서만 처리되고 서버로 전송되지 않습니다.
```

```after
즐겨찾기는 브라우저 안에서만 처리됩니다.
```

### G-36 · L-3 · 제품 문구
audit: L-3

```before
검색 기록을 보려면 화면 아래 기록 탭을 여세요. 이 앱은 검색어를 서버에 저장하지 않습니다.
```

```after
검색 기록을 보려면 화면 아래 기록 탭을 여세요. 검색어는 기기에만 남습니다.
```

An affirmative restatement of the same commitment beats a negative-capability line. A legally required negative claim may stay; the audit then warns and caps the grade at C.

### G-37 · L-1 · 대화체
audit: L-1

```before
요청하신 계정 정리는 안전하게 진행해 드릴게요. 끝나면 메일로 알려 드릴게요.
```

```after
요청하신 계정 정리를 진행해 드릴게요. 끝나면 메일로 알려 드릴게요.
```

### G-38 · L-1 · 제품 문구
audit: L-1

```before
복구 기능이 데이터를 언제나 안전하게 지켜드립니다.
```

```after
복구 기능이 데이터를 지켜드립니다.
```

Naming a recovery feature does not earn the 안전 allowance; a stated failure must lead to a concrete recovery action or fallback state.

## Must Not Change (Adversarial Pairs)

These pairs are identical on both sides and must still pass: they are the texts a humanizer must NOT rewrite. They protect against over-writing — deleting safety vocabulary that is content, instruction, or warning rather than flaunting.

### G-39 · L-1 · 리포트
audit: keep L-1

```before
식약처는 백신 안전성 검토 결과를 어제 공개했다.
```

```after
식약처는 백신 안전성 검토 결과를 어제 공개했다.
```

안전성 is the subject matter here, not reassurance. In a declared non-product genre the audit warns and caps the grade at C instead of failing, so the rewriter is never forced to delete the topic word.

### G-40 · L-1 · 칼럼
audit: keep L-1

```before
그 답장을 읽고서야 안심하고 잠들 수 있었다.
```

```after
그 답장을 읽고서야 안심하고 잠들 수 있었다.
```

### G-41 · L-1 · 제품 문구
audit: none

```before
비밀번호는 안전하게 보관하세요. 잠금 해제 코드는 다른 사람과 공유하지 마세요.
```

```after
비밀번호는 안전하게 보관하세요. 잠금 해제 코드는 다른 사람과 공유하지 마세요.
```

Imperatives are the shape issue #44 asks for — telling the reader what to do — so they are never counted as reassurance, even under the strict gate.

### G-42 · L-3 · 제품 문구
audit: none

```before
지금 나가면 변경 사항이 저장되지 않습니다.
```

```after
지금 나가면 변경 사항이 저장되지 않습니다.
```

A conditional negative is a warning to the reader, not capability reassurance.

### G-43 · L-1 · 제품 문구
audit: none

```before
펌웨어 설정에 실패했습니다. 안전한 기존 부팅 설정을 계속 사용합니다.
```

```after
펌웨어 설정에 실패했습니다. 안전한 기존 부팅 설정을 계속 사용합니다.
```

The failure is explicit and the next sentence names the exact fallback behavior, so this passes untouched even under the strict gate.

## Combined Repair

### G-44 · D-1, A-2, I-1, D-2, H-1, L-1 · 블로그
audit: D-1, A-2, I-1, D-2, H-1, L-1

```before
결론적으로 이번 개편은 성능 개선을 통해 사용자 경험을 크게 높인 것입니다. 초기 로딩 시간이 3.2초에서 1.4초로 줄었고 이는 매우 주목할 만합니다. 또한 새 캐시 계층은 백그라운드에서 안전하게 동작합니다. 설정 화면 구성은 예전 그대로입니다.
```

```after
이번 개편은 성능 개선으로 사용자 경험을 크게 높였습니다. 초기 로딩 시간이 3.2초에서 1.4초로 줄었습니다. 새 캐시 계층은 백그라운드에서 동작합니다. 설정 화면 구성은 예전 그대로입니다.
```
