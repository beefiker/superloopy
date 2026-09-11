# API v2 Migration Guide

Add one header to your requests:

```
X-API-Version: 2
```

Keep `Authorization` exactly as it is. Deadline: **2026-09-30**, when v1 stops accepting new requests.

---

## What changes

| Item | Detail |
|---|---|
| v1 end of service | After **2026-09-30** |
| Version selection | By header, not request path |
| Authentication | Unchanged |
| Response structure | Unchanged |
| Request body field names | Unchanged — do not rename |

Endpoint URLs stay the same. Plan this as verification work, not a rebuild. About 30 minutes per service if your proxies forward custom headers; half a day if you have to trace a header through infrastructure you don't control.

### Example request

```js
fetch("https://api.example.com/orders", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-API-Version": "2"
  }
})
```

Without the header, the server may fall back to v1. A request that still returns 200 is not proof of success — the header may never have arrived. Check the response body, not the status code.

---

## Rollout order

1. **Development** — add the header, compare response fields against the official examples at https://docs.example.com/api/v2
2. **Staging** — promote the change, review error logs for environment-specific failures
3. **Production** — apply once steps 1 and 2 are clean

---

## When something breaks: check header forwarding first

Do not revert the request path. The path does not select the version.

Some proxies and SDKs strip headers they don't recognise, so your client sends `X-API-Version: 2` and the server never sees it. Work through the chain in order:

1. Confirm your HTTP client or SDK attaches the header to the outbound request
2. Confirm each proxy in the chain forwards `X-API-Version` rather than stripping it
3. Confirm the header is present at the last hop before the API

---

## Migration list

Maintain a list covering your services. Review item before production release — have it complete at that point.

| Service | Apply date | Verification result |
|---|---|---|
| *(your service)* | *(date header applied)* | *(pass / findings)* |

---

## After going live

1. Confirm v1 and v2 requests return the same order data
2. Record that proxies and SDKs forwarded the header

### Checklist

- [ ] `Authorization` header unchanged
- [ ] `X-API-Version: 2` added
- [ ] Request body field names not renamed
- [ ] Response fields compared against https://docs.example.com/api/v2
- [ ] Header added in development; responses compared
- [ ] Error logs checked in staging
- [ ] Applied in production
- [ ] Proxies and SDKs verified not to strip custom headers
- [ ] Migration list complete before production release
- [ ] v1 and v2 confirmed to return the same order data
- [ ] Header forwarding recorded

---

Next: add `X-API-Version: 2` in your development environment and open https://docs.example.com/api/v2 to compare the first response.
