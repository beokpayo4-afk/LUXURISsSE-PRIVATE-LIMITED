import { useState } from 'react'
import { COMPANY } from '../../constants/company'
import { useAuth } from '../../context/AuthContext'
import { useAddToCart } from '../../hooks/useAddToCart'
import { useRequireLoginNavigate } from '../../hooks/useRequireLoginNavigate'
import { formatTourPrice } from '../../utils/tours'

const FEATURES = [
  { icon: '📄', label: 'Detailed itinerary' },
  { icon: '✉', label: 'Sent to your email' },
  { icon: '✓', label: 'Free cancellation' },
  { icon: '↻', label: 'Flexible dates' },
]

export default function TourBookingPanel({ tour }) {
  const [quantity, setQuantity] = useState(1)
  const { user } = useAuth()
  const addToCart = useAddToCart()
  const goBook = useRequireLoginNavigate()

  const unitPrice = tour.starting_price != null ? Number(tour.starting_price) : null
  const lineTotal = unitPrice != null ? unitPrice * quantity : null
  const priceLabel = formatTourPrice(tour.starting_price)
  const mrp = formatTourPrice(tour.mrp)

  function handleAddToCart() {
    addToCart({
      type: 'tour',
      tourId: tour.id,
      title: tour.title,
      unitPrice,
      quantity,
      meta: [tour.destination_name, tour.category_name].filter(Boolean).join(' · '),
    })
  }

  function handleBuyNow() {
    goBook(`/booking?tour=${tour.id}&travelers=${quantity}`)
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-stone-200/80 sm:p-8 lg:sticky lg:top-24">
      {tour.category_name && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          {tour.category_name}
        </p>
      )}
      <h1 className="mt-2 font-serif text-3xl leading-tight text-emerald-950 sm:text-4xl lg:text-[2.35rem]">
        {tour.title}
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        ★★★★★ <span className="text-stone-400">Curated by {COMPANY.shortName}</span>
      </p>
      <p className="mt-4 text-base leading-relaxed text-stone-600">
        {[tour.destination_name, tour.category_name].filter(Boolean).join(' · ')}
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        {priceLabel ? (
          <p className="font-serif text-4xl font-bold text-emerald-950 sm:text-5xl">{priceLabel}</p>
        ) : (
          <p className="text-lg text-stone-500">Price on enquiry</p>
        )}
        {mrp && tour.starting_price != null && tour.mrp > tour.starting_price && (
          <p className="text-lg text-stone-400 line-through">{mrp}</p>
        )}
        {priceLabel && <p className="text-sm text-stone-500">per person</p>}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className="rounded-2xl border border-amber-100/80 bg-[#faf6f0] px-3 py-3 text-sm text-stone-700"
          >
            <span className="mr-1.5">{f.icon}</span>
            {f.label}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex items-center justify-between rounded-full border border-stone-200 bg-white px-2 py-1 sm:w-36">
          <button
            type="button"
            aria-label="Decrease travellers"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-stone-600 hover:bg-stone-100"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center text-lg font-semibold text-slate-900">{quantity}</span>
          <button
            type="button"
            aria-label="Increase travellers"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-stone-600 hover:bg-stone-100"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:from-amber-400 hover:to-amber-600"
        >
          {user ? 'Add to cart' : 'Login to add to cart'}
          <span aria-hidden>↓</span>
        </button>
      </div>

      {!user && (
        <p className="mt-2 text-center text-xs text-stone-500">
          Sign in first — your selection is saved and added after login.
        </p>
      )}

      <button
        type="button"
        onClick={handleBuyNow}
        className="mt-3 w-full rounded-full border border-stone-300 bg-white px-6 py-3.5 text-base font-semibold text-emerald-950 hover:bg-stone-50"
      >
        Buy now — complete booking
      </button>

      {lineTotal != null && quantity > 1 && (
        <p className="mt-3 text-center text-sm text-stone-600">
          Indicative total: <span className="font-semibold text-emerald-950">{formatTourPrice(lineTotal)}</span>
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-amber-800/80">
        <span>🛡 Secure enquiry</span>
        <span>🔒 No card data stored</span>
        <span>💬 Email support</span>
      </div>

      <a
        href={`tel:${COMPANY.phone}`}
        className="mt-4 block text-center text-sm font-medium text-emerald-800 hover:underline"
      >
        Or call {COMPANY.phone}
      </a>
    </div>
  )
}
