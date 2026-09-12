import type { CVData } from './types'

/** Seed content for a brand new document. */
export const initialData: CVData = {
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
    {
      title: 'Backend',
      bullets: ['Node.js, NestJS, Express'],
    },
    {
      title: 'Frontend',
      bullets: ['Angular, Next.js'],
    },
    {
      title: 'Databases',
      bullets: ['PostgreSQL, MongoDB, Redis'],
    },
    {
      title: 'DevOps & Infrastructure',
      bullets: ['Docker, Linux (CentOS, Ubuntu), Nginx', 'Server management, networking'],
    },
    {
      title: 'Search & Caching',
      bullets: ['Elasticsearch, Redis'],
    },
    {
      title: 'Security',
      bullets: ['Firewall configuration, Wazuh, SIEM basics', 'Cybersecurity practices, incident response'],
    },
    {
      title: 'Other',
      bullets: ['REST APIs, Microservices architecture'],
    },
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
  certifications: [],
  projects: [],
}
