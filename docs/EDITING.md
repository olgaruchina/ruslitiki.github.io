# Updating the Ruslitiki page

After the maintainer has installed the editor once, double-click **Ruslitiki Editor.app** in the project folder. It opens the editor in your browser and runs quietly in the background. You can close and reopen the browser; saved drafts remain on this laptop. The app must stay with its project folder. The maintainer should check this launcher on Olga's Mac during setup; the native app launcher has not yet been exercised here.

1. Start in **Edit page**. Click text on the page and type. Select a section to see its controls, or use the settings on the left.
2. Drag a section using its **Move** handle. Drag a new block from the content palette onto the page, or press **+ Add section**, **Add before**, **Add after**, or **Add section here**. The page updates while you work. Press **Save draft** to keep your changes on this laptop.
3. Press **Prepare preview**. This saves your changes, checks the page and builds a separate **Saved preview**. Use **Phone**, **Tablet** or **Desktop**, or **Open preview** to see it in a separate tab. Links work in the saved preview; clicking them on the editing page selects their content.
4. After the one-time publishing connection, press **Publish website** and confirm. Wait for the editor to say **Published**. A saved draft and a preview are not public updates.

The public coming-soon page stays available while you edit. If you change a draft after previewing it, prepare another preview before publishing. If another window has changed your saved draft, the editor asks you to reload rather than overwriting it.

After setup, **Publish website** sends your reviewed page to GitHub, and GitHub Actions updates the public website automatically. You do not need to open GitHub or run commands for routine updates. Use **Check publishing connection** during the one-time setup: it shows any owner settings still needed, with links, and enables publication when ready. Checking the connection preserves your draft and does not publish it. Until setup is complete, saving and previewing remain available.

**Dates & links:** leave the email empty until the mailbox actually works. Only switch from Coming soon when the real Patreon link is available. Dates never activate a paid membership button automatically.

**AI-readable overview:** the website's `llms.txt` updates automatically when you prepare and publish the page. It uses the same club details, dates, visible sections and active links. Hidden sections stay out, and there is no separate file for you to edit.

**Images:** use a PNG, JPEG or WebP under 2 MB. New uploads stay in the editor's private working area. Only the selected logo and images in visible blocks are copied from that private area into the reviewed release. Previously published images may remain in the site's image library. Use the original wordmark button to return to the existing branding.

**Book illustration:** under **First book**, use **Show the Eugene Onegin illustration** to show or hide the historical garden scene. Its artist credit appears with it. Changing the book title or author hides this Onegin-specific artwork automatically.

**Club introduction video:** a **Meet Ruslitiki** YouTube block is ready under **Page blocks**, with **Show on page** switched off until the video is available. Paste the finished video's YouTube share or watch link into **YouTube video link**, switch **Show on page** on, and prepare a preview. Check that the video plays before publishing. You can change its heading, introduction, width and position like any other section. The player uses YouTube's privacy-enhanced embed and does not autoplay. In **Edit page**, clicking the video opens its settings; use **Saved preview** to play it. You can add further video blocks from the palette.

**Frequently asked questions:** the seven starting answers come from the club notes. Click a question or answer to edit it directly, or use its **Page blocks** settings. Drag to reorder, duplicate an existing answer, or add **Question and answer** from the palette. Visitors expand answers individually. The standard and early-bird USD prices are confirmed. Update session times, replay arrangements and any early-bird conditions when those decisions are confirmed. The first-book FAQ and How the club works section contain their own text: update these when you change the book or launch dates elsewhere. The Membership section and waitlist FAQ both mention prices; keep them consistent when pricing changes.

**Layout & style:** choose an introduction beside the book, the book on the left, one column, or a centred composition. Change page width, section spacing, wordmark size, heading size, paragraph size, and button shape. Choose Literata or Golos Text independently for headings and paragraphs. Apply a colour palette or choose your own background, text and accent colours; unreadable colour combinations must be corrected before saving. Move the Onegin illustration above or below its title/description and change its size.

**Screen sizes:** Phone uses up to 390px, Tablet up to 768px, and Desktop uses the available preview width. These views resize both the editing page and Saved preview; on a smaller laptop, use **Open preview** for more room. The public page stacks the book and lower sections below 900px, keeps images fluid, wraps the menu, and uses larger controls for touch. These width previews help review the layout; they do not replace checking the finished page on real devices.

**Section menu:** the top menu jumps to October’s Book, How it works, Membership and FAQs. It follows your block order and automatically leaves out hidden or removed sections. In **Page blocks**, change a section's **Menu label** to rename its link, clear it to remove that link, or add a label to include another section. The video appears as **Meet Olga** when you turn it on. Clicking a menu link in **Edit page** jumps to that section without selecting or outlining it. Click the section itself to edit it; in **Saved preview** it works as a visitor's page link. The menu stays at the top while scrolling on larger screens and wraps normally on smaller screens.

**Page blocks:** add up to 12 text, question-and-answer, image-and-text, YouTube video, button, or quote blocks. Drag them directly on the page or in the page-order list; arrow buttons provide another way to move them. Blocks can go before or after the introduction and first book, which move together. The wordmark and footer stay in their places. Use **Options** on the page to open a block's settings, **Duplicate** to reuse it, **Hide** to keep it off the page, or **Remove** to delete it from the draft. Hidden blocks remain available under **Page blocks**.

**Buttons:** add a standalone button block or a button inside any other block. Edit its words on the page, then set its destination in the settings. Choose filled, outline or text styling. A button needs both a label and a safe destination before previewing or publishing.

Each block has width, alignment and plain/bordered/accent-background choices. Text blocks offer one column, two text columns, or a heading beside the text. These layouts stack when space is tight. The current lower-page sections use the full page width, with headings beside their text on desktop and full-width FAQ rows. Image blocks offer left/right/above placement and original/landscape/square/portrait proportions, plus an image description, optional caption and source credit link. Use images you have permission to publish. Layouts adapt automatically to smaller screens.

**Unfinished work:** new blocks can be saved privately before their text, image or button is complete. The editor asks you to finish visible blocks before preparing a publishable preview. Each open tab has its own unsaved editing page; saving still checks for changes made in another tab.

**Undo and reset:** Undo/Redo keeps your last 40 changes in the current editor tab, including removed blocks and style changes. Typing in one passage is grouped into one undo step. This history clears when you reload the tab. **Reset page style** restores the original visual settings while keeping your content and block order. **Edit page** shows changes as you work; prepare a new **Saved preview** before publishing them.

**Recovery:** after there are two confirmed publications, Restore previous version copies the earlier content into a draft for review. Your newer draft is backed up first. Review and publish the restoration when ready. It does not silently change the live page.

If publication reports that the host has not confirmed a release, do not assume it failed or succeeded. The editor retains the attempted version so the same update can be checked again. Ask the maintainer to check the hosting connection if this persists.

This editor has no recurring editor subscription and works on the configured laptop. Drafts do not yet sync between computers. Back up the whole project including its hidden `.studio` folder. Private drafts and backups must not be copied into a public repository.

The local editor is the supported editing workflow. The earlier `.pages.yml` hosted CMS configuration is retained as a reference; it is not activated and does not cover the expanded layout/block model. It needs updating and its own publishing design before use. Hosting settings and executable HTML/CSS remain maintainer responsibilities.
