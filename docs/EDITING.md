# Updating the Ruslitiki page

After the maintainer has installed the editor once, double-click **Ruslitiki Editor.app** in the project folder. It opens the editor in your browser and runs quietly in the background. You can close and reopen the browser; saved drafts remain on this laptop. The app must stay with its project folder. The maintainer should check this launcher on Olga's Mac during setup; the native app launcher has not yet been exercised here.

1. Choose **Introduction**, **First book**, **Dates & links**, **Extra sections**, or **Search listing**.
2. Change the content. The editor shows **Unsaved changes** until you press **Save draft**.
3. Press **Prepare preview**. This saves your changes, checks the page and builds a preview. Use **Phone** or **Desktop**, or **Open preview** to see it in a separate tab.
4. After the one-time publishing connection, press **Publish website** and confirm. Wait for the editor to say **Published**. A saved draft and a preview are not public updates.

The public coming-soon page stays available while you edit. If you change a draft after previewing it, prepare another preview before publishing. If another window has changed your saved draft, the editor asks you to reload rather than overwriting it.

After setup, **Publish website** sends your reviewed page to GitHub, and GitHub Actions updates the public website automatically. You do not need to open GitHub or run commands. The maintainer selects editor publishing mode once during setup; until that connection is complete, saving and previewing remain available.

**Dates & links:** leave the email empty until the mailbox actually works. Only switch from Coming soon when the real Patreon link is available. Dates never activate a paid membership button automatically.

**Images:** use a PNG, JPEG or WebP under 2 MB. New uploads stay in the editor's private working area. Only the image selected for the reviewed page is included in its release. Use the original wordmark button to return to the existing branding.

**Extra sections:** add a short note or a question and answer, then move it up/down or hide it. These are optional; the first release is intentionally brief. Typography and mobile layout are handled for you.

**Recovery:** after there are two confirmed publications, Restore previous version copies the earlier content into a draft for review. Your newer draft is backed up first. Review and publish the restoration when ready. It does not silently change the live page.

If publication reports that the host has not confirmed a release, do not assume it failed or succeeded. The editor retains the attempted version so the same update can be checked again. Ask the maintainer to check the hosting connection if this persists.

This first editor works on the configured laptop. Drafts do not yet sync between computers. Back up the whole project including its hidden `.studio` folder. Private drafts and backups must not be copied into a public repository. A hosted Pages CMS configuration is included for a future remote editing option, but it is not activated.

The optional hosted CMS does not share the local editor's draft store; choose one editing workflow at a time. The editor intentionally keeps font settings, page templates, hosting accounts and technical configuration out of ordinary content editing.
