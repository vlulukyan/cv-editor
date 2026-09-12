import type { RGB, SectionId, Template, TextRole, TextSpec } from './types'

const WHITE: RGB = [255, 255, 255]

/**
 * Above this, the gap between letters is wider than a space glyph and PDF text
 * extractors read a word as loose single letters ("E D U C A T I O N"). The
 * threshold was measured against pdf.js, not guessed. Templates are clamped to
 * it so no preset can quietly break the exported text.
 */
const MAX_TRACKING = 0.1

/**
 * A template only overrides what makes it distinct; everything else comes from
 * here, so adding one stays a matter of describing the differences.
 */
const baseText: Record<TextRole, TextSpec> = {
  name: { size: 24, line: 28, bold: true, tracking: 0.1, upper: true },
  role: { size: 14, line: 20, tracking: 0.1, upper: true },
  heading: { size: 11, line: 12, bold: true, tracking: 0.1, upper: true },
  title: { size: 13, line: 16, bold: true },
  subtitle: { size: 11, line: 15 },
  meta: { size: 11, line: 15 },
  body: { size: 11, line: 17 },
  small: { size: 10, line: 14, color: 'muted' },
  label: { size: 8.5, line: 11, bold: true, upper: true },
}

const baseGaps = {
  section: 40,
  heading: 20,
  entry: 28,
  bulletRow: 7,
  bulletTop: 12,
}

/** Structural switches most templates leave alone. */
const structuralDefaults = {
  photo: 'none',
  rail: 'none',
  columnDivider: false,
  infoStyle: 'stacked',
  skillStyle: 'bullets',
  justify: false,
  headingIcons: false,
  numbered: [] as SectionId[],
} as const

type StructuralKey = keyof typeof structuralDefaults

type TemplateDraft = Omit<Template, 'text' | 'gaps' | StructuralKey> &
  Partial<Pick<Template, StructuralKey>> & {
    text?: Partial<Record<TextRole, Partial<TextSpec>>>
    gaps?: Partial<Template['gaps']>
  }

function define(draft: TemplateDraft): Template {
  const text = { ...baseText }

  for (const role of Object.keys(draft.text ?? {}) as TextRole[]) {
    text[role] = { ...baseText[role], ...draft.text?.[role] }
  }

  for (const role of Object.keys(text) as TextRole[]) {
    const { tracking } = text[role]

    if (tracking !== undefined && tracking > MAX_TRACKING) {
      text[role] = { ...text[role], tracking: MAX_TRACKING }
    }
  }

  return {
    ...structuralDefaults,
    ...draft,
    text,
    gaps: { ...baseGaps, ...draft.gaps },
  }
}

const ALL_MAIN = [
  'profile',
  'experience',
  'education',
  'courses',
  'certifications',
  'projects',
  'skills',
  'languages',
  'links',
  'hobbies',
] as const

export const templates: Template[] = [
  /* 1 ----------------------------------------------------- the original */
  define({
    id: 'sidebar-classic',
    name: 'Sidebar Classic',
    description: 'Grey sidebar and a boxed name. The original layout.',
    family: 'sans',
    page: {
      sidebar: 'left',
      sidebarWidth: 240,
      sidebarPaddingLeft: 60,
      sidebarPaddingRight: 28,
      mainPaddingX: 32,
      headerHeight: 190,
      topPadding: 40,
      bottomPadding: 48,
    },
    header: { style: 'boxed', align: 'center', fullWidth: false },
    headingRule: 'under',
    entry: 'locationRight',
    gutterWidth: 96,
    bullet: 'dot',
    colors: {
      paper: [242, 242, 242],
      panel: [231, 231, 231],
      ink: [23, 23, 23],
      muted: [64, 64, 64],
      rule: [115, 115, 115],
      accent: [23, 23, 23],
      headerFill: [242, 242, 242],
      headerInk: [23, 23, 23],
      panelInk: [23, 23, 23],
    },
    sections: {
      sidebar: ['info', 'skills', 'hobbies', 'languages', 'links'],
      main: [
        'profile',
        'experience',
        'education',
        'courses',
        'certifications',
        'projects',
      ],
    },
  }),

  /* 2 -------------------------------------------- nothing but the words */
  define({
    id: 'ats-plain',
    name: 'ATS Plain',
    description: 'One column, no panels. The safest thing to upload.',
    family: 'sans',
    page: {
      sidebar: 'none',
      sidebarWidth: 0,
      sidebarPaddingLeft: 0,
      sidebarPaddingRight: 0,
      mainPaddingX: 64,
      headerHeight: 116,
      topPadding: 54,
      bottomPadding: 56,
    },
    header: { style: 'plain', align: 'left', fullWidth: true, contactRow: true },
    headingRule: 'under',
    entry: 'metaJoined',
    gutterWidth: 96,
    bullet: 'dot',
    skillStyle: 'inline',
    colors: {
      paper: WHITE,
      panel: WHITE,
      ink: [0, 0, 0],
      muted: [70, 70, 70],
      rule: [150, 150, 150],
      accent: [0, 0, 0],
      headerFill: null,
      headerInk: [0, 0, 0],
      panelInk: [0, 0, 0],
    },
    text: {
      name: { size: 23, line: 27, tracking: 0.04 },
      role: { size: 12, line: 16, tracking: 0.04, upper: false },
      heading: { size: 11, line: 14, tracking: 0.06 },
    },
    sections: { sidebar: [], main: [...ALL_MAIN] },
    gaps: { section: 24, heading: 13, entry: 18 },
  }),

  /* 3 ---------------------------------- navy band, portrait, timeline rail */
  define({
    id: 'timeline-navy',
    name: 'Timeline Navy',
    description: 'Navy band, portrait, and a timeline rail with icon badges.',
    family: 'sans',
    page: {
      sidebar: 'left',
      sidebarWidth: 250,
      sidebarPaddingLeft: 26,
      sidebarPaddingRight: 24,
      mainPaddingX: 32,
      headerHeight: 214,
      topPadding: 30,
      bottomPadding: 44,
    },
    header: { style: 'banner', align: 'left', fullWidth: true },
    photo: 'circleHeader',
    rail: 'badges',
    headingIcons: true,
    infoStyle: 'icons',
    justify: true,
    headingRule: 'under',
    entry: 'dateRight',
    gutterWidth: 96,
    bullet: 'dot',
    colors: {
      paper: WHITE,
      panel: [238, 239, 241],
      ink: [42, 52, 71],
      muted: [110, 120, 138],
      rule: [199, 205, 214],
      accent: [42, 52, 71],
      headerFill: [42, 52, 71],
      headerInk: WHITE,
      panelInk: [42, 52, 71],
    },
    text: {
      name: { size: 27, line: 32, tracking: 0.06 },
      role: { size: 13, line: 18, tracking: 0.1 },
      heading: { size: 12, line: 15, tracking: 0.1 },
      title: { size: 12, line: 15 },
      body: { size: 10.5, line: 16 },
      meta: { size: 10, line: 14, color: 'muted' },
    },
    sections: {
      sidebar: ['info', 'skills', 'languages', 'links', 'hobbies'],
      main: [
        'profile',
        'experience',
        'education',
        'courses',
        'projects',
        'certifications',
      ],
    },
    gaps: { section: 30, heading: 16, entry: 22 },
  }),

  /* 4 -------------------------- serif masthead, hairline column divider */
  define({
    id: 'editorial-serif',
    name: 'Editorial Serif',
    description: 'A tracked eyebrow over a stacked serif name, split by a rule.',
    family: 'serif',
    page: {
      sidebar: 'left',
      sidebarWidth: 250,
      sidebarPaddingLeft: 56,
      sidebarPaddingRight: 30,
      mainPaddingX: 34,
      headerHeight: 218,
      topPadding: 34,
      bottomPadding: 56,
    },
    header: {
      style: 'plain',
      align: 'left',
      fullWidth: true,
      eyebrow: true,
      stackName: true,
      underline: true,
    },
    columnDivider: true,
    infoStyle: 'icons',
    headingRule: 'none',
    entry: 'metaJoined',
    gutterWidth: 96,
    bullet: 'square',
    colors: {
      paper: [254, 254, 253],
      panel: [254, 254, 253],
      ink: [38, 38, 38],
      muted: [128, 124, 118],
      rule: [206, 203, 197],
      accent: [38, 38, 38],
      headerFill: null,
      headerInk: [26, 26, 26],
      panelInk: [38, 38, 38],
    },
    text: {
      name: { size: 40, line: 44, tracking: 0.02, bold: false },
      role: { size: 11, line: 16, tracking: 0.1, color: 'muted' },
      heading: {
        size: 11,
        line: 14,
        tracking: 0.1,
        bold: false,
        color: 'muted',
      },
      title: { size: 10.5, line: 14, bold: true, upper: true, tracking: 0.05 },
      subtitle: { size: 10.5, line: 15 },
      meta: { size: 10.5, line: 15, color: 'muted' },
      body: { size: 10.5, line: 16 },
      small: { size: 10, line: 15, color: 'muted' },
    },
    sections: {
      sidebar: ['info', 'skills', 'languages', 'links'],
      main: [
        'profile',
        'experience',
        'education',
        'courses',
        'projects',
        'certifications',
      ],
    },
    gaps: { section: 34, heading: 18, entry: 22, bulletTop: 9, bulletRow: 6 },
  }),

  /* 5 ---------------------- coral headings, contact row, numbered awards */
  define({
    id: 'coral-studio',
    name: 'Coral Studio',
    description: 'Heavy name, contact columns, coral headings, numbered awards.',
    family: 'sans',
    page: {
      sidebar: 'right',
      sidebarWidth: 214,
      sidebarPaddingLeft: 24,
      sidebarPaddingRight: 30,
      mainPaddingX: 34,
      headerHeight: 200,
      topPadding: 26,
      bottomPadding: 44,
    },
    header: { style: 'plain', align: 'left', fullWidth: false, contactRow: true },
    headingRule: 'none',
    entry: 'stacked',
    gutterWidth: 96,
    bullet: 'none',
    numbered: ['certifications'],
    colors: {
      paper: WHITE,
      panel: WHITE,
      ink: [26, 26, 26],
      muted: [110, 110, 110],
      rule: [232, 232, 232],
      accent: [232, 92, 42],
      headerFill: null,
      headerInk: [26, 26, 26],
      panelInk: [26, 26, 26],
    },
    text: {
      name: { size: 34, line: 38, tracking: 0, upper: false },
      role: { size: 14, line: 19, tracking: 0, upper: false, color: 'muted' },
      heading: { size: 13, line: 16, tracking: 0.02, color: 'accent' },
      title: { size: 11.5, line: 15 },
      body: { size: 10, line: 15 },
      meta: { size: 9.5, line: 13, color: 'muted' },
      label: { size: 9.5, line: 13, bold: true, upper: true, color: 'accent' },
      small: { size: 9.5, line: 13, color: 'muted' },
    },
    sections: {
      sidebar: ['skills', 'languages', 'links', 'hobbies'],
      main: [
        'profile',
        'experience',
        'education',
        'courses',
        'certifications',
        'projects',
      ],
    },
    gaps: { section: 30, heading: 15, entry: 20 },
  }),

  /* 6 -------------------------------------------- dark page, light text */
  define({
    id: 'dark-panel',
    name: 'Dark Panel',
    description: 'Charcoal page with a portrait and pale type.',
    family: 'sans',
    page: {
      sidebar: 'left',
      sidebarWidth: 236,
      sidebarPaddingLeft: 28,
      sidebarPaddingRight: 24,
      mainPaddingX: 34,
      headerHeight: 180,
      topPadding: 28,
      bottomPadding: 44,
    },
    header: { style: 'plain', align: 'left', fullWidth: true, underline: true },
    photo: 'squareHeader',
    infoStyle: 'icons',
    skillStyle: 'chips',
    headingRule: 'none',
    entry: 'stacked',
    gutterWidth: 96,
    bullet: 'dot',
    colors: {
      paper: [26, 26, 28],
      panel: [34, 34, 37],
      ink: [238, 238, 236],
      muted: [150, 150, 148],
      rule: [72, 72, 76],
      accent: [232, 219, 176],
      headerFill: null,
      headerInk: [245, 245, 243],
      panelInk: [232, 232, 230],
    },
    text: {
      name: { size: 32, line: 34, tracking: 0, upper: false },
      role: { size: 14, line: 20, tracking: 0.04, upper: false, color: 'muted' },
      heading: { size: 9.5, line: 12, tracking: 0.1, color: 'accent' },
      title: { size: 12.5, line: 16 },
      body: { size: 10, line: 15 },
      meta: { size: 9.5, line: 13, color: 'muted' },
      small: { size: 9.5, line: 13, color: 'muted' },
      label: { size: 8, line: 11, bold: true, upper: true, color: 'accent' },
    },
    sections: {
      sidebar: ['info', 'skills', 'certifications', 'languages', 'links'],
      main: ['profile', 'experience', 'education', 'courses', 'projects', 'hobbies'],
    },
    gaps: { section: 28, heading: 14, entry: 20 },
  }),

  /* 7 ----------------------------------------- chips, bar rule, blue key */
  define({
    id: 'chip-modern',
    name: 'Chip Modern',
    description: 'Skill chips, bar-marked headings, sidebar on the right.',
    family: 'sans',
    page: {
      sidebar: 'right',
      sidebarWidth: 236,
      sidebarPaddingLeft: 26,
      sidebarPaddingRight: 26,
      mainPaddingX: 40,
      headerHeight: 122,
      topPadding: 34,
      bottomPadding: 44,
    },
    header: { style: 'plain', align: 'left', fullWidth: false },
    headingRule: 'bar',
    entry: 'dateRight',
    gutterWidth: 96,
    bullet: 'dash',
    skillStyle: 'chips',
    infoStyle: 'icons',
    colors: {
      paper: WHITE,
      panel: [244, 246, 249],
      ink: [26, 32, 40],
      muted: [104, 116, 132],
      rule: [212, 220, 228],
      accent: [30, 96, 168],
      headerFill: null,
      headerInk: [26, 32, 40],
      panelInk: [26, 32, 40],
    },
    text: {
      name: { size: 27, line: 31, tracking: 0.01, upper: false },
      role: { size: 12, line: 16, tracking: 0.08, color: 'accent' },
      heading: { size: 10, line: 12, tracking: 0.1, color: 'accent' },
      title: { size: 12.5, line: 15 },
      body: { size: 10.5, line: 15 },
      meta: { size: 10, line: 13, color: 'muted' },
    },
    sections: {
      sidebar: ['info', 'skills', 'languages', 'links', 'hobbies'],
      main: [
        'profile',
        'experience',
        'projects',
        'education',
        'courses',
        'certifications',
      ],
    },
    gaps: { section: 28, heading: 14, entry: 20, bulletTop: 8, bulletRow: 5 },
  }),

  /* 8 ---------------------------------------- oversized name, date gutter */
  define({
    id: 'swiss-grid',
    name: 'Swiss Grid',
    description: 'An oversized name and dates squared off in a left gutter.',
    family: 'sans',
    page: {
      sidebar: 'none',
      sidebarWidth: 0,
      sidebarPaddingLeft: 0,
      sidebarPaddingRight: 0,
      mainPaddingX: 54,
      headerHeight: 176,
      topPadding: 46,
      bottomPadding: 52,
    },
    header: {
      style: 'plain',
      align: 'left',
      fullWidth: true,
      stackName: true,
      underline: true,
    },
    headingRule: 'over',
    entry: 'gutterDates',
    gutterWidth: 132,
    bullet: 'none',
    skillStyle: 'inline',
    colors: {
      paper: [250, 250, 249],
      panel: [250, 250, 249],
      ink: [17, 17, 17],
      muted: [125, 125, 122],
      rule: [17, 17, 17],
      accent: [186, 63, 38],
      headerFill: null,
      headerInk: [17, 17, 17],
      panelInk: [17, 17, 17],
    },
    text: {
      name: { size: 46, line: 46, tracking: -0.02 },
      role: { size: 12, line: 16, tracking: 0.1, color: 'accent' },
      heading: { size: 9.5, line: 12, tracking: 0.1 },
      title: { size: 12.5, line: 16 },
      body: { size: 10.5, line: 16 },
      meta: { size: 10, line: 14, color: 'muted' },
    },
    sections: { sidebar: [], main: [...ALL_MAIN] },
    gaps: { section: 34, heading: 16, entry: 24 },
  }),

  /* 9 ------------------------------------------- hairlines and air only */
  define({
    id: 'minimal-rule',
    name: 'Minimal Rule',
    description: 'No fills, no bullets. Hairlines and white space only.',
    family: 'sans',
    page: {
      sidebar: 'none',
      sidebarWidth: 0,
      sidebarPaddingLeft: 0,
      sidebarPaddingRight: 0,
      mainPaddingX: 92,
      headerHeight: 132,
      topPadding: 66,
      bottomPadding: 64,
    },
    header: { style: 'rules', align: 'center', fullWidth: true },
    headingRule: 'none',
    entry: 'stacked',
    gutterWidth: 96,
    bullet: 'none',
    skillStyle: 'inline',
    colors: {
      paper: WHITE,
      panel: WHITE,
      ink: [32, 32, 32],
      muted: [143, 143, 143],
      rule: [224, 224, 224],
      accent: [32, 32, 32],
      headerFill: null,
      headerInk: [32, 32, 32],
      panelInk: [32, 32, 32],
    },
    text: {
      name: { size: 20, line: 26, tracking: 0.1, bold: false },
      role: { size: 11, line: 16, tracking: 0.1, color: 'muted' },
      heading: { size: 9.5, line: 12, tracking: 0.1, color: 'muted' },
      title: { size: 12, line: 16 },
      body: { size: 11, line: 18 },
      meta: { size: 10, line: 14, color: 'muted' },
    },
    sections: { sidebar: [], main: [...ALL_MAIN] },
    gaps: { section: 38, heading: 18, entry: 26, bulletTop: 10, bulletRow: 8 },
  }),

  /* 10 ------------------------------------- everything on a single page */
  define({
    id: 'dense',
    name: 'Dense',
    description: 'Smallest type and tightest spacing, for a long career.',
    family: 'sans',
    page: {
      sidebar: 'left',
      sidebarWidth: 198,
      sidebarPaddingLeft: 22,
      sidebarPaddingRight: 20,
      mainPaddingX: 26,
      headerHeight: 88,
      topPadding: 26,
      bottomPadding: 32,
    },
    header: { style: 'plain', align: 'left', fullWidth: true, underline: true },
    headingRule: 'under',
    entry: 'metaJoined',
    gutterWidth: 84,
    bullet: 'dot',
    skillStyle: 'chips',
    columnDivider: true,
    colors: {
      paper: WHITE,
      panel: [248, 248, 248],
      ink: [30, 30, 30],
      muted: [112, 112, 112],
      rule: [206, 206, 206],
      accent: [30, 30, 30],
      headerFill: null,
      headerInk: [30, 30, 30],
      panelInk: [30, 30, 30],
    },
    text: {
      name: { size: 19, line: 22, tracking: 0.04 },
      role: { size: 10.5, line: 14, tracking: 0.1, color: 'muted' },
      heading: { size: 9, line: 11, tracking: 0.08 },
      title: { size: 11, line: 13.5 },
      subtitle: { size: 9.5, line: 12.5 },
      meta: { size: 9.5, line: 12.5, color: 'muted' },
      body: { size: 9.5, line: 13.5 },
      small: { size: 9, line: 12, color: 'muted' },
      label: { size: 7.5, line: 10, bold: true, upper: true },
    },
    sections: {
      sidebar: ['info', 'skills', 'languages', 'links', 'hobbies'],
      main: [
        'profile',
        'experience',
        'projects',
        'education',
        'courses',
        'certifications',
      ],
    },
    gaps: { section: 20, heading: 11, entry: 14, bulletTop: 6, bulletRow: 3 },
  }),
]

export const DEFAULT_TEMPLATE_ID = templates[0].id

export function getTemplate(id: string | undefined): Template {
  return templates.find((entry) => entry.id === id) ?? templates[0]
}
