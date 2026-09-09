# Publishing with the editor and GitHub Actions

The chosen publishing route is **Prepare preview → Publish website** in the local editor. GitHub Actions publishes the reviewed public files to `https://www.ruslitiki.com/`. There is no editor subscription or additional hosting service. The separate private Sites copy is not part of this publishing flow.

## One-time connection

The editor includes **Check publishing connection**, which reads GitHub settings and shows any remaining steps with links. It never publishes a page or changes GitHub settings. Once all checks pass, it saves the local connection automatically; Olga does not need to edit a configuration file.

The maintainer and repository owner complete these settings once:

1. Install Git and GitHub CLI on the editing laptop. Sign in with permission to push to `olgaruchina/ruslitiki.github.io`, including workflow files. Credentials stay with GitHub CLI and are not passed to the browser.
2. In [Pages settings](https://github.com/olgaruchina/ruslitiki.github.io/settings/pages), set **Build and deployment → Source → GitHub Actions**. Keep `www.ruslitiki.com` and HTTPS enabled. No DNS change is needed. This requires owner/maintainer access, which the currently connected account does not have.
3. After queued and running production workflows have finished, set repository variable `RUSLITIKI_PUBLISH_SOURCE` to `editor` in [Actions variables](https://github.com/olgaruchina/ruslitiki.github.io/settings/variables/actions). This selects the editor as the only production source.
4. In [Environments](https://github.com/olgaruchina/ruslitiki.github.io/settings/environments), open `github-pages` and add an allowed **branch** rule named `site-live`. This personal repository requires its owner to change the environment. The connection check expects an explicit `site-live` or `*` branch rule, or an environment without branch restrictions. Per-publication approval rules must be resolved before fully automatic updates can be enabled.
5. Return to the editor and press **Check publishing connection**. Once connected, prepare and review a preview, then use **Publish website**. The editor confirms success only after the live website returns that release's marker.

A source merge to `main` is **not required** for editor publishing. The editor places both the reviewed `dist/` files and the trusted workflow on the `site-live` branch, so GitHub can discover and run that workflow directly. Source changes can remain on the development branch until separately reviewed and merged.

As of 8 September 2026, the repository variable is set to `editor`. The connected account has push access. Pages still uses the legacy `main` root-folder source, and `github-pages` currently permits only `main`; those two owner-only changes remain. The connection check reports current settings rather than relying on this recorded status.

## How publication works

The editor validates the saved content and builds an exact local preview. Private uploads are copied into that preview only when selected by the logo or a visible image block. Publication sends the reviewed output under `dist/`, plus `.github/workflows/pages.yml` outside the public files, to `site-live`. It does not send the editor, private draft store, research notes or repository source tree.

The workflow uploads that `dist/` unchanged. It does not rebuild different content. Only the selected mode can publish; source pushes still run tests/build checks without replacing Olga's live edits. All production workflows share one queue.

The connection is checked again before each release is sent. The adapter uses a non-force push, retains uncertain attempts for retry and confirms `https://www.ruslitiki.com/release.json` before reporting success. The canonical `www` address is required because redirecting marker requests are rejected. No deployment secret needs to be placed in GitHub Actions: GitHub supplies its scoped token, and only the deployment job has Pages and identity-token write permissions.

A long GitHub queue can outlast the editor's wait. A pending release can be checked again without creating a different release or replacing the previous-version history. The Actions run is the maintainer's deployment diagnostic. The local preview is still available if GitHub settings or authentication need attention.

## Source updates and recovery

Successful editor publication also updates `content/site.json` and selected images on the editing laptop. The maintainer still commits and synchronizes those source changes; private drafts are not automatically pushed. For a design/code update, update the laptop's source, prepare a fresh preview and publish it through the editor.

**Restore previous version** creates a draft from the prior distinct successful publication. Review and publish it when ready. It does not silently change the live page. Live Publish/Restore, interrupted deployment and Olga's native launcher still need an acceptance walkthrough after the owner settings are complete.

The ignored `.studio/publishing.json` is created by the connection check. It contains the fixed repository, `site-live` branch and canonical live URL, but no credentials. Advanced maintainer configuration uses the same fields; ordinary editing requires no JSON changes.

## Optional automatic publishing from main

The workflow can alternatively build and publish `main`. Before switching, incorporate Olga's latest published content into `main`, validate it, and wait for all queued or running production workflows to finish. Then set `RUSLITIKI_PUBLISH_SOURCE` to `main` and allow `main` in the environment. Only successful builds publish. Do not merge Astro source into the legacy root-folder Pages setup; switch Pages to GitHub Actions first.

Do not enable both publishing modes or a second CMS at once. The earlier `.pages.yml` is an inactive reference and does not cover the expanded block/layout model or share the local draft store.

References: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [environment permissions](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [Actions free usage](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
