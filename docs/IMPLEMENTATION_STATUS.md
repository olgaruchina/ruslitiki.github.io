# First release implementation status

8 September 2026. This is the coming-soon release and first local editor prototype, not the full membership website.

## Implemented

- Responsive, static Astro coming-soon page using the supplied wordmark, pale blue, Literata and Golos Text.
- Confirmed waitlist link, membership opening 24 September and reading start 1 October, first read *Eugene Onegin*, optional working email and future Patreon states.
- Privacy page, 404, canonical metadata, sitemap, robots, organization data, accessible headings and controls; no public client JavaScript or analytics.
- Private local editing UI: text, dates, links, logo upload/reset, optional note/FAQ blocks, ordering and visibility, search listing.
- Draft save with stale-window conflict detection; exact saved previews; phone/desktop preview sizes; private upload staging; previous-content recovery mechanism.
- Public publishing adapter: validates a reviewed artifact, sends generated output to a dedicated branch, reconciles a pending retry and checks the live release marker. Disabled pending real host connection.
- Optional Pages CMS field configuration and a Mac application launcher; neither hosted authentication nor the native launcher has been exercised yet.

## Checked

- Dependency installation completed; npm reported zero vulnerabilities at installation.
- Ten automated tests passed, including an isolated local HTTP/editor integration test with real Astro preview builds.
- Tested: stale draft save, invalid URL/calendar/email inputs, image path restrictions, malformed upload type, rejected foreign origin/Host/token, missing image, artifact modification/symlink, private unselected upload, selected image rendering route, and disabled public publishing.
- Production build and built-page checks passed: confirmed copy/dates, canonical origin, working local references, no editor/private files in output and no public client scripts.
- The local page returned HTTP 200 before its preview was opened.
- Source review identified and corrected private upload leakage, lock ownership, preview validation, artifact copying and pending publication retry issues.

These are programmatic checks. They are not a completed browser visual/accessibility audit, a successful public release, or owner acceptance.

## Still needed

- Owner connection of the free host and custom domain, then activation and end-to-end testing of Publish/Restore using Olga's account. Current GitHub access permits pushing branches but not administering Pages settings.
- Olga's real editing walkthrough, browser/phone/keyboard/zoom checks and native Mac launcher verification.
- An operational public email before showing Contact Olga; approved membership terms and Patreon destination before opening membership.
- Full homepage/reading-guide content and member-offer sections in the later planned release.
- A synchronization model if editing from multiple laptops or enabling hosted Pages CMS. The local prototype does not auto-commit private drafts or sync them through GitHub.

The private Sites deployment is a review copy. The existing public GitHub Pages branch and DNS remain unchanged. No participant responses or private planning documents are included in this source repository or build.
