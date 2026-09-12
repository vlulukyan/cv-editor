import jsPDF from 'jspdf'
import { type BlockHeights, mergeColumnPages, paginateBlocks } from '../paginate'
import { RAIL_X, columnMetrics } from '../render/metrics'
import { buildColumnSpecs } from '../render/spec'
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  type RGB,
  type Template,
} from '../templates/types'
import type { CVData } from '../types'
import { type PdfBlock, resolveStyle, specsToPdfBlocks } from './blocks'
import { createBlock, drawItems, toPt } from './draw'

function fill(
  doc: jsPDF,
  color: RGB,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const [red, green, blue] = color

  doc.setFillColor(red, green, blue)
  doc.rect(toPt(x), toPt(y), toPt(width), toPt(height), 'F')
}

function drawPageBackground(doc: jsPDF, template: Template) {
  const { page, colors } = template

  fill(doc, colors.paper, 0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  if (page.sidebar === 'none') return

  const x = page.sidebar === 'left' ? 0 : PAGE_WIDTH - page.sidebarWidth

  fill(doc, colors.panel, x, 0, page.sidebarWidth, PAGE_HEIGHT)
}

function photoBox(template: Template) {
  const metrics = columnMetrics(template)
  const isCircle = template.photo !== 'squareHeader'
  const size = isCircle ? 112 : 96
  const right = template.header.fullWidth
    ? template.page.mainPaddingX
    : PAGE_WIDTH - metrics.mainX - metrics.mainContentWidth

  return {
    size,
    x: PAGE_WIDTH - right - size,
    y: Math.max(20, (template.page.headerHeight - size) / 2),
  }
}

function drawPhoto(doc: jsPDF, data: CVData, template: Template) {
  if (!data.photo || template.photo === 'none') return

  const { x, y, size } = photoBox(template)

  try {
    doc.addImage(data.photo, toPt(x), toPt(y), toPt(size), toPt(size))
  } catch {
    // A portrait that will not decode must not fail the whole export.
  }
}

function drawHeader(doc: jsPDF, data: CVData, template: Template) {
  const { header, page, colors } = template

  if (header.style === 'none') return

  const metrics = columnMetrics(template)
  const nameStyle = resolveStyle(template.text.name, template, 'headerInk')
  const roleStyle = resolveStyle(template.text.role, template, 'headerInk')

  const cased = (value: string, upper?: boolean) =>
    upper ? value.toUpperCase() : value

  const labelStyle = resolveStyle(template.text.label, template, 'headerInk')
  const smallStyle = resolveStyle(template.text.small, template, 'headerInk')

  /**
   * Draws the whole masthead - optional eyebrow, the name (stacked word by
   * word when the template asks), the role and a contact row - and reports the
   * height it used so a rule can be placed under it.
   */
  const drawText = (
    x: number,
    y: number,
    boxWidth: number,
    boxAlign: 'left' | 'center',
  ) => {
    const block = createBlock(doc, boxWidth)
    const role = cased(data.personal.title, template.text.role.upper)
    const aligned = <T extends { align?: string }>(style: T) => ({
      ...style,
      align: boxAlign,
    })

    if (header.eyebrow && data.personal.title) {
      block.text(role, aligned(roleStyle))
      block.space(8)
    }

    const words = header.stackName
      ? data.personal.fullName.split(/\s+/).filter(Boolean)
      : [data.personal.fullName]

    for (const word of words) {
      block.text(cased(word, template.text.name.upper), aligned(nameStyle))
    }

    if (!header.eyebrow && data.personal.title) {
      block.space(6)
      block.text(role, aligned(roleStyle))
    }

    if (header.contactRow) {
      const columns = [
        { label: 'Phone', value: data.personal.phone },
        { label: 'Address', value: data.personal.address },
        { label: 'Email', value: data.personal.email },
      ].filter((column) => column.value)

      if (columns.length) {
        block.space(16)

        const gap = 26
        const columnWidth = (boxWidth - gap * (columns.length - 1)) / columns.length
        const top = block.height

        columns.forEach((column, index) => {
          const columnX = index * (columnWidth + gap)
          const inner = createBlock(doc, columnWidth)

          inner.text(column.label, labelStyle)
          inner.space(4)
          inner.text(column.value, smallStyle)

          drawItems(
            doc,
            inner.items.map((item) =>
              'x' in item ? { ...item, x: item.x + columnX } : item,
            ),
            x,
            y + top,
          )
          block.extendTo(top + inner.height)
        })
      }
    }

    drawItems(doc, block.items, x, y)

    return block.height
  }

  const left = header.fullWidth ? page.mainPaddingX : metrics.mainX
  const width = header.fullWidth
    ? PAGE_WIDTH - page.mainPaddingX * 2
    : metrics.mainContentWidth
  const hasPhoto = Boolean(data.photo) && template.photo !== 'none'
  const textWidth = width - (hasPhoto ? 130 : 0)

  if (header.style === 'banner') {
    if (colors.headerFill) {
      fill(doc, colors.headerFill, 0, 0, PAGE_WIDTH, page.headerHeight)
    }

    drawText(page.mainPaddingX, page.headerHeight / 2 - 30, textWidth, 'left')
    drawPhoto(doc, data, template)
    return
  }

  if (header.style === 'boxed') {
    const boxWidth = 380
    const boxX = metrics.mainX + metrics.mainContentWidth / 2 - boxWidth / 2
    const innerWidth = boxWidth - 64
    const probe = createBlock(doc, innerWidth)

    probe.text(cased(data.personal.fullName, template.text.name.upper), nameStyle)
    if (data.personal.title) {
      probe.space(6)
      probe.text(cased(data.personal.title, template.text.role.upper), roleStyle)
    }

    const boxHeight = probe.height + 52

    if (colors.headerFill) {
      const [red, green, blue] = colors.headerFill
      const [ruleRed, ruleGreen, ruleBlue] = colors.rule

      doc.setFillColor(red, green, blue)
      doc.setDrawColor(ruleRed, ruleGreen, ruleBlue)
      doc.setLineWidth(toPt(2))
      doc.rect(toPt(boxX), toPt(56), toPt(boxWidth), toPt(boxHeight), 'FD')
    }

    drawText(boxX + 32, 56 + 26, innerWidth, 'center')
    return
  }

  if (header.style === 'rules') {
    const [red, green, blue] = colors.rule

    doc.setDrawColor(red, green, blue)
    doc.setLineWidth(toPt(1))
    doc.line(
      toPt(left),
      toPt(page.topPadding),
      toPt(left + width),
      toPt(page.topPadding),
    )

    const height = drawText(left, page.topPadding + 14, width, 'center')
    const bottom = page.topPadding + 14 + height + 14

    doc.line(toPt(left), toPt(bottom), toPt(left + width), toPt(bottom))
    return
  }

  const usedHeight = drawText(left, page.topPadding, textWidth, header.align)

  if (header.underline) {
    const [red, green, blue] = colors.rule

    doc.setDrawColor(red, green, blue)
    doc.setLineWidth(toPt(1))
    doc.line(
      toPt(left),
      toPt(page.topPadding + usedHeight + 16),
      toPt(left + width),
      toPt(page.topPadding + usedHeight + 16),
    )
  }

  drawPhoto(doc, data, template)
}

function drawRail(doc: jsPDF, template: Template, top: number) {
  if (template.rail === 'none') return

  const metrics = columnMetrics(template)
  const [red, green, blue] = template.colors.rule

  doc.setDrawColor(red, green, blue)
  doc.setLineWidth(toPt(1))
  doc.line(
    toPt(metrics.mainX + RAIL_X),
    toPt(top),
    toPt(metrics.mainX + RAIL_X),
    toPt(PAGE_HEIGHT - template.page.bottomPadding),
  )
}

function drawDivider(doc: jsPDF, template: Template, isFirstPage: boolean) {
  if (!template.columnDivider || template.page.sidebar === 'none') return

  const x =
    template.page.sidebar === 'left'
      ? template.page.sidebarWidth
      : PAGE_WIDTH - template.page.sidebarWidth
  const [red, green, blue] = template.colors.rule

  doc.setDrawColor(red, green, blue)
  doc.setLineWidth(toPt(1))
  // Start below the masthead so it never cuts through the name.
  const top = isFirstPage ? template.page.headerHeight : 0

  doc.line(toPt(x), toPt(top), toPt(x), toPt(PAGE_HEIGHT))
}

function drawColumn(doc: jsPDF, blocks: PdfBlock[], x: number, top: number) {
  let y = top

  blocks.forEach((block, index) => {
    if (index > 0) y += block.gapBefore

    drawItems(doc, block.node, x, y)
    y += block.height
  })
}

function fileNameFor(data: CVData) {
  const name = data.personal.fullName.trim() || 'CV'

  return `${name.replace(/\s+/g, '_')}_CV.pdf`
}

/** Builds the paginated document without saving, so it can also be inspected. */
export function buildPdf(data: CVData, template: Template) {
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
  const metrics = columnMetrics(template)

  const mainBlocks = specsToPdfBlocks(
    doc,
    buildColumnSpecs(data, template, template.sections.main, false),
    metrics.mainContentWidth,
    template,
    'ink',
  )
  const sidebarBlocks = specsToPdfBlocks(
    doc,
    buildColumnSpecs(data, template, template.sections.sidebar, true),
    metrics.sidebarContentWidth || 1,
    template,
    'panelInk',
  )

  const heights: BlockHeights = {}

  for (const block of [...mainBlocks, ...sidebarBlocks]) {
    heights[block.key] = block.height
  }

  const pages = mergeColumnPages(
    paginateBlocks(mainBlocks, heights, metrics.firstHeight, metrics.nextHeight),
    paginateBlocks(
      sidebarBlocks,
      heights,
      metrics.firstHeight,
      metrics.nextHeight,
    ),
  )

  doc.setProperties({
    title: `${data.personal.fullName} - CV`,
    subject: data.personal.title,
    author: data.personal.fullName,
    keywords: data.skills.flatMap((skill) => skill.bullets).join(', '),
  })

  pages.forEach((page, index) => {
    if (index > 0) doc.addPage()

    drawPageBackground(doc, template)
    drawDivider(doc, template, index === 0)

    if (index === 0) drawHeader(doc, data, template)

    const top = index === 0 ? metrics.firstTop : metrics.nextTop

    drawRail(doc, template, top)

    drawColumn(doc, page.main, metrics.mainX, top)

    if (template.page.sidebar !== 'none') {
      drawColumn(doc, page.sidebar, metrics.sidebarX, top)
    }
  })

  return { doc, pageCount: pages.length }
}

/**
 * PDF has no rounded image clipping worth relying on, so a circular portrait
 * is masked into a transparent PNG before it ever reaches jsPDF.
 */
function maskToCircle(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image()

    image.onload = () => {
      const size = Math.min(image.width, image.height)
      const canvas = document.createElement('canvas')

      canvas.width = size
      canvas.height = size

      const context = canvas.getContext('2d')

      if (!context) {
        resolve(dataUrl)
        return
      }

      context.beginPath()
      context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      context.closePath()
      context.clip()
      context.drawImage(
        image,
        (image.width - size) / 2,
        (image.height - size) / 2,
        size,
        size,
        0,
        0,
        size,
        size,
      )

      resolve(canvas.toDataURL('image/png'))
    }

    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })
}

/**
 * Draws the CV as real PDF text rather than a rasterised screenshot, so that
 * applicant tracking systems can extract the content.
 */
export async function exportTextPdf(data: CVData, template: Template) {
  const needsCircle =
    Boolean(data.photo) &&
    template.photo !== 'none' &&
    template.photo !== 'squareHeader'

  const prepared = needsCircle
    ? { ...data, photo: await maskToCircle(data.photo as string) }
    : data

  const { doc, pageCount } = buildPdf(prepared, template)

  doc.save(fileNameFor(data))

  return pageCount
}
