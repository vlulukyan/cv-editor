import type {
  BulletedSectionItem,
  Course,
  CVData,
  Education,
  Job,
  LinkItem,
  PersonalInfo,
  Skill,
} from './types'
import { initialData } from './initialData'

export { initialData }

export const SCHEMA_VERSION = 1

const PREFIX = 'cv-editor'
const INDEX_KEY = `${PREFIX}/index`
const LEGACY_KEY = 'cv-editor-data'

const documentKey = (id: string) => `${PREFIX}/doc/${id}`

export type DocumentMeta = {
  id: string
  name: string
  updatedAt: string
}

export type DocumentIndex = {
  version: number
  activeId: string
  documents: DocumentMeta[]
}

function createId() {
  return `cv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/* -------------------------------------------------------------------------
 * Validation
 *
 * Anything reaching these functions may be hand-edited localStorage or a JSON
 * file dropped in by the user, so every field is coerced rather than trusted.
 * A malformed document degrades to a usable one instead of crashing the app.
 * ---------------------------------------------------------------------- */

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asArray<T>(value: unknown, map: (entry: Record<string, unknown>) => T) {
  if (!Array.isArray(value)) return []

  return value.map((entry) => map(asRecord(entry)))
}

function toPersonal(value: unknown): PersonalInfo {
  const raw = asRecord(value)

  return {
    fullName: asString(raw.fullName),
    title: asString(raw.title),
    address: asString(raw.address),
    phone: asString(raw.phone),
    email: asString(raw.email),
    birth: asString(raw.birth),
    birthPlace: asString(raw.birthPlace),
    nationality: asString(raw.nationality),
  }
}

function toSkill(raw: Record<string, unknown>): Skill {
  // Older saves stored a skill as { name } with no bullets.
  const title = asString(raw.title) || asString(raw.name)

  return { title, bullets: asStringArray(raw.bullets) }
}

function toJob(raw: Record<string, unknown>): Job {
  return {
    title: asString(raw.title),
    location: asString(raw.location),
    period: asString(raw.period),
    bullets: asStringArray(raw.bullets),
  }
}

function toEducation(raw: Record<string, unknown>): Education {
  return {
    title: asString(raw.title),
    period: asString(raw.period),
    location: asString(raw.location),
  }
}

function toCourse(raw: Record<string, unknown>): Course {
  return { title: asString(raw.title), period: asString(raw.period) }
}

function toBulletedItem(raw: Record<string, unknown>): BulletedSectionItem {
  return {
    title: asString(raw.title),
    subtitle: asString(raw.subtitle),
    period: asString(raw.period),
    bullets: asStringArray(raw.bullets),
  }
}

function toLink(value: unknown): LinkItem {
  // Links used to be plain strings.
  if (typeof value === 'string') return { title: value, url: '' }

  const raw = asRecord(value)

  return { title: asString(raw.title), url: asString(raw.url) }
}

function toLayout(value: unknown) {
  const raw = asRecord(value)
  const density = typeof raw.density === 'number' ? raw.density : undefined
  const sidebarWidth =
    typeof raw.sidebarWidth === 'number' ? raw.sidebarWidth : undefined

  return density === undefined && sidebarWidth === undefined
    ? undefined
    : { density, sidebarWidth }
}

export function normalizeCVData(value: unknown): CVData {
  const raw = asRecord(value)

  return {
    templateId: typeof raw.templateId === 'string' ? raw.templateId : undefined,
    layout: toLayout(raw.layout),
    photo:
      typeof raw.photo === 'string' && raw.photo.startsWith('data:image/')
        ? raw.photo
        : undefined,
    personal: toPersonal(raw.personal),
    profile: asString(raw.profile),
    skills: asArray(raw.skills, toSkill),
    hobbies: asString(raw.hobbies),
    languages: asStringArray(raw.languages),
    links: Array.isArray(raw.links) ? raw.links.map(toLink) : [],
    experience: asArray(raw.experience, toJob),
    education: asArray(raw.education, toEducation),
    courses: asArray(raw.courses, toCourse),
    certifications: asArray(raw.certifications, toBulletedItem),
    projects: asArray(raw.projects, toBulletedItem),
  }
}

/* -------------------------------------------------------------------------
 * Documents
 * ---------------------------------------------------------------------- */

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)

    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be full or blocked; the in-memory document still works.
  }
}

function toIndex(value: unknown): DocumentIndex | null {
  const raw = asRecord(value)

  if (!Array.isArray(raw.documents) || !raw.documents.length) return null

  const documents = raw.documents
    .map((entry) => asRecord(entry))
    .filter((entry) => typeof entry.id === 'string')
    .map((entry) => ({
      id: asString(entry.id),
      name: asString(entry.name, 'Untitled CV'),
      updatedAt: asString(entry.updatedAt, new Date().toISOString()),
    }))

  if (!documents.length) return null

  const activeId = asString(raw.activeId)

  return {
    version: SCHEMA_VERSION,
    activeId: documents.some((entry) => entry.id === activeId)
      ? activeId
      : documents[0].id,
    documents,
  }
}

/**
 * Reads the document index, migrating a single-document save from the
 * original storage key on first run.
 */
export function loadIndex(): DocumentIndex {
  const existing = toIndex(readJson(INDEX_KEY))

  if (existing) return existing

  const legacy = readJson(LEGACY_KEY)
  const id = createId()
  const index: DocumentIndex = {
    version: SCHEMA_VERSION,
    activeId: id,
    documents: [{ id, name: 'My CV', updatedAt: new Date().toISOString() }],
  }

  writeJson(documentKey(id), normalizeCVData(legacy ?? initialData))
  writeJson(INDEX_KEY, index)

  return index
}

export function saveIndex(index: DocumentIndex) {
  writeJson(INDEX_KEY, index)
}

export function loadDocument(id: string): CVData {
  const stored = readJson(documentKey(id))

  return stored ? normalizeCVData(stored) : normalizeCVData(initialData)
}

export function saveDocument(id: string, data: CVData) {
  writeJson(documentKey(id), data)
}

export function deleteDocument(id: string) {
  try {
    window.localStorage.removeItem(documentKey(id))
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

export function touchDocument(
  index: DocumentIndex,
  id: string,
  changes: Partial<Omit<DocumentMeta, 'id'>> = {},
): DocumentIndex {
  return {
    ...index,
    documents: index.documents.map((entry) =>
      entry.id === id
        ? { ...entry, updatedAt: new Date().toISOString(), ...changes }
        : entry,
    ),
  }
}

export function addDocument(
  index: DocumentIndex,
  name: string,
  data: CVData,
): { index: DocumentIndex; id: string } {
  const id = createId()

  saveDocument(id, data)

  return {
    id,
    index: {
      ...index,
      activeId: id,
      documents: [
        ...index.documents,
        { id, name, updatedAt: new Date().toISOString() },
      ],
    },
  }
}

export function removeDocument(
  index: DocumentIndex,
  id: string,
): DocumentIndex {
  const documents = index.documents.filter((entry) => entry.id !== id)

  if (!documents.length) return index

  deleteDocument(id)

  return {
    ...index,
    activeId: index.activeId === id ? documents[0].id : index.activeId,
    documents,
  }
}

/* -------------------------------------------------------------------------
 * JSON transfer
 * ---------------------------------------------------------------------- */

type ExportedFile = {
  schemaVersion: number
  name: string
  exportedAt: string
  data: CVData
}

export function downloadJson(name: string, data: CVData) {
  const payload: ExportedFile = {
    schemaVersion: SCHEMA_VERSION,
    name,
    exportedAt: new Date().toISOString(),
    data,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `${name.replace(/\s+/g, '_') || 'cv'}.json`
  anchor.click()

  URL.revokeObjectURL(url)
}

/**
 * Accepts both an exported wrapper and a bare CV object, so a file saved by
 * an older version - or hand-written - still imports.
 */
export function parseImportedJson(text: string) {
  const parsed = JSON.parse(text) as unknown
  const raw = asRecord(parsed)
  const hasWrapper = 'data' in raw && typeof raw.data === 'object'

  return {
    name: asString(raw.name, 'Imported CV'),
    data: normalizeCVData(hasWrapper ? raw.data : parsed),
  }
}
