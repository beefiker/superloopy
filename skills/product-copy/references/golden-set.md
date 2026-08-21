# Product Copy Golden Set

Use these cases for calibration. Facts shown after `SUPPORT` are the only behavioral facts available.

## PC-1 — remove unsupported reassurance

SUPPORT: The backup completed. No backup path, validation count, storage guarantee, or mechanism was supplied.

FAIL: 백업을 안전하고 정확하게 처리했습니다.

PASS: 백업이 완료되었습니다.

SUPPORT: The backup was stored at `/Backups`, and 42 files were verified.

PASS: 백업 파일을 /Backups에 저장했습니다. 42개 파일을 확인했습니다.  (only when those facts are supplied)

## PC-2 — state a supplied fallback

SUPPORT: If firmware application fails, the product continues using the existing boot settings.

FAIL: 저장에 실패해도 이전 버전은 안전하게 남습니다.

PASS: 펌웨어 설정에 실패했습니다. 기존 부팅 설정을 계속 사용합니다.

## PC-3 — preserve verified privacy meaning

SUPPORT: The privacy commitment has been verified.

MANUAL REVIEW: 검색어를 서버로 전송하지 않습니다.

PASS: 검색어를 서버로 전송하지 않습니다.

Do not convert this commitment into an instruction and do not delete it merely because it is negative.

## PC-4 — ask for missing behavior

SOURCE: 저장에 실패해도 데이터는 안전합니다.

SUPPORT: No retained-data state or recovery behavior was supplied.

FAIL: 저장에 실패했습니다. 변경 사항이 저장되지 않았을 수 있습니다.

PASS: 저장 실패 후 실제로 남는 데이터는 무엇입니까?

Return only that one precise question. Do not append a draft or suggest a recovery mechanism.
