# Ruslitiki

The first release is a static coming-soon page, with the supplied wordmark, confirmed dates, waitlist, first book and privacy information. A private local editor provides the first working editing prototype. The full membership site remains a later release.

## Run locally

Use Node.js 22.12+ (Node 25.4 was used here), then `npm install` once. `npm run dev` opens the Astro development service; `npm run build` generates `dist/`. `npm run test` and `npm run check:site` verify content rules and the built output.

For ordinary editing on this Mac, double-click **Ruslitiki Editor.app** after the one-time installation. It starts the editor in the background and opens `http://127.0.0.1:4310`; no terminal commands are needed. The command-file launcher and `npm run studio` remain maintainer alternatives. The editor is bound to this laptop and is not included in the public build. See [the editing guide](docs/EDITING.md).

## Content and design

`content/site.json` holds shared public copy, links, dates, the first book and optional text/FAQ blocks. The site validates it before building. The frontend renders plain text, never editor-supplied HTML or executable Markdown. The existing source banner is retained without modifying the original image; CSS fits its wordmark region. Literata and Golos Text are self-hosted through pinned OFL packages.

Native Pages CMS field configuration is supplied in `.pages.yml` as an optional hosted route. No hosted CMS account, collaborator invitation or remote draft/publish workflow is activated. Its standard actions did not provide the integrated preview/status experience required here, so this first prototype uses a local editor.

## Publishing status

The original GitHub Pages configuration serves `main` from the repository root. Development remains on a separate branch. Nothing should be merged to `main` solely to publish this Astro source: the old Pages setup would not build it correctly.

GitHub Actions is configured to test and build code pushes and automatically publish successful `main` builds once the owner changes the Pages source to GitHub Actions and this branch is merged. Development branches and pull requests only run checks. No additional hosting service or deployment secret is needed.

The local editor can use the same workflow in a separate editor publishing mode: it pushes the reviewed static files under `dist/` plus the workflow to `site-live`, then waits for `https://www.ruslitiki.com/release.json` to confirm that exact release. A repository variable selects either automatic `main` publishing or editor publishing, preventing stale source from overwriting the owner's live edits. The editor remains disabled until configured, and live deployment has not been exercised. Follow [hosting setup](docs/HOSTING_SETUP.md).

`.openai/hosting.json` identifies the separate owner-private Sites review deployment. That deployment is for reviewing the public page, not Olga's permanent editing service. Never put private research or the response CSV in this repository or its published output.

## Validation

Automated checks cover safe links and dates, draft conflict detection, private image staging, preview integrity, missing assets, publishing prerequisites, local HTTP protections and built-page metadata. See [implementation status](docs/IMPLEMENTATION_STATUS.md) for exact completed checks and remaining setup. Browser visual and interactive acceptance with Olga remains to be done.
