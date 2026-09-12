import type { ReactNode } from 'react'

/**
 * A unit of content that flows onto a page. `node` is whatever the renderer
 * needs - React elements for the preview, draw instructions for the PDF.
 */
export type FlowBlock<T = ReactNode> = {
  key: string
  node: T
  /** Space added above this block when it is not the first block on a page. */
  gapBefore: number
  /** Never let a page end on this block - it belongs with the block after it. */
  keepWithNext?: boolean
}

export type BlockHeights = Record<string, number>

type FlowGroup<B> = {
  blocks: B[]
  gapBefore: number
  height: number
}

/**
 * Chains every `keepWithNext` block onto the block that follows it, so a
 * section heading can never be left stranded at the bottom of a page.
 */
function groupBlocks<B extends FlowBlock<unknown>>(
  blocks: B[],
  heights: BlockHeights,
): FlowGroup<B>[] {
  const groups: FlowGroup<B>[] = []
  let current: FlowGroup<B> | null = null

  for (const block of blocks) {
    const height = heights[block.key] ?? 0

    if (current) {
      current.blocks.push(block)
      current.height += block.gapBefore + height
    } else {
      current = { blocks: [block], gapBefore: block.gapBefore, height }
    }

    if (!block.keepWithNext) {
      groups.push(current)
      current = null
    }
  }

  if (current) groups.push(current)

  return groups
}

/**
 * Fills each page to its available height before starting the next one, so
 * content always flows upwards instead of sitting on a fixed page.
 */
export function paginateBlocks<B extends FlowBlock<unknown>>(
  blocks: B[],
  heights: BlockHeights,
  firstPageHeight: number,
  nextPageHeight: number,
): B[][] {
  const pages: B[][] = []
  const groups = groupBlocks(blocks, heights)

  let currentPage: B[] = []
  let usedHeight = 0
  let availableHeight = firstPageHeight

  for (const group of groups) {
    const gap = currentPage.length ? group.gapBefore : 0
    const doesNotFit = usedHeight + gap + group.height > availableHeight

    if (doesNotFit && currentPage.length) {
      pages.push(currentPage)
      currentPage = []
      usedHeight = 0
      availableHeight = nextPageHeight
    }

    usedHeight += (currentPage.length ? group.gapBefore : 0) + group.height
    currentPage.push(...group.blocks)
  }

  pages.push(currentPage)

  return pages
}

/** Pairs up both columns, padded so every page has an entry for each. */
export function mergeColumnPages<B>(mainPages: B[][], sidebarPages: B[][]) {
  const pageCount = Math.max(mainPages.length, sidebarPages.length, 1)

  return Array.from({ length: pageCount }, (_, index) => ({
    main: mainPages[index] ?? [],
    sidebar: sidebarPages[index] ?? [],
  }))
}
