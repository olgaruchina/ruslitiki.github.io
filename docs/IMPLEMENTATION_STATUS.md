# First release implementation status

8 September 2026. This is the coming-soon release and first local editor prototype, not the full membership website.

## Implemented

- Responsive, static Astro coming-soon page using the supplied wordmark, pale blue, Literata and Golos Text.
- Historical Eugene Onegin garden illustration by Elena Samokish-Sudkovskaya (1908), with source credit, descriptive alternative text and responsive WebP images. The editor can hide it; changing the first book removes this specific artwork. See [artwork provenance](ARTWORK.md).
- Confirmed waitlist link, membership opening 24 September and reading start 1 October, first read *Eugene Onegin*, optional working email and future Patreon states.
- Privacy page, 404, canonical metadata, sitemap, robots, organization data, accessible headings and controls; no public client JavaScript or analytics.
- Private local editing UI: text, dates, links, logo upload/reset and search listing, plus four page compositions, width/spacing/typography controls, custom colours with contrast validation, button shapes and Onegin artwork placement/size.
- Visual editing canvas renders the shared homepage components, with direct text editing, section move handles, drag-to-insert palette, insertion controls and arrow-button alternatives. Section options remain available in the inspector. The local canvas uses isolated per-tab snapshots and is excluded from production output.
- Up to 12 text, FAQ, image-and-text, button and quote blocks, with optional buttons in any block, duplication, visibility, width/alignment/background controls, text columns and image placement/crops. Undo/Redo tracks 40 changes in the current tab and groups inline typing; style reset preserves content and ordering. Unfinished blocks can be saved privately but must be completed or hidden before preparing a public preview.
- Draft save with stale-window conflict detection; exact saved previews; phone/desktop preview sizes; private upload staging; previous-content recovery mechanism.
- Public publishing adapter: validates a reviewed artifact, sends generated output to a dedicated branch, reconciles a pending retry and checks the live release marker. Disabled pending real host connection.
- Editor publishing is the chosen route. Check publishing connection reads account, Pages, canonical domain, mode and environment prerequisites, shows setting links and enables the local adapter when ready. It does not modify GitHub or publish a release. The connection is checked again before publication; retrying the same successful release preserves Restore history.
- GitHub Actions workflow: checks source pushes/pull requests and deploys successful `main` builds after Pages activation. Optional editor mode deploys the exact reviewed `dist/` artifact from `site-live`; its push includes the workflow. Only one mode can publish, preventing stale source from overwriting editor content.
- Earlier Pages CMS field configuration retained as an inactive reference; it does not cover the expanded block/layout model. A Mac application launcher is supplied but has not been exercised yet.

## Checked

- Dependency installation completed; npm reported zero vulnerabilities at installation.
- Twenty-five automated tests passed, including isolated local HTTP/editor integration tests with real Astro preview builds for all four compositions and a check that editor pushes preserve the reviewed artifact while keeping the workflow outside public files.
- Tested: stale draft save, invalid URL/calendar/email inputs, image path restrictions, malformed upload type, rejected foreign origin/Host/token, missing image, artifact modification/symlink, private unselected upload, selected image rendering route, and disabled public publishing.
- Production build and built-page checks passed: confirmed copy/dates, canonical origin, working local references, no editor/private files in output and no public client scripts.
- The local page returned HTTP 200 before its preview was opened.
- Tests also cover old-draft compatibility, exact block ordering, theme validation, strict setting types, image descriptions/dimensions, selected block image staging and readable preset colours. Generated HTML checks confirm that the book-left composition changes reading order along with its visual placement.
- Connection tests cover incomplete settings, unavailable credentials, branch versus tag permissions, approval rules and canonical URL redirects. HTTP tests check that the connection endpoint is protected and preserves the saved draft; recovery tests verify idempotent publication history.
- Canvas tests cover actual HTTP rendering, per-tab isolation, denied snapshot-file access, nonce/Host/Origin checks, stale-update rejection and unchanged saved revisions. Model and message-transport tests cover exact insertion/reordering, text-field allowlists, retained over-limit text, safe buttons, unfinished private drafts and text acknowledgement during inspector locks. Production preview builds after canvas startup remain free of development scripts and canvas controls.
- Source review identified and corrected private upload leakage, lock ownership, preview validation, artifact copying, pending publication retry, dark-theme skip-link contrast, narrow text columns and second-tab build-state recovery.

These are programmatic checks. They are not a completed browser visual/accessibility audit, a successful public release, or owner acceptance.

## Still needed

- Owner switch of the existing GitHub Pages source to GitHub Actions and permission for site-live in the github-pages environment. The repository variable is already set to editor; no main merge is required for this publishing route. Then check the editor connection and test Publish/Restore using Olga's account. The custom domain is already configured. Current GitHub access permits pushing branches but not administering Pages settings.
- Olga's real editing walkthrough, browser/phone/keyboard/zoom checks and native Mac launcher verification.
- An operational public email before showing Contact Olga; approved membership terms and Patreon destination before opening membership.
- Full homepage/reading-guide content and member-offer sections in the later planned release.
- A synchronization model if editing from multiple laptops or enabling hosted Pages CMS. The local prototype does not auto-commit private drafts or sync them through GitHub.

The private Sites deployment is a review copy. The existing public GitHub Pages branch and DNS remain unchanged. No participant responses or private planning documents are included in this source repository or build.
