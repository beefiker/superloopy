export const sample = Object.freeze({
  "id": "api-migration",
  "label": "API 전환 안내",
  "description": "코드, 경고, 링크",
  "versions": {
    "original": {
      "id": "original",
      "short": "Original",
      "label": "Original",
      "text": "# API v2 전환 안내\n\n기존 API v1은 2026-09-30 이후 새 요청을 받지 않습니다. 그 전까지 연동 서비스를 API v2로 전환해 주세요. 이번 전환에서는 인증 방식과 기본 응답 구조는 유지되지만, 버전 선택은 요청 경로가 아니라 헤더로 전달해야 합니다. 전환 기한이 지나면 v1 호출은 오류 응답을 받으므로, 테스트 환경과 운영 환경을 모두 확인해야 합니다.\n\n기존에 사용하던 `Authorization` 헤더는 그대로 둡니다. 새로 추가하는 값은 `X-API-Version: 2`이며, 이 헤더가 없으면 v1 동작이 선택될 수 있습니다. 요청 본문의 필드 이름을 임의로 바꾸지 말고, 공식 예제 URL인 https://docs.example.com/api/v2 를 기준으로 응답 필드를 비교해 주세요.\n\n```js\nconst response = await fetch(\"https://api.example.com/orders\", {\n  headers: {\n    Authorization: `Bearer ${token}`,\n    \"X-API-Version\": \"2\"\n  }\n});\n```\n\n전환 순서는 개발 환경에서 헤더를 추가해 응답을 비교하고, 스테이징에서 오류 로그를 확인한 뒤, 운영 환경에 적용하는 방식입니다. 특히 프록시나 SDK가 사용자 정의 헤더를 제거하지 않는지 확인해야 합니다. 문제가 생기면 요청 경로를 되돌리는 대신 헤더 전송 설정을 먼저 점검해 주세요. API v2의 필수 필드와 예제는 https://docs.example.com/api/v2 에서 확인할 수 있습니다. 적용 날짜와 확인 결과는 서비스별 전환 목록에 남겨 누락된 연동이 없는지 확인합니다. 전환 목록은 운영 배포 전 검토 항목으로 사용합니다.\n\n운영 적용 뒤에는 v1과 v2 요청이 같은 주문 정보를 반환하는지 확인합니다. 프록시와 SDK의 배포 설정이 헤더를 그대로 전달한 기록도 전환 목록에 남깁니다.\n",
      "metrics": {
        "characters": 961,
        "words": 197,
        "lines": 18
      },
      "audits": []
    },
    "a": {
      "id": "a",
      "short": "A",
      "label": "Humanize Korean",
      "text": "# API v2 전환 안내\n\n기존 API v1은 2026-09-30 이후 새 요청을 받지 않습니다. 그 전에 연동 서비스를 API v2로 바꿔 주세요. 인증 방식과 기본 응답 구조는 그대로지만, 이제 버전은 요청 경로가 아니라 헤더로 선택합니다. 기한이 지나면 v1 호출은 오류 응답을 받으니 테스트 환경과 운영 환경을 모두 확인해야 합니다.\n\n`Authorization` 헤더는 지금처럼 사용합니다. 새로 넣을 값은 `X-API-Version: 2`입니다. 이 헤더가 없으면 v1 동작이 선택될 수 있습니다. 요청 본문 필드 이름은 바꾸지 말고, 공식 예제 URL https://docs.example.com/api/v2 를 기준으로 응답 필드를 비교해 주세요.\n\n```js\nconst response = await fetch(\"https://api.example.com/orders\", {\n  headers: {\n    Authorization: `Bearer ${token}`,\n    \"X-API-Version\": \"2\"\n  }\n});\n```\n\n개발 환경에서 헤더를 추가해 응답을 비교한 뒤 스테이징 오류 로그를 보고 운영에 적용합니다. 프록시나 SDK가 사용자 정의 헤더를 빼지 않는지도 확인해 주세요. 문제가 생기면 요청 경로를 되돌리기 전에 헤더 전송 설정부터 점검합니다. 필수 필드와 예제는 https://docs.example.com/api/v2 에 있습니다. 적용 날짜와 확인 결과는 서비스별 전환 목록에 남겨 누락된 연동이 없는지 확인합니다.\n\n운영 적용 뒤에는 v1과 v2 요청이 같은 주문 정보를 반환하는지 확인합니다. 프록시와 SDK의 배포 설정이 헤더를 그대로 전달한 기록도 전환 목록에 남깁니다. 전환 목록은 운영 배포 전 검토 항목으로 사용합니다.\n",
      "metrics": {
        "characters": 884,
        "words": 179,
        "lines": 18
      },
      "audits": []
    },
    "b": {
      "id": "b",
      "short": "B",
      "label": "i-have-adhd",
      "text": "# API v2 전환 안내\n\n**기한:** 2026-09-30 전까지 API v1 연동을 API v2로 전환합니다. 이후 v1은 새 요청을 받지 않고 오류 응답을 반환합니다.\n\n## 바뀌는 점\n\n- 인증 방식과 기본 응답 구조는 유지합니다.\n- 버전 선택은 요청 경로가 아니라 헤더로 전달합니다.\n- `Authorization` 헤더는 그대로 사용합니다.\n- `X-API-Version: 2`를 추가합니다. 없으면 v1 동작이 선택될 수 있습니다.\n\n공식 예제 URL https://docs.example.com/api/v2 를 기준으로 응답 필드를 비교합니다. 요청 본문 필드 이름은 바꾸지 않습니다.\n\n```js\nconst response = await fetch(\"https://api.example.com/orders\", {\n  headers: {\n    Authorization: `Bearer ${token}`,\n    \"X-API-Version\": \"2\"\n  }\n});\n```\n\n## 적용 순서\n\n1. 개발 환경에서 헤더를 추가하고 응답을 비교합니다.\n2. 스테이징에서 오류 로그를 확인합니다.\n3. 운영 환경에 적용하고 프록시나 SDK가 사용자 정의 헤더를 제거하지 않는지 확인합니다.\n\n문제가 생기면 요청 경로를 되돌리기 전에 헤더 전송 설정을 점검합니다. 필수 필드와 예제는 https://docs.example.com/api/v2 에 있습니다. 적용 날짜와 확인 결과는 서비스별 전환 목록에 남겨 누락된 연동이 없는지 확인합니다.\n\n**호환성 확인:** 운영 적용 뒤 v1과 v2 요청이 같은 주문 정보를 반환하는지 확인합니다. 프록시와 SDK가 헤더를 그대로 전달한 배포 기록도 전환 목록에 남깁니다. 전환 목록은 운영 배포 전 검토 항목으로 사용합니다.\n",
      "metrics": {
        "characters": 883,
        "words": 174,
        "lines": 31
      },
      "audits": []
    },
    "c": {
      "id": "c",
      "short": "C",
      "label": "Say It Straight",
      "text": "# API v2 전환 안내\n\nAPI v1은 2026-09-30 이후 새 요청을 받지 않습니다. 기한 전 API v2로 전환해 주세요. 기한이 지나면 v1 호출은 오류 응답을 받습니다. 테스트 환경과 운영 환경을 모두 확인해야 합니다.\n\n인증 방식과 기본 응답 구조는 유지합니다. 버전은 요청 경로가 아니라 헤더로 선택합니다. `Authorization` 헤더는 그대로 두고 `X-API-Version: 2`를 추가합니다. 이 헤더가 없으면 서버가 v1으로 동작할 수 있습니다. 요청 본문 필드 이름은 바꾸지 마세요. 공식 예제 URL https://docs.example.com/api/v2 를 기준으로 응답 필드를 비교합니다.\n\n```js\nconst response = await fetch(\"https://api.example.com/orders\", {\n  headers: {\n    Authorization: `Bearer ${token}`,\n    \"X-API-Version\": \"2\"\n  }\n});\n```\n\n개발 환경에서 헤더를 추가해 응답을 비교하고 스테이징 오류 로그를 확인한 뒤 운영에 적용합니다. 프록시나 SDK가 사용자 정의 헤더를 제거하지 않는지 확인하세요. 문제가 생기면 요청 경로를 되돌리기 전에 헤더 전송 설정을 점검합니다. API v2의 필수 필드와 예제는 https://docs.example.com/api/v2 에 있습니다. 적용 날짜와 확인 결과는 서비스별 전환 목록에 남겨 누락된 연동이 없는지 확인합니다.\n\n운영 적용 뒤 v1과 v2 요청이 같은 주문 정보를 반환하는지 확인합니다. 프록시와 SDK가 헤더를 그대로 전달한 배포 기록도 전환 목록에 남깁니다. 전환 목록은 운영 배포 전 검토 항목으로 사용합니다.\n",
      "metrics": {
        "characters": 866,
        "words": 172,
        "lines": 18
      },
      "audits": []
    }
  }
});
