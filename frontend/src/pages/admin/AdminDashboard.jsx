import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchDashboard } from '../../api'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/Feedback'
import { COMPANY } from '../../constants/company'

const COLORS = {
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  cyan: '#22d3ee',
  slate: '#94a3b8',
}

const PIE_COLORS = [COLORS.blue, COLORS.emerald, COLORS.amber, COLORS.violet, COLORS.rose, COLORS.cyan]

function money(value) {
  const n = Number(value || 0)
  if (n >= 10000000) return `₹ ${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000) return `₹ ${(n / 100000).toFixed(2)} L`
  return `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function moneyFull(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function statusTone(status) {
  const s = String(status || '').toLowerCase()
  if (['confirmed', 'completed', 'paid'].includes(s)) return 'bg-emerald-500/15 text-emerald-300'
  if (['pending', 'new'].includes(s)) return 'bg-amber-500/15 text-amber-300'
  if (['cancelled', 'failed'].includes(s)) return 'bg-rose-500/15 text-rose-300'
  return 'bg-slate-500/20 text-slate-300'
}

function KpiCard({ label, value, hint, tone = 'up' }) {
  const toneClass =
    tone === 'down' ? 'text-rose-400' : tone === 'neutral' ? 'text-slate-400' : 'text-emerald-400'
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121a2b] p-4 shadow-lg shadow-black/20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">{value}</p>
      {hint != null && hint !== '' && <p className={`mt-1.5 text-xs font-medium ${toneClass}`}>{hint}</p>}
    </div>
  )
}

function Panel({ title, children, action, className = '' }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-[#121a2b] p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white sm:text-base">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function ChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b1220] px-3 py-2 text-xs text-slate-200 shadow-xl">
      {label && <p className="mb-1 font-medium text-white">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color || p.fill }}>
          {p.name}: {valueFormatter ? valueFormatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

function Stars({ rating }) {
  const full = Math.round(Number(rating) || 0)
  return (
    <div className="flex gap-0.5 text-amber-400" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < full ? '★' : '☆'}</span>
      ))}
    </div>
  )
}

function exportCsv(rows) {
  if (!rows?.length) return
  const header = ['Booking ID', 'Customer', 'Package', 'Destination', 'Travel Date', 'Amount', 'Status']
  const lines = rows.map((r) =>
    [
      r.booking_code,
      r.customer_name,
      r.package_name || '',
      r.destination || '',
      r.travel_date || '',
      r.amount ?? '',
      r.status,
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(',')
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `luxurisse-bookings-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminDashboard() {
  const { search: globalSearch = '' } = useOutletContext() || {}
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [destinationFilter, setDestinationFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchDashboard()
      .then((dashboard) => {
        if (cancelled) return
        setData(dashboard)
        setError('')
      })
      .catch(() => {
        if (!cancelled) setError('Could not load analytics dashboard from the API.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const refresh = () => setReloadKey((k) => k + 1)

  const stats = data?.stats
  const charts = data?.charts
  const q = String(globalSearch || '').trim().toLowerCase()

  const destinationOptions = useMemo(() => {
    const names = (charts?.popular_destinations || []).map((d) => d.name)
    return ['all', ...names]
  }, [charts])

  const destBars = useMemo(() => {
    let list = charts?.popular_destinations || []
    if (destinationFilter !== 'all') list = list.filter((d) => d.name === destinationFilter)
    if (q) list = list.filter((d) => String(d.name).toLowerCase().includes(q))
    return list.map((d) => ({ name: d.name, bookings: d.count }))
  }, [charts, destinationFilter, q])

  const revenueSeries = useMemo(
    () => (charts?.monthly_revenue || []).map((p) => ({ name: p.label, revenue: Number(p.amount || 0) })),
    [charts]
  )

  const bookingTrend = useMemo(() => {
    const current = charts?.monthly_bookings || []
    return current.map((p, idx) => {
      const prev = current[idx - 1]
      return {
        name: p.label,
        thisMonth: p.count,
        lastMonth: prev ? prev.count : 0,
      }
    })
  }, [charts])

  const packageTypeData = useMemo(
    () =>
      (charts?.bookings_by_category || []).map((c) => ({
        name: c.name,
        value: c.count,
        percent: c.percent,
      })),
    [charts]
  )

  const statusData = useMemo(
    () =>
      (charts?.bookings_by_status || [])
        .filter((s) => s.count > 0)
        .map((s) => ({ name: s.name, value: s.count, percent: s.percent })),
    [charts]
  )

  const paymentData = useMemo(
    () =>
      (charts?.revenue_by_payment_method || []).map((p) => ({
        name: p.name,
        value: Number(p.amount || 0),
        percent: p.percent,
        count: p.count,
      })),
    [charts]
  )

  const topPackages = useMemo(() => {
    let list = charts?.top_packages || []
    if (destinationFilter !== 'all') {
      list = list.filter((p) => p.destination === destinationFilter)
    }
    if (q) {
      list = list.filter((p) =>
        [p.name, p.destination].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      )
    }
    return list
  }, [charts, destinationFilter, q])

  const recentBookings = useMemo(() => {
    let list = charts?.recent_bookings || []
    if (destinationFilter !== 'all') {
      list = list.filter((b) => b.destination === destinationFilter)
    }
    if (q) {
      list = list.filter((b) =>
        [b.booking_code, b.customer_name, b.package_name, b.destination, b.status]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    }
    return list
  }, [charts, destinationFilter, q])

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#0b1220] p-10 text-slate-300">
        <LoadingState label="Loading analytics…" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-2xl bg-[#0b1220] p-6">
        <ErrorState description={error} onRetry={refresh} />
      </div>
    )
  }
  if (!stats) return <EmptyState title="No dashboard data" />

  const periodLabel = (() => {
    const pts = charts?.monthly_bookings || []
    if (pts.length < 2) return 'Last 12 months'
    return `${pts[0].label} – ${pts[pts.length - 1].label}`
  })()

  return (
    <div className="-mx-5 -my-6 space-y-5 bg-[#0b1220] px-5 py-6 text-slate-300 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
            {COMPANY.shortName} Analytics
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
            Tour & Travel Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">Live aggregates from bookings, payments, and packages.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-white/10 bg-[#121a2b] px-3 py-2 text-xs text-slate-300">
            {periodLabel}
          </span>
          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#121a2b] px-3 py-2 text-xs text-slate-200 outline-none"
          >
            {destinationOptions.map((d) => (
              <option key={d} value={d}>
                {d === 'all' ? 'All destinations' : d}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => exportCsv(recentBookings)}
            className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500"
          >
            Export
          </button>
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-white/10 bg-[#121a2b] px-3 py-2 text-xs text-slate-200 hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Total Bookings" value={stats.total_bookings} hint={`${stats.pending_bookings} pending`} />
        <KpiCard label="Total Revenue" value={money(stats.total_revenue)} hint="Paid payments only" />
        <KpiCard label="Avg. Booking Value" value={moneyFull(stats.avg_booking_value)} hint="From priced bookings" />
        <KpiCard label="Total Customers" value={stats.total_customers} hint={`${stats.total_tours} packages`} />
        <KpiCard
          label="Completed Trips"
          value={stats.completed_bookings}
          hint={`${stats.confirmed_bookings} confirmed`}
        />
        <KpiCard
          label="Cancellation Rate"
          value={`${Number(stats.cancellation_rate || 0).toFixed(2)}%`}
          hint={`${stats.cancelled_bookings} cancelled`}
          tone={stats.cancellation_rate > 10 ? 'down' : 'up'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Bookings by Destination" className="xl:col-span-1">
          <div className="h-64">
            {destBars.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No destination bookings yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={destBars} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="bookings" name="Bookings" fill={COLORS.blue} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Revenue Overview" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={1} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip valueFormatter={moneyFull} />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={COLORS.emerald}
                  fill="url(#revFill)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Bookings by Package Type">
          <div className="h-56">
            {packageTypeData.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No category bookings yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={packageTypeData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {packageTypeData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Bookings by Status">
          <div className="h-56">
            {statusData.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No bookings yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {statusData.map((entry, i) => {
                      const map = {
                        Pending: COLORS.amber,
                        Confirmed: COLORS.emerald,
                        Completed: COLORS.blue,
                        Cancelled: COLORS.rose,
                      }
                      return <Cell key={entry.name} fill={map[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    })}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Revenue by Payment Method">
          <div className="h-56">
            {paymentData.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-500">No payments recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {paymentData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip valueFormatter={moneyFull} />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Bookings Trend Comparison">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bookingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={1} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Line
                  type="monotone"
                  dataKey="thisMonth"
                  name="This month series"
                  stroke={COLORS.blue}
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="lastMonth"
                  name="Prior month"
                  stroke={COLORS.amber}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Key Insights">
          <ul className="space-y-3 text-sm text-slate-300">
            {(charts?.insights || []).map((line) => (
              <li key={line} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl border border-white/10 bg-[#0b1220] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Reviews</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-white">{stats.total_reviews}</p>
                <p className="text-xs text-slate-400">Total reviews</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-white">{Number(stats.avg_rating || 0).toFixed(1)}/5</p>
                <Stars rating={stats.avg_rating} />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Top Selling Packages"
          action={
            <Link to="/admin/tours" className="text-xs font-medium text-sky-400 hover:text-sky-300">
              View all
            </Link>
          }
        >
          {topPackages.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No package sales yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="pb-3 pr-3">Package</th>
                    <th className="pb-3 pr-3">Destination</th>
                    <th className="pb-3 pr-3">Bookings</th>
                    <th className="pb-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topPackages.map((p) => (
                    <tr key={p.id || p.name} className="border-t border-white/5">
                      <td className="py-3 pr-3 font-medium text-slate-100">{p.name}</td>
                      <td className="py-3 pr-3 text-slate-400">{p.destination || '—'}</td>
                      <td className="py-3 pr-3 text-slate-300">{p.bookings}</td>
                      <td className="py-3 text-emerald-300">{moneyFull(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="Recent Bookings"
          action={
            <Link to="/admin/bookings" className="text-xs font-medium text-sky-400 hover:text-sky-300">
              View all
            </Link>
          }
        >
          {recentBookings.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="pb-3 pr-2">ID</th>
                    <th className="pb-3 pr-2">Customer</th>
                    <th className="pb-3 pr-2">Package</th>
                    <th className="pb-3 pr-2">Amount</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="border-t border-white/5">
                      <td className="py-3 pr-2 font-medium text-sky-300">{b.booking_code}</td>
                      <td className="py-3 pr-2 text-slate-200">{b.customer_name}</td>
                      <td className="py-3 pr-2 text-slate-400">
                        <span className="block max-w-[10rem] truncate">
                          {b.package_name || 'Custom / ticket'}
                        </span>
                        {b.destination && (
                          <span className="block text-[11px] text-slate-500">{b.destination}</span>
                        )}
                      </td>
                      <td className="py-3 pr-2 text-slate-200">
                        {b.amount != null ? moneyFull(b.amount) : '—'}
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${statusTone(b.status)}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
