import type jsPDF from 'jspdf'
import { type FontFamily, PDF_FONTS, type RGB } from '../templates/types'
import { ICONS, ICON_BOX, type IconName } from '../templates/icons'

/** The whole app lays out in CSS pixels at 96dpi; PDF points are 72dpi. */
const PX_TO_PT = 0.75

export const toPt = (px: number) => px * PX_TO_PT

/**
 * Where a browser puts the baseline inside a line box for the metrics of the
 * families used here, reduced to a single ratio of the font size.
 */
const BASELINE_RATIO = 0.3465

export type TextStyle = {
  /** Font size in px, matching the template's size for this role. */
  size: number
  /** Line box height in px. */
  lineHeight: number
  bold?: boolean
  upper?: boolean
  /** Letter spacing in px. */
  tracking?: number
  color: RGB
  family: FontFamily
  align?: 'left' | 'right' | 'center'
}

export type PdfItem =
  | {
      kind: 'text'
      lines: string[]
      style: TextStyle
      x: number
      y: number
      width: number
      link?: string
    }
  | { kind: 'rule'; x: number; y: number; width: number; color: RGB }
  | {
      kind: 'bar'
      x: number
      y: number
      width: number
      height: number
      color: RGB
    }
  | { kind: 'dot'; x: number; y: number; size: number; color: RGB }
  | {
      kind: 'ring'
      x: number
      y: number
      size: number
      color: RGB
      fill: RGB
    }
  | {
      kind: 'icon'
      name: IconName
      x: number
      y: number
      size: number
      color: RGB
    }
  | {
      kind: 'chip'
      x: number
      y: number
      width: number
      height: number
      color: RGB
    }
  | {
      kind: 'image'
      dataUrl: string
      x: number
      y: number
      width: number
      height: number
    }

function applyTextStyle(doc: jsPDF, style: TextStyle) {
  doc.setFont(PDF_FONTS[style.family], style.bold ? 'bold' : 'normal')
  doc.setFontSize(toPt(style.size))
  doc.setCharSpace(toPt(style.tracking ?? 0))

  const [red, green, blue] = style.color

  doc.setTextColor(red, green, blue)
}

/**
 * jsPDF's own width helpers ignore character spacing, so tracked text has to
 * be measured by hand or headings would be laid out far too narrow.
 */
function measureLine(doc: jsPDF, line: string, style: TextStyle) {
  const trackingWidth = (style.tracking ?? 0) * line.length

  return doc.getTextWidth(line) / PX_TO_PT + trackingWidth
}

export function measureText(doc: jsPDF, text: string, style: TextStyle) {
  applyTextStyle(doc, style)

  return measureLine(doc, style.upper ? text.toUpperCase() : text, style)
}

function splitLongWord(
  doc: jsPDF,
  word: string,
  width: number,
  style: TextStyle,
) {
  const parts: string[] = []
  let current = ''

  for (const character of word) {
    const candidate = current + character

    if (current && measureLine(doc, candidate, style) > width) {
      parts.push(current)
      current = character
    } else {
      current = candidate
    }
  }

  if (current) parts.push(current)

  return parts
}

/** Greedy word wrap that accounts for tracking and breaks over-long tokens. */
export function wrapText(
  doc: jsPDF,
  text: string,
  width: number,
  style: TextStyle,
) {
  applyTextStyle(doc, style)

  const lines: string[] = []

  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)

    if (!words.length) {
      lines.push('')
      continue
    }

    let current = ''

    for (const word of words) {
      if (measureLine(doc, word, style) > width) {
        if (current) lines.push(current)

        const parts = splitLongWord(doc, word, width, style)

        lines.push(...parts.slice(0, -1))
        current = parts[parts.length - 1] ?? ''
        continue
      }

      const candidate = current ? `${current} ${word}` : word

      if (current && measureLine(doc, candidate, style) > width) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    }

    lines.push(current)
  }

  return lines
}

export function textHeight(lines: string[], style: TextStyle) {
  return lines.length * style.lineHeight
}

export function drawItems(
  doc: jsPDF,
  items: PdfItem[],
  offsetX: number,
  offsetY: number,
) {
  for (const item of items) {
    if (item.kind === 'rule') {
      const [red, green, blue] = item.color

      doc.setDrawColor(red, green, blue)
      doc.setLineWidth(toPt(1))
      doc.line(
        toPt(offsetX + item.x),
        toPt(offsetY + item.y + 0.5),
        toPt(offsetX + item.x + item.width),
        toPt(offsetY + item.y + 0.5),
      )
      continue
    }

    if (item.kind === 'bar') {
      const [red, green, blue] = item.color

      doc.setFillColor(red, green, blue)
      doc.rect(
        toPt(offsetX + item.x),
        toPt(offsetY + item.y),
        toPt(item.width),
        toPt(item.height),
        'F',
      )
      continue
    }

    if (item.kind === 'dot') {
      const [red, green, blue] = item.color
      const radius = item.size / 2

      doc.setFillColor(red, green, blue)
      doc.circle(
        toPt(offsetX + item.x + radius),
        toPt(offsetY + item.y + radius),
        toPt(radius),
        'F',
      )
      continue
    }

    if (item.kind === 'ring') {
      const [red, green, blue] = item.color
      const [fillRed, fillGreen, fillBlue] = item.fill
      const radius = item.size / 2

      doc.setDrawColor(red, green, blue)
      doc.setFillColor(fillRed, fillGreen, fillBlue)
      doc.setLineWidth(toPt(2))
      doc.circle(
        toPt(offsetX + item.x + radius),
        toPt(offsetY + item.y + radius),
        toPt(radius),
        'FD',
      )
      continue
    }

    if (item.kind === 'chip') {
      const [red, green, blue] = item.color

      doc.setDrawColor(red, green, blue)
      doc.setLineWidth(toPt(1))
      doc.roundedRect(
        toPt(offsetX + item.x),
        toPt(offsetY + item.y),
        toPt(item.width),
        toPt(item.height),
        toPt(item.height / 2),
        toPt(item.height / 2),
        'D',
      )
      continue
    }

    if (item.kind === 'image') {
      try {
        doc.addImage(
          item.dataUrl,
          toPt(offsetX + item.x),
          toPt(offsetY + item.y),
          toPt(item.width),
          toPt(item.height),
        )
      } catch {
        // An unreadable portrait must not take the whole export down.
      }
      continue
    }

    if (item.kind === 'icon') {
      const [red, green, blue] = item.color
      const scale = item.size / ICON_BOX
      const px = (value: number) => toPt(offsetX + item.x + value * scale)
      const py = (value: number) => toPt(offsetY + item.y + value * scale)

      doc.setDrawColor(red, green, blue)
      doc.setFillColor(red, green, blue)
      doc.setLineWidth(toPt(1.1 * scale))

      for (const shape of ICONS[item.name]) {
        if (shape.t === 'line') {
          doc.line(px(shape.x1), py(shape.y1), px(shape.x2), py(shape.y2))
        } else if (shape.t === 'circle') {
          doc.circle(
            px(shape.cx),
            py(shape.cy),
            toPt(shape.r * scale),
            shape.fill ? 'F' : 'D',
          )
        } else {
          doc.rect(
            px(shape.x),
            py(shape.y),
            toPt(shape.w * scale),
            toPt(shape.h * scale),
            shape.fill ? 'F' : 'D',
          )
        }
      }
      continue
    }

    applyTextStyle(doc, item.style)

    item.lines.forEach((line, lineIndex) => {
      const lineTop = offsetY + item.y + lineIndex * item.style.lineHeight
      const baseline =
        lineTop + item.style.lineHeight / 2 + item.style.size * BASELINE_RATIO
      const lineWidth = measureLine(doc, line, item.style)

      let x = offsetX + item.x

      if (item.style.align === 'right') x += item.width - lineWidth
      if (item.style.align === 'center') x += (item.width - lineWidth) / 2

      doc.text(line, toPt(x), toPt(baseline))

      if (item.link) {
        doc.link(
          toPt(x),
          toPt(lineTop),
          toPt(lineWidth),
          toPt(item.style.lineHeight),
          { url: item.link },
        )
      }
    })
  }

  doc.setCharSpace(0)
}

type TextOptions = {
  x?: number
  width?: number
  /** Draw at this offset without advancing the cursor. */
  at?: number
  link?: string
}

/**
 * Accumulates positioned items for one block and tracks its height, so the
 * block can be measured before the paginator decides which page it lands on.
 */
export function createBlock(doc: jsPDF, width: number) {
  const items: PdfItem[] = []
  let cursor = 0

  return {
    items,
    get height() {
      return cursor
    },
    space(px: number) {
      cursor += px
    },
    extendTo(y: number) {
      cursor = Math.max(cursor, y)
    },
    text(value: string, style: TextStyle, options: TextOptions = {}) {
      const x = options.x ?? 0
      const itemWidth = options.width ?? width - x
      // Uppercase before wrapping, or the measured width would be wrong.
      const content = style.upper ? value.toUpperCase() : value
      const lines = wrapText(doc, content, itemWidth, style)
      const y = options.at ?? cursor

      items.push({
        kind: 'text',
        lines,
        style,
        x,
        y,
        width: itemWidth,
        link: options.link,
      })

      const height = textHeight(lines, style)

      if (options.at === undefined) cursor = y + height

      return height
    },
    rule(x: number, ruleWidth: number, color: RGB) {
      items.push({ kind: 'rule', x, y: cursor, width: ruleWidth, color })
      cursor += 1
    },
    bar(x: number, y: number, barWidth: number, height: number, color: RGB) {
      items.push({ kind: 'bar', x, y, width: barWidth, height, color })
      cursor = Math.max(cursor, y + height)
    },
    dot(x: number, y: number, size: number, color: RGB) {
      items.push({ kind: 'dot', x, y, size, color })
    },
    ring(x: number, y: number, size: number, color: RGB, fill: RGB) {
      items.push({ kind: 'ring', x, y, size, color, fill })
    },
    icon(name: IconName, x: number, y: number, size: number, color: RGB) {
      items.push({ kind: 'icon', name, x, y, size, color })
    },
    chip(x: number, y: number, chipWidth: number, height: number, color: RGB) {
      items.push({ kind: 'chip', x, y, width: chipWidth, height, color })
    },
  }
}

export type Block = ReturnType<typeof createBlock>
