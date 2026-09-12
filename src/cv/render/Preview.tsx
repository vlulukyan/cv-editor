import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { CVData } from '../types'
import { normalizeUrl, openInBlankPage } from '../utils'
import {
  type BlockHeights,
  type FlowBlock,
  mergeColumnPages,
  paginateBlocks,
} from '../paginate'
import {
  FONT_STACKS,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  type RGB,
  type Template,
  type TextSpec,
  rgbCss,
} from '../templates/types'
import { ICONS, ICON_BOX, type IconName } from '../templates/icons'
import { type BlockSpec, type Part, buildColumnSpecs } from './spec'
import { MARKER_GUTTER, RAIL_X, columnMetrics } from './metrics'

type ColorKey = 'ink' | 'muted' | 'accent' | 'headerInk' | 'panelInk'

function textStyle(
  spec: TextSpec,
  template: Template,
  fallback: ColorKey,
): CSSProperties {
  const color = template.colors[spec.color ?? fallback] as RGB

  return {
    fontSize: spec.size,
    lineHeight: `${spec.line}px`,
    fontWeight: spec.bold ? 700 : 400,
    letterSpacing: spec.tracking ? `${spec.tracking}em` : undefined,
    textTransform: spec.upper ? 'uppercase' : undefined,
    color: rgbCss(color),
  }
}

/** Draws an icon from the shared primitives, so it matches the PDF exactly. */
function Icon({
  name,
  size,
  color,
}: {
  name: IconName
  size: number
  color: string
}) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      style={{ display: 'block', flex: '0 0 auto' }}
      viewBox={`0 0 ${ICON_BOX} ${ICON_BOX}`}
      width={size}
    >
      {ICONS[name].map((shape, index) => {
        const stroke = { stroke: color, strokeWidth: 1.3, fill: 'none' }

        if (shape.t === 'circle') {
          return (
            <circle
              cx={shape.cx}
              cy={shape.cy}
              key={index}
              r={shape.r}
              {...stroke}
              fill={shape.fill ? color : 'none'}
            />
          )
        }

        if (shape.t === 'rect') {
          return (
            <rect
              height={shape.h}
              key={index}
              width={shape.w}
              x={shape.x}
              y={shape.y}
              {...stroke}
              fill={shape.fill ? color : 'none'}
            />
          )
        }

        return (
          <line
            key={index}
            x1={shape.x1}
            x2={shape.x2}
            y1={shape.y1}
            y2={shape.y2}
            {...stroke}
          />
        )
      })}
    </svg>
  )
}

function Heading({
  part,
  template,
  fallback,
}: {
  part: Extract<Part, { kind: 'heading' }>
  template: Template
  fallback: ColorKey
}) {
  const style = textStyle(template.text.heading, template, fallback)
  const rule = <div style={{ height: 1, background: rgbCss(template.colors.rule) }} />
  const label = (
    <span style={{ ...style, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      {part.icon ? (
        <Icon
          color={String(style.color)}
          name={part.icon}
          size={template.text.heading.size + 3}
        />
      ) : null}
      {part.text}
    </span>
  )

  if (template.headingRule === 'bar') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 14,
            height: 2,
            flex: '0 0 auto',
            background: rgbCss(template.colors.accent),
          }}
        />
        {label}
      </div>
    )
  }

  return (
    <div>
      {template.headingRule === 'over' ? (
        <div style={{ marginBottom: 8 }}>{rule}</div>
      ) : null}
      <div>{label}</div>
      {template.headingRule === 'under' ? (
        <div style={{ marginTop: 10 }}>{rule}</div>
      ) : null}
    </div>
  )
}

function Bullets({
  items,
  template,
  fallback,
}: {
  items: string[]
  template: Template
  fallback: ColorKey
}) {
  const bodyStyle = textStyle(template.text.body, template, fallback)
  const inkColor = rgbCss(template.colors[fallback] as RGB)

  return (
    <div style={{ marginTop: template.gaps.bulletTop }}>
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: template.bullet === 'none' ? 0 : 9,
            marginBottom:
              index === items.length - 1 ? 0 : template.gaps.bulletRow,
            paddingLeft: template.bullet === 'none' ? 0 : 6,
          }}
        >
          {template.bullet === 'none' ? null : (
            <span
              aria-hidden="true"
              style={{
                flex: '0 0 auto',
                marginTop:
                  template.bullet === 'dash'
                    ? (template.text.body.line - 1) / 2
                    : (template.text.body.line - 3) / 2,
                width: template.bullet === 'dash' ? 6 : 3,
                height: template.bullet === 'dash' ? 1 : 3,
                borderRadius: template.bullet === 'square' ? 0 : 999,
                background: inkColor,
              }}
            />
          )}
          <div
            style={{
              ...bodyStyle,
              flex: '1 1 auto',
              minWidth: 0,
              textAlign: template.justify ? 'justify' : undefined,
            }}
          >
            {item}
          </div>
        </div>
      ))}
    </div>
  )
}

function Entry({
  part,
  template,
  fallback,
}: {
  part: Extract<Part, { kind: 'entry' }>
  template: Template
  fallback: ColorKey
}) {
  const titleStyle = textStyle(template.text.title, template, fallback)
  const subtitleStyle = textStyle(template.text.subtitle, template, fallback)
  const metaStyle = textStyle(template.text.meta, template, fallback)
  const smallStyle = textStyle(template.text.small, template, fallback)

  const title = <div style={titleStyle}>{part.title}</div>
  const subtitle = part.subtitle ? (
    <div style={subtitleStyle}>{part.subtitle}</div>
  ) : null

  if (template.entry === 'gutterDates') {
    return (
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: template.gutterWidth, flex: '0 0 auto', ...metaStyle }}>
          {part.period}
        </div>
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          {title}
          {subtitle}
          {part.location ? <div style={smallStyle}>{part.location}</div> : null}
        </div>
      </div>
    )
  }

  if (template.entry === 'metaJoined') {
    const meta = [part.subtitle, part.location, part.period]
      .filter(Boolean)
      .join('  ·  ')

    return (
      <div>
        {title}
        {meta ? <div style={metaStyle}>{meta}</div> : null}
      </div>
    )
  }

  if (template.entry === 'dateRight') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>{title}</div>
          {part.period ? (
            <div style={{ flex: '0 0 auto', ...metaStyle }}>{part.period}</div>
          ) : null}
        </div>
        {subtitle}
        {part.location ? <div style={smallStyle}>{part.location}</div> : null}
      </div>
    )
  }

  if (template.entry === 'stacked') {
    const meta = [part.period, part.location].filter(Boolean).join(', ')

    return (
      <div>
        {title}
        {subtitle}
        {meta ? <div style={metaStyle}>{meta}</div> : null}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        {title}
        {subtitle}
        {part.period ? <div style={metaStyle}>{part.period}</div> : null}
      </div>
      {part.location ? (
        <div style={{ flex: '0 0 auto', paddingTop: 2, ...smallStyle }}>
          {part.location}
        </div>
      ) : null}
    </div>
  )
}

function renderPart(
  part: Part,
  index: number,
  template: Template,
  fallback: ColorKey,
): ReactNode {
  const key = `${part.kind}-${index}`
  const inkColor = rgbCss(template.colors[fallback] as RGB)

  switch (part.kind) {
    case 'heading':
      return (
        <Heading fallback={fallback} key={key} part={part} template={template} />
      )

    case 'paragraph':
      return (
        <p
          key={key}
          style={{
            margin: 0,
            whiteSpace: 'pre-line',
            textAlign: template.justify ? 'justify' : undefined,
            ...textStyle(template.text.body, template, fallback),
          }}
        >
          {part.text}
        </p>
      )

    case 'inline':
      return (
        <div key={key} style={textStyle(template.text.body, template, fallback)}>
          {part.text}
        </div>
      )

    case 'entry':
      return <Entry fallback={fallback} key={key} part={part} template={template} />

    case 'bullets':
      return (
        <Bullets
          fallback={fallback}
          items={part.items}
          key={key}
          template={template}
        />
      )

    case 'chips':
      return (
        <div key={key} style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {part.items.map((item, chipIndex) => (
            <span
              key={`${item}-${chipIndex}`}
              style={{
                border: `1px solid ${rgbCss(template.colors.rule)}`,
                borderRadius: 999,
                padding: '2px 8px',
                ...textStyle(template.text.small, template, fallback),
                color: inkColor,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      )

    case 'labeled':
      return (
        <div key={key}>
          {part.rows.map((row, rowIndex) => {
            const values = row.values.map((value) => (
              <div
                key={value}
                style={{
                  wordBreak: 'break-word',
                  ...textStyle(template.text.small, template, fallback),
                  color: inkColor,
                }}
              >
                {value}
              </div>
            ))

            if (template.infoStyle === 'icons') {
              return (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    marginTop: rowIndex === 0 ? 0 : 10,
                  }}
                >
                  <span style={{ paddingTop: 2 }}>
                    <Icon
                      color={rgbCss(template.colors.muted)}
                      name={row.icon}
                      size={template.text.small.size + 2}
                    />
                  </span>
                  <div style={{ minWidth: 0 }}>{values}</div>
                </div>
              )
            }

            return (
              <div key={row.label} style={{ marginTop: rowIndex === 0 ? 0 : 12 }}>
                <div style={textStyle(template.text.label, template, fallback)}>
                  {row.label}
                </div>
                {values}
              </div>
            )
          })}
        </div>
      )

    case 'lines':
      return (
        <div key={key}>
          {part.items.map((item, itemIndex) => (
            <div
              key={`${item}-${itemIndex}`}
              style={{
                marginTop: itemIndex === 0 ? 0 : 10,
                ...textStyle(template.text.meta, template, fallback),
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )

    case 'links':
      return (
        <div key={key}>
          {part.items.map((link, linkIndex) => (
            <div
              key={`${link.title}-${linkIndex}`}
              style={{
                marginTop: linkIndex === 0 ? 0 : 6,
                ...textStyle(template.text.meta, template, fallback),
              }}
            >
              {link.url ? (
                <a
                  data-cv-link="true"
                  href={normalizeUrl(link.url)}
                  onClick={(event) => openInBlankPage(event, link.url)}
                  rel="noreferrer"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                  target="_blank"
                >
                  {link.title || link.url}
                </a>
              ) : (
                <span>{link.title}</span>
              )}
            </div>
          ))}
        </div>
      )

    case 'skill':
      return (
        <div key={key}>
          <div style={textStyle(template.text.subtitle, template, fallback)}>
            <strong>{part.title}:</strong>
          </div>
          <Bullets fallback={fallback} items={part.items} template={template} />
        </div>
      )
  }
}

/** The node or ordinal drawn in a block's left gutter. */
function Marker({
  spec,
  template,
  fallback,
}: {
  spec: BlockSpec
  template: Template
  fallback: ColorKey
}) {
  if (!spec.marker) return null

  if (spec.marker.kind === 'number') {
    return (
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          ...textStyle(template.text.title, template, fallback),
          fontSize: template.text.title.size + 7,
          color: rgbCss(template.colors.accent),
          fontWeight: 700,
        }}
      >
        {String(spec.marker.value).padStart(2, '0')}
      </span>
    )
  }

  const isBadge = template.rail === 'badges' && spec.parts[0]?.kind === 'heading'
  const size = isBadge ? 16 : 7

  return (
    <span
      style={{
        position: 'absolute',
        left: RAIL_X - size / 2,
        top: isBadge ? 0 : 6,
        width: size,
        height: size,
        borderRadius: 999,
        boxSizing: 'border-box',
        background: isBadge
          ? rgbCss(template.colors.accent)
          : rgbCss(template.colors.paper),
        border: isBadge
          ? 'none'
          : `2px solid ${rgbCss(template.colors.accent)}`,
      }}
    />
  )
}

function specToBlock(
  spec: BlockSpec,
  template: Template,
  fallback: ColorKey,
): FlowBlock {
  return {
    key: spec.key,
    gapBefore: spec.gapBefore,
    keepWithNext: spec.keepWithNext,
    node: (
      <div
        style={{
          position: spec.marker ? 'relative' : undefined,
          paddingLeft: spec.marker ? MARKER_GUTTER : undefined,
        }}
      >
        <Marker fallback={fallback} spec={spec} template={template} />
        {spec.parts.map((part, index) => (
          <div
            key={`${spec.key}-${index}`}
            style={{ marginTop: index === 0 ? 0 : 6 }}
          >
            {renderPart(part, index, template, fallback)}
          </div>
        ))}
      </div>
    ),
  }
}

/* ------------------------------------------------------------------ pages */

function Photo({ data, template }: { data: CVData; template: Template }) {
  if (!data.photo || template.photo === 'none') return null

  const metrics = columnMetrics(template)
  const isCircle = template.photo !== 'squareHeader'
  const size = isCircle ? 112 : 96
  const right = template.header.fullWidth
    ? template.page.mainPaddingX
    : PAGE_WIDTH - metrics.mainX - metrics.mainContentWidth

  return (
    <img
      alt=""
      src={data.photo}
      style={{
        position: 'absolute',
        right,
        top: Math.max(20, (template.page.headerHeight - size) / 2),
        width: size,
        height: size,
        objectFit: 'cover',
        borderRadius: isCircle ? '50%' : 4,
      }}
    />
  )
}

function ContactRow({
  data,
  template,
  fallback,
}: {
  data: CVData
  template: Template
  fallback: ColorKey
}) {
  const { personal } = data
  const columns = [
    { label: 'Phone', value: personal.phone },
    { label: 'Address', value: personal.address },
    { label: 'Email', value: personal.email },
  ].filter((column) => column.value)

  if (!columns.length) return null

  return (
    <div style={{ display: 'flex', gap: 26, marginTop: 16 }}>
      {columns.map((column) => (
        <div key={column.label} style={{ flex: '1 1 0', minWidth: 0 }}>
          <div style={textStyle(template.text.label, template, fallback)}>
            {column.label}
          </div>
          <div
            style={{
              marginTop: 4,
              wordBreak: 'break-word',
              ...textStyle(template.text.small, template, fallback),
            }}
          >
            {column.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function PageHeader({ data, template }: { data: CVData; template: Template }) {
  const { header, page, colors } = template

  if (header.style === 'none') return null

  const metrics = columnMetrics(template)
  const left = header.fullWidth ? page.mainPaddingX : metrics.mainX
  const width =
    (header.fullWidth ? PAGE_WIDTH - page.mainPaddingX * 2 : metrics.mainContentWidth) -
    (data.photo && template.photo !== 'none' ? 130 : 0)

  const nameStyle = textStyle(template.text.name, template, 'headerInk')
  const roleStyle = textStyle(template.text.role, template, 'headerInk')

  const nameNode = header.stackName ? (
    <div style={nameStyle}>
      {data.personal.fullName.split(/\s+/).map((word, index) => (
        <div key={`${word}-${index}`}>{word}</div>
      ))}
    </div>
  ) : (
    <div style={nameStyle}>{data.personal.fullName}</div>
  )

  const roleNode = data.personal.title ? (
    <div style={roleStyle}>{data.personal.title}</div>
  ) : null

  const stack = (
    <>
      {header.eyebrow ? roleNode : null}
      <div style={{ marginTop: header.eyebrow ? 8 : 0 }}>{nameNode}</div>
      {header.eyebrow ? null : <div style={{ marginTop: 6 }}>{roleNode}</div>}
      {header.contactRow ? (
        <ContactRow data={data} fallback="headerInk" template={template} />
      ) : null}
    </>
  )

  if (header.style === 'banner') {
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: PAGE_WIDTH,
          height: page.headerHeight,
          background: colors.headerFill ? rgbCss(colors.headerFill) : undefined,
          boxSizing: 'border-box',
          padding: `0 ${page.mainPaddingX}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ width }}>{stack}</div>
        <Photo data={data} template={template} />
      </div>
    )
  }

  if (header.style === 'boxed') {
    return (
      <div
        style={{
          position: 'absolute',
          left: metrics.mainX + metrics.mainContentWidth / 2,
          top: 56,
          transform: 'translateX(-50%)',
          width: 380,
          boxSizing: 'border-box',
          border: `2px solid ${rgbCss(colors.rule)}`,
          background: colors.headerFill ? rgbCss(colors.headerFill) : undefined,
          padding: '24px 32px',
          textAlign: 'center',
        }}
      >
        {stack}
      </div>
    )
  }

  if (header.style === 'rules') {
    return (
      <div
        style={{
          position: 'absolute',
          left,
          top: page.topPadding,
          width: PAGE_WIDTH - page.mainPaddingX * 2,
          textAlign: 'center',
        }}
      >
        <div style={{ height: 1, background: rgbCss(colors.rule) }} />
        <div style={{ padding: '14px 0' }}>{stack}</div>
        <div style={{ height: 1, background: rgbCss(colors.rule) }} />
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: page.topPadding,
        width: header.fullWidth
          ? PAGE_WIDTH - page.mainPaddingX * 2
          : metrics.mainContentWidth,
        textAlign: header.align,
      }}
    >
      <div style={{ width }}>{stack}</div>
      {header.underline ? (
        <div
          style={{
            marginTop: 16,
            height: 1,
            background: rgbCss(colors.rule),
          }}
        />
      ) : null}
      <Photo data={data} template={template} />
    </div>
  )
}

function FlowColumn({
  blocks,
  onSelectBlock,
}: {
  blocks: FlowBlock[]
  onSelectBlock?: (blockKey: string) => void
}) {
  return (
    <>
      {blocks.map((block, index) => (
        <div
          className={onSelectBlock ? 'cv-selectable' : undefined}
          key={block.key}
          onClick={
            onSelectBlock
              ? (event) => {
                  if ((event.target as HTMLElement).closest('a')) return
                  onSelectBlock(block.key)
                }
              : undefined
          }
          style={{ marginTop: index === 0 ? 0 : block.gapBefore }}
        >
          {block.node}
        </div>
      ))}
    </>
  )
}

type CVPageProps = {
  data: CVData
  template: Template
  pageIndex: number
  main: FlowBlock[]
  sidebar: FlowBlock[]
  onSelectBlock?: (blockKey: string) => void
}

function CVPage({
  data,
  template,
  pageIndex,
  main,
  sidebar,
  onSelectBlock,
}: CVPageProps) {
  const isFirstPage = pageIndex === 0
  const { page, colors } = template
  const metrics = columnMetrics(template)
  const top = isFirstPage ? metrics.firstTop : metrics.nextTop

  const sidebarNode =
    page.sidebar === 'none' ? null : (
      <aside
        style={{
          // A fixed column: without this the main column squeezes it, and the
          // narrower it gets the more text wraps, overflowing the page.
          flex: '0 0 auto',
          width: page.sidebarWidth,
          background: rgbCss(colors.panel),
          paddingLeft: page.sidebarPaddingLeft,
          paddingRight: page.sidebarPaddingRight,
          paddingTop: top,
          paddingBottom: page.bottomPadding,
          boxSizing: 'border-box',
        }}
      >
        <FlowColumn blocks={sidebar} onSelectBlock={onSelectBlock} />
      </aside>
    )

  const mainNode = (
    <main
      style={{
        position: 'relative',
        flex: '1 1 auto',
        minWidth: 0,
        paddingLeft: page.mainPaddingX,
        paddingRight: page.mainPaddingX,
        paddingTop: top,
        paddingBottom: page.bottomPadding,
        boxSizing: 'border-box',
      }}
    >
      {template.rail !== 'none' ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: page.mainPaddingX + RAIL_X,
            top,
            bottom: page.bottomPadding,
            width: 1,
            background: rgbCss(colors.rule),
          }}
        />
      ) : null}
      <FlowColumn blocks={main} onSelectBlock={onSelectBlock} />
    </main>
  )

  return (
    <div
      className="cv-page mx-auto mb-8 shadow-2xl print:mb-0 print:shadow-none"
      data-cv-page="true"
      style={{
        position: 'relative',
        width: PAGE_WIDTH,
        minHeight: PAGE_HEIGHT,
        background: rgbCss(colors.paper),
        color: rgbCss(colors.ink),
        fontFamily: FONT_STACKS[template.family],
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', minHeight: PAGE_HEIGHT }}>
        {page.sidebar === 'left' ? sidebarNode : null}
        {mainNode}
        {page.sidebar === 'right' ? sidebarNode : null}
      </div>
      {template.columnDivider && page.sidebar !== 'none' ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left:
              page.sidebar === 'left'
                ? page.sidebarWidth
                : PAGE_WIDTH - page.sidebarWidth,
            // Start below the masthead so it never cuts through the name.
            top: isFirstPage ? page.headerHeight : 0,
            bottom: 0,
            width: 1,
            background: rgbCss(colors.rule),
          }}
        />
      ) : null}
      {isFirstPage ? <PageHeader data={data} template={template} /> : null}
    </div>
  )
}

/* ------------------------------------------------------------ measurement */

function sameHeights(current: BlockHeights, next: BlockHeights) {
  const currentKeys = Object.keys(current)

  if (currentKeys.length !== Object.keys(next).length) return false

  return currentKeys.every(
    (key) => Math.abs((current[key] ?? 0) - (next[key] ?? 0)) < 0.5,
  )
}

function MeasureLayer({
  template,
  mainBlocks,
  sidebarBlocks,
  onMeasure,
}: {
  template: Template
  mainBlocks: FlowBlock[]
  sidebarBlocks: FlowBlock[]
  onMeasure: (heights: BlockHeights) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const metrics = columnMetrics(template)

  useLayoutEffect(() => {
    const container = containerRef.current

    if (!container) return

    const heights: BlockHeights = {}

    container
      .querySelectorAll<HTMLElement>('[data-flow-key]')
      .forEach((element) => {
        const key = element.dataset.flowKey

        if (key) heights[key] = element.getBoundingClientRect().height
      })

    onMeasure(heights)
  })

  return (
    <div
      aria-hidden="true"
      className="cv-measure pointer-events-none fixed left-0 top-0 -z-10"
      ref={containerRef}
      style={{
        visibility: 'hidden',
        fontFamily: FONT_STACKS[template.family],
      }}
    >
      <div style={{ width: metrics.mainContentWidth }}>
        {mainBlocks.map((block) => (
          <div data-flow-key={block.key} key={block.key}>
            {block.node}
          </div>
        ))}
      </div>
      <div style={{ width: metrics.sidebarContentWidth }}>
        {sidebarBlocks.map((block) => (
          <div data-flow-key={block.key} key={block.key}>
            {block.node}
          </div>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- document */

export type CVDocumentProps = {
  data: CVData
  template: Template
  onPageCountChange?: (pageCount: number) => void
  onSelectBlock?: (blockKey: string) => void
}

export function CVDocument({
  data,
  template,
  onPageCountChange,
  onSelectBlock,
}: CVDocumentProps) {
  const [heights, setHeights] = useState<BlockHeights>({})

  const mainBlocks = useMemo(
    () =>
      buildColumnSpecs(data, template, template.sections.main, false).map(
        (spec) => specToBlock(spec, template, 'ink'),
      ),
    [data, template],
  )

  const sidebarBlocks = useMemo(
    () =>
      buildColumnSpecs(data, template, template.sections.sidebar, true).map(
        (spec) => specToBlock(spec, template, 'panelInk'),
      ),
    [data, template],
  )

  const handleMeasure = useCallback((next: BlockHeights) => {
    setHeights((previous) => (sameHeights(previous, next) ? previous : next))
  }, [])

  const pages = useMemo(() => {
    const metrics = columnMetrics(template)

    return mergeColumnPages(
      paginateBlocks(mainBlocks, heights, metrics.firstHeight, metrics.nextHeight),
      paginateBlocks(
        sidebarBlocks,
        heights,
        metrics.firstHeight,
        metrics.nextHeight,
      ),
    )
  }, [mainBlocks, sidebarBlocks, heights, template])

  useLayoutEffect(() => {
    onPageCountChange?.(pages.length)
  }, [pages.length, onPageCountChange])

  return (
    <>
      <MeasureLayer
        mainBlocks={mainBlocks}
        onMeasure={handleMeasure}
        sidebarBlocks={sidebarBlocks}
        template={template}
      />
      {pages.map((page, index) => (
        <CVPage
          data={data}
          key={`cv-page-${index}`}
          main={page.main}
          onSelectBlock={onSelectBlock}
          pageIndex={index}
          sidebar={page.sidebar}
          template={template}
        />
      ))}
    </>
  )
}
