import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { COMPANY } from '../../constants/company'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useAddToCart } from '../../hooks/useAddToCart'
import { useRequireLoginNavigate } from '../../hooks/useRequireLoginNavigate'
import {
  BASE_CITY,
  DISTANCE_DESTINATIONS,
  TICKET_FARE_MAX,
  TICKET_FARE_MIN,
  fareForDistanceKm,
  formatInr,
} from '../../utils/ticketDistanceFare'

export default function DistanceTicketFare() {
  const [destinationId, setDestinationId] = useState(DISTANCE_DESTINATIONS[1]?.id || 'bhilai')
  const { user } = useAuth()
  const { addItem } = useCart()
  const addToCart = useAddToCart()
  const goBook = useRequireLoginNavigate()

  const destination = useMemo(
    () => DISTANCE_DESTINATIONS.find((d) => d.id === destinationId) || DISTANCE_DESTINATIONS[0],
    [destinationId]
  )

  const fare = fareForDistanceKm(destination.km)

  function buildItem() {
    return {
      type: 'ticket',
      ticketId: `distance-${destination.id}-${fare}`,
      title: `${BASE_CITY} → ${destination.name}`,
      unitPrice: fare,
      quantity: 1,
      meta: `${destination.km} km · fare by distance (${formatInr(TICKET_FARE_MIN)}–${formatInr(TICKET_FARE_MAX)})`,
    }
  }

  function handleAdd() {
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Distance fare
          </p>
          <h2 className="mt-2 font-serif text-3xl text-emerald-950 sm:text-4xl">
            Ticket cost by distance
          </h2>
          <p className="mt-3 text-stone-600">
            Pick a destination from {BASE_CITY}. Fare scales with road distance and stays between{' '}
            {formatInr(TICKET_FARE_MIN)} and {formatInr(TICKET_FARE_MAX)}. +5% GST applies at
            checkout.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="mt-6 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-3 text-sm font-semibold text-white hover:from-amber-400 hover:to-amber-600"
          >
            {user
              ? `Add ticket · ${formatInr(fare)}`
              : 'Login to add ticket'}
          </button>
          <button
            type="button"
            onClick={handleBook}
            className="mt-3 block text-sm font-medium text-emerald-800 hover:underline"
          >
            Book this fare →
          </button>
        </div>

        <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-5 sm:p-6">
          <label className="block text-sm font-medium text-stone-600" htmlFor="distance-destination">
            Destination
          </label>
          <select
            id="distance-destination"
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-slate-900"
          >
            {DISTANCE_DESTINATIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.km} km · {formatInr(fareForDistanceKm(d.km))}
              </option>
            ))}
          </select>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-stone-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Distance</p>
              <p className="mt-2 font-serif text-3xl text-emerald-950">{destination.km} km</p>
              <p className="mt-1 text-[11px] text-stone-500">from {BASE_CITY}</p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Ticket cost</p>
              <p className="mt-2 font-serif text-3xl text-emerald-950">{formatInr(fare)}</p>
              <p className="mt-1 text-[11px] text-stone-500">+5% GST at checkout</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-xs text-stone-500">
              <span>
                Near · {formatInr(TICKET_FARE_MIN)}
              </span>
              <span>
                Far · {formatInr(TICKET_FARE_MAX)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-amber-600 transition-all"
                style={{
                  width: `${((fare - TICKET_FARE_MIN) / (TICKET_FARE_MAX - TICKET_FARE_MIN)) * 100}%`,
                }}
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-stone-500">
            Indicative only — final fare confirmed by {COMPANY.shortName}.{' '}
            <Link to="/contact" className="font-medium text-emerald-800 hover:underline">
              Talk to us
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
