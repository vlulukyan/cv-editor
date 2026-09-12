import { buildPdf } from './pdf/exportTextPdf'
import { type LayoutOverrides, applyLayout } from './templates/layout'
import type { Template } from './templates/types'
import type { CVData } from './types'

/** Tried in order, so the roomiest layout that still fits is the one chosen. */
const DENSITY_STEPS = [1, 0.97, 0.94, 0.91, 0.88, 0.85, 0.82, 0.79, 0.76, 0.72]

/**
 * Finds the loosest density at which the CV fits the requested page count.
 *
 * The PDF builder is used as the oracle rather than the on-screen preview: it
 * paginates from the same block model without needing the DOM, so a candidate
 * can be measured without rendering it.
 */
export function findDensityForPages(
  data: CVData,
  template: Template,
  targetPages: number,
  overrides: LayoutOverrides | undefined,
): { density: number; pageCount: number; fits: boolean } {
  let last = { density: 1, pageCount: Number.POSITIVE_INFINITY, fits: false }

  for (const density of DENSITY_STEPS) {
    const candidate = applyLayout(template, { ...overrides, density })
    const { pageCount } = buildPdf(data, candidate)

    last = { density, pageCount, fits: pageCount <= targetPages }

    if (last.fits) return last
  }

  return last
}
