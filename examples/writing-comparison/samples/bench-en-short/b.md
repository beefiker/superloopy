Add `X-API-Version: 2` to your API requests. Deadline: API v1 stops accepting new requests on 2026-09-30.

What stays the same: your `Authorization` header, the basic response structure, and all request field names. Do not rename fields.

Migration steps:

1. Add the header `X-API-Version: 2` to every request. Without it, requests may fall back to v1.
2. Compare your v2 responses against https://docs.example.com/api/v2
3. Apply in development, then staging, then production
4. Confirm proxies and SDKs forward the header at each stage
5. Record the apply date and verification result for each service

Next: add the header in development and diff one response against the v2 docs.
