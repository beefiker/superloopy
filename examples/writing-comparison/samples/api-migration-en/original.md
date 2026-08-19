# Migrating to API v2

The v1 endpoints will stop accepting traffic on 2026-09-30. After that date any request sent to v1 comes back as 410 and is not retried. For most callers the change that needs to be made is a small one, because v2 keeps the same paths and the same field names and only differs in how the version gets selected and how errors are shaped.

## Selecting the version

Where v1 took the version from a prefix in the URL, v2 reads the `X-API-Version` header instead, so the path itself no longer carries a version at all.

```js
const response = await fetch("https://api.example.com/orders", {
  headers: { "X-API-Version": "2", Authorization: `Bearer ${token}` }
});
```

You are able to confirm which version actually handled a request by looking at the response:

```sh
curl -sI https://api.example.com/orders -H "X-API-Version: 2" | grep -i x-api-version
```

> If the header is missing the request will be served by v1 until 2026-09-30 and will fail after that. Proxies that strip headers they do not recognise are the most common reason for a header going missing.

## Errors

v2 returns a single error object carrying `code` and `message`, rather than the array that v1 used to return. The full field-by-field notes live at https://docs.example.com/api/v2, and the migration list is a review item before production release.
