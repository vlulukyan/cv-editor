import type { IconName } from './icons'

export type RGB = readonly [number, number, number]

/** Every section the CV can show, in either column. */
export type SectionId =
  | 'info'
  | 'profile'
  | 'experience'
  | 'education'
  | 'courses'
  | 'certifications'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'hobbies'
  | 'links'

/**
 * Only families jsPDF ships built in, so a template never needs an embedded
 * font and the exported text stays extractable.
 */
export type FontFamily = 'sans' | 'serif' | 'mono'

export type TextRole =
  | 'heading'
  | 'title'
  | 'subtitle'
  | 'meta'
  | 'body'
  | 'small'
  | 'label'
  | 'name'
  | 'role'

export type TextSpec = {
  size: number
  line: number
  bold?: boolean
  /** Letter spacing in em. Above ~0.10em PDF extractors split words. */
  tracking?: number
  upper?: boolean
  color?: 'ink' | 'muted' | 'accent' | 'headerInk' | 'panelInk'
}

export type Template = {
  id: string
  name: string
  description: string
  family: FontFamily

  page: {
    sidebar: 'left' | 'right' | 'none'
    sidebarWidth: number
    sidebarPaddingLeft: number
    sidebarPaddingRight: number
    mainPaddingX: number
    /** Vertical space the page-one header takes before content starts. */
    headerHeight: number
    topPadding: number
    bottomPadding: number
  }

  header: {
    style: 'boxed' | 'banner' | 'plain' | 'rules' | 'none'
    align: 'left' | 'center'
    /** Whether the header spans the sidebar too. */
    fullWidth: boolean
    /** Role shown as a small tracked line above the name. */
    eyebrow?: boolean
    /** Break the name onto its own lines, one word per line. */
    stackName?: boolean
    /** Rule drawn beneath the whole header block. */
    underline?: boolean
    /** Contact details laid out as columns under the name. */
    contactRow?: boolean
  }

  /** Portrait treatment. Photos are optional; templates opt in. */
  photo: 'none' | 'circleHeader' | 'circleSidebar' | 'squareHeader'

  /** A vertical rail down the main column, as on a timeline resume. */
  rail: 'none' | 'nodes' | 'badges'

  /** Hairline between the two columns. */
  columnDivider: boolean

  /** How the info block presents each contact line. */
  infoStyle: 'stacked' | 'icons'

  /** How a skill group is presented. */
  skillStyle: 'bullets' | 'chips' | 'inline'

  /** Body text justification. */
  justify: boolean

  /** Section headings that carry a small icon. */
  headingIcons: boolean

  /** Sections whose entries are numbered 01, 02, 03. */
  numbered: SectionId[]

  /** How a section heading is separated from its entries. */
  headingRule: 'under' | 'over' | 'none' | 'bar'

  /** How an entry lays out its title, dates and place. */
  entry: 'locationRight' | 'stacked' | 'gutterDates' | 'metaJoined' | 'dateRight'
  /** Width of the date gutter when `entry` is 'gutterDates'. */
  gutterWidth: number

  bullet: 'dot' | 'dash' | 'square' | 'none'

  text: Record<TextRole, TextSpec>

  colors: {
    paper: RGB
    panel: RGB
    ink: RGB
    muted: RGB
    rule: RGB
    accent: RGB
    headerFill: RGB | null
    headerInk: RGB
    panelInk: RGB
  }

  sections: {
    sidebar: SectionId[]
    main: SectionId[]
  }

  gaps: {
    section: number
    heading: number
    entry: number
    bulletRow: number
    bulletTop: number
  }
}

export const PAGE_WIDTH = 794
export const PAGE_HEIGHT = 1123

/** Font stacks that match the metrics of the PDF's built-in families. */
export const FONT_STACKS: Record<FontFamily, string> = {
  sans: 'Arial, Helvetica, sans-serif',
  serif: '"Times New Roman", Times, serif',
  mono: '"Courier New", Courier, monospace',
}

export const PDF_FONTS: Record<FontFamily, string> = {
  sans: 'helvetica',
  serif: 'times',
  mono: 'courier',
}

export type { IconName }

export const rgbCss = ([red, green, blue]: RGB) => `rgb(${red},${green},${blue})`
