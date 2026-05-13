## Learned User Preferences

- User wants strict no-guess behavior; unknown details must be marked as not verified.
- User prefers the smallest viable code change over broad refactors.
- User prefers concise communication.
- User sometimes asks to save durable patterns or preferences into Brain via `user-brain`.

## Learned Workspace Facts

- Primary workspace is `farmaplus` at `/Users/Shared/Code/farmaplus`.
- `farmaplus` uses a monorepo layout with `apps/web` as a Next.js app.
- `farmaplus` structure was aligned to the `sicop-health` project layout.
- A design reference document exists at `docs/design-reference-trumprx.md` and is based on the TrumpRx source plus provided screenshots.
- Brain MCP is configured and reachable in this workspace context via `user-brain`.
- Local reference repos for UI work include `/Users/Shared/Code/ocreamerstudio` (GSAP/ScrollTrigger and section composition) and `/Users/Shared/Code/lechandelier-restaurant` (e.g. home contact grid layout).
- Brand messaging for site copy is documented in `docs/farmaplus-brand-message-final.md`.
- Primary Git remote is `https://github.com/ocreamer888/farmaplus.git` (`origin`).
- Headless Shopify / ecommerce work is kept on branch `feature/shopify-ecommerce`; `main` is the marketing site without Shopify until legal clearance.
- Next.js serves static URLs from `apps/web/public` only; paths must not assume files at the monorepo root are web-accessible.
