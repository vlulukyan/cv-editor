# CV Editor

A React + TypeScript CV editor for writing, previewing, and exporting a resume as PDF.

The app is a split layout: an editor on the left, a live A4 preview on the right.

- Every section collapses to a scannable outline of the CV
- Drag to reorder entries and bullets, with keyboard reordering as well
- Content flows across A4 pages automatically, with no fixed page split
- PDF export as real, selectable text so applicant tracking systems can read it
- Ten structurally different templates, picked from live thumbnails
- Optional portrait, shown by the templates that have a place for one
- Several named CVs, with JSON import and export
- Density and column-width controls, with a one-click fit to a page count
- Autosave, undo and redo
- Writing advice on each bullet

## What This Project Does

The app is built for quickly preparing a professional CV without manually editing document files.

You can edit personal information, profile, skills, work experience, education,
courses, certifications, projects, languages, links and hobbies. The preview
updates as you type.

### Templates

A template is pure configuration. It sets page geometry, type scale and
colours, but also the things that actually make layouts differ: whether there
is a portrait, a timeline rail with nodes, icons on headings and contact lines,
a hairline between the columns, a contact row under the name, numbered entries,
skills as bullets or chips or one line, a stacked or eyebrowed masthead, and
which of five ways an entry lays out its title, dates and place.
There is exactly one content builder (`src/cv/render/spec.ts`) producing a
neutral block spec, and two thin interpreters that read it: the HTML preview and
the PDF. Adding a template is a matter of describing the differences in
`src/cv/templates/presets.ts` and touching no renderer.

Only the three font families jsPDF ships built in are used, so no template
needs an embedded font and exported text stays extractable. Icons are described
as primitives in `src/cv/templates/icons.ts` rather than SVG paths, so the
preview and the PDF draw the same shape. Letter spacing is
clamped to `MAX_TRACKING` for the same reason - see PDF export below.

### Fitting the page

A CV that runs a few lines past a page is the common case, and the Layout
section handles it: density scales every type size and gap together, the side
column can be widened or narrowed, and `Fit to 1 page` searches for the
loosest density that still fits.

The search uses the PDF builder as its oracle - it paginates from the same
block model without needing the DOM, so a candidate layout can be measured
without rendering it. When no size fits, the layout is left alone rather than
shrunk to something unreadable for no gain.

### Pagination

Content is measured and flowed onto pages rather than assigned to a fixed one,
so the page count grows and shrinks with the content and nothing is stranded on
a half-empty page. A section heading is always kept with its first entry.

The same block model drives both renderers: `paginateBlocks` in
`src/cv/paginate.ts` is shared by the on-screen preview and the PDF, and the
page geometry both rely on is derived from the template by
`src/cv/render/metrics.ts`.

### PDF export

`Export PDF` draws the CV as real PDF text, so the content can be extracted by
applicant tracking systems and by search. `Export as image` rasterises the
preview instead, which is only useful when exact visual fidelity matters more
than the text being readable.

Letter spacing is capped by `MAX_TRACKING` in `src/cv/templates/presets.ts`,
and every template is clamped to it on definition.
Above roughly 0.10em the gap between letters is wider than a space character
and PDF text extractors read a heading as loose single letters
(`E D U C A T I O N`). The threshold was measured, not guessed.

### Documents

Each CV is stored separately under `cv-editor/doc/<id>`, with an index at
`cv-editor/index`. A save made by an earlier version of the app is migrated on
first run. Use the name in the top left to switch, rename, duplicate, delete,
or move a CV in and out of JSON.

Anything read back from storage or from an imported file is coerced field by
field, so a malformed document degrades to a usable one instead of crashing.

### Writing advice

Each bullet is checked for the things that make a line read as though nobody in
particular wrote it: no number in it, filler phrasing such as "responsible for",
vocabulary that clusters in generated prose, excessive length, and repeating the
opening verb of the bullet above. Collapsed entries show how many suggestions
they carry. It is advice, not validation - nothing is blocked.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- `@dnd-kit` for reordering
- `jspdf` for PDF output
- `html-to-image` for the image export

## Layout

```text
src/
  cv/
    templates/ the ten templates, as configuration
    render/    content -> block spec -> HTML preview
    pdf/       the same block spec -> PDF text
    paginate.ts shared by both renderers
  editor/      the editing panel: fields, sections, sortable rows, hooks
  App.tsx      composes the two
```

## How To Run

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm run dev
```

Then open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

## Available Scripts

```bash
npm run dev
```

Starts the local development server.

```bash
npm run build
```

Builds the project for production.

```bash
npm run preview
```

Previews the production build locally.

```bash
npm run lint
```

Runs ESLint.

## Keyboard

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + S` | Save now (edits autosave anyway) |
| `Space` on a drag handle | Pick an entry up, arrows move it, `Space` drops it |

## Notes

- CV data is stored in browser `localStorage`
- If `npm run build` fails because of a missing Rolldown native binding, reinstalling dependencies usually fixes the local environment issue
