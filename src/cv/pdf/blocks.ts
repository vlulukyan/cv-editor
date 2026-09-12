import type jsPDF from 'jspdf'
import type { FlowBlock } from '../paginate'
import type { RGB, Template, TextSpec } from '../templates/types'
import { normalizeUrl } from '../utils'
import type { BlockSpec, Part } from '../render/spec'
import { MARKER_GUTTER, RAIL_X } from '../render/metrics'
import { type Block, type PdfItem, createBlock, measureText } from './draw'

export type PdfBlock = FlowBlock<PdfItem[]> & { height: number }

type ColorKey = 'ink' | 'muted' | 'accent' | 'headerInk' | 'panelInk'

/** Resolves a template text role into the concrete style the drawer needs. */
export function resolveStyle(
  spec: TextSpec,
  template: Template,
  fallback: ColorKey,
  align?: 'left' | 'right' | 'center',
) {
  return {
    size: spec.size,
    lineHeight: spec.line,
    bold: spec.bold,
    tracking: spec.tracking ? spec.tracking * spec.size : 0,
    upper: spec.upper,
    color: template.colors[spec.color ?? fallback] as RGB,
    family: template.family,
    align,
  }
}

const PART_GAP = 6

function addHeading(
  block: Block,
  width: number,
  part: Extract<Part, { kind: 'heading' }>,
  template: Template,
  fallback: ColorKey,
) {
  const style = resolveStyle(template.text.heading, template, fallback)
  const iconSize = style.size + 3
  const iconGap = part.icon ? iconSize + 7 : 0

  const drawLabel = (x: number) => {
    if (part.icon) {
      block.icon(part.icon, x, block.height + 1, iconSize, style.color)
    }

    block.text(part.text, style, {
      x: x + iconGap,
      width: width - x - iconGap,
    })
  }

  if (template.headingRule === 'bar') {
    const top = block.height

    block.bar(0, top + style.lineHeight / 2 - 1, 14, 2, template.colors.accent)
    drawLabel(22)
    return
  }

  if (template.headingRule === 'over') {
    block.rule(0, width, template.colors.rule)
    block.space(8)
  }

  drawLabel(0)

  if (template.headingRule === 'under') {
    block.space(10)
    block.rule(0, width, template.colors.rule)
  }
}

function addBullets(
  block: Block,
  width: number,
  items: string[],
  template: Template,
  fallback: ColorKey,
) {
  if (!items.length) return

  const style = resolveStyle(template.text.body, template, fallback)
  const inkColor = template.colors[fallback] as RGB

  block.space(template.gaps.bulletTop)

  const markerWidth = template.bullet === 'dash' ? 6 : 3
  const textX = template.bullet === 'none' ? 0 : 6 + markerWidth + 9

  items.forEach((item, index) => {
    if (index > 0) block.space(template.gaps.bulletRow)

    const rowTop = block.height

    if (template.bullet === 'dash') {
      block.bar(6, rowTop + (style.lineHeight - 1) / 2, 6, 1, inkColor)
    } else if (template.bullet === 'square') {
      block.bar(6, rowTop + (style.lineHeight - 3) / 2, 3, 3, inkColor)
    } else if (template.bullet === 'dot') {
      block.dot(6, rowTop + (style.lineHeight - 3) / 2, 3, inkColor)
    }

    block.text(item, style, { x: textX, width: width - textX })
  })
}

function addEntry(
  doc: jsPDF,
  block: Block,
  width: number,
  part: Extract<Part, { kind: 'entry' }>,
  template: Template,
  fallback: ColorKey,
) {
  const titleStyle = resolveStyle(template.text.title, template, fallback)
  const subtitleStyle = resolveStyle(template.text.subtitle, template, fallback)
  const metaStyle = resolveStyle(template.text.meta, template, fallback)
  const smallStyle = resolveStyle(template.text.small, template, fallback)

  if (template.entry === 'gutterDates') {
    const contentX = template.gutterWidth + 16
    const contentWidth = width - contentX

    if (part.period) {
      block.text(part.period, metaStyle, {
        x: 0,
        width: template.gutterWidth,
        at: 0,
      })
    }

    block.text(part.title, titleStyle, { x: contentX, width: contentWidth })
    if (part.subtitle) {
      block.text(part.subtitle, subtitleStyle, { x: contentX, width: contentWidth })
    }
    if (part.location) {
      block.text(part.location, smallStyle, { x: contentX, width: contentWidth })
    }

    block.extendTo(metaStyle.lineHeight)
    return
  }

  if (template.entry === 'metaJoined') {
    const meta = [part.subtitle, part.location, part.period]
      .filter(Boolean)
      .join('  ·  ')

    block.text(part.title, titleStyle)
    if (meta) block.text(meta, metaStyle)
    return
  }

  if (template.entry === 'dateRight') {
    const periodWidth = part.period
      ? measureText(doc, part.period, metaStyle)
      : 0

    if (part.period) {
      block.text(part.period, metaStyle, {
        x: width - periodWidth,
        width: periodWidth,
        at: block.height + (titleStyle.lineHeight - metaStyle.lineHeight) / 2,
      })
    }

    block.text(part.title, titleStyle, {
      width: width - (part.period ? periodWidth + 12 : 0),
    })
    if (part.subtitle) block.text(part.subtitle, subtitleStyle)
    if (part.location) block.text(part.location, smallStyle)
    return
  }

  if (template.entry === 'stacked') {
    const meta = [part.period, part.location].filter(Boolean).join(', ')

    block.text(part.title, titleStyle)
    if (part.subtitle) block.text(part.subtitle, subtitleStyle)
    if (meta) block.text(meta, metaStyle)
    return
  }

  const locationWidth = part.location
    ? measureText(doc, part.location, smallStyle)
    : 0
  const titleWidth = width - (part.location ? locationWidth + 16 : 0)

  block.text(part.title, titleStyle, { width: titleWidth })
  if (part.subtitle) block.text(part.subtitle, subtitleStyle, { width: titleWidth })
  if (part.period) block.text(part.period, metaStyle, { width: titleWidth })

  if (part.location) {
    block.text(part.location, smallStyle, {
      x: width - locationWidth,
      width: locationWidth,
      at: 2,
    })
    block.extendTo(2 + smallStyle.lineHeight)
  }
}

function addChips(
  doc: jsPDF,
  block: Block,
  width: number,
  items: string[],
  template: Template,
  fallback: ColorKey,
) {
  const style = resolveStyle(template.text.small, template, fallback)
  const chipStyle = { ...style, color: template.colors[fallback] as RGB }
  const height = style.lineHeight + 4
  const padding = 8
  const gap = 5

  let x = 0
  let top = block.height

  for (const item of items) {
    const textWidth = measureText(doc, item, chipStyle)
    const chipWidth = textWidth + padding * 2

    if (x > 0 && x + chipWidth > width) {
      x = 0
      top += height + gap
    }

    block.chip(x, top, chipWidth, height, template.colors.rule)
    block.text(item, chipStyle, { x: x + padding, width: textWidth, at: top + 2 })

    x += chipWidth + gap
  }

  block.extendTo(top + height)
}

function addPart(
  doc: jsPDF,
  block: Block,
  width: number,
  part: Part,
  template: Template,
  fallback: ColorKey,
) {
  switch (part.kind) {
    case 'heading':
      addHeading(block, width, part, template, fallback)
      break

    case 'paragraph':
    case 'inline':
      block.text(part.text, resolveStyle(template.text.body, template, fallback))
      break

    case 'entry':
      addEntry(doc, block, width, part, template, fallback)
      break

    case 'bullets':
      addBullets(block, width, part.items, template, fallback)
      break

    case 'chips':
      addChips(doc, block, width, part.items, template, fallback)
      break

    case 'labeled': {
      const labelStyle = resolveStyle(template.text.label, template, fallback)
      const valueStyle = {
        ...resolveStyle(template.text.small, template, fallback),
        color: template.colors[fallback] as RGB,
      }
      const withIcons = template.infoStyle === 'icons'
      const iconSize = valueStyle.size + 2
      const textX = withIcons ? iconSize + 8 : 0

      part.rows.forEach((row, index) => {
        if (index > 0) block.space(withIcons ? 10 : 12)

        if (withIcons) {
          block.icon(
            row.icon,
            0,
            block.height + 2,
            iconSize,
            template.colors.muted,
          )
        } else {
          block.text(row.label, labelStyle)
        }

        for (const value of row.values) {
          block.text(value, valueStyle, { x: textX, width: width - textX })
        }
      })
      break
    }

    case 'lines': {
      const style = resolveStyle(template.text.meta, template, fallback)

      part.items.forEach((item, index) => {
        if (index > 0) block.space(10)
        block.text(item, style)
      })
      break
    }

    case 'links': {
      const style = resolveStyle(template.text.meta, template, fallback)

      part.items.forEach((link, index) => {
        if (index > 0) block.space(6)

        const url = normalizeUrl(link.url)

        block.text(link.title || link.url, style, { link: url || undefined })
      })
      break
    }

    case 'skill': {
      const titleStyle = resolveStyle(template.text.subtitle, template, fallback)

      block.text(`${part.title}:`, { ...titleStyle, bold: true })
      addBullets(block, width, part.items, template, fallback)
      break
    }
  }
}

/** The rail node or ordinal drawn in a block's left gutter. */
function addMarker(
  block: Block,
  spec: BlockSpec,
  template: Template,
  fallback: ColorKey,
) {
  if (!spec.marker) return

  if (spec.marker.kind === 'number') {
    const style = {
      ...resolveStyle(template.text.title, template, fallback),
      size: template.text.title.size + 7,
      color: template.colors.accent,
      bold: true,
    }

    block.text(String(spec.marker.value).padStart(2, '0'), style, {
      x: 0,
      width: MARKER_GUTTER,
      at: 0,
    })
    return
  }

  const isBadge = template.rail === 'badges' && spec.parts[0]?.kind === 'heading'
  const size = isBadge ? 16 : 7

  if (isBadge) {
    block.dot(RAIL_X - size / 2, 0, size, template.colors.accent)
  } else {
    block.ring(
      RAIL_X - size / 2,
      6,
      size,
      template.colors.accent,
      template.colors.paper,
    )
  }
}

export function specsToPdfBlocks(
  doc: jsPDF,
  specs: BlockSpec[],
  width: number,
  template: Template,
  fallback: ColorKey,
): PdfBlock[] {
  return specs.map((spec) => {
    const indent = spec.marker ? MARKER_GUTTER : 0
    const block = createBlock(doc, width)

    addMarker(block, spec, template, fallback)

    // Markers live in the gutter; the content is laid out beside them and
    // shifted as a whole so both renderers indent identically.
    const inner = createBlock(doc, width - indent)

    spec.parts.forEach((part, index) => {
      if (index > 0) inner.space(PART_GAP)
      addPart(doc, inner, width - indent, part, template, fallback)
    })

    const shifted = inner.items.map((item) =>
      'x' in item ? { ...item, x: item.x + indent } : item,
    )

    return {
      key: spec.key,
      gapBefore: spec.gapBefore,
      keepWithNext: spec.keepWithNext,
      node: [...block.items, ...shifted],
      height: Math.max(block.height, inner.height),
    }
  })
}
