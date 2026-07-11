# Official Design-System Map

The brand teardowns in `references/design/` answer "what should this *look* like." This file answers the prior question: **does an official component package already own this look?** When a brief reads as one of the platforms below, hand-rolling its visual language is its own slop tell — the honest move is to install the official package and let it carry components, tokens, and accessibility, while DESIGN.md records what was adopted.

## Routing table (brief → official package)

| Brief reads as… | Reach for | Why |
| --- | --- | --- |
| Microsoft-style / enterprise SaaS product UI | `@fluentui/react-components` (or `@fluentui/web-components`) | Official Fluent, Microsoft tokens, accessibility solved upstream |
| Google-ish / Material-flavored product | `@material/web` + Material 3 tokens | Official, theme-able via Material Theming |
| IBM-style B2B / enterprise analytics | `@carbon/react` + `@carbon/styles` | Official Carbon, mature data-density patterns |
| Shopify admin surface | Polaris (`polaris.js` web components / Polaris React) | Required for Shopify app UI |
| Atlassian / Jira-style product | `@atlaskit/*` + `@atlaskit/tokens` | Official Atlassian design system |
| GitHub-style devtool or community page | `@primer/css`; `@primer/react-brand` for marketing | Official Primer; Brand variant covers marketing surfaces |
| UK public-sector service | `govuk-frontend` | Regulatorily expected |
| US public-sector / trust-first | `uswds` | Same |
| Fast local-business / agency MVP | Bootstrap 5.3 | Boring, fast, works |
| Accessible React foundation you theme yourself | `@radix-ui/themes` | Primitives plus a polished theme layer |
| Modern SaaS where you own the components | shadcn/ui (`npx shadcn@latest add …`) | You own the code — but never ship its default state |
| Indie / small-team modern SaaS or marketing | Tailwind v4 utilities | The default when no platform above applies |

## Honesty rules

- **Official system exists → install the official package.** Do not recreate its CSS by hand; a hand-rolled Fluent lookalike is a simplified lookalike, exactly what zoro's drift review flags.
- **Do not import a system's tokens and then override most of them.** If the brief demands that much deviation, the brief was not that system — pick the honest foundation instead.
- **One system per project.** Never mix Fluent with Carbon, or shadcn/ui components inside a Material tree. This is the component-library instance of the anti-slop one-system lock.
- **DESIGN.md still gates.** Record the adopted system and its theme values as the token source in DESIGN.md; custom-authored layers on top remain subject to the ds-compliance script and the anti-slop pre-flight.

## When the brief is an aesthetic, not a system

Glassmorphism, bento grids, brutalism, editorial/magazine, dark-tech terminal, aurora/mesh gradients, and kinetic typography have **no official package**. Build them with native CSS (plus the project's existing utility layer) and label the implementation honestly — borrowed inspiration is fine, pretending a trend is an official system is not.

- **Apple Liquid Glass is Apple-platform material.** There is no official `liquid-glass.css` for the web; a `backdrop-filter` + layered-border build is a *labeled approximation*, and it must ship a solid-fill fallback under `prefers-reduced-transparency`.

## Install commands (reality anchors)

```bash
npm install @fluentui/react-components        # Fluent UI React (v9)
npm install @material/web                     # Material Web (Material 3)
npm install @carbon/react @carbon/styles      # IBM Carbon
npm install @atlaskit/tokens                  # Atlassian (plus per-component packages)
npm install @primer/css                       # GitHub Primer (product)
npm install @primer/react-brand               # GitHub Primer (marketing)
npm install govuk-frontend                    # GOV.UK Frontend
npm install uswds                             # US Web Design System
npm install bootstrap                         # Bootstrap 5.3
npm install @radix-ui/themes                  # Radix Themes
npx shadcn@latest init                        # shadcn/ui (then `add button card …`)
```

Before importing any of these, check `package.json` first and output the install command when the package is missing — never assume a dependency exists. (These are project dependencies for the *user's* build; nothing here is ever added to Superloopy's own dependency-free `package.json`.)

## Canonical documentation (consult before reinventing)

- Fluent: https://fluent2.microsoft.design/ · Material: https://m3.material.io/develop/web
- Carbon: https://carbondesignsystem.com/ · Polaris: https://polaris-react.shopify.com/
- Atlassian: https://atlassian.design/ · Primer: https://primer.style/
- GOV.UK: https://design-system.service.gov.uk/ · USWDS: https://designsystem.digital.gov/
- Radix Themes: https://www.radix-ui.com/themes/docs · shadcn/ui: https://ui.shadcn.com/docs
- Apple materials (for the approximation caveat): https://developer.apple.com/design/human-interface-guidelines/materials
