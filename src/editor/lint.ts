export type BulletIssue = {
  code: string
  message: string
}

/** Phrasing that describes a job description rather than what you did. */
const FILLER_PHRASES = [
  'responsible for',
  'worked on',
  'helped with',
  'involved in',
  'assisted with',
  'participated in',
  'tasked with',
  'duties included',
  'in charge of',
]

/**
 * Words that cluster in generated prose. None is wrong on its own; together
 * they are what makes a bullet read as written by nobody in particular.
 */
const GENERIC_WORDS = [
  'leverage',
  'leveraging',
  'delve',
  'spearhead',
  'spearheaded',
  'seamless',
  'seamlessly',
  'robust',
  'cutting-edge',
  'state-of-the-art',
  'passionate',
  'synergy',
  'utilize',
  'utilise',
  'utilizing',
  'utilising',
  'fast-paced',
  'wide range of',
  'various',
  'numerous',
  'comprehensive',
  'dynamic',
  'holistic',
]

const MAX_WORDS = 28

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean)

function firstWord(text: string) {
  return words(text)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''
}

function lintOne(bullet: string, previousBullet?: string): BulletIssue[] {
  const text = bullet.trim()

  // An empty bullet is unfinished, not badly written.
  if (!text) return []

  const issues: BulletIssue[] = []
  const lower = text.toLowerCase()

  if (!/\d/.test(text)) {
    issues.push({
      code: 'no-metric',
      message: 'No number. How many, how much, how fast?',
    })
  }

  const filler = FILLER_PHRASES.find((phrase) => lower.includes(phrase))

  if (filler) {
    issues.push({
      code: 'filler',
      message: `"${filler}" describes the role, not what you did.`,
    })
  }

  const generic = GENERIC_WORDS.filter((word) =>
    new RegExp(`\\b${word.replace(/[-\s]/g, '[-\\s]')}\\b`, 'i').test(text),
  )

  if (generic.length) {
    issues.push({
      code: 'generic',
      message: `Reads as generated: ${generic.join(', ')}.`,
    })
  }

  const wordCount = words(text).length

  if (wordCount > MAX_WORDS) {
    issues.push({
      code: 'too-long',
      message: `${wordCount} words. Split it or cut it back.`,
    })
  }

  if (previousBullet && firstWord(text) && firstWord(text) === firstWord(previousBullet)) {
    issues.push({
      code: 'repeated-verb',
      message: `Starts with "${firstWord(text)}" like the bullet above.`,
    })
  }

  return issues
}

/** Issues per bullet, in the same order as the bullets given. */
export function lintBullets(bullets: string[]): BulletIssue[][] {
  return bullets.map((bullet, index) => lintOne(bullet, bullets[index - 1]))
}

export function countIssues(bullets: string[]) {
  return lintBullets(bullets).reduce((total, issues) => total + issues.length, 0)
}
