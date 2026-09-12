import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Download,
  Image as ImageIcon,
  Plus,
  Redo2,
  Undo2,
} from 'lucide-react'
import { toJpeg } from 'html-to-image'
import jsPDF from 'jspdf'
import './App.css'
import { CVDocument } from './cv/render/Preview'
import { getTemplate } from './cv/templates/presets'
import { applyLayout } from './cv/templates/layout'
import { PAGE_WIDTH } from './cv/templates/types'
import { exportTextPdf } from './cv/pdf/exportTextPdf'
import { pdfColorStyleOverrides } from './cv/pdfStyles'
import { initialData } from './cv/initialData'
import {
  addDocument,
  downloadJson,
  loadDocument,
  loadIndex,
  parseImportedJson,
  removeDocument,
  saveDocument,
  saveIndex,
  touchDocument,
} from './cv/storage'
import type {
  BulletedSectionItem,
  BulletedSectionName,
  Course,
  CVData,
  Education,
  Job,
  LinkItem,
  PersonalInfo,
  SimpleSectionName,
} from './cv/types'
import { moveItem, normalizeUrl } from './cv/utils'
import { DocumentMenu } from './editor/DocumentMenu'
import { TemplatePicker } from './editor/TemplatePicker'
import { LayoutControls } from './editor/LayoutControls'
import { Field, FieldPair } from './editor/Field'
import { PhotoField } from './editor/PhotoField'
import { FocusProvider } from './editor/FocusProvider'
import { editorKeyForBlock, useFocus } from './editor/focusContext'
import { type BulletIssue, countIssues, lintBullets } from './editor/lint'
import { PreviewToolbar } from './editor/PreviewToolbar'
import { MIN_ZOOM } from './editor/zoom'
import { EmptySection, Section } from './editor/Section'
import { SortableItem, SortableList, SortableRow } from './editor/Sortable'
import { useAutosave } from './editor/useAutosave'
import { useUndoableState } from './editor/useUndoableState'

/** Field layout for sections whose items are just a few short text fields. */
type SimpleSectionField = {
  key: 'title' | 'period' | 'location'
  label: string
  textarea?: boolean
}

const educationFields: SimpleSectionField[] = [
  { key: 'title', label: 'Degree and school', textarea: true },
  { key: 'period', label: 'Period' },
  { key: 'location', label: 'Location' },
]

const courseFields: SimpleSectionField[] = [
  { key: 'title', label: 'Course and provider', textarea: true },
  { key: 'period', label: 'Period' },
]

const newEducation: Education = {
  title: 'New degree, school',
  period: '2020 - 2024',
  location: 'Yerevan',
}

const newCourse: Course = {
  title: 'New course, provider',
  period: '2024',
}

type SimpleSectionItem = Record<SimpleSectionField['key'], string>

/**
 * Education and Course differ only by which of these fields they carry, so the
 * editor treats both as records and renders whichever fields it is given.
 */
function simpleItems(data: CVData, section: SimpleSectionName) {
  return data[section] as SimpleSectionItem[]
}

const idsFor = (prefix: string, length: number) =>
  Array.from({ length }, (_, index) => `${prefix}-${index}`)

const emptyCV: CVData = {
  ...initialData,
  personal: { ...initialData.personal, fullName: 'Your Name', title: 'Your title' },
  profile: '',
  experience: [],
  education: [],
  courses: [],
  certifications: [],
  projects: [],
}

function Editor() {
  const [bootstrap] = useState(() => {
    const index = loadIndex()

    return { index, data: loadDocument(index.activeId) }
  })

  const [index, setIndex] = useState(bootstrap.index)
  const {
    value: data,
    setValue: setData,
    reset: resetData,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoableState<CVData>(bootstrap.data)

  const exportRef = useRef<HTMLDivElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const scaledRef = useRef<HTMLDivElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [pageCount, setPageCount] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [naturalHeight, setNaturalHeight] = useState(0)

  const { requestFocus } = useFocus()
  const baseTemplate = getTemplate(data.templateId)
  const template = useMemo(
    () => applyLayout(baseTemplate, data.layout),
    [baseTemplate, data.layout],
  )

  const activeName =
    index.documents.find((entry) => entry.id === index.activeId)?.name ?? 'CV'

  const handleSave = useCallback(
    (value: CVData) => {
      saveDocument(index.activeId, value)
      setIndex((previous) => touchDocument(previous, index.activeId))
    },
    [index.activeId],
  )

  const { state: saveState, flush } = useAutosave({
    value: data,
    key: index.activeId,
    onSave: handleSave,
  })

  useEffect(() => {
    saveIndex(index)
  }, [index])

  const handlePageCountChange = useCallback((nextPageCount: number) => {
    setPageCount(nextPageCount)
  }, [])

  const handleSelectBlock = useCallback(
    (blockKey: string) => requestFocus(editorKeyForBlock(blockKey)),
    [requestFocus],
  )

  /* ---------------------------------------------------------------- zoom */

  useLayoutEffect(() => {
    const element = scaledRef.current

    if (!element) return

    const measure = () => setNaturalHeight(element.offsetHeight)
    const observer = new ResizeObserver(measure)

    observer.observe(element)
    measure()

    return () => observer.disconnect()
  }, [])

  const fitToWidth = useCallback(() => {
    const available = (previewRef.current?.clientWidth ?? PAGE_WIDTH) - 48

    setZoom(Math.min(1, Math.max(MIN_ZOOM, available / PAGE_WIDTH)))
  }, [])

  // Shrink to fit when the page would overflow, but never zoom back in on the
  // user's behalf - once they pick a level it is theirs.
  useEffect(() => {
    const clampToWidth = () => {
      const available = (previewRef.current?.clientWidth ?? PAGE_WIDTH) - 48

      setZoom((previous) =>
        PAGE_WIDTH * previous > available
          ? Math.max(MIN_ZOOM, available / PAGE_WIDTH)
          : previous,
      )
    }

    clampToWidth()
    window.addEventListener('resize', clampToWidth)

    return () => window.removeEventListener('resize', clampToWidth)
  }, [])

  /* ------------------------------------------------------------ shortcuts */

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return

      const key = event.key.toLowerCase()

      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      } else if (key === 's') {
        event.preventDefault()
        flush()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, flush])

  /* ------------------------------------------------------------ documents */

  const switchDocument = (id: string) => {
    flush()
    setIndex((previous) => ({ ...previous, activeId: id }))
    resetData(loadDocument(id))
  }

  const createDocument = (name: string, seed: CVData) => {
    flush()
    setIndex((previous) => {
      const { index: nextIndex } = addDocument(previous, name, seed)

      return nextIndex
    })
    resetData(seed)
  }

  const deleteActiveDocument = () => {
    setIndex((previous) => {
      const nextIndex = removeDocument(previous, previous.activeId)

      resetData(loadDocument(nextIndex.activeId))

      return nextIndex
    })
  }

  const importDocument = async (file: File) => {
    try {
      const { name, data: imported } = parseImportedJson(await file.text())

      createDocument(name, imported)
    } catch {
      window.alert(
        'That file could not be read as a CV. Expected JSON exported from this editor.',
      )
    }
  }

  /* ----------------------------------------------------------------- data */

  const updatePersonal = (key: keyof PersonalInfo, value: string) => {
    setData((previous) => ({
      ...previous,
      personal: { ...previous.personal, [key]: value },
    }))
  }

  const updateSkill = (index: number, key: 'title' | 'bullets', value: string) => {
    setData((previous) => {
      const skills = [...previous.skills]

      skills[index] =
        key === 'title'
          ? { ...skills[index], title: value }
          : {
              ...skills[index],
              bullets: value
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean),
            }

      return { ...previous, skills }
    })
  }

  const addSkill = () => {
    setData((previous) => ({
      ...previous,
      skills: [...previous.skills, { title: 'New group', bullets: ['New skill'] }],
    }))
  }

  const removeSkill = (index: number) => {
    setData((previous) => ({
      ...previous,
      skills: previous.skills.filter((_, skillIndex) => skillIndex !== index),
    }))
  }

  const reorderSkills = (fromIndex: number, toIndex: number) => {
    setData((previous) => ({
      ...previous,
      skills: moveItem(previous.skills, fromIndex, toIndex),
    }))
  }

  const updateLink = (index: number, key: keyof LinkItem, value: string) => {
    setData((previous) => {
      const links = [...previous.links]
      links[index] = { ...links[index], [key]: value }
      return { ...previous, links }
    })
  }

  const addLink = () => {
    setData((previous) => ({
      ...previous,
      links: [...previous.links, { title: 'New link', url: '' }],
    }))
  }

  const removeLink = (index: number) => {
    setData((previous) => ({
      ...previous,
      links: previous.links.filter((_, linkIndex) => linkIndex !== index),
    }))
  }

  const reorderLinks = (fromIndex: number, toIndex: number) => {
    setData((previous) => ({
      ...previous,
      links: moveItem(previous.links, fromIndex, toIndex),
    }))
  }

  const updateJob = (index: number, key: keyof Job, value: string) => {
    setData((previous) => {
      const experience = [...previous.experience]
      experience[index] = { ...experience[index], [key]: value }
      return { ...previous, experience }
    })
  }

  const updateJobBullet = (
    jobIndex: number,
    bulletIndex: number,
    value: string,
  ) => {
    setData((previous) => {
      const experience = [...previous.experience]
      const bullets = [...experience[jobIndex].bullets]
      bullets[bulletIndex] = value
      experience[jobIndex] = { ...experience[jobIndex], bullets }
      return { ...previous, experience }
    })
  }

  const addJobBullet = (jobIndex: number) => {
    setData((previous) => {
      const experience = [...previous.experience]
      experience[jobIndex] = {
        ...experience[jobIndex],
        bullets: [...experience[jobIndex].bullets, ''],
      }
      return { ...previous, experience }
    })
  }

  const removeJobBullet = (jobIndex: number, bulletIndex: number) => {
    setData((previous) => {
      const experience = [...previous.experience]

      experience[jobIndex] = {
        ...experience[jobIndex],
        bullets: experience[jobIndex].bullets.filter(
          (_, index) => index !== bulletIndex,
        ),
      }

      return { ...previous, experience }
    })
  }

  const reorderJobBullets = (
    jobIndex: number,
    fromIndex: number,
    toIndex: number,
  ) => {
    setData((previous) => {
      const experience = [...previous.experience]

      experience[jobIndex] = {
        ...experience[jobIndex],
        bullets: moveItem(experience[jobIndex].bullets, fromIndex, toIndex),
      }

      return { ...previous, experience }
    })
  }

  const addJob = () => {
    setData((previous) => ({
      ...previous,
      experience: [
        ...previous.experience,
        {
          title: 'New position',
          location: 'Yerevan',
          period: '2024 - present',
          bullets: [''],
        },
      ],
    }))
  }

  const removeJob = (index: number) => {
    setData((previous) => ({
      ...previous,
      experience: previous.experience.filter((_, jobIndex) => jobIndex !== index),
    }))
  }

  const reorderJobs = (fromIndex: number, toIndex: number) => {
    setData((previous) => ({
      ...previous,
      experience: moveItem(previous.experience, fromIndex, toIndex),
    }))
  }

  const updateSimpleSectionItem = (
    section: SimpleSectionName,
    itemIndex: number,
    key: SimpleSectionField['key'],
    value: string,
  ) => {
    setData((previous) => ({
      ...previous,
      [section]: simpleItems(previous, section).map((item, index) =>
        index === itemIndex ? { ...item, [key]: value } : item,
      ),
    }))
  }

  const addSimpleSectionItem = (
    section: SimpleSectionName,
    item: Education | Course,
  ) => {
    setData((previous) => ({
      ...previous,
      [section]: [...previous[section], item],
    }))
  }

  const removeSimpleSectionItem = (
    section: SimpleSectionName,
    itemIndex: number,
  ) => {
    setData((previous) => ({
      ...previous,
      [section]: simpleItems(previous, section).filter(
        (_, index) => index !== itemIndex,
      ),
    }))
  }

  const reorderSimpleSection = (
    section: SimpleSectionName,
    fromIndex: number,
    toIndex: number,
  ) => {
    setData((previous) => ({
      ...previous,
      [section]: moveItem(simpleItems(previous, section), fromIndex, toIndex),
    }))
  }

  const updateBulletedSectionItem = (
    section: BulletedSectionName,
    itemIndex: number,
    key: keyof BulletedSectionItem,
    value: string,
  ) => {
    setData((previous) => {
      const items = [...previous[section]]
      items[itemIndex] = { ...items[itemIndex], [key]: value }
      return { ...previous, [section]: items }
    })
  }

  const updateBulletedSectionBullet = (
    section: BulletedSectionName,
    itemIndex: number,
    bulletIndex: number,
    value: string,
  ) => {
    setData((previous) => {
      const items = [...previous[section]]
      const bullets = [...items[itemIndex].bullets]
      bullets[bulletIndex] = value
      items[itemIndex] = { ...items[itemIndex], bullets }
      return { ...previous, [section]: items }
    })
  }

  const addBulletedSectionItem = (
    section: BulletedSectionName,
    item: BulletedSectionItem,
  ) => {
    setData((previous) => ({
      ...previous,
      [section]: [...previous[section], item],
    }))
  }

  const removeBulletedSectionItem = (
    section: BulletedSectionName,
    itemIndex: number,
  ) => {
    setData((previous) => ({
      ...previous,
      [section]: previous[section].filter((_, index) => index !== itemIndex),
    }))
  }

  const reorderBulletedSection = (
    section: BulletedSectionName,
    fromIndex: number,
    toIndex: number,
  ) => {
    setData((previous) => ({
      ...previous,
      [section]: moveItem(previous[section], fromIndex, toIndex),
    }))
  }

  const addBulletedSectionBullet = (
    section: BulletedSectionName,
    itemIndex: number,
  ) => {
    setData((previous) => {
      const items = [...previous[section]]
      items[itemIndex] = {
        ...items[itemIndex],
        bullets: [...items[itemIndex].bullets, ''],
      }
      return { ...previous, [section]: items }
    })
  }

  const removeBulletedSectionBullet = (
    section: BulletedSectionName,
    itemIndex: number,
    bulletIndex: number,
  ) => {
    setData((previous) => {
      const items = [...previous[section]]

      items[itemIndex] = {
        ...items[itemIndex],
        bullets: items[itemIndex].bullets.filter(
          (_, index) => index !== bulletIndex,
        ),
      }

      return { ...previous, [section]: items }
    })
  }

  const reorderBulletedSectionBullets = (
    section: BulletedSectionName,
    itemIndex: number,
    fromIndex: number,
    toIndex: number,
  ) => {
    setData((previous) => {
      const items = [...previous[section]]

      items[itemIndex] = {
        ...items[itemIndex],
        bullets: moveItem(items[itemIndex].bullets, fromIndex, toIndex),
      }

      return { ...previous, [section]: items }
    })
  }

  /* --------------------------------------------------------------- export */

  const exportPdf = () => {
    void exportTextPdf(data, template)
  }

  const exportImagePdf = async () => {
    if (!exportRef.current) return

    const restoreZoom = zoom

    setIsExporting(true)
    setZoom(1)
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )

    try {
      const pdf = new jsPDF('p', 'pt', 'a4')
      const pages = Array.from(
        exportRef.current.querySelectorAll<HTMLElement>("[data-cv-page='true']"),
      )

      for (let index = 0; index < pages.length; index += 1) {
        const imgData = await toJpeg(pages[index], {
          backgroundColor: '#ffffff',
          cacheBust: true,
          height: pages[index].offsetHeight,
          pixelRatio: 2,
          quality: 0.94,
          skipFonts: true,
          style: { ...pdfColorStyleOverrides, margin: '0' },
          width: pages[index].offsetWidth,
        })
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()

        if (index > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight)

        const pageRect = pages[index].getBoundingClientRect()
        const scaleX = pageWidth / pageRect.width
        const scaleY = pageHeight / pageRect.height
        const links = Array.from(
          pages[index].querySelectorAll<HTMLAnchorElement>('[data-cv-link="true"]'),
        )

        for (const link of links) {
          const url = normalizeUrl(link.href)
          const linkRect = link.getBoundingClientRect()

          if (!url) continue

          pdf.link(
            (linkRect.left - pageRect.left) * scaleX,
            (linkRect.top - pageRect.top) * scaleY,
            linkRect.width * scaleX,
            linkRect.height * scaleY,
            { target: '_blank', url },
          )
        }
      }

      pdf.save(`${data.personal.fullName.replace(/\s+/g, '_') || 'CV'}_CV.pdf`)
    } finally {
      setZoom(restoreZoom)
      setIsExporting(false)
    }
  }

  /* --------------------------------------------------------------- render */

  const renderBulletEditor = (
    prefix: string,
    bullets: string[],
    onChange: (bulletIndex: number, value: string) => void,
    onAdd: () => void,
    onRemove: (bulletIndex: number) => void,
    onReorder: (fromIndex: number, toIndex: number) => void,
  ) => {
    const issues = lintBullets(bullets)

    return (
      <div className="pt-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted">Bullets</span>
          <button
            className="rounded-md px-1.5 py-1 text-[11px] font-medium text-muted outline-none transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ink/20"
            onClick={onAdd}
            type="button"
          >
            <span className="inline-flex items-center gap-1">
              <Plus className="h-3 w-3" />
              Add bullet
            </span>
          </button>
        </div>
        {bullets.length ? (
          <SortableList ids={idsFor(prefix, bullets.length)} onReorder={onReorder}>
            {bullets.map((bullet, bulletIndex) => (
              <SortableRow
                id={`${prefix}-${bulletIndex}`}
                key={`${prefix}-${bulletIndex}`}
                label={`bullet ${bulletIndex + 1}`}
                onRemove={() => onRemove(bulletIndex)}
              >
                <textarea
                  className="w-full resize-y rounded-lg border border-rule bg-white px-2.5 py-1.5 text-[13px] leading-5 text-neutral-900 outline-none transition [field-sizing:content] placeholder:text-neutral-400 focus:border-ink focus:ring-2 focus:ring-ink/10"
                  onChange={(event) => onChange(bulletIndex, event.target.value)}
                  placeholder="What you did, and what came of it"
                  rows={2}
                  value={bullet}
                />
                <BulletAdvice issues={issues[bulletIndex] ?? []} />
              </SortableRow>
            ))}
          </SortableList>
        ) : (
          <EmptySection>No bullets yet</EmptySection>
        )}
      </div>
    )
  }

  const renderSimpleSection = (
    section: SimpleSectionName,
    title: string,
    fields: SimpleSectionField[],
    defaultItem: Education | Course,
    emptyMessage: string,
  ) => {
    const items = simpleItems(data, section)

    return (
      <Section
        count={items.length}
        name={section}
        onAdd={() => addSimpleSectionItem(section, defaultItem)}
        title={title}
      >
        {items.length ? (
          <SortableList
            ids={idsFor(section, items.length)}
            onReorder={(from, to) => reorderSimpleSection(section, from, to)}
          >
            {items.map((item, itemIndex) => (
              <SortableItem
                id={`${section}-${itemIndex}`}
                key={`${section}-${itemIndex}`}
                meta={item.period}
                onRemove={() => removeSimpleSectionItem(section, itemIndex)}
                title={item.title || 'Untitled'}
              >
                {fields.map((field) => (
                  <Field
                    key={field.key}
                    label={field.label}
                    onChange={(value) =>
                      updateSimpleSectionItem(section, itemIndex, field.key, value)
                    }
                    rows={2}
                    textarea={field.textarea}
                    value={item[field.key] ?? ''}
                  />
                ))}
              </SortableItem>
            ))}
          </SortableList>
        ) : (
          <EmptySection>{emptyMessage}</EmptySection>
        )}
      </Section>
    )
  }

  const saveLabel =
    saveState === 'pending'
      ? 'Unsaved changes'
      : saveState === 'saving'
        ? 'Saving'
        : 'All changes saved'

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 print:bg-white xl:h-screen xl:overflow-hidden">
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="grid min-h-screen grid-cols-1 xl:h-full xl:min-h-0 xl:grid-cols-[400px_1fr]">
        <aside className="print-hide flex min-h-0 flex-col border-r border-rule bg-white xl:h-full">
          <header className="sticky top-0 z-30 shrink-0 bg-ink px-4 py-3 text-white xl:static">
            <div className="flex items-center justify-between gap-2">
              <DocumentMenu
                index={index}
                onCreate={() => createDocument('Untitled CV', emptyCV)}
                onDelete={deleteActiveDocument}
                onDuplicate={() => createDocument(`${activeName} copy`, data)}
                onExport={() => downloadJson(activeName, data)}
                onImport={importDocument}
                onRename={(name) =>
                  setIndex((previous) =>
                    touchDocument(previous, previous.activeId, { name }),
                  )
                }
                onSwitch={switchDocument}
              />
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  aria-label="Undo"
                  className="rounded-md p-1.5 text-white/70 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-25 disabled:hover:bg-transparent"
                  disabled={!canUndo}
                  onClick={undo}
                  title="Undo (Ctrl+Z)"
                  type="button"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label="Redo"
                  className="rounded-md p-1.5 text-white/70 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-25 disabled:hover:bg-transparent"
                  disabled={!canRedo}
                  onClick={redo}
                  title="Redo (Ctrl+Shift+Z)"
                  type="button"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <button
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-[13px] font-semibold text-ink outline-none transition hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/40"
              onClick={exportPdf}
              type="button"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </button>

            <div className="mt-2">
              <TemplatePicker
                data={data}
                onChange={(templateId) =>
                  setData((previous) => ({ ...previous, templateId }))
                }
                templateId={template.id}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-white/45">{saveLabel}</span>
              <button
                className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-white/55 outline-none transition hover:bg-white/5 hover:text-white/85 focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-50"
                disabled={isExporting}
                onClick={exportImagePdf}
                type="button"
              >
                <ImageIcon className="h-3 w-3" />
                {isExporting ? 'Exporting' : 'Export as image'}
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <Section name="personal" title="Personal">
              <div className="space-y-2.5">
                <PhotoField
                  onChange={(photo) =>
                    setData((previous) => ({ ...previous, photo }))
                  }
                  photo={data.photo}
                  usedByTemplate={template.photo !== 'none'}
                />
                <Field
                  label="Full name"
                  onChange={(value) => updatePersonal('fullName', value)}
                  value={data.personal.fullName}
                />
                <Field
                  label="Title"
                  onChange={(value) => updatePersonal('title', value)}
                  value={data.personal.title}
                />
                <Field
                  label="Address"
                  onChange={(value) => updatePersonal('address', value)}
                  rows={2}
                  textarea
                  value={data.personal.address}
                />
                <FieldPair>
                  <Field
                    label="Phone"
                    onChange={(value) => updatePersonal('phone', value)}
                    value={data.personal.phone}
                  />
                  <Field
                    label="Email"
                    onChange={(value) => updatePersonal('email', value)}
                    value={data.personal.email}
                  />
                </FieldPair>
                <FieldPair>
                  <Field
                    label="Born"
                    onChange={(value) => updatePersonal('birth', value)}
                    value={data.personal.birth}
                  />
                  <Field
                    label="Birthplace"
                    onChange={(value) => updatePersonal('birthPlace', value)}
                    value={data.personal.birthPlace}
                  />
                </FieldPair>
                <Field
                  label="Nationality"
                  onChange={(value) => updatePersonal('nationality', value)}
                  value={data.personal.nationality}
                />
              </div>
            </Section>

            <Section defaultOpen={false} name="layout" title="Layout">
              <LayoutControls
                baseTemplate={baseTemplate}
                data={data}
                layout={data.layout}
                onChange={(layout) =>
                  setData((previous) => ({ ...previous, layout }))
                }
              />
            </Section>

            <Section name="profile" title="Profile">
              <Field
                hint="Two or three sentences. Lead with what you actually build."
                label="Summary"
                onChange={(value) =>
                  setData((previous) => ({ ...previous, profile: value }))
                }
                rows={6}
                textarea
                value={data.profile}
              />
            </Section>

            <Section
              count={data.experience.length}
              name="experience"
              onAdd={addJob}
              title="Experience"
            >
              {data.experience.length ? (
                <SortableList
                  ids={idsFor('experience', data.experience.length)}
                  onReorder={reorderJobs}
                >
                  {data.experience.map((job, jobIndex) => (
                    <SortableItem
                      id={`experience-${jobIndex}`}
                      issueCount={countIssues(job.bullets)}
                      key={`experience-${jobIndex}`}
                      meta={job.period}
                      onRemove={() => removeJob(jobIndex)}
                      title={job.title || 'Untitled role'}
                    >
                      <Field
                        label="Role and company"
                        onChange={(value) => updateJob(jobIndex, 'title', value)}
                        rows={2}
                        textarea
                        value={job.title}
                      />
                      <FieldPair>
                        <Field
                          label="Period"
                          onChange={(value) =>
                            updateJob(jobIndex, 'period', value)
                          }
                          value={job.period}
                        />
                        <Field
                          label="Location"
                          onChange={(value) =>
                            updateJob(jobIndex, 'location', value)
                          }
                          value={job.location}
                        />
                      </FieldPair>
                      {renderBulletEditor(
                        `experience-${jobIndex}-bullet`,
                        job.bullets,
                        (bulletIndex, value) =>
                          updateJobBullet(jobIndex, bulletIndex, value),
                        () => addJobBullet(jobIndex),
                        (bulletIndex) => removeJobBullet(jobIndex, bulletIndex),
                        (from, to) => reorderJobBullets(jobIndex, from, to),
                      )}
                    </SortableItem>
                  ))}
                </SortableList>
              ) : (
                <EmptySection>Add your first role</EmptySection>
              )}
            </Section>

            {renderSimpleSection(
              'education',
              'Education',
              educationFields,
              newEducation,
              'Add a degree or school',
            )}

            {renderSimpleSection(
              'courses',
              'Courses',
              courseFields,
              newCourse,
              'Add a course',
            )}

            <Section
              count={data.certifications.length}
              name="certifications"
              onAdd={() =>
                addBulletedSectionItem('certifications', {
                  title: 'New certification',
                  subtitle: 'Issuer',
                  period: '2024',
                  bullets: [],
                })
              }
              title="Certifications"
            >
              {data.certifications.length ? (
                <SortableList
                  ids={idsFor('certifications', data.certifications.length)}
                  onReorder={(from, to) =>
                    reorderBulletedSection('certifications', from, to)
                  }
                >
                  {data.certifications.map((item, itemIndex) => (
                    <SortableItem
                      id={`certifications-${itemIndex}`}
                      key={`certifications-${itemIndex}`}
                      meta={item.period}
                      onRemove={() =>
                        removeBulletedSectionItem('certifications', itemIndex)
                      }
                      title={item.title || 'Untitled'}
                    >
                      <Field
                        label="Certification"
                        onChange={(value) =>
                          updateBulletedSectionItem(
                            'certifications',
                            itemIndex,
                            'title',
                            value,
                          )
                        }
                        rows={2}
                        textarea
                        value={item.title}
                      />
                      <FieldPair>
                        <Field
                          label="Issuer"
                          onChange={(value) =>
                            updateBulletedSectionItem(
                              'certifications',
                              itemIndex,
                              'subtitle',
                              value,
                            )
                          }
                          value={item.subtitle}
                        />
                        <Field
                          label="Period"
                          onChange={(value) =>
                            updateBulletedSectionItem(
                              'certifications',
                              itemIndex,
                              'period',
                              value,
                            )
                          }
                          value={item.period}
                        />
                      </FieldPair>
                    </SortableItem>
                  ))}
                </SortableList>
              ) : (
                <EmptySection>Add a certification</EmptySection>
              )}
            </Section>

            <Section
              count={data.projects.length}
              name="projects"
              onAdd={() =>
                addBulletedSectionItem('projects', {
                  title: 'New project',
                  subtitle: 'Role and stack',
                  period: '2024',
                  bullets: [''],
                })
              }
              title="Projects"
            >
              {data.projects.length ? (
                <SortableList
                  ids={idsFor('projects', data.projects.length)}
                  onReorder={(from, to) =>
                    reorderBulletedSection('projects', from, to)
                  }
                >
                  {data.projects.map((item, itemIndex) => (
                    <SortableItem
                      id={`projects-${itemIndex}`}
                      issueCount={countIssues(item.bullets)}
                      key={`projects-${itemIndex}`}
                      meta={item.period}
                      onRemove={() =>
                        removeBulletedSectionItem('projects', itemIndex)
                      }
                      title={item.title || 'Untitled project'}
                    >
                      <Field
                        label="Project"
                        onChange={(value) =>
                          updateBulletedSectionItem(
                            'projects',
                            itemIndex,
                            'title',
                            value,
                          )
                        }
                        rows={2}
                        textarea
                        value={item.title}
                      />
                      <FieldPair>
                        <Field
                          label="Role and stack"
                          onChange={(value) =>
                            updateBulletedSectionItem(
                              'projects',
                              itemIndex,
                              'subtitle',
                              value,
                            )
                          }
                          value={item.subtitle}
                        />
                        <Field
                          label="Period"
                          onChange={(value) =>
                            updateBulletedSectionItem(
                              'projects',
                              itemIndex,
                              'period',
                              value,
                            )
                          }
                          value={item.period}
                        />
                      </FieldPair>
                      {renderBulletEditor(
                        `projects-${itemIndex}-bullet`,
                        item.bullets,
                        (bulletIndex, value) =>
                          updateBulletedSectionBullet(
                            'projects',
                            itemIndex,
                            bulletIndex,
                            value,
                          ),
                        () => addBulletedSectionBullet('projects', itemIndex),
                        (bulletIndex) =>
                          removeBulletedSectionBullet(
                            'projects',
                            itemIndex,
                            bulletIndex,
                          ),
                        (from, to) =>
                          reorderBulletedSectionBullets(
                            'projects',
                            itemIndex,
                            from,
                            to,
                          ),
                      )}
                    </SortableItem>
                  ))}
                </SortableList>
              ) : (
                <EmptySection>Add a project</EmptySection>
              )}
            </Section>

            <Section
              count={data.skills.length}
              name="skills"
              onAdd={addSkill}
              title="Skills"
            >
              {data.skills.length ? (
                <SortableList
                  ids={idsFor('skills', data.skills.length)}
                  onReorder={reorderSkills}
                >
                  {data.skills.map((skill, skillIndex) => (
                    <SortableItem
                      id={`skills-${skillIndex}`}
                      key={`skills-${skillIndex}`}
                      meta={`${skill.bullets.length}`}
                      onRemove={() => removeSkill(skillIndex)}
                      title={skill.title || 'Untitled group'}
                    >
                      <Field
                        label="Group"
                        onChange={(value) =>
                          updateSkill(skillIndex, 'title', value)
                        }
                        value={skill.title}
                      />
                      <Field
                        hint="One per line"
                        label="Skills"
                        onChange={(value) =>
                          updateSkill(skillIndex, 'bullets', value)
                        }
                        rows={3}
                        textarea
                        value={skill.bullets.join('\n')}
                      />
                    </SortableItem>
                  ))}
                </SortableList>
              ) : (
                <EmptySection>Add a skill group</EmptySection>
              )}
            </Section>

            <Section name="languages-and-hobbies" title="Languages and hobbies">
              <div className="space-y-2.5">
                <Field
                  hint="Separate with commas"
                  label="Languages"
                  onChange={(value) =>
                    setData((previous) => ({
                      ...previous,
                      languages: value
                        .split(',')
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    }))
                  }
                  value={data.languages.join(', ')}
                />
                <Field
                  label="Hobbies"
                  onChange={(value) =>
                    setData((previous) => ({ ...previous, hobbies: value }))
                  }
                  value={data.hobbies}
                />
              </div>
            </Section>

            <Section
              count={data.links.length}
              name="links"
              onAdd={addLink}
              title="Links"
            >
              {data.links.length ? (
                <SortableList
                  ids={idsFor('links', data.links.length)}
                  onReorder={reorderLinks}
                >
                  {data.links.map((link, linkIndex) => (
                    <SortableRow
                      id={`links-${linkIndex}`}
                      key={`links-${linkIndex}`}
                      label={link.title || `link ${linkIndex + 1}`}
                      onRemove={() => removeLink(linkIndex)}
                    >
                      <div className="grid grid-cols-[1fr_1.4fr] gap-2 py-0.5">
                        <input
                          aria-label={`Link ${linkIndex + 1} title`}
                          className="w-full rounded-lg border border-rule bg-white px-2.5 py-1.5 text-[13px] text-neutral-900 outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/10"
                          onChange={(event) =>
                            updateLink(linkIndex, 'title', event.target.value)
                          }
                          placeholder="Title"
                          value={link.title}
                        />
                        <input
                          aria-label={`Link ${linkIndex + 1} URL`}
                          className="w-full rounded-lg border border-rule bg-white px-2.5 py-1.5 text-[13px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-ink focus:ring-2 focus:ring-ink/10"
                          onChange={(event) =>
                            updateLink(linkIndex, 'url', event.target.value)
                          }
                          placeholder="github.com/you"
                          value={link.url}
                        />
                      </div>
                    </SortableRow>
                  ))}
                </SortableList>
              ) : (
                <EmptySection>Add a link</EmptySection>
              )}
            </Section>

            <div className="h-12" />
          </div>
        </aside>

        <main className="min-w-0 p-4 md:p-8 xl:h-full xl:min-h-0 xl:overflow-auto" ref={previewRef}>
          <PreviewToolbar
            onFit={fitToWidth}
            onZoomChange={setZoom}
            pageCount={pageCount}
            zoom={zoom}
          />
          <div
            className="mx-auto"
            style={{
              width: PAGE_WIDTH * zoom,
              height: naturalHeight ? naturalHeight * zoom : undefined,
            }}
          >
            <div
              ref={scaledRef}
              style={{
                width: PAGE_WIDTH,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <div ref={exportRef}>
                <CVDocument
                  data={data}
                  template={template}
                  onPageCountChange={handlePageCountChange}
                  onSelectBlock={handleSelectBlock}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function BulletAdvice({ issues }: { issues: BulletIssue[] }) {
  if (!issues.length) return null

  return (
    <ul className="mb-1 mt-1 space-y-0.5">
      {issues.map((issue) => (
        <li
          className="flex gap-1.5 text-[11px] leading-4 text-muted"
          key={issue.code}
        >
          <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-advice" />
          {issue.message}
        </li>
      ))}
    </ul>
  )
}

export default function App() {
  return (
    <FocusProvider>
      <Editor />
    </FocusProvider>
  )
}
