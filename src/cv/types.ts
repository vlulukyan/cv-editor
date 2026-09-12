export type PersonalInfo = {
  fullName: string
  title: string
  address: string
  phone: string
  email: string
  birth: string
  birthPlace: string
  nationality: string
}

export type Skill = {
  title: string
  bullets: string[]
}

export type Job = {
  title: string
  location: string
  period: string
  bullets: string[]
}

export type Education = {
  title: string
  period: string
  location: string
}

export type Course = {
  title: string
  period: string
}

export type BulletedSectionItem = {
  title: string
  subtitle: string
  period: string
  bullets: string[]
}

export type LinkItem = {
  title: string
  url: string
}

export type CVData = {
  /** Which template renders this CV. Falls back to the first one. */
  templateId?: string
  /** Square portrait as a data URL. Templates opt in to showing it. */
  photo?: string
  /** Per-document tweaks layered over the template. */
  layout?: { density?: number; sidebarWidth?: number }
  personal: PersonalInfo
  profile: string
  skills: Skill[]
  hobbies: string
  languages: string[]
  links: LinkItem[]
  experience: Job[]
  education: Education[]
  courses: Course[]
  certifications: BulletedSectionItem[]
  projects: BulletedSectionItem[]
}

export type BulletedSectionName = 'certifications' | 'projects'

/** Sections whose items are flat records of short text fields. */
export type SimpleSectionName = 'education' | 'courses'
