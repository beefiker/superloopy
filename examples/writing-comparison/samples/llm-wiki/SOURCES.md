# llm-wiki 샘플 출처 기록

이 샘플의 BEE 회사와 도입 서사는 허구다. 그러나 본문이 인용하는 수치, 회사 사례,
실무자 관행은 아래 공개 자료를 근거로 삼았다. 이 파일은 앱에 포함되지 않는
편집자용 기록이다. 본문 수치를 고치기 전에 여기서 근거를 확인하고, 근거가
바뀌면 네 변형(`original`/`a`/`b`/`c`)과 `sample-data.test.mjs`의 고정 문자열을
함께 갱신한다.

정확한 URL을 확인한 항목만 URL을 적었다. 나머지는 발행처와 시점으로 적는다.

## 사례 표와 본문 수치

| 본문 수치·주장 | 출처 |
| --- | --- |
| 우버 — 첫 버전 답변 유용률 48.9%, 답변마다 피드백 버튼, 골든 질문 100여 개 LLM 심판 채점 | Uber 엔지니어링 블로그의 Genie(온콜 코파일럿) 소개 글과 2025년 5월 개선 후속 글(개선판 +27% acceptable, −60% incorrect) |
| 스포티파이 — 개발자 87% 주간 사용, 지원 처리 시간 47% 단축 | Spotify 엔지니어링 블로그의 AiKA(Backstage TechDocs 기반 RAG) 소개 글 |
| 클라우드플레어 — 저장소 3,900개 AGENTS.md 자동 생성, 주간 MR 5,600→8,700, 리뷰어가 문서 갱신 표시 | blog.cloudflare.com/internal-ai-engineering-stack/ (2026-04) |
| 스트라이프 — 주간 프로덕션 MR 1,300건, MCP 도구 500개(Toolshed) | InfoQ, "Stripe autonomous coding agents (Minions)" (2026-03), infoq.com/news/2026/03/ |
| 링크드인 — 인증된 테이블·예시만 색인해 80% | linkedin.com/blog/engineering/ai/practical-text-to-sql-for-data-analytics (SQL Bot) |
| 잘란도 — 33% | engineering.zalando.com/posts/2026/08/agentic-engineering-at-zalando-a-snapshot.html |
| 웹플로우 — 온보딩 기간 약 20% 단축, 실사용률 20~40% 정체 반례 | Glean 고객 사례(Webflow) 및 사내 검색 도입률 관련 공개 논의 |
| 평가 통과율 53%→100% (익숙하지 않은 프레임워크, 압축 색인 문서) | Vercel 평가 글(2026-01): Next.js 16 신규 API 대상, AGENTS.md 압축 문서 색인 8KB |
| 상용 검색 제품 17~33% 오답률 | Stanford HAI/RegLab 법률 AI 도구 평가 연구(범용 챗봇 58~80% 대비); 검색 실패 유형은 Barnett et al., arXiv:2401.05856 |
| 도입 조직 절반 이상 예산 초과 전망, 데이터 정리가 전체 비용의 30~50%, 비용 계산 5~10배 오차 | Gartner 전망·보도자료(2024-07 GenAI 프로젝트 중단 전망, 2026년 비용 전망, 500~1,000% 비용 오차 경고) |
| 사용자 3분의 2가 AI 답변을 검증하지 않음 | KPMG · University of Melbourne 글로벌 신뢰 조사(47개국 48,000명, 2024-11~2025-01) |

## 실무자 관행 (도입 조직의 실전 수칙 절)

| 본문 관행 | 출처 |
| --- | --- |
| 체르니(Boris Cherny) — 실수를 규칙 한 줄로 남기는 오류 장부 | Pragmatic Engineer 인터뷰(2026-03-04) |
| pamelafox — 실패가 증명할 때만 문서 한 줄 추가, 되돌려 재실행 검증; 200줄 규율 | Hacker News AGENTS.md 스레드(id 44957443, 2025-08)의 본인 코멘트와 같은 스레드 실무자 코멘트 |
| 해시모토(Mitchell Hashimoto) — 계획 파일을 세션 넘어 재사용 | mitchellh.com/writing/non-trivial-vibing (2025-10-11) |
| 로나허(Armin Ronacher) — 스타일 지침이 아니라 운영 지식을 담는다 | lucumr.pocoo.org (2025-06-12) |
| 카파시(Andrej Karpathy) — 인용문(지속·복리 자산, 장부 정리) 및 LLM 위키 구상 | gist.github.com/karpathy/442a6bf555914893e9891c11519de94f (2026-04). 본문 인용은 이 gist의 발췌 번역이다. |

## 반대 근거 (본문 '한계와 위험' 절의 균형)

- ETH Zurich 평가(arXiv:2602.11988): 컨텍스트 파일이 과제 성공률을 일반적으로
  올리지 못했고 추론 비용은 20% 늘었다. 본문이 기대 효과를 단정하지 않는 이유다.
