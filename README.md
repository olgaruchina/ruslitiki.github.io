# Ruslitiki published site

This branch contains the published website in `dist/`. The editorial layout changes are reviewed in [PR #8](https://github.com/olgaruchina/ruslitiki.github.io/pull/8), against `site-live`.

## Preview locally

```sh
python3 -m http.server 4322 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4322/. This branch has no source build or package test command.

## Layout ownership

- `dist/index.html`: published content and page structure.
- `dist/editorial.css`: responsive hierarchy, spacing, editorial membership columns, and navigation styling.
- `dist/section-navigation.js`: current-section indication in desktop and mobile navigation.

Keep the existing colours, fonts, wordmark, and artwork. Use spacing, alignment, and selective emphasis to clarify the reading order. Membership places the offer beside its benefits on desktop and stacks below 900px. The navigation points directly to the named sections; the wordmark returns to the top.

Copy is preserved except for two membership-opening/waitlist corrections documented in the PR. The existing join action is repeated in membership, Home is removed from navigation, and paragraph breaks and bold emphasis are adjusted.

## Verification

For layout changes, check the opening, book, video, club explanation, membership, expanded FAQs, contact, and footer at 320, 375, 768, 900, and 1440px. Check the 1280 × 720 opening separately for button visibility. Confirm:

- no horizontal page overflow or clipped text;
- membership stacks below 900px;
- mobile menu opens, reaches its target, and closes;
- section links, wordmark, and current-section underline work;
- FAQs work with the keyboard and retain visible focus;
- price, renewal/cancellation details, and contact links remain readable.

Basic checks:

```sh
node --check dist/section-navigation.js
git diff --check
```

These viewport and interaction checks were performed for PR #8. They are not physical-device testing, a full accessibility audit, or evidence of increased signups. Patreon payment checkout was not tested.

## Publishing boundary

The existing workflow does not run PR checks for a `site-live` base. A push to `site-live` can publish when `RUSLITIKI_PUBLISH_SOURCE` is `editor`; a PR alone does not deploy.

These are edits to generated public files. Before the next editor/source publish, carry the layout, navigation, and content changes into that publishing source and verify its output. Otherwise a new publish can overwrite them. The existing `dist/release.json` identifies the source artifact used as the baseline; it was not regenerated for this layout PR.

Keep screenshots as PR-body attachments, not repository files. Local comparison pages, preview assets, and review notes are not release files; stage explicit paths rather than adding the whole working directory.
