# Promit Mitra — Portfolio

A responsive static portfolio inspired by the supplied ArtCraft references. The site uses a dark editorial visual system with a separately art-directed light theme, a split hero with a large background-integrated ASCII illustration, thin ruled grids, varied section compositions, and a right-side scroll ruler.

## Included
- `index.html` — portfolio content and semantic sections
- `assets/css/style.css` — base responsive layouts, original graphic panels, typography and motion
- `assets/css/refined.css` — readability, containment and adaptive grids; unique case-study illustrations; the full workflow map and scroll-triggered visual treatments
- `assets/css/quality-fixes.css` — final containment pass for poster typography, equal card grids, editorial-cover spacing and a three-unit seamless ticker
- `assets/css/case-study.css` — shared case-study layout primitives
- `assets/js/main.js` — scroll-linked page ruler and hero drift, active section labels, scroll reveals, mobile navigation, theme switch and pointer parallax
- `assets/images/favicon.svg` — icon
- `CNAME` — `promit.qd.je`

## Presentation and visual hierarchy
The portfolio uses a larger body-text scale, stronger third-level headings, better text wrapping, and contained, adaptive grids. The flagship B2B case is presented as a full workflow map: signal monitoring → account research → internal opportunity review → multi-channel outreach/content → shared CRM context → quote-request activation → PM/specialist handoff. A separate parallel lane documents RFP response coordination. Other cases use distinct editorial, requirement-mapping, channel-orchestration, brand-format and product-concept illustrations rather than repeating one layout.

## Light theme
The theme switch uses a warm-paper palette for the main site, with graphite text, botanical-olive accents, and muted blueprint blue for the scroll rail. The hero deliberately diverges: in light mode it uses a deep botanical-olive background with white typography and white ASCII art for stronger contrast, while the remaining sections retain warm-paper surfaces. Cards, project illustrations, grids, case-study pages, overlay backdrops/loading states, and the CV frame receive light-theme treatments. The selection is saved in `localStorage` and applied before styles load on the homepage, CV page, and all case-study pages.

## Motion model
**Scroll-linked:** page progress ruler and percentage, active vertical chapter label, a sticky, scroll-linked ASCII transformation: the source glyphs begin assembled as the supplied portrait, disperse into a deterministic random sample of full-stage grid cells while scrolling down, and reassemble into the same portrait when scrolling back up. Section/case reveals and workflow diagrams remain scroll-triggered too.

**Time-based:** a subtle scan sweep over the ASCII artwork, blinking signal indicators, diagram signal pulses and a seamless infinite ticker. The ticker uses three identical groups and moves by exactly one group-width to avoid a visible endpoint; it pauses on hover. Decorative hero cards and orbit outlines are suppressed so they do not compete with the headline or ASCII art.

Reduced-motion preferences are respected. Motion is an original recreation of the references' visual language rather than an exact copy of their underlying source or timing curves. The system map and case illustrations are rebuilt from the documented work rather than copied from employer systems.

## Publish on GitHub Pages
1. Extract the ZIP and upload the **contents** of this folder to the root of your repository. `index.html` and `CNAME` must be at the top level.
2. Open **Settings → Pages**. Choose **Deploy from a branch**, select branch `main` and folder `/ (root)`, then save.
3. Under **Custom domain**, enter `promit.qd.je`.
4. After GitHub verifies DNS and provisions the certificate, enable **Enforce HTTPS**.

Keep the existing GitHub Pages A records:
- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

## Notes
- Archivo, Instrument Serif, Inter and Geist Mono are loaded through Google Fonts. A network connection is needed for those fonts; fallback fonts are included.
- The portfolio has been populated with work history and case studies based on the project notes currently available. Case-study pages live in `case-studies/`.

## Portfolio content and accuracy
- B2B demand generation: signal-led account research, Apollo, Zoho CRM/Voice, Mailchimp, n8n, LinkedIn outreach, quote-request handoff.
- Whitepaper content: seven whitepapers; research, outlining, writing, editing, design and distribution across email, LinkedIn and website.
- RFP/pre-sales: 12 responses supported through submission; four received a client/procurement response (33.3% response rate, not a win rate).
- Marketing operations: reconstructed explanation of shared communication history and follow-up workflow; no internal screenshots or confidential configuration.
- Event/brand communications: selected experience across print, promotional assets, social content and event media.
- POSM Planner: clearly labelled as a self-initiated concept-stage project, not a launched product.

Company and client identity from the confidential B2B role is withheld. Do not add company-owned whitepapers, client names, prospect data, original CRM screenshots, internal automation configuration, confidential pricing or proprietary proposal content. Workflow illustrations are conceptual reconstructions. The available notes explicitly separate RFP responses from lead activations; do not imply that the 5 reported broader-role activations were generated by the 12 RFP submissions.


### Hero ASCII artwork

The hero uses the supplied ASCII art, embedded as preformatted source in `index.html` and duplicated at `assets/images/ascii-art.txt` for editing. JavaScript renders the non-space characters to a single high-DPI-aware canvas rather than creating and updating thousands of DOM nodes. While the scene is pinned during the hero scroll track, the glyphs interpolate at fractional-pixel positions from their original character coordinates to stable, randomly selected cells in a full-stage grid; reverse scrolling reconstructs the original art. The canvas uses a capped backing resolution and a frame-coalesced scroll handler. The grid has a fixed cell size so scrolling only updates its composited opacity, avoiding continuous background-size repaints. Once the hero transition reaches its final state, the canvas stops redrawing while the rest of the page scrolls. The effect is disabled for visitors who prefer reduced motion.


### Animated ASCII title

The hero wordmark runs from the local `assets/js/ascii-dissolve.js` file using a self-contained adaptation of the supplied `dissolve` technique. It cycles through `PROMIT.`, `SIGNAL`, `SYSTEMS`, and `CONTENT`, then returns to `PROMIT.`; each word breaks into ASCII dust before the next one forms. The glyph paths, timing and character-ramp renderer are bundled with the site, so the title animation does not depend on `ascii.rest` or any remote JavaScript. A conventional `PROMIT.` wordmark fades in after a delay only if the local ASCII effect fails to initialize. The larger ASCII portrait on the right still uses the local source file and the existing scroll-driven canvas transform.


## CV overlay and PDF

The Contact section now includes a **View CV** control. It opens `cv.html` in the shared document overlay; the overlay header provides a **Save as PDF** download for `assets/pdf/Promit-Mitra-CV.pdf`. The CV page also has a standalone toolbar with a PDF download and a link back to the portfolio.

The CV page and downloadable one-page A4 PDF preserve the wording and details from the uploaded CV. Changes are formatting only: hierarchy, spacing, type, colour, rules, grids and responsive layout. Company names, dates, contact details, role titles, summary, bullets, skills, education and certifications remain as provided in the source CV.

The selected-work modal supports the six case studies and the CV. It includes a blur backdrop, independent iframe scroll, Escape and backdrop-to-close, focus restoration, and a staged loading transition that waits for the embedded document and fonts to settle before fading it in.

## Latest hero correction

- Desktop hero composition uses Share Tech Mono for the ASCII portrait and lifts the intro/portrait as a single group to remove unused space above the content. The canvas scatter renderer uses the same font and zoom-aware coordinates.


## Navigation mapping update

The top navigation now maps directly to the page sections: Home → `#home`, `01 / Profile` → `#about`, `02 / Selected work` → `#work`, `03 / Approach` → `#approach`, and `04 / Contact` → `#contact`. The right-side chapter rail uses the same section names. Active navigation is determined from a viewport reading line, with one canonical mapping shared by desktop, mobile, and the chapter rail so tall sections do not cause the active item to jump unpredictably.


## Latest layout adjustment
- The expertise ticker is now anchored inside the sticky hero stage, making it a visible part of the hero and using the previously empty lower band. The ribbon is taller, more legible, and remains continuous.
- The Profile section uses a wider two-column layout with more horizontal room for the copy and reduced vertical padding; it stacks cleanly on mobile.

## Section grid background
Sections 01 Profile, 02 Selected Work and 03 Approach use a subdued cursor-reactive square grid on a separate background layer. A matte gradient softens the pattern, and the Selected Work cards remain opaque above it. The hero and 04 Contact are excluded. The effect is local JavaScript and respects reduced-motion preferences.


### Contact card motion
The “LET’S TALK” panel has a restrained pointer tilt and cursor-following matte highlight. The interaction is disabled for coarse/touch pointers and reduced-motion preferences; no third-party library is required.

## Smooth scroll and parallax

The portfolio, CV and case-study pages share `assets/css/smooth-parallax.css` and `assets/js/smooth-parallax.js`. The effect keeps native scrolling responsive while decorative artwork and secondary visual layers ease into small scroll-relative offsets. CV and case studies opened in the document overlay run the same effect inside their own iframe viewport, independently of the main page. Reduced-motion preferences disable the parallax, and print output remains unaffected.
