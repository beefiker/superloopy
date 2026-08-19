export const sample = Object.freeze({
  "id": "api-migration-en",
  "label": "API migration",
  "description": "Code, warning, links",
  "versions": {
    "original": {
      "id": "original",
      "short": "Original",
      "label": "Original",
      "text": "# Migrating to API v2\n\nThe v1 endpoints will stop accepting traffic on 2026-09-30. After that date any request sent to v1 comes back as 410 and is not retried. For most callers the change that needs to be made is a small one, because v2 keeps the same paths and the same field names and only differs in how the version gets selected and how errors are shaped.\n\n## Selecting the version\n\nWhere v1 took the version from a prefix in the URL, v2 reads the `X-API-Version` header instead, so the path itself no longer carries a version at all.\n\n```js\nconst response = await fetch(\"https://api.example.com/orders\", {\n  headers: { \"X-API-Version\": \"2\", Authorization: `Bearer ${token}` }\n});\n```\n\nYou are able to confirm which version actually handled a request by looking at the response:\n\n```sh\ncurl -sI https://api.example.com/orders -H \"X-API-Version: 2\" | grep -i x-api-version\n```\n\n> If the header is missing the request will be served by v1 until 2026-09-30 and will fail after that. Proxies that strip headers they do not recognise are the most common reason for a header going missing.\n\n## Errors\n\nv2 returns a single error object carrying `code` and `message`, rather than the array that v1 used to return. The full field-by-field notes live at https://docs.example.com/api/v2, and the migration list is a review item before production release.\n",
      "metrics": {
        "characters": 1348,
        "words": 223,
        "lines": 25
      },
      "audits": []
    },
    "b": {
      "id": "b",
      "short": "B",
      "label": "i-have-adhd",
      "text": "# Migrating to API v2\n\n**Deadline:** 2026-09-30. After that, v1 returns 410 and is not retried.\n\n**Scope:** paths and field names are unchanged. Only version selection and error shape differ.\n\n## Selecting the version\n\nv1 read the version from the URL prefix. v2 reads the `X-API-Version` header, so the path carries no version.\n\n```js\nconst response = await fetch(\"https://api.example.com/orders\", {\n  headers: { \"X-API-Version\": \"2\", Authorization: `Bearer ${token}` }\n});\n```\n\nConfirm which version answered:\n\n```sh\ncurl -sI https://api.example.com/orders -H \"X-API-Version: 2\" | grep -i x-api-version\n```\n\n> If the header is missing the request will be served by v1 until 2026-09-30 and will fail after that. Proxies that strip headers they do not recognise are the most common reason for a header going missing.\n\n## Errors\n\nv2 returns one error object with `code` and `message`. v1 returned an array. Field-by-field notes: https://docs.example.com/api/v2 — and the migration list is a review item before production release.\n",
      "metrics": {
        "characters": 1029,
        "words": 154,
        "lines": 27
      },
      "audits": []
    },
    "c": {
      "id": "c",
      "short": "C",
      "label": "Say It Straight",
      "text": "# Migrating to API v2\n\nThe v1 endpoints stop accepting traffic on 2026-09-30. After that date requests to v1 return 410 and are not retried. The change is small for most callers: v2 keeps the same paths and field names, and differs only in how the version is selected and how errors are shaped.\n\n## Selecting the version\n\nv1 took the version from a URL prefix. v2 reads the `X-API-Version` header instead, so the path no longer carries a version.\n\n```js\nconst response = await fetch(\"https://api.example.com/orders\", {\n  headers: { \"X-API-Version\": \"2\", Authorization: `Bearer ${token}` }\n});\n```\n\nConfirm which version handled a request from the response:\n\n```sh\ncurl -sI https://api.example.com/orders -H \"X-API-Version: 2\" | grep -i x-api-version\n```\n\n> If the header is missing the request will be served by v1 until 2026-09-30 and will fail after that. Proxies that strip headers they do not recognise are the most common reason for a header going missing.\n\n## Errors\n\nv2 returns a single error object with `code` and `message` rather than the v1 array. Full field-by-field notes are at https://docs.example.com/api/v2, and the migration list is a review item before production release.\n",
      "metrics": {
        "characters": 1192,
        "words": 190,
        "lines": 25
      },
      "audits": []
    }
  }
});
