# API v2 Migration Guide for Partner Developers

This guide covers migrating your integration from **API v1** to **API v2**. The migration is small: authentication and the basic response structure stay the same, and the version is selected by a header rather than by the request path. For most partners, the work amounts to adding one header and verifying that it survives the trip through your proxies and SDKs.

Below: the deadline, the required change, a rollout order, troubleshooting notes, and the record-keeping expected before your production release.

---

## 1. Deadline and Scope

**API v1 stops accepting new requests after 2026-09-30.** Move your integrations to API v2 before that date.

| Item | Detail |
|---|---|
| v1 end of service | After **2026-09-30**, v1 no longer accepts new requests |
| Required action | Move integrations to API v2 before the deadline |
| Authentication | Unchanged |
| Basic response structure | Unchanged |
| Version selection | By **header**, not by the request path |

Because the request path does not change, you should not need to rewrite endpoint URLs or re-architect your client. Plan the work as verification, not a rebuild.

---

## 2. The Required Change

Keep your existing `Authorization` header exactly as it is today, and **add** the version header:

```
X-API-Version: 2
```

> **Important:** Without the header, the server may fall back to v1 behaviour. A request that "still works" after your change is not proof of success; the header may simply never have arrived. Verify the response, not just the status code.

### Example request

```js
fetch("https://api.example.com/orders", {
  headers: {
    Authorization: `Bearer ${token}`,
    "X-API-Version": "2"
  }
})
```

### What not to change

- **Do not rename request body fields.** Field names in your request bodies stay as they are.
- **Do compare response fields** against the official examples published at **https://docs.example.com/api/v2**. That documentation defines a correct v2 response.

---

## 3. Recommended Migration Order

Follow this sequence rather than applying the header everywhere at once. Each stage surfaces a different class of problem.

### Step 1 — Development: add the header and compare responses

Add `X-API-Version: 2` in development first. Compare the responses you receive against the official examples at https://docs.example.com/api/v2, and confirm the response fields line up with the documented v2 shape.

### Step 2 — Staging: check error logs

Promote the change to staging and review your error logs. Staging catches environment-specific issues, particularly anything related to how requests travel through intermediate infrastructure.

### Step 3 — Production: apply the change

Once development comparisons and staging logs are clean, apply the header in production.

```
Development  →  add header, compare responses
     ↓
Staging      →  check error logs
     ↓
Production   →  apply
```

---

## 4. Proxies, SDKs, and Custom Headers

This is the most common source of trouble in a header-based migration.

**Check that proxies and SDKs do not strip custom headers.** Some intermediaries drop headers they don't recognise, so your client sends `X-API-Version: 2`, the server never sees it, and the request falls back to v1 behaviour.

> **If something breaks, check header forwarding before reverting the request path.**

Reverting the request path is the wrong first response, because the path does not select the version. Work through header forwarding first:

- Confirm your HTTP client or SDK attaches the custom header to the outbound request.
- Confirm each proxy in the chain forwards `X-API-Version` rather than stripping it.
- Confirm the header is still present at the last hop before the API.

---

## 5. Migration List and Record-Keeping

Maintain a **migration list** covering your services. For each service, record:

- The **apply date**
- The **verification result**

**This list is a review item before the production release.** Have it complete and current at that point.

A simple format is fine:

| Service | Apply date | Verification result |
|---|---|---|
| *(your service)* | *(date the header was applied)* | *(pass / findings)* |
| … | … | … |

---

## 6. Post-Production Verification

After you go live in production, complete two final checks and record the outcome:

1. **Confirm that v1 and v2 requests return the same order data.** Run the comparison and verify the data matches.
2. **Record that proxies and SDKs forwarded the header.** Capture the confirmation in your records rather than assuming it worked.

### Checklist

- [ ] `Authorization` header kept unchanged
- [ ] `X-API-Version: 2` added
- [ ] Request body field names left unrenamed
- [ ] Response fields compared against https://docs.example.com/api/v2
- [ ] Header added in development; responses compared
- [ ] Error logs checked in staging
- [ ] Applied in production
- [ ] Proxies and SDKs verified not to strip custom headers
- [ ] Migration list complete (apply date + verification result per service) before production release
- [ ] v1 and v2 confirmed to return the same order data
- [ ] Header forwarding by proxies and SDKs recorded

---

## Closing

To summarise: keep your `Authorization` header, add `X-API-Version: 2`, don't rename request body fields, and compare your response fields against the official v2 examples. Roll it out development → staging → production, keep your migration list current for the pre-release review, and finish with a same-data comparison between v1 and v2.

Complete your migration before **2026-09-30**, when v1 stops accepting new requests.
