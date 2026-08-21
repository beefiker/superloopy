# Product Copy Golden Set

Use these cases for calibration. Facts shown after `SUPPORT` are the only behavioral facts available.

## PC-1 — remove unsupported reassurance

SUPPORT: The backup completed. No backup path, validation count, storage guarantee, or mechanism was supplied.

FAIL: 백업을 안전하고 정확하게 처리했습니다.

PASS: 백업이 완료되었습니다.

SUPPORT: The backup was stored at `/Backups`, and 42 files were verified.

PASS: 백업 파일을 /Backups에 저장했습니다. 42개 파일을 확인했습니다.  (only when those facts are supplied)

SUPPORT: Memos are encrypted and stored only on the device.

SOURCE: 메모는 안전한 방식으로 암호화되어 기기 안에만 보관됩니다.

PASS: 메모는 암호화되어 기기 안에만 보관됩니다.

SUPPORT: Monthly usage is calculated at midnight.

PASS: 월 사용량은 매일 자정에 계산됩니다.

## PC-2 — state a supplied fallback

SUPPORT: If firmware application fails, the product continues using the existing boot settings.

FAIL: 저장에 실패해도 이전 버전은 안전하게 남습니다.

PASS: 펌웨어 설정에 실패했습니다. 기존 부팅 설정을 계속 사용합니다.

## PC-3 — preserve verified privacy meaning

SUPPORT: The privacy commitment has been verified.

MANUAL REVIEW: 검색어를 서버로 전송하지 않습니다.

PASS: 검색어를 서버로 전송하지 않습니다.

Do not convert this commitment into an instruction and do not delete it merely because it is negative.

SUPPORT: The privacy commitment has been verified; favorites are processed only in the browser.

MANUAL REVIEW: 즐겨찾기는 브라우저 안에서만 처리되고 서버로 전송되지 않습니다.

PASS: 즐겨찾기는 브라우저 안에서만 처리되고 서버로 전송되지 않습니다.

## PC-4 — ask for missing behavior

SOURCE: 저장에 실패해도 데이터는 안전합니다.

SUPPORT: No retained-data state or recovery behavior was supplied.

FAIL: 저장에 실패했습니다. 변경 사항이 저장되지 않았을 수 있습니다.

PASS: 저장 실패 후 실제로 남는 데이터는 무엇입니까?

Return only that one precise question. Do not append a draft or suggest a recovery mechanism.

## PC-5 — name the verified relation

SUPPORT: The selected target computer was identified.

MANUAL REVIEW: 정확한 컴퓨터

PASS: 대상 컴퓨터 확인

SUPPORT: The detected board model is MSI and the model identity was confirmed.

MANUAL REVIEW: 정확한 MSI 보드 확인됨

PASS: MSI 보드 모델 확인

SUPPORT: The firmware image matches the confirmed board.

MANUAL REVIEW: 정확한 펌웨어 이미지

PASS: 보드와 일치하는 펌웨어 이미지

PASS: 정확한 시간, 수치, 사양, 정보

Accuracy belongs to the measurable or informational target. Do not replace these legitimate phrases merely because they contain `정확한`.
