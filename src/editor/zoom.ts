export const ZOOM_STEPS = [0.35, 0.5, 0.65, 0.8, 0.9, 1, 1.15, 1.35, 1.6]
export const MIN_ZOOM = ZOOM_STEPS[0]
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1]

/** Moves to the neighbouring zoom step, snapping from any in-between value. */
export function stepZoom(zoom: number, direction: -1 | 1) {
  const nearest = ZOOM_STEPS.reduce((best, step) =>
    Math.abs(step - zoom) < Math.abs(best - zoom) ? step : best,
  )
  const index = ZOOM_STEPS.indexOf(nearest) + direction

  return ZOOM_STEPS[Math.min(Math.max(index, 0), ZOOM_STEPS.length - 1)]
}
