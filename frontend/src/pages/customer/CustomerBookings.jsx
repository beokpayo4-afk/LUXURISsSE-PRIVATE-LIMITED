import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyBookings } from '../../api'
import DownloadBookingPdfButton from '../../components/bookings/DownloadBookingPdfButton'
import { useAuth } from '../../context/AuthContext'
import { formatTourPrice } from '../../utils/tours'

export default function CustomerBookings() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyBookings()
      .then((rows) => setItems(Array.isArray(rows) ? rows : []))
      .catch(() => setError('Could not load bookings.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl">My bookings</h1>
          <p className="mt-1 text-sm text-stone-500">Pending bookings await confirmation from our team.</p>
        </div>
        <Link
          to="/tours"
          className="rounded-full bg-emerald-950 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
        >
          Book a tour
        </Link>
      </div>
      {loading && <p className="mt-6 text-sm text-stone-500">Loading…</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="mt-6 text-stone-500 text-sm">You have no bookings yet.</p>
      )}
      <ul className="mt-6 space-y-3">
        {items.map((b) => (
          <li key={b.id} className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{b.booking_code}</p>
                <p className="mt-1 capitalize text-stone-600">Status: {b.status}</p>
                <p className="text-stone-500">
                  Travellers: {b.travelers}
                  {b.travel_date ? ` · Travel: ${b.travel_date}` : ''}
                </p>
                {b.notes && <p className="mt-2 text-stone-500">{b.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                {b.total_amount != null && (
                  <p className="font-serif text-xl font-bold text-emerald-950">
                    {formatTourPrice(b.total_amount)}
                  </p>
                )}
                <DownloadBookingPdfButton booking={b} customer={user} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
