/**
 * Icons described as primitives rather than SVG paths, so the HTML preview and
 * the PDF draw exactly the same shape. All are authored in a 16x16 box.
 */
export type IconPrimitive =
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: boolean }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: boolean }

export type IconName =
  | 'phone'
  | 'mail'
  | 'pin'
  | 'globe'
  | 'home'
  | 'user'
  | 'work'
  | 'school'
  | 'star'
  | 'link'
  | 'language'

export const ICON_BOX = 16

export const ICONS: Record<IconName, IconPrimitive[]> = {
  phone: [
    { t: 'rect', x: 5, y: 2, w: 6, h: 12 },
    { t: 'line', x1: 7, y1: 12, x2: 9, y2: 12 },
  ],
  mail: [
    { t: 'rect', x: 2, y: 4, w: 12, h: 8 },
    { t: 'line', x1: 2, y1: 4, x2: 8, y2: 9 },
    { t: 'line', x1: 14, y1: 4, x2: 8, y2: 9 },
  ],
  pin: [
    { t: 'circle', cx: 8, cy: 6.5, r: 4 },
    { t: 'line', x1: 4.6, y1: 8.6, x2: 8, y2: 14 },
    { t: 'line', x1: 11.4, y1: 8.6, x2: 8, y2: 14 },
  ],
  globe: [
    { t: 'circle', cx: 8, cy: 8, r: 6 },
    { t: 'line', x1: 2, y1: 8, x2: 14, y2: 8 },
    { t: 'circle', cx: 8, cy: 8, r: 2.6 },
  ],
  home: [
    { t: 'line', x1: 2.5, y1: 8, x2: 8, y2: 3 },
    { t: 'line', x1: 13.5, y1: 8, x2: 8, y2: 3 },
    { t: 'rect', x: 4, y: 8, w: 8, h: 5.5 },
  ],
  user: [
    { t: 'circle', cx: 8, cy: 5.5, r: 2.8 },
    { t: 'line', x1: 3.2, y1: 13.5, x2: 4.6, y2: 10 },
    { t: 'line', x1: 12.8, y1: 13.5, x2: 11.4, y2: 10 },
    { t: 'line', x1: 4.6, y1: 10, x2: 11.4, y2: 10 },
  ],
  work: [
    { t: 'rect', x: 2, y: 5.5, w: 12, h: 8 },
    { t: 'line', x1: 6, y1: 5.5, x2: 6, y2: 3 },
    { t: 'line', x1: 10, y1: 5.5, x2: 10, y2: 3 },
    { t: 'line', x1: 6, y1: 3, x2: 10, y2: 3 },
  ],
  school: [
    { t: 'line', x1: 1.5, y1: 6.5, x2: 8, y2: 3.5 },
    { t: 'line', x1: 14.5, y1: 6.5, x2: 8, y2: 3.5 },
    { t: 'line', x1: 1.5, y1: 6.5, x2: 8, y2: 9.5 },
    { t: 'line', x1: 14.5, y1: 6.5, x2: 8, y2: 9.5 },
    { t: 'line', x1: 12, y1: 7.7, x2: 12, y2: 12 },
  ],
  star: [
    { t: 'circle', cx: 8, cy: 8, r: 5.5 },
    { t: 'circle', cx: 8, cy: 8, r: 2, fill: true },
  ],
  link: [
    { t: 'circle', cx: 5.5, cy: 8, r: 3 },
    { t: 'circle', cx: 10.5, cy: 8, r: 3 },
  ],
  language: [
    { t: 'circle', cx: 8, cy: 8, r: 6 },
    { t: 'line', x1: 8, y1: 2, x2: 8, y2: 14 },
    { t: 'line', x1: 2.4, y1: 5.6, x2: 13.6, y2: 5.6 },
    { t: 'line', x1: 2.4, y1: 10.4, x2: 13.6, y2: 10.4 },
  ],
}
