/**
 * Dashboard charts.
 *
 * Plain SVG rather than a charting library: these render on the server with no
 * client JS, add nothing to the bundle, and can be made properly accessible.
 *
 * Colour rules (validated, not eyeballed — the brand palette fails as a
 * categorical set: teal reads as grey in a fill, and teal/green sit only ΔE 7.7
 * apart for normal vision):
 *   - one measure across categories  → a single hue, magnitude by length
 *   - stages of one process          → the green ramp, light to dark
 *   - two series                     → green + gold (passes CVD and normal-vision checks)
 *   - state (approved/pending/…)     → status colours, always with a text label
 *
 * Every value is direct-labelled, which is also the secondary encoding that
 * makes the green/gold pair legal for colour-vision-deficient readers, and each
 * chart carries a visually hidden table so the figures are available to screen
 * readers rather than locked inside the drawing.
 */

import { cn } from '@/lib/utils'

const INK        = '#2A2823'
const INK_MUTED  = '#6B6454'
const SURFACE    = '#E8E4D8'

// Green ramp, light → dark, for ordered stages
export const GREEN_RAMP = ['#97C459', '#639922', '#4E7D18', '#3B6D11', '#2E560C']
export const SERIES = { primary: '#3B6D11', secondary: '#BA7517' }
export const STATUS = {
  good:     '#3B6D11',
  warning:  '#BA7517',
  critical: '#DC2626',
  neutral:  '#6B6454',
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function ChartFrame({
  title, caption, children, className, table,
}: {
  title: string
  caption?: string
  children: React.ReactNode
  className?: string
  table: { head: string[]; rows: (string | number)[][] }
}) {
  return (
    <figure className={cn('bg-white rounded-xl border border-sand-200 p-5 shadow-card', className)}>
      <figcaption className="mb-1">
        <h3 className="text-sm font-semibold text-sand-900">{title}</h3>
        {caption && <p className="text-xs text-sand-600 mt-0.5 leading-relaxed">{caption}</p>}
      </figcaption>

      {children}

      {/* The same numbers, reachable by screen readers */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>{table.head.map(h => <th key={h} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => j === 0
                ? <th key={j} scope="row">{c}</th>
                : <td key={j}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 rounded-lg bg-sand-50 border border-dashed border-sand-200">
      <p className="text-xs text-sand-600 text-center max-w-[22ch] leading-relaxed">{message}</p>
    </div>
  )
}

// ─── Horizontal bars: one measure compared across categories ──────────────────

export interface BarDatum {
  label: string
  value: number
  /** Overrides the single-hue default, for status palettes */
  color?: string
  /** Shown instead of the raw number, e.g. a currency string */
  display?: string
}

export function HBarChart({
  title, caption, data, emptyMessage, ramp = false, unit = '',
}: {
  title: string
  caption?: string
  data: BarDatum[]
  emptyMessage: string
  /** Colour the bars along the green ramp, for ordered stages */
  ramp?: boolean
  unit?: string
}) {
  const table = {
    head: ['Category', unit || 'Value'],
    rows: data.map(d => [d.label, d.display ?? d.value]),
  }
  const total = data.reduce((s, d) => s + d.value, 0)

  if (!data.length || total === 0) {
    return (
      <ChartFrame title={title} caption={caption} table={table}>
        <EmptyState message={emptyMessage} />
      </ChartFrame>
    )
  }

  const max = Math.max(...data.map(d => d.value))
  const rowH = 34
  const barH = 18
  const labelW = 132
  const valueW = 58
  const W = 460
  const plotW = W - labelW - valueW
  const H = data.length * rowH

  return (
    <ChartFrame title={title} caption={caption} table={table}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto mt-3"
        role="img"
        aria-label={`${title}. ${data.map(d => `${d.label}: ${d.display ?? d.value}`).join('. ')}`}
      >
        {data.map((d, i) => {
          const y = i * rowH
          const w = max > 0 ? Math.max((d.value / max) * plotW, d.value > 0 ? 3 : 0) : 0
          const fill = d.color ?? (ramp ? GREEN_RAMP[Math.min(i, GREEN_RAMP.length - 1)] : SERIES.primary)
          return (
            <g key={d.label}>
              <title>{`${d.label}: ${d.display ?? d.value}`}</title>
              <text
                x={0} y={y + barH / 2 + 4}
                fontSize="11.5" fill={INK} textAnchor="start"
              >
                {d.label.length > 20 ? d.label.slice(0, 19) + '…' : d.label}
              </text>
              {/* Track, so an empty stage still reads as a stage */}
              <rect x={labelW} y={y} width={plotW} height={barH} rx={4} fill={SURFACE} opacity={0.5} />
              {w > 0 && <rect x={labelW} y={y} width={w} height={barH} rx={4} fill={fill} />}
              <text
                x={labelW + plotW + 8} y={y + barH / 2 + 4}
                fontSize="12" fontWeight="600" fill={INK} textAnchor="start"
              >
                {d.display ?? d.value}
              </text>
            </g>
          )
        })}
      </svg>
    </ChartFrame>
  )
}

// ─── Two-series split bar: composition of one total ───────────────────────────

export function SplitBar({
  title, caption, parts, emptyMessage,
}: {
  title: string
  caption?: string
  parts: { label: string; value: number; display: string; color: string }[]
  emptyMessage: string
}) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  const table = { head: ['Part', 'Amount'], rows: parts.map(p => [p.label, p.display]) }

  if (total === 0) {
    return (
      <ChartFrame title={title} caption={caption} table={table}>
        <EmptyState message={emptyMessage} />
      </ChartFrame>
    )
  }

  const W = 460, H = 34, GAP = 2
  let x = 0

  return (
    <ChartFrame title={title} caption={caption} table={table}>
      <svg
        viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-3"
        role="img"
        aria-label={`${title}. ${parts.map(p => `${p.label}: ${p.display}`).join('. ')}`}
      >
        {parts.map((p, i) => {
          const w = Math.max((p.value / total) * (W - GAP * (parts.length - 1)), 0)
          const el = (
            <g key={p.label}>
              <title>{`${p.label}: ${p.display}`}</title>
              <rect x={x} y={0} width={w} height={H} rx={4} fill={p.color} />
            </g>
          )
          x += w + GAP
          return el
        })}
      </svg>

      {/* Legend, because there is more than one series, with the value beside it */}
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
        {parts.map(p => (
          <li key={p.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: p.color }}
              aria-hidden="true"
            />
            <span className="text-xs text-sand-600">{p.label}</span>
            <span className="text-xs font-semibold text-sand-900">{p.display}</span>
          </li>
        ))}
      </ul>
    </ChartFrame>
  )
}

// ─── Trend: one measure over time ─────────────────────────────────────────────

export function TrendArea({
  title, caption, points, emptyMessage, valuePrefix = '',
}: {
  title: string
  caption?: string
  points: { label: string; value: number }[]
  emptyMessage: string
  valuePrefix?: string
}) {
  const table = {
    head: ['Period', 'Value'],
    rows: points.map(p => [p.label, `${valuePrefix}${p.value}`]),
  }
  const total = points.reduce((s, p) => s + p.value, 0)

  if (points.length < 2 || total === 0) {
    return (
      <ChartFrame title={title} caption={caption} table={table}>
        <EmptyState message={emptyMessage} />
      </ChartFrame>
    )
  }

  const W = 460, H = 150, PAD_B = 22, PAD_T = 14
  const max = Math.max(...points.map(p => p.value)) || 1
  const stepX = W / (points.length - 1)
  const yOf = (v: number) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B)

  const line = points.map((p, i) => `${i * stepX},${yOf(p.value)}`).join(' ')
  const area = `${line} ${W},${H - PAD_B} 0,${H - PAD_B}`
  const peak = points.reduce((a, b) => (b.value > a.value ? b : a), points[0])
  const peakIdx = points.indexOf(peak)

  return (
    <ChartFrame title={title} caption={caption} table={table}>
      <svg
        viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-3"
        role="img"
        aria-label={`${title}. ${points.map(p => `${p.label}: ${valuePrefix}${p.value}`).join('. ')}`}
      >
        {/* Recessive baseline only, no gridlines competing with the data */}
        <line x1={0} y1={H - PAD_B} x2={W} y2={H - PAD_B} stroke={SURFACE} strokeWidth={1} />
        <polygon points={area} fill={SERIES.primary} opacity={0.1} />
        <polyline points={line} fill="none" stroke={SERIES.primary} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <g key={p.label}>
            <title>{`${p.label}: ${valuePrefix}${p.value}`}</title>
            <circle cx={i * stepX} cy={yOf(p.value)} r={4}
              fill={SERIES.primary} stroke="#FFFFFF" strokeWidth={2} />
          </g>
        ))}

        {/* Label the peak only — a number on every point is noise */}
        <text
          x={Math.min(Math.max(peakIdx * stepX, 16), W - 16)}
          y={yOf(peak.value) - 10}
          fontSize="11" fontWeight="700" fill={INK} textAnchor="middle"
        >
          {valuePrefix}{peak.value}
        </text>

        {/* First and last period only, so the axis stays quiet */}
        <text x={0} y={H - 6} fontSize="10.5" fill={INK_MUTED} textAnchor="start">
          {points[0].label}
        </text>
        <text x={W} y={H - 6} fontSize="10.5" fill={INK_MUTED} textAnchor="end">
          {points[points.length - 1].label}
        </text>
      </svg>
    </ChartFrame>
  )
}
