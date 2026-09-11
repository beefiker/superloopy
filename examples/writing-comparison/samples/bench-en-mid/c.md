# API v2 Migration Guide

Move your integration from API v1 to API v2 before the cutoff date below.

## 1. Deadline

API v1 **stops accepting new requests after 2026-09-30**. All partner integrations must be migrated to API v2 before that date.

## 2. What Changes (and What Doesn't)

| Area | Status |
|---|---|
| Authentication | Unchanged — keep your existing `Authorization` header |
| Basic response structure | Unchanged |
| Version selection | By **header**, not by request path |
| Request body field names | Do **not** rename them |

Add the header `X-API-Version: 2`. **Without this header, the server may fall back to v1 behaviour.**

## 3. Example Request

```js
fetch("https://api.example.com/orders", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-API-Version": "2"
  }
})
```

## 4. Recommended Migration Order

1. **Development**: add the header and compare responses.
2. **Staging**: check error logs.
3. **Production**: apply the change.

Compare response fields against the official examples at <https://docs.example.com/api/v2>.

## 5. Common Pitfalls

- Verify that **proxies and SDKs do not strip custom headers**.
- If something breaks, **check header forwarding first** before reverting the request path.

## 6. Tracking and Review

- Record the **apply date** and **verification result** per service in a migration list.
- This list is a **review item before the production release**.

## 7. Post-Production Checks

- Confirm that v1 and v2 requests return the **same order data**.
- Record that proxies and SDKs **forwarded the header**.

Reach out if anything here is unclear.
