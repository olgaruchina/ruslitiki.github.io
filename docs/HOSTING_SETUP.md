# One-time public publishing connection

This setup is not complete. The coming-soon page is built; the local editor can save and preview. Public Publish is disabled until the free production host is connected. The existing Pages site and DNS have not been changed.

## Proposed free host

Use Cloudflare Pages with a Git connection to `olgaruchina/ruslitiki.github.io`, production branch `site-live`, no build command, and output directory `/`. The editor puts ready-to-serve static files onto that branch; Cloudflare must not rebuild a different source revision. This preserves GitHub source ownership and keeps an owner from handling deployment credentials.

The site owner must authorize the Git connection and manage the custom domain in their own account. The currently available GitHub account has push access but not repository administration access. Connect `www.ruslitiki.com` and configure the apex redirect as required by the host. Verify HTTPS, DNS, free-plan limits and disabled paid overages before enabling the editor.

Publish only generated `dist` files on `site-live`; never the repository root or private `.studio` directory. Configure preview access separately if adding remote preview domains. Local editor previews bind only to loopback and do not need a cloud account.

## Local adapter configuration

The maintainer creates `.studio/publishing.json` after the hosting/domain connection is checked:

```json
{
  "enabled": true,
  "repository": "olgaruchina/ruslitiki.github.io",
  "branch": "site-live",
  "liveUrl": "https://www.ruslitiki.com/"
}
```

Git and GitHub CLI must be installed and authenticated on Olga's editing laptop with push access to this repository. The browser never receives that credential. No Cloudflare token is embedded in the website. Do not change the existing `main` branch Pages configuration casually; switching production hosting is a separate, intentional release step.

Before handing over, verify using Olga's account: publish a reviewed release; observe the live release marker; retry the same release; make a second publication; restore the previous content; and handle an interrupted/failed host deployment. Test simultaneous source edits. Until these checks pass, this is an integration prototype, not a proven live publishing system.

## Source and live output

`site-live` holds generated public output with its own deployment history. Source remains on the development/default branch. Successful local publication updates `content/site.json` and the selected image on the laptop; the maintainer still commits/synchronizes those source changes. Draft saves are private local writes, not Git commits. Multi-laptop source synchronization is not implemented in this first prototype.

Native Pages CMS is optional. Its `.pages.yml` describes fields/blocks; enabling it requires the repository owner to install its GitHub App. It does not activate the local preview/publish adapter, and should not be offered alongside local editing without an agreed synchronization model.

The separate owner-private Sites deployment is a review copy. It does not connect the custom domain, activate Pages CMS or provide the permanent owner editor.
