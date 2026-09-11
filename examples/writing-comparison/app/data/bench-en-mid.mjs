export const sample = Object.freeze({
  "id": "bench-en-mid",
  "language": "bench",
  "label": "Benchmark · English mid (265 words)",
  "description": "API v2 migration guide, model draft",
  "versions": {
    "original": {
      "id": "original",
      "short": "Original",
      "label": "Original",
      "text": "# API v2 Migration Guide\n\nHello! Below is a concise guide to help you move your integration from API v1 to API v2 before the cutoff.\n\n## 1. Deadline\n\nAPI v1 **stops accepting new requests after 2026-09-30**. All partner integrations must be migrated to API v2 before that date.\n\n## 2. What Changes (and What Doesn't)\n\n| Area | Status |\n|---|---|\n| Authentication | Unchanged — keep your existing `Authorization` header |\n| Basic response structure | Unchanged |\n| Version selection | By **header**, not by request path |\n| Request body field names | Do **not** rename them |\n\nAdd the header `X-API-Version: 2`. **Without this header, the server may fall back to v1 behaviour.**\n\n## 3. Example Request\n\n```js\nfetch(\"https://api.example.com/orders\", {\n  headers: {\n    Authorization: `Bearer ${token}`,\n    \"X-API-Version\": \"2\"\n  }\n})\n```\n\n## 4. Recommended Migration Order\n\n1. **Development** — add the header and compare responses.\n2. **Staging** — check error logs.\n3. **Production** — apply the change.\n\nCompare response fields against the official examples at <https://docs.example.com/api/v2>.\n\n## 5. Common Pitfalls\n\n- Verify that **proxies and SDKs do not strip custom headers**.\n- If something breaks, **check header forwarding first** before reverting the request path.\n\n## 6. Tracking and Review\n\n- Record the **apply date** and **verification result** per service in a migration list.\n- This list is a **review item before the production release**.\n\n## 7. Post-Production Checks\n\n- Confirm that v1 and v2 requests return the **same order data**.\n- Record that proxies and SDKs **forwarded the header**.\n\nThanks for migrating early — please reach out if anything is unclear!\n",
      "metrics": {
        "characters": 1684,
        "words": 265,
        "lines": 54
      },
      "audits": [],
      "notes": []
    },
    "b": {
      "id": "b",
      "short": "B",
      "label": "i-have-adhd",
      "text": "# API v2 Migration Guide\n\nAdd the header `X-API-Version: 2` to every request. That is the entire migration.\n\n```js\nfetch(\"https://api.example.com/orders\", {\n  headers: {\n    Authorization: `Bearer ${token}`,\n    \"X-API-Version\": \"2\"\n  }\n})\n```\n\nWithout that header, the server falls back to v1.\n\n## Deadline\n\nv1 stops accepting requests after **2026-09-30**. That is 19 days from today.\n\n## What does not change\n\n- Authentication — keep your existing `Authorization` header\n- Response structure\n- Request body field names — do not rename them\n- Request path — version is selected by header, not path\n\n## Migration steps\n\n1. **Dev**: add the header, diff responses against v1\n2. **Staging**: deploy, check error logs\n3. **Production**: deploy, record apply date and verification result per service\n4. **After production**: confirm v1 and v2 return the same order data\n5. **After production**: confirm proxies and SDKs forwarded the header\n\nCompare response fields against <https://docs.example.com/api/v2>.\n\n## If something breaks\n\nCheck header forwarding first. Proxies and SDKs strip custom headers. Do not revert the request path — the path is unchanged in v2, so reverting it will not help.\n\n## Before the production release\n\nYour migration list (apply date + verification result per service) is a review item. Have it complete before the release review.\n\nNext: add the header in dev and diff one response against v1.\n",
      "metrics": {
        "characters": 1421,
        "words": 218,
        "lines": 45
      },
      "audits": [],
      "notes": []
    },
    "c": {
      "id": "c",
      "short": "C",
      "label": "Say It Straight",
      "text": "# API v2 Migration Guide\n\nMove your integration from API v1 to API v2 before the cutoff date below.\n\n## 1. Deadline\n\nAPI v1 **stops accepting new requests after 2026-09-30**. All partner integrations must be migrated to API v2 before that date.\n\n## 2. What Changes (and What Doesn't)\n\n| Area | Status |\n|---|---|\n| Authentication | Unchanged — keep your existing `Authorization` header |\n| Basic response structure | Unchanged |\n| Version selection | By **header**, not by request path |\n| Request body field names | Do **not** rename them |\n\nAdd the header `X-API-Version: 2`. **Without this header, the server may fall back to v1 behaviour.**\n\n## 3. Example Request\n\n```js\nfetch(\"https://api.example.com/orders\", {\n  headers: {\n    Authorization: `Bearer ${token}`,\n    \"X-API-Version\": \"2\"\n  }\n})\n```\n\n## 4. Recommended Migration Order\n\n1. **Development**: add the header and compare responses.\n2. **Staging**: check error logs.\n3. **Production**: apply the change.\n\nCompare response fields against the official examples at <https://docs.example.com/api/v2>.\n\n## 5. Common Pitfalls\n\n- Verify that **proxies and SDKs do not strip custom headers**.\n- If something breaks, **check header forwarding first** before reverting the request path.\n\n## 6. Tracking and Review\n\n- Record the **apply date** and **verification result** per service in a migration list.\n- This list is a **review item before the production release**.\n\n## 7. Post-Production Checks\n\n- Confirm that v1 and v2 requests return the **same order data**.\n- Record that proxies and SDKs **forwarded the header**.\n\nReach out if anything here is unclear.\n",
      "metrics": {
        "characters": 1617,
        "words": 250,
        "lines": 54
      },
      "audits": [],
      "notes": []
    }
  }
});
