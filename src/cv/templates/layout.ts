import type { Template, TextRole, TextSpec } from './types'
import { PAGE_WIDTH } from './types'

/** Per-document tweaks layered on top of whatever the template specifies. */
export type LayoutOverrides = {
  /** Scales type and spacing. 1 keeps the template's own proportions. */
  density?: number
  /** Replaces the template's sidebar width, in px. */
  sidebarWidth?: number
}

export const DENSITY_RANGE = { min: 0.72, max: 1.15 } as const
export const SIDEBAR_RANGE = { min: 150, max: 330 } as const

/** The main column must stay wide enough to read. */
const MIN_MAIN_CONTENT = 260

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

function scaleText(spec: TextSpec, density: number): TextSpec {
  return {
    ...spec,
    size: Math.round(spec.size * density * 10) / 10,
    line: Math.round(spec.line * density * 10) / 10,
  }
}

/**
 * Applies the document's own layout tweaks. Kept separate from the presets so
 * a template stays a fixed description and the user's adjustments stay data.
 */
export function applyLayout(
  template: Template,
  overrides: LayoutOverrides | undefined,
): Template {
  if (!overrides) return template

  const density = clamp(
    overrides.density ?? 1,
    DENSITY_RANGE.min,
    DENSITY_RANGE.max,
  )
  const hasSidebar = template.page.sidebar !== 'none'

  let sidebarWidth = template.page.sidebarWidth

  if (hasSidebar && overrides.sidebarWidth) {
    sidebarWidth = clamp(
      overrides.sidebarWidth,
      SIDEBAR_RANGE.min,
      Math.min(
        SIDEBAR_RANGE.max,
        PAGE_WIDTH - template.page.mainPaddingX * 2 - MIN_MAIN_CONTENT,
      ),
    )
  }

  if (density === 1 && sidebarWidth === template.page.sidebarWidth) {
    return template
  }

  const text = Object.fromEntries(
    (Object.keys(template.text) as TextRole[]).map((role) => [
      role,
      scaleText(template.text[role], density),
    ]),
  ) as Record<TextRole, TextSpec>

  const scale = (value: number) => Math.round(value * density)

  return {
    ...template,
    text,
    page: {
      ...template.page,
      sidebarWidth,
      headerHeight: scale(template.page.headerHeight),
      topPadding: scale(template.page.topPadding),
      bottomPadding: scale(template.page.bottomPadding),
    },
    gaps: {
      section: scale(template.gaps.section),
      heading: scale(template.gaps.heading),
      entry: scale(template.gaps.entry),
      bulletRow: Math.max(2, scale(template.gaps.bulletRow)),
      bulletTop: Math.max(4, scale(template.gaps.bulletTop)),
    },
  }
}
