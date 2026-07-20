# Hybrid Shell and Client Contract

Use this when a Web or custom-rendered client runs inside a native shell, or when multiple UI/runtime processes share one journey. Apply the shared UX contract plus the relevant desktop/mobile, Web, and renderer references.

## Ownership map

Name the owner of every boundary:

- the client owns document rendering and in-client interaction;
- the shell owns native windows/scenes, menus, pickers, permissions, accessibility integration, package lifecycle, and system handoff unless the inspected stack proves otherwise;
- a service or backend owns durable remote results; and
- the bridge owns serialization, authorization, cancellation, ordering, retries, and error translation across processes.

Map client, shell, service, document, and state owners for each journey. A WebView uses an OS/provider engine whose version and capability may vary; a bundled browser such as Chromium has a different update and security boundary. Do not treat them as interchangeable.

## Bridge truth

Specify every IPC or bridge command by semantic input, validation, owner, result, failure, cancellation, lifetime, and observable state. A JavaScript handler, message receipt, spinner, or toast is not proof that the native or durable operation completed. Prevent duplicate submissions and stale replies; preserve enough context to recover after client reload, shell recreation, or service failure.

Keep privileged native operations behind a minimal authorized surface. Validate untrusted client data, avoid exposing raw filesystem or process capability, and prove that navigation or content injection cannot widen the bridge contract.

## Native and client evidence

Client proof cannot substitute for shell proof. Test the in-client journey in its real embedded engine, then independently prove native picker, window, menu, permission, accessibility, package, update, launch, and shutdown behavior owned by the shell. Likewise, a native shell screenshot cannot prove client semantics, focus, text input, localization, or responsive rendering.

Record engine/provider/version, shell/runtime/version, OS/device, package channel, bridge mode, service state, and each artifact's owner. For a public surface deployed separately from the embedded client, evaluate its crawlability and Web evidence as a separate target.
