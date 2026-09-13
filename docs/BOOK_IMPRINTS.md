# Background book drawings

Three transparent book illustrations add faint, tone-on-tone imprints to the page. In the editor, use **Layout & style → Background book drawings** to turn them on or off. The setting is stored as `design.bookImprints`.

## Original assets

The original PNGs are preserved in the repository:

- [Open book](../src/assets/book-imprints/open-book.png): an open vintage hardback with two visible pages and a gentle central gutter.
- [Closed book](../src/assets/book-imprints/closed-book.png): a single plain hardback at a slight diagonal, with visible page edges.
- [Book stack](../src/assets/book-imprints/book-stack.png): two slightly offset hardbacks with plain covers and visible page edges.

Each original is a 1254 × 1254 RGBA PNG. Both the background and the spaces inside the page and cover outlines are transparent. The strokes are near-black with antialiased alpha; CSS alpha masking supplies the exact page ink color.

## Rendering and placement

[BookImprint.astro](../src/components/BookImprint.astro) uses Astro's `getImage` to optimize each original into a **384 px WebP** at quality 80. The generated image is a CSS alpha mask over `currentColor`, with opacity controlled in [customization.css](../src/styles/customization.css).

There are five responsive placements:

| Placement | Drawing | Responsive behavior |
| --- | --- | --- |
| Header | Closed book | Scales with the viewport near the upper-right corner. |
| Meet Ruslitiki video | Open book | Appears beside a centered video when the surrounding space allows it. |
| How the club works | Book stack | Appears in the heading column for split text layouts at widths of 900 px and above. |
| Membership | Closed book | Appears in the heading column for split text layouts at widths of 900 px and above. |
| Footer | Book stack | Sits beside the footer phrase and becomes smaller on narrow screens. |

All drawings are decorative: `aria-hidden="true"` excludes them from the accessibility tree, while `pointer-events: none` prevents them from intercepting clicks. They are not selectable and do not add focus targets. Turning off Background book drawings hides all five placements.

## Generation provenance

Generation mode: built-in image_gen__imagegen, three independent generation calls. No CLI fallback. Generated PNG alpha channels are preserved unchanged.

Each output is 1254 × 1254 RGBA (tool-selected size despite requested 1024 square). Transparent pixels outside the contours and within page/cover regions were verified. Near-black ink with antialiased alpha is suitable for CSS alpha masks; opaque ink is not numerically pure black at every pixel (channel maxima 23 or below). Use CSS alpha masking for exact tinting.

## open-book.png

```text
Use case: stylized-concept.
Asset type: transparent raster illustration for a subtle literary website background imprint.
Scene/backdrop: actual transparent alpha background everywhere except the ink strokes, including inside the object; absolutely no white or colored paper fill, no painted checkerboard.
Style/medium: elegant sparse hand-inked line drawing, fine slightly irregular organic contours, very few delicate page-edge strokes. Black opaque ink strokes with normal antialiasing. No hatching, shading, crosshatching, cast shadow, gray wash, texture field, ornaments, text, lettering, logos, or watermark.
Composition: one centered isolated motif with modest transparent breathing room, 1024 by 1024 square canvas.
Important: this will be used as a CSS alpha mask tinted into a very faint tone-on-tone imprint. Keep the generated ink pure black and opaque and the rest genuinely transparent. Open paper and cover regions must remain transparent; use outlines only.
Subject: one open vintage hardcover book seen in a slight three-quarter perspective, both open pages clearly visible, a gentle central gutter, modest curved page edges, sparse and quiet.
```

## closed-book.png

```text
Use case: stylized-concept.
Asset type: transparent raster illustration for a subtle literary website background imprint.
Scene/backdrop: actual transparent alpha background everywhere except the ink strokes, including inside the object; absolutely no white or colored paper fill, no painted checkerboard.
Style/medium: elegant sparse hand-inked line drawing, fine slightly irregular organic contours, very few delicate page-edge strokes. Black opaque ink strokes with normal antialiasing. No hatching, shading, crosshatching, cast shadow, gray wash, texture field, ornaments, text, lettering, logos, or watermark.
Composition: one centered isolated motif with modest transparent breathing room, 1024 by 1024 square canvas.
Important: this will be used as a CSS alpha mask tinted into a very faint tone-on-tone imprint. Keep the generated ink pure black and opaque and the rest genuinely transparent. Open paper and cover regions must remain transparent; use outlines only.
Subject: one closed vintage hardback book seen in a slight three-quarter perspective, a simple plain cover and visible page edges along the lower/front side. The book sits naturally at a slight diagonal, sparse and quiet.
```

## book-stack.png

```text
Use case: stylized-concept.
Asset type: transparent raster illustration for a subtle literary website background imprint.
Scene/backdrop: actual transparent alpha background everywhere except the ink strokes, including inside the object; absolutely no white or colored paper fill, no painted checkerboard.
Style/medium: elegant sparse hand-inked line drawing, fine slightly irregular organic contours, very few delicate page-edge strokes. Black opaque ink strokes with normal antialiasing. No hatching, shading, crosshatching, cast shadow, gray wash, texture field, ornaments, text, lettering, logos, or watermark.
Composition: one centered isolated motif with modest transparent breathing room, 1024 by 1024 square canvas.
Important: this will be used as a CSS alpha mask tinted into a very faint tone-on-tone imprint. Keep the generated ink pure black and opaque and the rest genuinely transparent. Open paper and cover regions must remain transparent; use outlines only.
Subject: one loose small stack of exactly two closed vintage hardback books, slightly offset from one another, seen in a slight three-quarter perspective. Simple plain covers with visible page edges, sparse and quiet.
```

