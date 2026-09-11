Add this header to your API client:

```
X-API-Version: 2
```

Keep everything else the same. That is the whole code change. The rest of this guide is verifying it survived the trip.

# API v2 Migration

**Deadline: 2026-09-30.** After that date v1 stops accepting new requests.

**Time:** ~30 minutes per service if you have a central request layer. Half a day if headers are set per call site.

---

## 1. The change

```js
fetch("https://api.example.com/orders", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-API-Version": "2"
  }
})
```

What stays untouched:

1. `Authorization` header — same credentials, same header
2. Request path — no `/v2/`, no new base URL
3. Request body field names — do not rename them
4. Basic response structure — unchanged

**The version lives in a header, not the URL.** If you remember one thing, that.

---

## 2. Set the header centrally

Per-call-site headers are how one forgotten module keeps running on v1 until the cutoff.

```js
// Every request inherits both headers.
function apiRequest(path, options = {}) {
  return fetch(`https://api.example.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-API-Version": "2",
      ...options.headers
    }
  });
}

apiRequest("/orders");
```

If your client has interceptors or default headers, use those. Goal: no call path can reach the API without the header.

---

## 3. The silent failure mode

Missing `X-API-Version` header → the server **may fall back to v1 behaviour**.

Two consequences:

1. A stripped header does not fail loudly. It works fine — until 2026-09-30.
2. A passing integration test does not prove you are on v2. Verify the header **arrived**, not that the call succeeded.

Treat a missing header as a defect, not cosmetics.

---

## 4. Rollout order

| Stage | Environment | Do this | Looking for |
|---|---|---|---|
| 1 | Development | Add header, compare responses | Field-level differences vs. official examples |
| 2 | Staging | Check error logs | Failures under realistic routing |
| 3 | Production | Apply | Header forwarding confirmed |

Do not skip ahead. Each stage catches a different class of problem.

### Stage 1 — Development

1. Add the header in the central request layer
2. Capture a real v2 response
3. Open the matching example at `https://docs.example.com/api/v2`
4. Walk the fields and confirm your parsing handles what is actually there
5. Resolve any field you depend on that you cannot confirm against the examples

The official examples are the reference — not memory of v1, not a colleague's screenshot.

### Stage 2 — Staging

Check error logs **after** the header change, not just before. Staging routing is closer to production, so header-stripping shows up here first.

Because of the v1 fallback, some problems produce no errors at all. Pair the log review with an explicit check that the header is arriving.

### Stage 3 — Production

Apply the change. If stages 1 and 2 were done properly, this is uneventful.

---

## 5. Proxies and SDKs: where this usually breaks

**Check that proxies and SDKs do not strip custom headers.**

Candidates between your code and the API:

1. Forward and reverse proxies
2. API gateways
3. Load balancers
4. CDN / edge layers
5. HTTP client SDKs with their own header allow-lists

Ask "did the header arrive?" — not "did the request succeed?" Confirm at the hop closest to the API that `X-API-Version: 2` is still attached, and record that confirmation.

---

## 6. If something breaks

**Check header forwarding before reverting the request path.**

The path is not the version selector. Editing the URL adds a second variable and hides the real cause, which is nearly always a proxy or SDK that dropped the custom header.

- Correct first move: confirm `X-API-Version: 2` reached the API.
- Wrong first move: editing the URL.

### Triage order

1. Is the header present as your application emits it?
2. Is it still present after each proxy, gateway, and SDK layer?
3. Is `Authorization` present and unchanged?
4. Are request body field names unchanged from v1?
5. Do response fields match the official examples?

Then check the error logs. Only after all of that consider anything beyond header configuration — and the request path still is not the version selector.

### Symptom table

| Symptom | Likely cause | First action |
|---|---|---|
| Works, but you cannot confirm v2 | Header stripped → v1 fallback | Verify forwarding at each hop |
| Works in dev, not staging | Proxy/gateway in staging path | Check header forwarding, not the path |
| Response field missing | Field-level difference | Compare against official v2 examples |
| Auth failure | Unrelated to versioning | Confirm `Authorization` unchanged |
| Rejected after "cleanup" | Renamed body fields | Restore original field names |

---

## 7. Migration list (required before production release)

Record **apply date** and **verification result** per service. This list is reviewed as part of the production release.

| Service | Apply date | Verification result | Notes |
|---|---|---|---|
| orders-api-client | 2026-09-__ | Pass / Fail | Responses compared vs. official examples |
| billing-sync | 2026-09-__ | Pass / Fail | Staging error logs reviewed |
| reporting-batch | 2026-09-__ | Pass / Fail | Header forwarding confirmed through gateway |

Per service, not per organisation. A single "we migrated" entry hides the one background job that never got the header.

---

## 8. After production

1. Confirm v1 and v2 requests return the same order data — against real production behaviour, not dev fixtures
2. Record that proxies forwarded the header
3. Record that SDKs forwarded the header
4. Update the migration list with apply date and verification result

The recorded forwarding confirmation is what separates "we are on v2" from "we appear to be fine."

---

## 9. Full checklist

**Code**

- [ ] Keep the existing `Authorization` header
- [ ] Add `X-API-Version: 2`
- [ ] Leave the request path unchanged
- [ ] Do not rename request body fields
- [ ] Compare response fields against `https://docs.example.com/api/v2`

**Rollout, in order**

- [ ] Development: add header, compare responses
- [ ] Staging: check error logs
- [ ] Production: apply

**Infrastructure**

- [ ] Proxies do not strip custom headers
- [ ] SDKs do not strip custom headers

**Records**

- [ ] Apply date recorded per service
- [ ] Verification result recorded per service
- [ ] Migration list reviewed before production release
- [ ] v1/v2 order data match confirmed
- [ ] Header forwarding recorded

---

## 10. FAQ

**New credentials?** No. Authentication is unchanged.

**Add `/v2/` to the path?** No. The version is a header.

**What if I forget the header?** The server may fall back to v1. Works until 2026-09-30, then stops.

**Rename request fields while I'm in there?** No. Ship the header first; keep one variable changing at a time.

**Authoritative response shapes?** `https://docs.example.com/api/v2`.

**Broke right after the header change?** Check header forwarding through proxies and SDKs. Do not revert the path.

**Is the migration list required?** Yes — a review item before the production release, with apply date and verification result per service.

---

**Next: add `X-API-Version: 2` to your development request layer and fire one `/orders` call.** Then compare the response against the official examples.
