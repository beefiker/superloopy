# Migrating to API v2

**Deadline:** 2026-09-30. After that, v1 returns 410 and is not retried.

**Scope:** paths and field names are unchanged. Only version selection and error shape differ.

## Selecting the version

v1 read the version from the URL prefix. v2 reads the `X-API-Version` header, so the path carries no version.

```js
const response = await fetch("https://api.example.com/orders", {
  headers: { "X-API-Version": "2", Authorization: `Bearer ${token}` }
});
```

Confirm which version answered:

```sh
curl -sI https://api.example.com/orders -H "X-API-Version: 2" | grep -i x-api-version
```

> If the header is missing the request will be served by v1 until 2026-09-30 and will fail after that. Proxies that strip headers they do not recognise are the most common reason for a header going missing.

## Errors

v2 returns one error object with `code` and `message`. v1 returned an array. Field-by-field notes: https://docs.example.com/api/v2 — and the migration list is a review item before production release.
