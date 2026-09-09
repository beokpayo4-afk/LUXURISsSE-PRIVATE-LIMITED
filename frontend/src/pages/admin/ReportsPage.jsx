import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboard } from '../../api'
import { EmptyState, ErrorState, LoadingState, StatCard } from '../../components/ui/Feedback'

/** Reports page mirrors live dashboard aggregates (no invented numbers). */
export default function ReportsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchDashboard()
      .then((payload) => {
        if (!cancelled) {
          setData(payload)
          setError('')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load reports.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  if (loading) return <LoadingState />
  if (error) {
    return (
      <ErrorState
        description={error}
        onRetry={() => {
          setLoading(true)
          setReloadKey((k) => k + 1)
        }}
      />
    )
  }
  if (!data) return <EmptyState />

  const s = data.stats
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Snapshot of live aggregates. Full charts live on the analytics dashboard.
          </p>
        </div>
        <Link
          to="/admin"
          className="rounded-full bg-emerald-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
        >
          Open analytics dashboard
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Bookings" value={s.total_bookings} />
        <StatCard label="Revenue (paid)" value={`₹${Number(s.total_revenue || 0).toLocaleString('en-IN')}`} />
        <StatCard
          label="Avg booking value"
          value={`₹${Number(s.avg_booking_value || 0).toLocaleString('en-IN')}`}
        />
        <StatCard label="Pending payments" value={s.pending_payments} />
        <StatCard label="Customers" value={s.total_customers} />
        <StatCard label="Cancellation rate" value={`${Number(s.cancellation_rate || 0).toFixed(2)}%`} />
        <StatCard label="Completed trips" value={s.completed_bookings} />
        <StatCard label="Reviews" value={`${s.total_reviews} · ${Number(s.avg_rating || 0).toFixed(1)}/5`} />
        <StatCard label="Tours" value={s.total_tours} />
      </div>
    </div>
  )
}
