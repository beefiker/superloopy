# Mobile and Tablet Application Contract

Use this after the shared UX contract for native or cross-platform phone and tablet UI. Resolve platform and API/OS version, form factors, current window size, orientation and posture, renderer/provider, package and update channel, supported inputs, permissions, restoration model, and validation devices.

## Navigation, windows, and input

Respect platform navigation and back behavior, system bars, insets and safe areas, edge-to-edge content, keyboard avoidance, multitasking, resizing, rotation, and foldable posture where supported. Do not infer layout from a device model or orientation alone; respond to the current window and content constraints.

Support touch, pointer, hardware keyboard, and stylus where applicable to the target and product. Preserve semantic outcomes across supported inputs without requiring identical gestures. Provide alternatives for drag, multi-touch, hover-only disclosure, and precision actions.

Use platform or provider permission and picker contracts for photos, files, cameras, location, accounts, and other protected resources. Explain denial, limited access, cancellation, and recovery. A simulated picker or granted emulator permission does not prove physical-device integration.

## State, locale, and accessibility

Define process and scene restoration, background/foreground transitions, low-memory or process death behavior, migration, backup eligibility, and sensitive-value ownership. Name the durability boundary rather than promising that preferences survive every update, reinstall, transfer, or account change.

Use platform locale, per-app language, RTL, formatting, pluralization, dynamic type or text scaling, and accessibility semantics. Test long and bidirectional content, larger text, focus/traversal order, labels/roles/states/actions, announcements, contrast, target size, and alternatives to gesture-only operations.

## Mobile evidence

Build a device and API matrix from integration risk, not market-share theater. Emulator or simulator evidence and physical-device evidence are complementary: use automation for deterministic state and broad API coverage, then physical devices for sensors, permissions, performance, input, accessibility services, rendering, and lifecycle risks that simulation cannot prove.

Exercise install/first-run, navigation/back, interruption, permission denial/recovery, rotation/resizing, process recreation, locale/RTL, text scaling, accessibility, offline or degraded service behavior, restart, and supported upgrade as applicable. Record which device, OS/API, build, account/state, and service conditions produced each artifact.
