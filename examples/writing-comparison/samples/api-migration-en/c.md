# Migrating to API v2

The v1 endpoints stop accepting traffic on 2026-09-30. After that date requests to v1 return 410 and are not retried. The change is small for most callers: v2 keeps the same paths and field names, and differs only in how the version is selected and how errors are shaped.

## Selecting the version

v1 took the version from a URL prefix. v2 reads the `X-API-Version` header instead, so the path no longer carries a version.

```js
const response = await fetch("https://api.example.com/orders", {
  headers: { "X-API-Version": "2", Authorization: `Bearer ${token}` }
});
```

Confirm which version handled a request from the response:

```sh
curl -sI https://api.example.com/orders -H "X-API-Version: 2" | grep -i x-api-version
```

> If the header is missing the request will be served by v1 until 2026-09-30 and will fail after that. Proxies that strip headers they do not recognise are the most common reason for a header going missing.

## Errors

v2 returns a single error object with `code` and `message` rather than the v1 array. Full field-by-field notes are at https://docs.example.com/api/v2, and the migration list is a review item before production release.
