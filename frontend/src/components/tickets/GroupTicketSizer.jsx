import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COMPANY } from '../../constants/company'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useAddToCart } from '../../hooks/useAddToCart'
import { useRequireLoginNavigate } from '../../hooks/useRequireLoginNavigate'
import {
  BASE_CITY,
  GROUP_TICKET_DESTINATIONS,
  TICKET_MAX,
  TICKET_MIN,
  TICKET_PRESETS,
  clampTicketSize,
  formatInr,
  ticketPrice,
} from '../../utils/groupTickets'

export default function GroupTicketSizer() {
  const [destinationId, setDestinationId] = useState(GROUP_TICKET_DESTINATIONS[1]?.id || 'bhilai')
  const [ticketSize, setTicketSize] = useState(TICKET_MIN)
  const { user } = useAuth()
  const { addItem } = useCart()
  const addToCart = useAddToCart()
  const goBook = useRequireLoginNavigate()

  const destination = useMemo(
    () => GROUP_TICKET_DESTINATIONS.find((d) => d.id === destinationId) || GROUP_TICKET_DESTINATIONS[0],
    [destinationId]
  )

  const price = ticketPrice(ticketSize)

  function buildItem() {
    return {
      type: 'group_ticket',
      destinationId: destination.id,
      title: `Group tickets — ${destination.name}`,
      unitPrice: price,
      quantity: 1,
      ticketSize,
      meta: `${ticketSize} tickets · ${destination.km} km from ${BASE_CITY}`,
    }
  }

  function handleRequest() {
    addToCart(buildItem())
  }

  function handleBook() {
    const item = buildItem()
    if (user) {
      addItem(item)
      goBook('/booking')
      return
    }
    addToCart(item)
  }

  return (
    <section className="w-full px-4 pb-4 pt-10 sm:px-6 lg:px-10">
      <div className="grid gap-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-2 lg:items-center lg:gap-12 lg:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Group tickets</p>
          <h2 className="mt-2 font-serif text-3xl text-emerald-950 sm:text-4xl">
            Ticket sizes from {TICKET_MIN} to {TICKET_MAX}
          </h2>
          <p className="mt-3 text-stone-600">
            Choose a destination from {BASE_CITY}, then pick a group size from {TICKET_MIN} to{' '}
            {TICKET_MAX}. Indicative fare updates live; we confirm the final price on booking.
          </p>
          <button
            type="button"
            onClick={handleRequest}
            className="mt-6 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-3 text-sm font-semibold text-white hover:from-amber-400 hover:to-amber-600"
          >
            {user ? `Request ${ticketSize} tickets · ${formatInr(price)}` : 'Login to request tickets'}
          </button>
          <button
            type="button"
            onClick={handleBook}
            className="mt-3 block text-sm font-medium text-emerald-800 hover:underline"
          >
            Book this group size →
          </button>
        </div>

        <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-5 sm:p-6">
          <label className="block text-sm font-medium text-stone-600" htmlFor="group-destination">
            Destination
          </label>
          <select
            id="group-destination"
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-slate-900"
          >
            {GROUP_TICKET_DESTINATIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.km} km
              </option>
            ))}
          </select>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Ticket size</p>
              <p className="mt-2 font-serif text-3xl text-emerald-950">{ticketSize}</p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Indicative fare</p>
              <p className="mt-2 font-serif text-3xl text-emerald-950">{formatInr(price)}</p>
              <p className="mt-1 text-[11px] text-stone-500">+5% GST at checkout</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-stone-600">
            {destination.name} is about <strong>{destination.km} km</strong> from {BASE_CITY}.
          </p>

          <input
            type="range"
            min={TICKET_MIN}
            max={TICKET_MAX}
            step={10}
            value={ticketSize}
            onChange={(e) => setTicketSize(clampTicketSize(e.target.value))}
            className="mt-4 w-full accent-amber-600"
            aria-label="Ticket size"
          />
          <div className="mt-2 flex justify-between text-xs text-stone-500">
            <span>
              {TICKET_MIN} · {formatInr(ticketPrice(TICKET_MIN))}
            </span>
            <span>
              {TICKET_MAX} · {formatInr(ticketPrice(TICKET_MAX))}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {TICKET_PRESETS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setTicketSize(size)}
                className={`flex h-10 min-w-[2.5rem] items-center justify-center rounded-full px-3 text-sm font-semibold transition ${
                  ticketSize === size
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-stone-500">
            Indicative only — final group fare confirmed by {COMPANY.shortName}.{' '}
            <Link to="/contact" className="font-medium text-emerald-800 hover:underline">
              Talk to us
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
