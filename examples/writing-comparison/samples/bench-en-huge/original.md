Hello! 👋

Below is a complete migration guide for partner developers moving from **API v1** to **API v2**. It is written to be read end-to-end once, and then used as a checklist during the actual rollout. Everything here is based on the confirmed migration facts — where the guide describes process rather than API behaviour, it is intended as a practical way to organize the work, not as a new technical requirement.

---

# API v2 Migration Guide

## 1. Overview

API v1 **stops accepting new requests after 2026-09-30**. Any partner integration that still calls v1 after that date will no longer be served, so all integrations must be moved to API v2 before the cutoff.

The good news is that this is a deliberately small migration. The two things partners usually worry about most — authentication and the overall shape of responses — **do not change**:

- **Authentication stays the same.** Your existing credentials and the existing `Authorization` header continue to work exactly as they do today.
- **The basic response structure stays the same.** You are not re-architecting your client around a new envelope or a new transport.
- **The version is selected by a header, not by the request path.** There is no `/v2/` path segment to add and no new base URL to configure.

In other words, the migration is primarily about **adding one header, verifying responses, and proving that the header actually survives the trip** through your proxies and SDKs.

### 1.1 The one-line summary

Keep your existing `Authorization` header, and add:

```
X-API-Version: 2
```

That's the migration. The rest of this document is about doing it safely and being able to demonstrate that you did.

---

## 2. What changes and what does not

| Area | v1 | v2 | Action required |
|---|---|---|---|
| Authentication | `Authorization` header | Unchanged | None — keep it as-is |
| Version selection | Implicit (default) | `X-API-Version: 2` header | **Add the header** |
| Request path / base URL | e.g. `https://api.example.com/orders` | Same | None — do **not** change the path |
| Basic response structure | Existing structure | Same basic structure | None structurally |
| Request body field names | Existing names | Same names | **Do not rename fields** |
| Response fields | Existing fields | Compare against official examples | **Verify field-by-field** |

### 2.1 Version selection is header-based

This is the single most important conceptual point: **the version lives in a header, not in the URL**. Teams that are used to path-based versioning often reach instinctively for `/v2/...` when something goes wrong. In this migration, that instinct is the wrong one — see [Section 6](#6-troubleshooting).

### 2.2 The default-fallback behaviour

If the `X-API-Version` header is **not** present, the server **may fall back to v1 behaviour**.

This has two practical consequences:

1. **Silent non-migration is possible.** A request that loses the header along the way does not necessarily fail loudly. It may simply be served as v1 — which works fine today, and stops working after 2026-09-30. This is exactly the failure mode that bites partners at the deadline.
2. **"It still works" is not proof of migration.** Because the fallback exists, a green integration test does not by itself confirm that you are on v2. You need to verify the header is actually arriving, not just that the call succeeded.

> ⚠️ **Treat a missing header as a migration defect, not a cosmetic issue.** The fallback makes the problem invisible until the cutoff date.

---

## 3. Code changes

### 3.1 The canonical example

```js
fetch("https://api.example.com/orders", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-API-Version": "2"
  }
})
```

Note what is present and what is absent:

- ✅ The existing `Authorization` header is **kept**.
- ✅ `X-API-Version: "2"` is **added**.
- ✅ The path is **unchanged** — `https://api.example.com/orders`, with no version segment.

### 3.2 Apply the header centrally, not per call site

Adding the header at every individual call site is the most common source of partial migrations: one forgotten module keeps quietly running on v1 until the cutoff. Wherever your stack allows it, set the header once in the layer that builds requests.

```js
// Centralised client — every request inherits both headers.
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

// Usage stays exactly as before — the path does not change.
apiRequest("/orders");
```

If your client library uses interceptors, default headers, or a base-configuration object, use that mechanism. The goal is that **no call path can reach the API without the header**.

### 3.3 Request bodies: do not rename fields

**Do not rename request body fields.** Your outbound payloads should be byte-for-byte the same as they are today. A migration is a much easier thing to debug when only one variable has changed, and here that variable is the header.

If you are tempted to "clean up" field names at the same time as the migration, resist it. Separate the two changes, ship the header first, and verify. Anything else makes it far harder to tell whether a difference in behaviour came from the version switch or from your own edit.

### 3.4 Response fields: compare against the official examples

For responses, the basic structure stays the same, but you should not assume field-level identity. **Compare response fields against the official examples** at:

```
https://docs.example.com/api/v2
```

Use the documented examples as the reference for what a correct v2 response looks like, and diff your actual responses against them. This is the authoritative source for the comparison — not your memory of v1, and not a colleague's screenshot.

A practical approach:

1. Capture a real v2 response from your development environment.
2. Open the corresponding example at `https://docs.example.com/api/v2`.
3. Walk the fields and confirm your parsing code handles what is actually there.
4. Note any field your code depends on that you cannot confirm against the examples, and resolve it before moving on.

---

## 4. Recommended migration order

The migration is intended to move through three stages, in this order. Do not skip ahead; each stage exists to catch a different class of problem.

| Stage | Environment | Primary activity | What you are looking for |
|---|---|---|---|
| 1 | Development | Add the header and compare responses | Field-level differences vs. the official examples |
| 2 | Staging | Check error logs | Failures that only appear under realistic traffic and routing |
| 3 | Production | Apply the change | Real-world confirmation and header forwarding |

### Stage 1 — Development: add the header and compare responses

Add `X-API-Version: 2` in your development environment first, then **compare responses**. This is where the field-by-field comparison against `https://docs.example.com/api/v2` belongs. Development is cheap to break and easy to iterate in, so do the detailed reading here.

Checklist:

- [ ] Header added in the central request layer
- [ ] `Authorization` header still present and unchanged
- [ ] Request path unchanged
- [ ] Request body field names unchanged
- [ ] Responses compared against the official v2 examples

### Stage 2 — Staging: check error logs

Once development looks clean, move to staging and **check your error logs**. Staging typically runs closer to production routing and configuration than development does, so this is where header-stripping and misconfigured intermediaries tend to first become visible.

Read the logs deliberately rather than only watching for red builds. Because of the v1 fallback described in [Section 2.2](#22-the-default-fallback-behaviour), some problems will not present as errors at all — so pair log review with an explicit check that the header is arriving.

Checklist:

- [ ] Error logs reviewed after the header change, not just before
- [ ] No new error patterns attributable to the version switch
- [ ] Header confirmed present on outbound requests through the staging path

### Stage 3 — Production: apply the change

Only after development comparison and staging log review should you apply the header in production. At this point the change itself should be uneventful; the value of the first two stages is precisely that production becomes boring.

---

## 5. Proxies and SDKs: the most common failure point

**Check that proxies and SDKs do not strip custom headers.**

`X-API-Version` is a custom header, and custom headers are exactly the kind of thing that intermediaries drop, filter, or fail to forward. Anything between your application code and the API is a candidate:

- Forward and reverse proxies
- API gateways
- Load balancers
- CDN or edge layers
- HTTP client SDKs and wrappers that manage their own header allow-lists

Because a stripped header causes a **fall back to v1 behaviour** rather than a loud failure, this problem is easy to miss and expensive to miss. Verify forwarding explicitly at each hop you control.

### 5.1 Verification approach

The essential question is not "did the request succeed?" but "**did the header arrive?**" Build your verification around the second question. Confirm at the boundary closest to the API that `X-API-Version: 2` is still attached, and record that confirmation — it is part of the post-production evidence described in [Section 7](#7-after-production-confirmation).

---

## 6. Troubleshooting

### 6.1 If something breaks, check header forwarding *before* reverting the request path

This deserves its own heading because it is the single most likely wrong turn in this migration.

> **If something breaks, check header forwarding before reverting the request path.**

The version is selected by a header, not the path. So when a call misbehaves after the change, the path is almost never the thing to touch. Changing it introduces a second variable and obscures the real cause — which is, far more often, a proxy or SDK that did not forward the custom header.

**Correct first move:** confirm whether `X-API-Version: 2` actually reached the API.

**Incorrect first move:** editing the URL.

### 6.2 Triage order

1. Is the `X-API-Version: 2` header present on the request as your application emits it?
2. Is it still present after each proxy, gateway, or SDK layer in the path?
3. Is the `Authorization` header still present and unchanged?
4. Are the request body field names unchanged from v1?
5. Do the response fields match the official examples at `https://docs.example.com/api/v2`?
6. What do the error logs show?

Only once all six have been answered should you consider changes beyond header configuration — and even then, the request path is not the version selector and should not be treated as one.

### 6.3 Quick symptom table

| Symptom | Most likely cause | First action |
|---|---|---|
| Everything works, but you cannot confirm v2 | Header stripped → v1 fallback | Verify header forwarding at each hop |
| Works in development, not in staging | Proxy/gateway in the staging path | Check header forwarding, not the path |
| Response field missing or unexpected | Field-level difference | Compare against the official v2 examples |
| Auth failure | Unrelated to versioning | Confirm `Authorization` header unchanged |
| Request rejected after "cleanup" | Renamed body fields | Restore original request body field names |

---

## 7. The migration list (required review item)

For each service you migrate, **record the apply date and the verification result** in a migration list. This list is **a review item before the production release** — it is not optional bookkeeping, and it is expected to be looked at as part of the release review.

### 7.1 Suggested format

| Service | Apply date | Verification result | Notes |
|---|---|---|---|
| orders-api-client | 2026-09-__ | Pass / Fail | Responses compared vs. official examples |
| billing-sync | 2026-09-__ | Pass / Fail | Staging error logs reviewed |
| reporting-batch | 2026-09-__ | Pass / Fail | Header forwarding confirmed through gateway |

Two columns are mandatory in substance: **the apply date** and **the verification result**, per service. Anything else you add is for your own convenience.

### 7.2 Why per-service

Partial migrations are the realistic failure mode. A single organisation-level "we migrated" entry hides the one background job or legacy service that never got the header and will simply stop working after 2026-09-30. Tracking per service makes the gap visible while there is still time to close it.

---

## 8. After production: confirmation

Once the change is live in production, two confirmations close out the migration:

1. **Confirm that v1 and v2 requests return the same order data.** Run the comparison against real production behaviour, not just development fixtures. Matching order data is the practical proof that the switch did not change what your integration sees.
2. **Record that proxies and SDKs forwarded the header.** This is the counterpart to the concern raised in [Section 5](#5-proxies-and-sdks-the-most-common-failure-point). Because a stripped header degrades silently to v1, an explicit recorded confirmation that the header was forwarded is what distinguishes "we are on v2" from "we appear to be fine."

### 8.1 Post-production checklist

- [ ] v1 and v2 requests confirmed to return the same order data
- [ ] Proxy header forwarding confirmed and **recorded**
- [ ] SDK header forwarding confirmed and **recorded**
- [ ] Migration list updated with apply date and verification result
- [ ] Migration list reviewed as part of the production release review

---

## 9. Consolidated checklist

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
- [ ] Post-production: v1/v2 order data match confirmed
- [ ] Post-production: header forwarding recorded

**Deadline**

- [ ] Completed before **2026-09-30**, after which v1 stops accepting new requests

---

## 10. Frequently asked questions

**Do I need new credentials?**
No. Authentication stays the same — keep your existing `Authorization` header.

**Do I need to change the base URL or add `/v2/` to the path?**
No. The version is selected by a header, not the request path.

**What happens if I forget the header?**
The server may fall back to v1 behaviour. That will keep working until 2026-09-30 and then stop — which is why explicit verification matters.

**Should I rename my request fields to match a new convention?**
No. Do not rename request body fields.

**Where is the authoritative reference for response shapes?**
The official examples at `https://docs.example.com/api/v2`.

**Something broke right after I added the header. What first?**
Check header forwarding through your proxies and SDKs. Do not revert the request path — the path is not the version selector.

**Is the migration list really required?**
Yes — it is a review item before the production release, and it should carry the apply date and verification result for each service.

---

## 11. Closing

To summarise: keep your `Authorization` header, add `X-API-Version: 2`, leave the path and your request body field names alone, and check your response fields against the official examples at `https://docs.example.com/api/v2`. Roll it out through development, then staging, then production. Make sure your proxies and SDKs actually forward the header — and if anything breaks, look there before you look at the URL. Record the apply date and verification result per service, review that list before the production release, and once you are live, confirm that v1 and v2 return the same order data and that the header was forwarded.

The hard deadline is **2026-09-30**, after which API v1 stops accepting new requests. The change itself is small, but the silent v1 fallback means it rewards being methodical — so please start early enough that the staging stage has room to surface anything unexpected.

I hope this guide makes the migration straightforward. If you'd like, I can also turn the checklists into a ready-to-fill migration list template, or adapt the code example to a different HTTP client or language. Best of luck with the rollout! 🚀
