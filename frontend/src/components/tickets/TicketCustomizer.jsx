import { useEffect, useMemo, useState } from 'react'
import { INDIA_STATES } from '../../constants/indiaStates'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useAddToCart } from '../../hooks/useAddToCart'
import { useRequireLoginNavigate } from '../../hooks/useRequireLoginNavigate'
import { formatTourPrice } from '../../utils/tours'

const TICKET_TYPES = ['Local Bus', 'Tempo', 'E-Rickshaw', 'Other']

/** Indicative starting fares by transport type — final fare confirmed on booking. */
const INDICATIVE_PRICE = {
  'Local Bus': 30,
  Tempo: 60,
  'E-Rickshaw': 40,
  Other: 50,
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const emptyCustom = {
  state: 'Chhattisgarh',
  type: 'Local Bus',
  from_location: '',
  to_location: '',
  pickup: '',
  drop: '',
  date: todayIso(),
  time: '09:00',
}

export default function TicketCustomizer({ suggestedLocations = [], onStateChange }) {
  const [form, setForm] = useState(emptyCustom)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const { addItem } = useCart()
  const addToCart = useAddToCart()
  const goBook = useRequireLoginNavigate()

  const price = INDICATIVE_PRICE[form.type] ?? 50

  useEffect(() => {
    onStateChange?.(form.state)
  }, [form.state, onStateChange])

  const locationOptions = useMemo(() => {
    const set = new Set(suggestedLocations.filter(Boolean))
    return [...set].sort()
  }, [suggestedLocations])

  function buildItem() {
    const from = form.from_location.trim()
    const to = form.to_location.trim()
    const title = `${form.state}: ${from} → ${to}`
    const pickup = form.pickup.trim()
    const drop = form.drop.trim()
    return {
      type: 'ticket',
      ticketId: `custom-${form.state}-${from}-${to}-${form.date}-${form.time}`,
      custom: true,
      title,
      unitPrice: price,
      quantity: 1,
      meta: [
        form.type,
        form.state,
        `${form.date} ${form.time}`,
        pickup && `Pickup: ${pickup}`,
        drop && `Drop: ${drop}`,
      ]
        .filter(Boolean)
        .join(' · '),
    }
  }

  function validate() {
    if (!form.state || !form.from_location.trim() || !form.to_location.trim()) {
      setError('Choose state, from location and to location.')
      return false
    }
    if (!form.date || !form.time) {
      setError('Choose date and time.')
      return false
    }
    setError('')
    return true
  }

  function handleAddToCart() {
    if (!validate()) return
    addToCart(buildItem())
  }

  function handleBook() {
    if (!validate()) return
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
      <div className="grid gap-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_0.95fr] lg:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Customize your ticket
          </p>
          <h2 className="mt-2 font-serif text-3xl text-emerald-950 sm:text-4xl">
            Choose your own locations
          </h2>
          <p className="mt-3 text-stone-600">
            Pick any state, type your from / to points, and set pickup & drop. Indicative fare updates by
            transport type — final price is confirmed when we accept the booking.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-stone-600">
            <li>• Free-text locations — write any place you need</li>
            <li>• Optional suggestions from published routes in that state</li>
            <li>• Works for Local Bus, Tempo, E-Rickshaw and Other</li>
          </ul>
        </div>

        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            handleBook()
          }}
        >
          <label className="block text-sm sm:col-span-1">
            <span className="mb-1 block font-medium text-stone-600">State *</span>
            <select
              className="w-full rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-2.5"
              value={form.state}
              onChange={(e) => {
                const state = e.target.value
                setForm((f) => ({ ...f, state }))
                onStateChange?.(state)
              }}
            >
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-600">Transport type *</span>
            <select
              className="w-full rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-2.5"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {TICKET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-stone-600">From location *</span>
            <input
              list="ticket-location-suggestions"
              className="w-full rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-2.5"
              placeholder="e.g. Raipur Railway Station"
              value={form.from_location}
              onChange={(e) => setForm((f) => ({ ...f, from_location: e.target.value }))}
              required
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-stone-600">To location *</span>
            <input
              list="ticket-location-suggestions"
              className="w-full rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-2.5"
              placeholder="e.g. Telibandha Lake"
              value={form.to_location}
              onChange={(e) => setForm((f) => ({ ...f, to_location: e.target.value }))}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-600">Pickup point</span>
            <input
              list="ticket-location-suggestions"
              className="w-full rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-2.5"
              placeholder="Optional — exact pickup"
              value={form.pickup}
              onChange={(e) => setForm((f) => ({ ...f, pickup: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-600">Drop point</span>
            <input
              list="ticket-location-suggestions"
              className="w-full rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-2.5"
              placeholder="Optional — exact drop"
              value={form.drop}
              onChange={(e) => setForm((f) => ({ ...f, drop: e.target.value }))}
            />
          </label>

          <datalist id="ticket-location-suggestions">
            {locationOptions.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-600">Date *</span>
            <input
              type="date"
              min={todayIso()}
              className="w-full rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-2.5"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-stone-600">Time *</span>
            <input
              type="time"
              className="w-full rounded-xl border border-stone-200 bg-[#faf8f5] px-3 py-2.5"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              required
            />
          </label>

          <div className="sm:col-span-2 rounded-2xl border border-stone-100 bg-[#faf8f5] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-stone-500">Indicative fare</p>
            <p className="font-serif text-3xl font-bold text-emerald-950">{formatTourPrice(price)}</p>
            <p className="mt-1 text-xs text-stone-500">Final fare confirmed after booking review.</p>
          </div>

          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

          <div className="sm:col-span-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              className="rounded-full bg-gradient-to-r from-amber-500 to-amber-700 px-5 py-3 text-sm font-semibold text-white hover:from-amber-400 hover:to-amber-600"
            >
              {user ? 'Add custom ticket to cart' : 'Login to add custom ticket'}
            </button>
            <button
              type="submit"
              className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-stone-50"
            >
              Book this route
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
