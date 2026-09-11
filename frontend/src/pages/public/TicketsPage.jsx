import { useEffect, useMemo, useState } from 'react'
import GroupTicketSizer from '../../components/tickets/GroupTicketSizer'
import TicketCustomizer from '../../components/tickets/TicketCustomizer'
import { fetchTickets } from '../../api'
import { useCart } from '../../context/CartContext'
import { useAddToCart } from '../../hooks/useAddToCart'
import { useRequireLoginNavigate } from '../../hooks/useRequireLoginNavigate'
import { useAuth } from '../../context/AuthContext'
import { formatTourPrice } from '../../utils/tours'

function formatTimeDisplay(value) {
  if (!value) return '—'
  const hhmm = String(value).slice(0, 5)
  const [hStr, mStr] = hhmm.split(':')
  let h = Number(hStr)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`
}

export default function TicketsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stateFilter, setStateFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [customState, setCustomState] = useState('Chhattisgarh')
  const { user } = useAuth()
  const { addItem } = useCart()
  const addToCart = useAddToCart()
  const goBook = useRequireLoginNavigate()

  useEffect(() => {
    fetchTickets({ active_only: true })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setError('Unable to load tickets. Is the API running?'))
      .finally(() => setLoading(false))
  }, [])

  const states = useMemo(
    () => [...new Set(items.map((t) => t.state).filter(Boolean))].sort(),
    [items]
  )

  const types = useMemo(
    () => [...new Set(items.map((t) => t.type).filter(Boolean))].sort(),
    [items]
  )

  const filtered = useMemo(() => {
    return items.filter((t) => {
      if (stateFilter !== 'all' && t.state !== stateFilter) return false
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      return true
    })
  }, [items, stateFilter, typeFilter])

  const suggestedLocations = useMemo(() => {
    const pool = customState
      ? items.filter((t) => t.state === customState)
      : items
    const locs = []
    for (const t of pool) {
      locs.push(t.from_location, t.to_location, t.pickup, t.drop)
    }
    return locs
  }, [items, customState])

  function ticketCartItem(ticket) {
    return {
      type: 'ticket',
      ticketId: ticket.id,
      title: ticket.name,
      unitPrice: Number(ticket.price),
      quantity: 1,
      meta: `${ticket.state} · ${ticket.from_location} → ${ticket.to_location} · ${ticket.date} ${formatTimeDisplay(ticket.time)}`,
    }
  }

  function handleBook(ticket) {
    const item = ticketCartItem(ticket)
    if (user) {
      addItem(item)
      goBook('/booking')
      return
    }
    addToCart(item)
  }

  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      <section className="border-b border-stone-200/80 bg-white/60">
        <div className="w-full px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Tickets</p>
          <h1 className="mt-2 font-serif text-4xl text-slate-900 sm:text-5xl lg:text-6xl">
            Local tickets
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-stone-600 sm:text-xl">
            Group sizes from 30 to 1000, customize your own route, or book a published local ticket.
          </p>

          {states.length > 0 && (
            <div className="mt-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">State</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStateFilter('all')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    stateFilter === 'all'
                      ? 'bg-emerald-950 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-stone-200 hover:bg-stone-50'
                  }`}
                >
                  All states
                </button>
                {states.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStateFilter(s)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      stateFilter === s
                        ? 'bg-emerald-950 text-white'
                        : 'bg-white text-slate-700 ring-1 ring-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {types.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">Transport</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    typeFilter === 'all'
                      ? 'bg-amber-700 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-stone-200 hover:bg-stone-50'
                  }`}
                >
                  All
                </button>
                {types.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      typeFilter === t
                        ? 'bg-amber-700 text-white'
                        : 'bg-white text-slate-700 ring-1 ring-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <GroupTicketSizer />

      <TicketCustomizer
        suggestedLocations={suggestedLocations}
        onStateChange={setCustomState}
      />

      <section className="w-full px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
        <div className="mb-8">
          <h2 className="font-serif text-3xl text-slate-900 sm:text-4xl">Published local routes</h2>
          <p className="mt-2 text-stone-600">Ready-made tickets you can book as listed.</p>
        </div>
        {loading && <p className="text-lg text-stone-500">Loading tickets…</p>}
        {error && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">{error}</p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-lg text-stone-500">No active tickets for this filter yet.</p>
        )}

        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ticket) => (
            <li
              key={ticket.id}
              className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  {ticket.type}
                </p>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900">
                  {ticket.state}
                </span>
              </div>
              <h2 className="mt-2 font-serif text-2xl text-emerald-950">{ticket.name}</h2>
              <p className="mt-3 text-sm text-stone-600">
                <span className="font-medium text-slate-800">{ticket.from_location}</span>
                {' → '}
                <span className="font-medium text-slate-800">{ticket.to_location}</span>
              </p>
              {(ticket.pickup || ticket.drop) && (
                <p className="mt-1 text-sm text-stone-500">
                  {[ticket.pickup && `Pickup: ${ticket.pickup}`, ticket.drop && `Drop: ${ticket.drop}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
              <p className="mt-3 text-sm text-stone-600">
                {ticket.date} · {formatTimeDisplay(ticket.time)}
              </p>
              <p className="mt-4 font-serif text-3xl font-bold text-emerald-950">
                {formatTourPrice(ticket.price)}
              </p>
              <p className="mt-1 text-xs text-stone-500">+5% GST at checkout</p>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addToCart(ticketCartItem(ticket))}
                  className="rounded-full bg-gradient-to-r from-amber-500 to-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:from-amber-400 hover:to-amber-600"
                >
                  {user ? 'Add to cart' : 'Login to add'}
                </button>
                <button
                  type="button"
                  onClick={() => handleBook(ticket)}
                  className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-stone-50"
                >
                  Book
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
