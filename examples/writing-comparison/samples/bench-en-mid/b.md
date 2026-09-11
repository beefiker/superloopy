# API v2 Migration Guide

Add the header `X-API-Version: 2` to every request. That is the entire migration.

```js
fetch("https://api.example.com/orders", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-API-Version": "2"
  }
})
```

Without that header, the server falls back to v1.

## Deadline

v1 stops accepting requests after **2026-09-30**. That is 19 days from today.

## What does not change

- Authentication — keep your existing `Authorization` header
- Response structure
- Request body field names — do not rename them
- Request path — version is selected by header, not path

## Migration steps

1. **Dev**: add the header, diff responses against v1
2. **Staging**: deploy, check error logs
3. **Production**: deploy, record apply date and verification result per service
4. **After production**: confirm v1 and v2 return the same order data
5. **After production**: confirm proxies and SDKs forwarded the header

Compare response fields against <https://docs.example.com/api/v2>.

## If something breaks

Check header forwarding first. Proxies and SDKs strip custom headers. Do not revert the request path — the path is unchanged in v2, so reverting it will not help.

## Before the production release

Your migration list (apply date + verification result per service) is a review item. Have it complete before the release review.

Next: add the header in dev and diff one response against v1.
