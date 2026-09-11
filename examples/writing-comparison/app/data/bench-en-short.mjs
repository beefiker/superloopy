export const sample = Object.freeze({
  "id": "bench-en-short",
  "language": "bench",
  "label": "Benchmark · English short (73 words)",
  "description": "API v2 migration guide, model draft",
  "versions": {
    "original": {
      "id": "original",
      "short": "Original",
      "label": "Original",
      "text": "Hello! API v1 stops accepting new requests after 2026-09-30, so please migrate before then. Authentication and the basic response structure are unchanged: keep your Authorization header and add X-API-Version: 2, since omitting it may fall back to v1. Don't rename request fields; compare responses against https://docs.example.com/api/v2. Apply in development, then staging, then production, confirming proxies and SDKs forward the header, and record the apply date and verification result per service. Hope this helps!\n",
      "metrics": {
        "characters": 520,
        "words": 73,
        "lines": 1
      },
      "audits": [],
      "notes": []
    },
    "b": {
      "id": "b",
      "short": "B",
      "label": "i-have-adhd",
      "text": "Add `X-API-Version: 2` to your API requests. Deadline: API v1 stops accepting new requests on 2026-09-30.\n\nWhat stays the same: your `Authorization` header, the basic response structure, and all request field names. Do not rename fields.\n\nMigration steps:\n\n1. Add the header `X-API-Version: 2` to every request. Without it, requests may fall back to v1.\n2. Compare your v2 responses against https://docs.example.com/api/v2\n3. Apply in development, then staging, then production\n4. Confirm proxies and SDKs forward the header at each stage\n5. Record the apply date and verification result for each service\n\nNext: add the header in development and diff one response against the v2 docs.\n",
      "metrics": {
        "characters": 685,
        "words": 106,
        "lines": 13
      },
      "audits": [],
      "notes": []
    },
    "c": {
      "id": "c",
      "short": "C",
      "label": "Say It Straight",
      "text": "API v1 stops accepting new requests after 2026-09-30, so migrate before then. Authentication and the basic response structure are unchanged: keep your Authorization header and add `X-API-Version: 2`, since the API may fall back to v1 if you omit it. Don't rename request fields; compare responses against https://docs.example.com/api/v2. Apply in development, then staging, then production, confirming that proxies and SDKs forward the header, and record the apply date and verification result per service.\n",
      "metrics": {
        "characters": 507,
        "words": 73,
        "lines": 1
      },
      "audits": [],
      "notes": []
    }
  }
});
