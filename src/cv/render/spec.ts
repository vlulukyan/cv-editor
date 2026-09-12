import type { CVData } from '../types'
import type { SectionId, Template } from '../templates/types'
import type { IconName } from '../templates/icons'

/**
 * A neutral description of what goes on the page. The HTML preview and the PDF
 * both interpret these parts, so content is written once and can never drift
 * between the two renderers.
 */
export type Part =
  | { kind: 'heading'; text: string; icon?: IconName }
  | { kind: 'paragraph'; text: string }
  | {
      kind: 'entry'
      title: string
      subtitle?: string
      period?: string
      location?: string
    }
  | { kind: 'bullets'; items: string[] }
  | {
      kind: 'labeled'
      rows: { label: string; values: string[]; icon: IconName }[]
    }
  | { kind: 'chips'; items: string[] }
  | { kind: 'lines'; items: string[] }
  | { kind: 'links'; items: { title: string; url: string }[] }
  | { kind: 'skill'; title: string; items: string[] }
  | { kind: 'inline'; text: string }

export type BlockMarker =
  | { kind: 'node' }
  | { kind: 'number'; value: number }

export type BlockSpec = {
  key: string
  gapBefore: number
  keepWithNext?: boolean
  parts: Part[]
  /** Drawn in the gutter beside the block: a rail node or an ordinal. */
  marker?: BlockMarker
}

const SECTION_ICONS: Record<SectionId, IconName> = {
  info: 'user',
  profile: 'user',
  experience: 'work',
  education: 'school',
  courses: 'school',
  certifications: 'star',
  projects: 'star',
  skills: 'star',
  languages: 'language',
  hobbies: 'star',
  links: 'link',
}

const HEADINGS: Record<SectionId, string> = {
  info: 'Info',
  profile: 'Profile',
  experience: 'Employment History',
  education: 'Education',
  courses: 'Courses',
  certifications: 'Certifications',
  projects: 'Projects',
  skills: 'Skills',
  languages: 'Languages',
  hobbies: 'Hobbies',
  links: 'Links',
}

/** Denser sections get proportionally tighter spacing than experience. */
const ENTRY_GAP_RATIO: Partial<Record<SectionId, number>> = {
  courses: 0.6,
  certifications: 0.45,
  skills: 0.7,
  languages: 0.5,
  links: 0.35,
}

type Context = {
  data: CVData
  template: Template
  /** Sidebar columns wrap earlier, so some sections stack instead of inline. */
  narrow: boolean
  column: 'main' | 'sidebar'
}

function entryGap(template: Template, section: SectionId) {
  return Math.round(template.gaps.entry * (ENTRY_GAP_RATIO[section] ?? 1))
}

/** A heading chained to its items, or nothing when the section is empty. */
function section(context: Context, id: SectionId, items: Part[][]): BlockSpec[] {
  if (!items.length) return []

  const { template, column } = context
  const gap = entryGap(template, id)
  const numbered = template.numbered.includes(id)
  const railed = template.rail !== 'none' && column === 'main'

  const markerFor = (index: number): BlockMarker | undefined => {
    if (numbered) return { kind: 'number', value: index + 1 }
    if (railed) return { kind: 'node' }
    return undefined
  }

  return [
    {
      key: `${id}-heading`,
      gapBefore: template.gaps.section,
      keepWithNext: true,
      parts: [
        {
          kind: 'heading',
          text: HEADINGS[id],
          icon: template.headingIcons ? SECTION_ICONS[id] : undefined,
        },
      ],
      marker:
        railed && template.rail === 'badges' ? { kind: 'node' } : undefined,
    },
    ...items.map((parts, index) => ({
      key: `${id}-${index}`,
      gapBefore: index === 0 ? template.gaps.heading : gap,
      parts,
      marker: markerFor(index),
    })),
  ]
}

function buildSection(context: Context, id: SectionId): BlockSpec[] {
  const { data, template } = context

  switch (id) {
    case 'info': {
      const { personal } = data
      const rows = [
        { label: 'Address', values: [personal.address], icon: 'pin' as const },
        { label: 'Phone', values: [personal.phone], icon: 'phone' as const },
        { label: 'Email', values: [personal.email], icon: 'mail' as const },
        {
          label: 'Date / Place of Birth',
          values: [personal.birth, personal.birthPlace],
          icon: 'user' as const,
        },
        {
          label: 'Nationality',
          values: [personal.nationality],
          icon: 'globe' as const,
        },
      ]
        .map((row) => ({ ...row, values: row.values.filter(Boolean) }))
        .filter((row) => row.values.length)

      return section(context, id, rows.length ? [[{ kind: 'labeled', rows }]] : [])
    }

    case 'profile':
      return data.profile.trim()
        ? section(context, id, [[{ kind: 'paragraph', text: data.profile }]])
        : []

    case 'experience':
      return section(
        context,
        id,
        data.experience.map((job) => {
          const parts: Part[] = [
            {
              kind: 'entry',
              title: job.title,
              period: job.period,
              location: job.location,
            },
          ]
          const bullets = job.bullets.filter(Boolean)

          if (bullets.length) parts.push({ kind: 'bullets', items: bullets })

          return parts
        }),
      )

    case 'education':
      return section(
        context,
        id,
        data.education.map((item) => [
          {
            kind: 'entry',
            title: item.title,
            period: item.period,
            location: item.location,
          },
        ]),
      )

    case 'courses':
      return section(
        context,
        id,
        data.courses.map((item) => [
          { kind: 'entry', title: item.title, period: item.period },
        ]),
      )

    case 'certifications':
      return section(
        context,
        id,
        data.certifications.map((item) => [
          {
            kind: 'inline',
            text: [item.title, item.subtitle, item.period]
              .filter(Boolean)
              .join(' | '),
          },
        ]),
      )

    case 'projects':
      return section(
        context,
        id,
        data.projects.map((item) => {
          const parts: Part[] = [
            {
              kind: 'entry',
              title: item.title,
              subtitle: item.subtitle,
              period: item.period,
            },
          ]
          const bullets = item.bullets.filter(Boolean)

          if (bullets.length) parts.push({ kind: 'bullets', items: bullets })

          return parts
        }),
      )

    case 'skills': {
      if (!data.skills.length) return []

      if (template.skillStyle === 'chips') {
        return section(context, id, [
          [{ kind: 'chips', items: data.skills.flatMap((s) => s.bullets) }],
        ])
      }

      if (template.skillStyle === 'inline') {
        return section(
          context,
          id,
          data.skills.map((skill) => [
            {
              kind: 'inline',
              text: `${skill.title}: ${skill.bullets.join(', ')}`,
            },
          ]),
        )
      }

      return section(
        context,
        id,
        data.skills.map((skill) => [
          { kind: 'skill', title: skill.title, items: skill.bullets },
        ]),
      )
    }

    case 'languages':
      if (!data.languages.length) return []

      // A wide column reads better as one line than as a stack.
      return section(context, id, [
        context.narrow
          ? [{ kind: 'lines', items: data.languages }]
          : [{ kind: 'inline', text: data.languages.join(', ') }],
      ])

    case 'hobbies':
      return data.hobbies.trim()
        ? section(context, id, [[{ kind: 'paragraph', text: data.hobbies }]])
        : []

    case 'links':
      return data.links.length
        ? section(context, id, [[{ kind: 'links', items: data.links }]])
        : []
  }
}

/** Blocks for one column, with the first block flush to the top of the page. */
export function buildColumnSpecs(
  data: CVData,
  template: Template,
  ids: SectionId[],
  narrow: boolean,
): BlockSpec[] {
  const context: Context = {
    data,
    template,
    narrow,
    column: narrow ? 'sidebar' : 'main',
  }
  const blocks = ids.flatMap((id) => buildSection(context, id))

  return blocks.map((block, index) =>
    index === 0 ? { ...block, gapBefore: 0 } : block,
  )
}
