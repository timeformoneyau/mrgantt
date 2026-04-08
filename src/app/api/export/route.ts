import { NextResponse } from 'next/server'
import PptxGenJS from 'pptxgenjs'
import { differenceInDays } from 'date-fns'

// ─── Tiimely brand tokens ────────────────────────────────────────────────────
const BRAND = {
  black:      '141413',
  white:      'FFFFFF',
  eggshell:   'FBF9F3',
  minty:      '75FAAB',
  sky:        '81ECF5',
  sunshine:   'FCFE7F',
  midGray:    'B0AEA5',
  lightGray:  '7C8383',
}

// Slide dimensions (widescreen 13.33" × 7.5")
const SW = 13.33  // slide width inches
const SH = 7.5    // slide height inches

// Layout
const MARGIN_L = 0.4
const MARGIN_T = 1.1   // top margin (below header area)
const MARGIN_R = 0.4
const MARGIN_B = 0.55
const LANE_LABEL_W = 1.6
const CHART_L = MARGIN_L + LANE_LABEL_W
const CHART_W = SW - CHART_L - MARGIN_R
const CHART_T = MARGIN_T + 0.38  // below month header row
const CHART_B = SH - MARGIN_B - 0.1

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

function hexToObj(hex: string) {
  // pptxgenjs wants plain hex strings without #
  return hex.replace('#', '')
}

function dateToFrac(dateStr: string, startStr: string, endStr: string): number {
  const d = parseDate(dateStr)
  const s = parseDate(startStr)
  const e = parseDate(endStr)
  const total = differenceInDays(e, s) || 1
  const offset = differenceInDays(d, s)
  return Math.max(0, Math.min(1, offset / total))
}

// Pick a readable text colour for a given bar colour
function textColorForBg(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? BRAND.black : BRAND.white
}

export async function POST(req: Request) {
  try {
    const { tasks, rows, dividers, viewState, projectName } = await req.json()

    const { startDate, endDate } = viewState
    const totalDays = differenceInDays(parseDate(endDate), parseDate(startDate)) || 1

    // Sort rows: non-system first by order, system (Staging) last
    const sortedRows = [...rows].sort((a: any, b: any) => {
      if (a.isSystem && !b.isSystem) return 1
      if (!a.isSystem && b.isSystem) return -1
      return a.order - b.order
    }).filter((r: any) => {
      // Only include rows that actually have tasks
      return tasks.some((t: any) => t.rowId === r.id)
    })

    const rowCount = sortedRows.length
    const availableH = CHART_B - CHART_T
    const rowH = Math.min(0.44, availableH / Math.max(rowCount, 1))
    const barH = rowH * 0.52
    const barTopOffset = (rowH - barH) / 2

    // ── Build slide ──────────────────────────────────────────────────────────
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE'
    pptx.author = 'Tiimely'

    const slide = pptx.addSlide()

    // Background
    slide.background = { color: BRAND.black }

    // ── Header bar (top strip) ───────────────────────────────────────────────
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SW, h: 0.72,
      fill: { color: '1C1C1B' },
      line: { type: 'none' },
    })

    // Minty Fresh accent line under header
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0.72, w: SW, h: 0.03,
      fill: { color: BRAND.minty },
      line: { type: 'none' },
    })

    // Project name / title
    slide.addText(projectName || 'Project Plan', {
      x: MARGIN_L, y: 0.1, w: SW * 0.65, h: 0.52,
      fontSize: 22, bold: true,
      fontFace: 'Georgia',
      color: BRAND.eggshell,
      valign: 'middle',
    })

    // Date range top-right
    const rangeLabel = `${formatMonthYear(startDate)} – ${formatMonthYear(endDate)}`
    slide.addText(rangeLabel, {
      x: SW * 0.65, y: 0.1, w: SW * 0.32, h: 0.52,
      fontSize: 11,
      fontFace: 'Arial',
      color: BRAND.midGray,
      align: 'right',
      valign: 'middle',
    })

    // ── Month header row ─────────────────────────────────────────────────────
    const months = getMonthBands(startDate, endDate)
    for (const m of months) {
      const x = CHART_L + m.frac * CHART_W
      const w = m.fracWidth * CHART_W
      if (w < 0.01) continue

      // Alternating subtle tint
      if (m.index % 2 === 0) {
        slide.addShape(pptx.ShapeType.rect, {
          x, y: MARGIN_T, w, h: availableH + 0.38,
          fill: { color: 'FFFFFF', transparency: 96 },
          line: { type: 'none' },
        })
      }

      // Month label
      slide.addText(m.label, {
        x: x + 0.04, y: MARGIN_T, w: Math.max(w - 0.08, 0.1), h: 0.34,
        fontSize: 9, bold: true,
        fontFace: 'Arial',
        color: BRAND.lightGray,
        valign: 'middle',
      })

      // Month boundary line
      slide.addShape(pptx.ShapeType.line, {
        x, y: MARGIN_T, w: 0, h: availableH + 0.38,
        line: { color: '7C8383', width: 0.5, transparency: 60 },
      })
    }

    // ── Lane rows ────────────────────────────────────────────────────────────
    sortedRows.forEach((row: any, rowIdx: number) => {
      const rowY = CHART_T + rowIdx * rowH

      // Row background (alternating)
      if (rowIdx % 2 === 1) {
        slide.addShape(pptx.ShapeType.rect, {
          x: MARGIN_L, y: rowY, w: SW - MARGIN_L - MARGIN_R, h: rowH,
          fill: { color: 'FFFFFF', transparency: 97 },
          line: { type: 'none' },
        })
      }

      // Lane label
      slide.addText(row.name, {
        x: MARGIN_L, y: rowY, w: LANE_LABEL_W - 0.1, h: rowH,
        fontSize: 9.5, bold: false,
        fontFace: 'Arial',
        color: BRAND.midGray,
        valign: 'middle',
        align: 'right',
      })

      // Row separator line
      slide.addShape(pptx.ShapeType.line, {
        x: MARGIN_L, y: rowY + rowH, w: SW - MARGIN_L - MARGIN_R, h: 0,
        line: { color: '7C8383', width: 0.3, transparency: 75 },
      })

      // ── Task bars for this row ──────────────────────────────────────────
      const rowTasks = tasks.filter((t: any) => t.rowId === row.id)

      for (const task of rowTasks) {
        const startFrac = dateToFrac(task.startDate, startDate, endDate)
        const endFrac = dateToFrac(task.endDate, startDate, endDate)
        const barW = Math.max((endFrac - startFrac) * CHART_W, 0.06)
        const barX = CHART_L + startFrac * CHART_W
        const barY = rowY + barTopOffset

        if (barX + barW < CHART_L || barX > CHART_L + CHART_W) continue

        const barColor = hexToObj(task.color || '#75FAAB')
        const textColor = textColorForBg(task.color || '#75FAAB')

        // Bar shape
        slide.addShape(pptx.ShapeType.roundRect, {
          x: Math.max(barX, CHART_L),
          y: barY,
          w: Math.min(barW, CHART_L + CHART_W - Math.max(barX, CHART_L)),
          h: barH,
          rectRadius: 0.04,
          fill: { color: barColor },
          line: { type: 'none' },
        })

        // Bar label (only if bar is wide enough)
        if (barW > 0.35) {
          slide.addText(task.title, {
            x: Math.max(barX, CHART_L) + 0.05,
            y: barY,
            w: Math.min(barW - 0.1, CHART_L + CHART_W - Math.max(barX, CHART_L) - 0.1),
            h: barH,
            fontSize: 7.5,
            fontFace: 'Arial',
            color: textColor,
            bold: true,
            valign: 'middle',
            wrap: false,
          })
        }
      }
    })

    // ── Divider / milestone lines ────────────────────────────────────────────
    for (const div of dividers) {
      const frac = dateToFrac(div.date, startDate, endDate)
      if (frac < 0 || frac > 1) continue
      const x = CHART_L + frac * CHART_W
      const divColor = hexToObj(div.color || BRAND.minty)

      slide.addShape(pptx.ShapeType.line, {
        x, y: MARGIN_T,
        w: 0, h: availableH + 0.38,
        line: {
          color: divColor,
          width: 1.2,
          dashType: div.style === 'dashed' ? 'dash' : 'solid',
          transparency: 20,
        },
      })

      if (div.label) {
        slide.addText(div.label, {
          x: x + 0.04,
          y: MARGIN_T + 0.02,
          w: 1.2, h: 0.22,
          fontSize: 7,
          fontFace: 'Arial',
          color: divColor,
          bold: true,
        })
      }
    }

    // ── Chart area border ────────────────────────────────────────────────────
    slide.addShape(pptx.ShapeType.rect, {
      x: CHART_L, y: MARGIN_T,
      w: CHART_W, h: availableH + 0.38,
      fill: { type: 'none' },
      line: { color: '7C8383', width: 0.5, transparency: 50 },
    })

    // ── Footer ───────────────────────────────────────────────────────────────
    slide.addText('Commercial in Confidence  ·  Tiimely', {
      x: MARGIN_L, y: SH - 0.42, w: SW * 0.5, h: 0.32,
      fontSize: 8,
      fontFace: 'Arial',
      color: BRAND.lightGray,
      valign: 'middle',
    })

    const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    slide.addText(today, {
      x: SW * 0.5, y: SH - 0.42, w: SW * 0.48, h: 0.32,
      fontSize: 8,
      fontFace: 'Arial',
      color: BRAND.lightGray,
      align: 'right',
      valign: 'middle',
    })

    // ── Output ───────────────────────────────────────────────────────────────
    const buffer = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer
    const safeName = (projectName || 'gantt').replace(/[^a-z0-9]/gi, '_').toLowerCase()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${safeName}_gantt.pptx"`,
      },
    })
  } catch (err: any) {
    console.error('Export error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMonthYear(dateStr: string): string {
  const d = parseDate(dateStr)
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

function getMonthBands(startDate: string, endDate: string) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  const total = differenceInDays(end, start) || 1

  const bands: { label: string; frac: number; fracWidth: number; index: number }[] = []
  let current = new Date(start.getFullYear(), start.getMonth(), 1)
  let idx = 0

  while (current <= end) {
    const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1)
    const bandStart = current < start ? start : current
    const bandEnd = nextMonth > end ? end : nextMonth

    const frac = differenceInDays(bandStart, start) / total
    const fracWidth = differenceInDays(bandEnd, bandStart) / total

    bands.push({
      label: current.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
      frac: Math.max(0, frac),
      fracWidth: Math.max(0, fracWidth),
      index: idx++,
    })

    current = nextMonth
  }

  return bands
}
