# Ruslitiki

The first release is a static coming-soon page, with the supplied wordmark, confirmed dates, waitlist, first book and privacy information. A private local editor provides the first working editing prototype. The full membership site remains a later release.

## Run locally

Use Node.js 22.12+ (Node 25.4 was used here), then `npm install` once. `npm run dev` opens the Astro development service; `npm run build` generates `dist/`. `npm run test` and `npm run check:site` verify content rules and the built output.

For ordinary editing on this Mac, double-click **Ruslitiki Editor.app** after the one-time installation. It starts the editor in the background and opens `http://127.0.0.1:4310`; no terminal commands are needed. The command-file launcher and `npm run studio` remain maintainer alternatives. The editor is bound to this laptop and is not included in the public build. See [the editing guide](docs/EDITING.md).

## Content and design

`content/site.json` holds shared public copy, links, dates, the first book, optional text/FAQ/image/video/button/quote blocks and layout/style settings. The local visual editor renders the actual homepage: click text to type, drag sections, insert blocks from a palette, and add buttons. Section controls support reordering, duplication, visibility, layouts, typography and colours, with undo. Private drafts may contain unfinished blocks; validation requires completed visible content, safe image paths and readable colour contrast before previewing or publishing. Older content receives default design settings without rewriting its saved revision. The frontend renders plain text, never editor-supplied HTML or executable Markdown. The existing source banner is retained without modifying the original image; CSS fits its wordmark region. Literata and Golos Text are self-hosted through pinned OFL packages.

The editing canvas uses a separate loopback-only Astro service with isolated per-tab snapshots. It shares homepage components with production; its controls and unsaved snapshots never enter the public build. **Saved preview** remains an immutable reviewed artifact, separate from the changing editing canvas.

The waitlist page includes seven expandable FAQs. A hidden YouTube introduction block is ready for the owner’s video link; it can be enabled in the editor when available. Video embeds use privacy-enhanced mode, load lazily and do not autoplay.

The local editor is the supported workflow and has no recurring editor subscription. The earlier `.pages.yml` configuration is retained as an inactive reference; it does not cover the expanded layout/block schema. Do not activate it without reconciling those fields and deciding how remote drafts and publishing would work.

## Publishing status

The original GitHub Pages configuration serves `main` from the repository root. Development remains on a separate branch. Nothing should be merged to `main` solely to publish this Astro source: the old Pages setup would not build it correctly.

The chosen publishing route is the local editor's **Publish website** button. GitHub Actions tests/builds source pushes and publishes the reviewed public files sent by the editor. No additional hosting service or deployment secret is needed.

The editor pushes the reviewed static files under `dist/` plus the workflow to `site-live`, then waits for `https://www.ruslitiki.com/release.json` to confirm that exact release. The repository variable is set to editor mode, preventing stale main source from overwriting the owner's live edits. **Check publishing connection** shows the remaining owner settings and enables the local connection when ready. A main merge is unnecessary for this route. Live publication remains disabled until Pages uses Actions and the environment permits site-live; it has not yet been exercised. Follow [hosting setup](docs/HOSTING_SETUP.md).

`.openai/hosting.json` identifies the separate owner-private Sites review deployment. That deployment is for reviewing the public page, not Olga's permanent editing service. Never put private research or the response CSV in this repository or its published output.

## Validation

Automated checks cover safe links and dates, draft conflict detection, private image staging, preview integrity, missing assets, publishing prerequisites, local HTTP protections and built-page metadata. See [implementation status](docs/IMPLEMENTATION_STATUS.md) for exact completed checks and remaining setup. Browser visual and interactive acceptance with Olga remains to be done.
