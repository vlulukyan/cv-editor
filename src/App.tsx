import {
  type ChangeEvent,
  type MouseEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { toJpeg } from 'html-to-image'
import jsPDF from 'jspdf'
import './App.css'

type PersonalInfo = {
  fullName: string
  title: string
  address: string
  phone: string
  email: string
  birth: string
  birthPlace: string
  nationality: string
}

type Skill = {
  name: string
  level: number
}

type Job = {
  title: string
  location: string
  period: string
  bullets: string[]
}

type Education = {
  title: string
  period: string
  location: string
}

type Course = {
  title: string
  period: string
}

type LinkItem = {
  title: string
  url: string
}

type CVData = {
  personal: PersonalInfo
  profile: string
  skills: Skill[]
  hobbies: string
  languages: string[]
  links: LinkItem[]
  experience: Job[]
  education: Education[]
  courses: Course[]
}

const initialData: CVData = {
  personal: {
    fullName: 'VAHAN LULUKYAN',
    title: 'FULL STACK DEVELOPER',
    address: '5 Tumanyan 4apt., Yerevan, 0001, Armenia',
    phone: '+374 91 78 76 76',
    email: 'lulukyan@hotmail.com',
    birth: '04.03.1988',
    birthPlace: 'Yerevan',
    nationality: 'Armenian',
  },
  profile:
    'Experienced Web Developer with expertise in all phases of advanced web development. Strong understanding of user interface design, testing, and debugging. Proven ability to design, install, test, and maintain robust web systems. Possessing a diverse skillset including JavaScript, TypeScript, Node.js, NestJS, Angular, and proficiency in MongoDB, MySQL, and PostgreSQL databases. Effective self-manager with excellent teamwork and collaboration skills.',
  skills: [
    { name: 'Visual Design Skills', level: 5 },
    { name: 'Knowledgeable in User Interface / User Experience', level: 5 },
    { name: 'Adaptability', level: 5 },
    { name: 'Database Management', level: 5 },
    { name: 'PHP / Python', level: 4 },
    { name: 'JavaScript / TypeScript', level: 5 },
    { name: 'Node JS / Nest JS', level: 5 },
    { name: 'PostgreSQL / Mongo DB', level: 4 },
    { name: 'Redis', level: 3 },
    { name: 'ElasticSearch', level: 4 },
    { name: 'Angular / Next JS', level: 5 },
  ],
  hobbies: 'Hiking, Watching football',
  languages: ['English', 'Russian', 'Armenian'],
  links: [
    { title: 'LinkedIn', url: '' },
    { title: 'GitHub', url: '' },
  ],
  experience: [
    {
      title: 'Senior backend developer, IT Flame LLC',
      location: 'Yerevan',
      period: 'Sep 2021 - present',
      bullets: [
        'Primarily focused on backend development, with some frontend contributions.',
        'Developed an e-commerce ecosystem utilizing NestJS APIs, Redis for caching and task scheduling, and ElasticSearch for search.',
        'PostgreSQL served as the primary database.',
        'Built the e-commerce platform redro.ru from the ground up.',
      ],
    },
    {
      title: 'Full Stack developer, Arpi Studio',
      location: 'Yerevan',
      period: 'Dec 2019 - Aug 2021',
      bullets: [
        'Collaborated across design, coding, testing, reporting, and debugging.',
        'Managed front-end and back-end development using Node.js, Express.js, MongoDB, Pug/EJS, and Angular.',
        'Continuously evaluated and learned emerging web development standards and technologies.',
        'Developed websites from scratch and worked on rebranding projects.',
      ],
    },
    {
      title: 'Full Stack Web Developer, Concent',
      location: 'Yerevan',
      period: 'Sep 2017 - Nov 2019',
      bullets: [
        'Designed, developed, tested, and deployed web applications.',
        'Provided troubleshooting and remediation.',
        'Developed RESTful APIs for cryptocurrencies.',
        'Translated client requirements into functional designs.',
      ],
    },
    {
      title: 'Web developer, USArmenia TV / Interlur LLC',
      location: 'Yerevan',
      period: 'Sep 2015 - May 2016',
      bullets: ['Worked as a web developer to design, code, and test websites.'],
    },
    {
      title: 'Web Developer',
      location: 'Yerevan',
      period: 'Aug 2013 - Aug 2015',
      bullets: [
        'Collaborated effectively as a team member in all phases of development.',
        'Continuously evaluated and learned about new web development standards and technologies.',
      ],
    },
    {
      title: 'Junior Developer, VXSoft',
      location: 'Yerevan',
      period: 'Aug 2011 - Jul 2013',
      bullets: [
        'Contributed to the development of software for the State Register Agency of Armenia.',
        'Resolved website issues including broken links, typos, and formatting errors.',
        'Collaborated in testing and debugging and communicated with customers.',
      ],
    },
  ],
  education: [
    {
      title: 'Bachelor of Mechanical Faculty, Armenian State Engineering University',
      period: 'Aug 2005 - Aug 2010',
      location: 'Yerevan',
    },
    {
      title: 'High School',
      period: 'Sep 1995 - May 2005',
      location: 'Yerevan',
    },
  ],
  courses: [
    {
      title: 'Javascript, Microsoft Innovation Center',
      period: 'Jun 2017 - Sep 2017',
    },
  ],
}

const storageKey = 'cv-editor-data'

const sectionTitle =
  'text-[11px] font-bold uppercase leading-3 tracking-[0.38em] text-neutral-900'

const pdfColorStyleOverrides = {
  '--color-neutral-50': '#fafafa',
  '--color-neutral-100': '#f5f5f5',
  '--color-neutral-200': '#e5e5e5',
  '--color-neutral-300': '#d4d4d4',
  '--color-neutral-400': '#a3a3a3',
  '--color-neutral-500': '#737373',
  '--color-neutral-600': '#525252',
  '--color-neutral-700': '#404040',
  '--color-neutral-800': '#262626',
  '--color-neutral-900': '#171717',
  '--color-neutral-950': '#0a0a0a',
}

type DotsProps = {
  level?: number
}

function Dots({ level = 4 }: DotsProps) {
  return (
    <div className="cv-skill-dots">
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          className={`cv-skill-dot ${index < level ? 'is-filled' : ''}`}
          key={index}
        />
      ))}
    </div>
  )
}

type SidebarFieldProps = {
  label: string
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  textarea?: boolean
}

function SidebarField({
  label,
  value,
  onChange,
  textarea = false,
}: SidebarFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      {textarea ? (
        <textarea
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-700"
          onChange={onChange}
          rows={3}
          value={value}
        />
      ) : (
        <input
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-700"
          onChange={onChange}
          value={value}
        />
      )}
    </label>
  )
}

type BulletListProps = {
  bullets: string[]
}

function BulletList({ bullets }: BulletListProps) {
  return (
    <div className="cv-bullet-list">
      {bullets.map((bullet, bulletIndex) => (
        <div className="cv-bullet-row" key={`${bullet}-${bulletIndex}`}>
          <span className="cv-bullet-marker" />
          <div className="cv-bullet-text">{bullet}</div>
        </div>
      ))}
    </div>
  )
}

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim()

  if (!trimmedUrl) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedUrl)) return trimmedUrl

  return `https://${trimmedUrl}`
}

function openInBlankPage(event: MouseEvent<HTMLAnchorElement>, url: string) {
  event.preventDefault()
  window.open(normalizeUrl(url), '_blank', 'noopener,noreferrer')
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length) return items

  const nextItems = [...items]
  const [item] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, item)

  return nextItems
}

function normalizeSavedData(data: CVData) {
  return {
    ...initialData,
    ...data,
    personal: { ...initialData.personal, ...data.personal },
    links: Array.isArray(data.links)
      ? data.links.map((link) =>
          typeof link === 'string' ? { title: link, url: '' } : link,
        )
      : initialData.links,
  }
}

function loadSavedData() {
  try {
    const savedData = window.localStorage.getItem(storageKey)

    if (!savedData) return initialData

    return normalizeSavedData(JSON.parse(savedData) as CVData)
  } catch {
    return initialData
  }
}

type CVPageProps = {
  data: CVData
  secondPage?: boolean
}

function CVPage({ data, secondPage = false }: CVPageProps) {
  return (
    <div
      className="cv-page mx-auto mb-8 w-[794px] bg-white text-neutral-900 shadow-2xl print:mb-0 print:shadow-none"
      data-cv-page="true"
      style={{ minHeight: '1123px' }}
    >
      {!secondPage ? (
        <div className="grid min-h-[1123px] grid-cols-[240px_1fr] bg-[#f2f2f2]">
          <aside className="bg-[#e7e7e7] pb-10 pl-[60px] pr-7 pt-[220px]">
            <div className="space-y-[34px]">
              <div>
                <h3 className={sectionTitle}>Info</h3>
                <div className="mt-3 h-px bg-neutral-500" />
                <div className="mt-4 space-y-[14px] text-[10px] leading-[14px]">
                  <div>
                    <div className="text-[8.5px] font-bold uppercase leading-[11px]">
                      Address
                    </div>
                    <div>{data.personal.address}</div>
                  </div>
                  <div>
                    <div className="text-[8.5px] font-bold uppercase leading-[11px]">
                      Phone
                    </div>
                    <div>{data.personal.phone}</div>
                  </div>
                  <div>
                    <div className="text-[8.5px] font-bold uppercase leading-[11px]">
                      Email
                    </div>
                    <div className="break-all">{data.personal.email}</div>
                  </div>
                  <div>
                    <div className="text-[8.5px] font-bold uppercase leading-[11px]">
                      Date / Place of Birth
                    </div>
                    <div>{data.personal.birth}</div>
                    <div>{data.personal.birthPlace}</div>
                  </div>
                  <div>
                    <div className="text-[8.5px] font-bold uppercase leading-[11px]">
                      Nationality
                    </div>
                    <div>{data.personal.nationality}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className={sectionTitle}>Skills</h3>
                <div className="mt-3 h-px bg-neutral-500" />
                <div className="cv-skill-list">
                  {data.skills.map((skill, index) => (
                    <div className="cv-skill-item" key={`${skill.name}-${index}`}>
                      <div className="cv-skill-label">{skill.name}</div>
                      <Dots level={skill.level} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={sectionTitle}>Hobbies</h3>
                <div className="mt-3 h-px bg-neutral-500" />
                <p className="mt-4 text-[11px] leading-[16px]">{data.hobbies}</p>
              </div>
            </div>
          </aside>

          <main className="relative px-8 pb-10 pt-[230px]">
            <div className="absolute left-1/2 top-14 w-[380px] -translate-x-1/2 border-2 border-neutral-500 bg-[#f2f2f2] px-8 py-6 text-center">
              <h1 className="text-[24px] font-extrabold leading-7 tracking-[0.17em]">
                {data.personal.fullName}
              </h1>
              <div className="mt-3 text-[14px] leading-5 tracking-[0.12em]">
                {data.personal.title}
              </div>
            </div>

            <section>
              <h3 className={sectionTitle}>Profile</h3>
              <div className="mt-3 h-px bg-neutral-500" />
              <p className="mt-4 text-[11px] leading-[17px]">{data.profile}</p>
            </section>

            <section className="mt-8">
              <h3 className={sectionTitle}>Employment History</h3>
              <div className="mt-3 h-px bg-neutral-500" />
              <div className="mt-5 space-y-[30px]">
                {data.experience.slice(0, 3).map((job, index) => (
                  <div key={`${job.title}-${index}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[13px] font-bold leading-[15px]">
                          {job.title}
                        </div>
                        <div className="text-[11px] leading-[15px]">{job.period}</div>
                      </div>
                      <div className="pt-0.5 text-[10px] leading-[14px]">
                        {job.location}
                      </div>
                    </div>
                    <BulletList bullets={job.bullets} />
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      ) : (
        <div className="grid min-h-[1123px] grid-cols-[240px_1fr] bg-[#f2f2f2]">
          <aside className="bg-[#e7e7e7] pb-10 pl-[60px] pr-7 pt-10">
            <div className="space-y-[34px]">
              <section>
                <h3 className={sectionTitle}>Languages</h3>
                <div className="mt-3 h-px bg-neutral-500" />
                <div className="mt-4 space-y-[18px] text-[11px] leading-[13px]">
                  {data.languages.map((language, index) => (
                    <div key={`${language}-${index}`}>{language}</div>
                  ))}
                </div>
              </section>

              <section className="mt-8">
                <h3 className={sectionTitle}>Links</h3>
                <div className="mt-3 h-px bg-neutral-500" />
                <div className="mt-4 space-y-2 text-[11px] leading-[14px]">
                  {data.links.map((link, index) => (
                    <div key={`${link.title}-${index}`}>
                      {link.url ? (
                        <a
                          className="text-neutral-900 no-underline"
                          data-cv-link="true"
                          href={normalizeUrl(link.url)}
                          onClick={(event) => openInBlankPage(event, link.url)}
                          rel="noreferrer"
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
              </section>
            </div>
          </aside>

          <main className="px-8 pb-12 pt-8">
            <section>
              <div className="space-y-[30px]">
                {data.experience.slice(3).map((job, index) => (
                  <div key={`${job.title}-${index}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[13px] font-bold leading-[15px]">
                          {job.title}
                        </div>
                        <div className="text-[11px] leading-[15px]">{job.period}</div>
                      </div>
                      <div className="pt-0.5 text-[10px] leading-[14px]">
                        {job.location}
                      </div>
                    </div>
                    <BulletList bullets={job.bullets} />
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h3 className={sectionTitle}>Education</h3>
              <div className="mt-3 h-px bg-neutral-500" />
              <div className="mt-5 space-y-[28px]">
                {data.education.map((item, index) => (
                  <div key={`${item.title}-${index}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="max-w-[320px] text-[13px] font-semibold leading-[16px]">
                          {item.title}
                        </div>
                        <div className="text-[11px] leading-[15px]">{item.period}</div>
                      </div>
                      <div className="pt-0.5 text-[10px] leading-[14px] text-neutral-700">
                        {item.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h3 className={sectionTitle}>Courses</h3>
              <div className="mt-3 h-px bg-neutral-500" />
              <div className="mt-5 space-y-4">
                {data.courses.map((item, index) => (
                  <div key={`${item.title}-${index}`}>
                    <div className="text-[13px] font-semibold leading-[16px]">
                      {item.title}
                    </div>
                    <div className="text-[11px] leading-[15px]">{item.period}</div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      )}
    </div>
  )
}

function App() {
  const [data, setData] = useState<CVData>(() => loadSavedData())
  const exportRef = useRef<HTMLDivElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  const pageCount = useMemo(() => 2, [])

  const saveData = () => {
    window.localStorage.setItem(storageKey, JSON.stringify(data))
    setSaveStatus('Saved')
    window.setTimeout(() => setSaveStatus(''), 1800)
  }

  const updatePersonal = (key: keyof PersonalInfo, value: string) => {
    setData((previous) => ({
      ...previous,
      personal: { ...previous.personal, [key]: value },
    }))
  }

  const updateSkillName = (index: number, value: string) => {
    setData((previous) => {
      const skills = [...previous.skills]
      skills[index] = { ...skills[index], name: value }
      return { ...previous, skills }
    })
  }

  const updateSkillLevel = (index: number, value: string) => {
    setData((previous) => {
      const skills = [...previous.skills]
      skills[index] = { ...skills[index], level: Number(value) }
      return { ...previous, skills }
    })
  }

  const addSkill = () => {
    setData((previous) => ({
      ...previous,
      skills: [...previous.skills, { name: 'New Skill', level: 3 }],
    }))
  }

  const removeSkill = (index: number) => {
    setData((previous) => ({
      ...previous,
      skills: previous.skills.filter((_, skillIndex) => skillIndex !== index),
    }))
  }

  const moveSkill = (index: number, direction: -1 | 1) => {
    setData((previous) => ({
      ...previous,
      skills: moveItem(previous.skills, index, index + direction),
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
      links: [...previous.links, { title: 'New Link', url: '' }],
    }))
  }

  const removeLink = (index: number) => {
    setData((previous) => ({
      ...previous,
      links: previous.links.filter((_, linkIndex) => linkIndex !== index),
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

  const addJob = () => {
    setData((previous) => ({
      ...previous,
      experience: [
        ...previous.experience,
        {
          title: 'New Position',
          location: 'Yerevan',
          period: '2024 - present',
          bullets: ['Describe your responsibility'],
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

  const moveJob = (index: number, direction: -1 | 1) => {
    setData((previous) => ({
      ...previous,
      experience: moveItem(previous.experience, index, index + direction),
    }))
  }

  const exportPdf = async () => {
    if (!exportRef.current) return

    setIsExporting(true)
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
          style: {
            ...pdfColorStyleOverrides,
            margin: '0',
          },
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

      pdf.save(`${data.personal.fullName.replace(/\s+/g, '_')}_CV.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 print:bg-white">
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[420px_1fr]">
        <aside className="print-hide border-r border-neutral-200 bg-white p-6 xl:h-screen xl:overflow-auto">
          <div className="sticky top-0 bg-white pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-neutral-900 p-2 text-white">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">CV Editor</h2>
                <p className="text-sm text-neutral-500">
                  Update content and export PDF
                </p>
              </div>
            </div>
            <button
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
              disabled={isExporting}
              onClick={exportPdf}
              type="button"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
            <button
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
              onClick={saveData}
              type="button"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
            {saveStatus ? (
              <div className="mt-2 text-center text-sm font-medium text-neutral-500">
                {saveStatus}
              </div>
            ) : null}
          </div>

          <div className="mt-6 space-y-8">
            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-600">
                Personal
              </h3>
              <SidebarField
                label="Full name"
                onChange={(event) =>
                  updatePersonal('fullName', event.target.value)
                }
                value={data.personal.fullName}
              />
              <SidebarField
                label="Title"
                onChange={(event) => updatePersonal('title', event.target.value)}
                value={data.personal.title}
              />
              <SidebarField
                label="Address"
                onChange={(event) =>
                  updatePersonal('address', event.target.value)
                }
                textarea
                value={data.personal.address}
              />
              <SidebarField
                label="Phone"
                onChange={(event) => updatePersonal('phone', event.target.value)}
                value={data.personal.phone}
              />
              <SidebarField
                label="Email"
                onChange={(event) => updatePersonal('email', event.target.value)}
                value={data.personal.email}
              />
              <SidebarField
                label="Birth date"
                onChange={(event) => updatePersonal('birth', event.target.value)}
                value={data.personal.birth}
              />
              <SidebarField
                label="Birth place"
                onChange={(event) =>
                  updatePersonal('birthPlace', event.target.value)
                }
                value={data.personal.birthPlace}
              />
              <SidebarField
                label="Nationality"
                onChange={(event) =>
                  updatePersonal('nationality', event.target.value)
                }
                value={data.personal.nationality}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-600">
                Profile
              </h3>
              <SidebarField
                label="Summary"
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    profile: event.target.value,
                  }))
                }
                textarea
                value={data.profile}
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-600">
                  Skills
                </h3>
                <button
                  className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
                  onClick={addSkill}
                  type="button"
                >
                  <span className="inline-flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </span>
                </button>
              </div>
              {data.skills.map((skill, index) => (
                <div
                  className="rounded-2xl border border-neutral-200 p-3"
                  key={`${skill.name}-${index}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-full space-y-2">
                      <SidebarField
                        label="Skill"
                        onChange={(event) =>
                          updateSkillName(index, event.target.value)
                        }
                        value={skill.name}
                      />
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-neutral-600">
                          Level (0-5)
                        </span>
                        <input
                          className="w-full"
                          max="5"
                          min="0"
                          onChange={(event) =>
                            updateSkillLevel(index, event.target.value)
                          }
                          type="range"
                          value={skill.level}
                        />
                        <div className="text-sm text-neutral-500">
                          {skill.level}/5
                        </div>
                      </label>
                    </div>
                    <div className="mt-1 flex flex-col gap-1">
                      <button
                        aria-label={`Move skill ${index + 1} up`}
                        className="rounded-lg p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => moveSkill(index, -1)}
                        title="Move up"
                        type="button"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Move skill ${index + 1} down`}
                        className="rounded-lg p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={index === data.skills.length - 1}
                        onClick={() => moveSkill(index, 1)}
                        title="Move down"
                        type="button"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Remove skill ${index + 1}`}
                        className="rounded-lg p-2 hover:bg-neutral-100"
                        onClick={() => removeSkill(index)}
                        title="Remove"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <SidebarField
                label="Hobbies"
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    hobbies: event.target.value,
                  }))
                }
                value={data.hobbies}
              />
              <SidebarField
                label="Languages (comma separated)"
                onChange={(event) =>
                  setData((previous) => ({
                    ...previous,
                    languages: event.target.value
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  }))
                }
                value={data.languages.join(', ')}
              />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-600">
                  Links
                </h3>
                <button
                  className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
                  onClick={addLink}
                  type="button"
                >
                  <span className="inline-flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </span>
                </button>
              </div>
              {data.links.map((link, index) => (
                <div
                  className="rounded-2xl border border-neutral-200 p-3"
                  key={`${link.title}-${index}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Link {index + 1}</div>
                    <button
                      className="rounded-lg p-2 hover:bg-neutral-100"
                      onClick={() => removeLink(index)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <SidebarField
                      label="Title"
                      onChange={(event) =>
                        updateLink(index, 'title', event.target.value)
                      }
                      value={link.title}
                    />
                    <SidebarField
                      label="URL"
                      onChange={(event) =>
                        updateLink(index, 'url', event.target.value)
                      }
                      value={link.url}
                    />
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-600">
                  Experience
                </h3>
                <button
                  className="rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
                  onClick={addJob}
                  type="button"
                >
                  <span className="inline-flex items-center gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </span>
                </button>
              </div>
              {data.experience.map((job, index) => (
                <div
                  className="rounded-2xl border border-neutral-200 p-3"
                  key={`${job.title}-${index}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">Job {index + 1}</div>
                    <div className="flex items-center gap-1">
                      <button
                        aria-label={`Move job ${index + 1} up`}
                        className="rounded-lg p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => moveJob(index, -1)}
                        title="Move up"
                        type="button"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Move job ${index + 1} down`}
                        className="rounded-lg p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                        disabled={index === data.experience.length - 1}
                        onClick={() => moveJob(index, 1)}
                        title="Move down"
                        type="button"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Remove job ${index + 1}`}
                        className="rounded-lg p-2 hover:bg-neutral-100"
                        onClick={() => removeJob(index)}
                        title="Remove"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <SidebarField
                      label="Title"
                      onChange={(event) =>
                        updateJob(index, 'title', event.target.value)
                      }
                      value={job.title}
                    />
                    <SidebarField
                      label="Location"
                      onChange={(event) =>
                        updateJob(index, 'location', event.target.value)
                      }
                      value={job.location}
                    />
                    <SidebarField
                      label="Period"
                      onChange={(event) =>
                        updateJob(index, 'period', event.target.value)
                      }
                      value={job.period}
                    />
                    {job.bullets.map((bullet, bulletIndex) => (
                      <SidebarField
                        key={`${bullet}-${bulletIndex}`}
                        label={`Bullet ${bulletIndex + 1}`}
                        onChange={(event) =>
                          updateJobBullet(
                            index,
                            bulletIndex,
                            event.target.value,
                          )
                        }
                        textarea
                        value={bullet}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </div>
        </aside>

        <main className="overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-[900px]" ref={exportRef}>
            <div>
              <CVPage data={data} />
            </div>
            <div>
              <CVPage data={data} secondPage />
            </div>
          </div>
          <div className="print-hide mt-6 text-center text-sm text-neutral-500">
            Preview pages: {pageCount}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
