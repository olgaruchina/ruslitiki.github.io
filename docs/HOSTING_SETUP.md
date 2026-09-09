# Automatic publishing with GitHub Actions

GitHub Pages is the production host. The public repository uses standard Ubuntu runners, so deployment requires no paid editor or additional hosting subscription. The existing custom domain is `www.ruslitiki.com`; this setup keeps it on GitHub Pages. The separate private Sites URL remains a review copy.

## Enable automatic updates from main

The workflow is `.github/workflows/pages.yml`. After activation, a push to `main` installs the locked dependencies, runs tests, builds Astro, checks the public output and publishes only `dist/`. A failed build/test stops publication. Development branch pushes and pull requests run checks without publishing.

The repository owner performs this one-time setup because the currently available GitHub account has push access but not administration access:

1. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. Keep the existing custom domain and HTTPS setting. No DNS change is needed for this switch.
2. Check **Settings → Environments → github-pages**. Allow deployments from `main`. For fully automatic publishing, do not require an approval on every deployment.
3. Merge the checked coming-soon branch into `main`. The resulting push triggers the workflow. Do not merge the Astro source while Pages still uses the old root-folder/branch build.
4. Open **Actions → Check and publish website** and confirm a successful deployment and the correct live page. The Actions run links to the deployment URL.

No personal token or hosting secret needs to be added to Actions. GitHub supplies its scoped deployment token. Build jobs have read-only repository access; only the deploy job gets Pages and identity-token permissions. Actions versions are pinned to verified official release commits.

Leave the repository variable `RUSLITIKI_PUBLISH_SOURCE` unset (or set it to `main`) for this mode. Subsequent pushes to `main` publish automatically. **Run workflow** is also available on `main` for a manual retry. Only `main` and the configured editor branch can deploy; running it on a development branch checks the site only.

## Connect Olga's Publish button

The editor saves private drafts and prepares exact local previews. Its publishing adapter uses the same free GitHub Actions host, with a dedicated `site-live` branch containing `dist/<reviewed public files>` and `.github/workflows/pages.yml`. Including the workflow on this branch is required: GitHub discovers push workflows from the pushed branch. Actions uploads that `dist/` unchanged, retaining its `release.json` identifier. It never rebuilds different source in editor mode.

Use **one publishing mode at a time**. The local editor does not yet synchronize its content commits back to `main`. Allowing both modes to publish would let a later code push replace Olga's newer copy with older source.

To activate the editor, the maintainer and owner:

1. Wait for all queued or running production workflow runs, including builds, to finish. Changing the mode does not cancel an older run's publishing intent. In **Settings → Secrets and variables → Actions → Variables**, set the repository variable `RUSLITIKI_PUBLISH_SOURCE` to `editor`.
2. In the `github-pages` environment, allow deployments from `site-live` as well. The workflow now checks source pushes but publishes only reviewed editor pushes.
3. Install/authenticate Git and GitHub CLI on Olga's laptop with repository push access and permission to push workflow files. The browser does not receive that credential.
4. Create the ignored local configuration `.studio/publishing.json`:

```json
{
  "enabled": true,
  "repository": "olgaruchina/ruslitiki.github.io",
  "branch": "site-live",
  "liveUrl": "https://www.ruslitiki.com/"
}
```

5. Test publishing a reviewed page, confirming its live release marker, retrying the same pending release, publishing a second version, and restoring the previous version. Test a failed/interrupted deployment too. Until these checks pass with Olga's account, the live integration remains a prototype.

The adapter checks the repository mode before sending a release. It uses a non-force push and confirms the matching live release marker before reporting success. All production deployments share one queue. A long GitHub queue can outlast the editor's wait; the pending release remains available for retry, without claiming success. GitHub Pages does not apply the Cloudflare-style `_headers` file, so the marker request includes a cache-busting query; the Actions result is the maintainer's deployment diagnostic.

Successful editor publication updates `content/site.json` and the selected image on the editing laptop. The maintainer still commits/synchronizes those source changes. Before switching back to automatic `main` publishing, incorporate the latest owner content into `main`, validate it, wait for all queued or running production workflows (including builds) to finish, then set the variable to `main`. This avoids replacing newer live content with stale source. For a design change while editor mode is active, update the laptop's source, prepare a new preview, and publish through the editor.

## Current status and recovery

The workflow and editor transport are implemented. The existing Pages configuration still uses the legacy `main` root-folder source; live Actions deployment and editor Publish/Restore have not been activated or tested against the public domain. The private review site is available independently.

In main mode, revert an unwanted source commit and push the revert; Actions publishes the corrected build. In editor mode, Restore previous version creates a draft to review and publish. Failed checks keep the previous successful Pages deployment available.

Native Pages CMS is an optional future editor with its own GitHub App installation. Its `.pages.yml` does not activate the local adapter; choose a content synchronization model before enabling a second editor.

References: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Actions free usage](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
