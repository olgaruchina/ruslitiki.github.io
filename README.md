# Ruslitiki

The website introduces the club, its first book, membership offering and waitlist. A private local visual editor manages its content and layout. The public page is statically generated with a small script for mobile navigation and FAQ motion; editing tools remain private. The full membership service remains a later release.

## Run locally

Use Node.js 22.12+ (Node 25.4 was used here), then `npm install` once. `npm run dev` opens the Astro development service; `npm run build` generates `dist/`. `npm run test` and `npm run check:site` verify content rules and the built output.

For ordinary editing on this Mac, double-click **Ruslitiki Editor.app** after the one-time installation. It starts the editor in the background and opens `http://127.0.0.1:4310`; no terminal commands are needed. The command-file launcher and `npm run studio` remain maintainer alternatives. The editor is bound to this laptop and is not included in the public build. See [the editing guide](docs/EDITING.md).

## Content and design

`content/site.json` holds public copy, links, dates, the first book, text/FAQ/image/video/button/quote blocks, editable labels and layout settings. The visual editor renders the actual homepage: click text to type, drag sections, insert blocks and add buttons. A floating toolbar applies bold and italic; paragraph fields also support bulleted and numbered lists. Headings and short labels retain inline formatting. Editing a plain inspector field replaces that field's formatting. Formatting uses a validated structured map; arbitrary HTML and executable Markdown are not accepted.

**Labels & menu** covers the first-book label, date labels, signup buttons, Home/first-book menu links, footer words and illustration captions/credit. Other section menu labels remain in **Page blocks**. Clicking a displayed date opens its calendar field in **Dates & links**. The tagline is centered below the wordmark. Section controls support reordering, duplication, visibility, layouts, typography and colours, with undo. Older drafts receive display defaults without mutating saved content. Validation checks completed content, safe image paths and readable contrast before previewing or publishing. Literata and Golos Text are self-hosted through pinned OFL packages; the supplied wordmark is preserved.

The editing canvas uses a separate loopback-only Astro service with isolated per-tab snapshots. It shares homepage components with production; its controls and unsaved snapshots never enter the public build. **Saved preview** remains an immutable reviewed artifact, separate from the changing editing canvas.

The waitlist page explains weekly reading materials, the monthly guided discussion and the advance calendar. It lists standard membership at $15 USD/month and early-bird membership at $9.99 USD/month. Seven expandable FAQs share one top separator and open/close with a gentle 260ms slide and fade. Reduced-motion preferences retain immediate toggling; FAQ answers stay open for editing. Olga's YouTube introduction is enabled between the opening and the written club explanation. Video embeds use privacy-enhanced mode, load lazily and do not autoplay.

The desktop menu follows the visible block order. Below 900px a Menu button opens a drawer from the right. In **Edit page**, clicking menu words edits them and an adjacent arrow jumps to their destination; **Saved preview** links navigate normally. How it works starts at the adjacent introduction video unless the owner separates those blocks or gives the video its own menu label. The small public interaction script controls the drawer and FAQ motion; it does not expose editor controls or private drafts.

The local editor is the supported workflow and has no recurring editor subscription. The earlier `.pages.yml` configuration is retained as an inactive reference; it does not cover the expanded layout/block schema. Do not activate it without reconciling those fields and deciding how remote drafts and publishing would work.

`/llms.txt` provides an AI-readable overview of the club, dates, first book, visible sections and active join/contact links. It is generated from the same content snapshot as the HTML, including editor-prepared releases, so it needs no separate maintenance. Hidden blocks and inactive join links are excluded. Pages advertise it with a `describedby` link; the existing sitemap and robots rules remain in place. The [llms.txt proposal](https://llmstxt.org/) complements conventional search metadata and is not a ranking guarantee.

## Publishing status

The initial source pull request has been merged into `main`, and `site-live` contains reviewed publication commits. Subsequent source changes use review branches. Source commits and the owner’s published content are separate.

The chosen publishing route is the local editor's **Publish website** button. GitHub Actions tests/builds source pushes and publishes the reviewed public files sent by the editor. No additional hosting service or deployment secret is needed.

The editor pushes the reviewed static files under `dist/` plus the workflow to `site-live`, then waits for `https://www.ruslitiki.com/release.json` to confirm that exact release. The repository variable is set to editor mode, preventing stale main source from overwriting the owner's live edits. **Check publishing connection** shows the remaining owner settings and enables the local connection when ready. A main merge is unnecessary for this route. This local editor currently reports publishing as disconnected. Check its connection before publishing from this laptop; the check verifies Pages, the environment and the selected account. Follow [hosting setup](docs/HOSTING_SETUP.md).

`.openai/hosting.json` identifies the separate owner-private Sites review deployment. That deployment is for reviewing the public page, not Olga's permanent editing service. Never put private research or the response CSV in this repository or its published output.

## Validation

Automated checks cover safe links and dates, draft conflict detection, private image staging, preview integrity, missing assets, publishing prerequisites, local HTTP protections and built-page metadata. See [implementation status](docs/IMPLEMENTATION_STATUS.md) for exact completed checks and remaining setup. Browser visual and interactive acceptance with Olga remains to be done.
