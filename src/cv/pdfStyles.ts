/**
 * html-to-image resolves CSS variables against the cloned node, so the palette
 * has to be inlined on the exported page.
 */
export const pdfColorStyleOverrides = {
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
