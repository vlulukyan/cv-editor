import { PAGE_HEIGHT, PAGE_WIDTH, type Template } from '../templates/types'

/** Indent given to a block that carries a rail node or an ordinal. */
export const MARKER_GUTTER = 30

/** Where the timeline rail sits inside that gutter. */
export const RAIL_X = 9

/**
 * Where each column starts and how much room it has, derived from the
 * template. Both renderers read this so they can never disagree on geometry.
 */
export function columnMetrics(template: Template) {
  const { page } = template
  const hasSidebar = page.sidebar !== 'none'
  const sidebarContentWidth = hasSidebar
    ? page.sidebarWidth - page.sidebarPaddingLeft - page.sidebarPaddingRight
    : 0
  const mainWidth = PAGE_WIDTH - (hasSidebar ? page.sidebarWidth : 0)

  return {
    sidebarContentWidth,
    mainContentWidth: mainWidth - page.mainPaddingX * 2,
    mainX:
      page.sidebar === 'left'
        ? page.sidebarWidth + page.mainPaddingX
        : page.mainPaddingX,
    sidebarX:
      page.sidebar === 'right'
        ? mainWidth + page.sidebarPaddingLeft
        : page.sidebarPaddingLeft,
    firstTop: page.headerHeight + page.topPadding,
    nextTop: page.topPadding,
    firstHeight:
      PAGE_HEIGHT - page.headerHeight - page.topPadding - page.bottomPadding,
    nextHeight: PAGE_HEIGHT - page.topPadding - page.bottomPadding,
  }
}
