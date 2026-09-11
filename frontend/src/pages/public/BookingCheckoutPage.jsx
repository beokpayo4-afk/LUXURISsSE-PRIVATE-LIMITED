import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createBooking, createPayment, fetchTour } from '../../api'
import DownloadBookingPdfButton from '../../components/bookings/DownloadBookingPdfButton'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { downloadBookingsPdf } from '../../utils/bookingPdf'
import {
  isTicketCartItem,
  ticketGstAmount,
  ticketLineSubtotal,
  ticketTotalWithGst,
} from '../../utils/ticketGst'
import { formatTourPrice } from '../../utils/tours'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function onlyDigits(value, max) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, max)
}

function formatCardNumber(value) {
  const digits = onlyDigits(value, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function isValidUpi(upi) {
  return /^[\w.-]+@[\w.-]+$/.test(String(upi || '').trim())
}

function StepTabs({ step }) {
  const items = [
    { id: 1, label: 'Your details' },
    { id: 2, label: 'Payment' },
  ]
  return (
    <ol className="mt-6 flex items-center gap-2 sm:gap-4">
      {items.map((item, index) => {
        const active = step === item.id
        const done = step > item.id
        return (
          <li key={item.id} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                active || done
                  ? 'bg-emerald-950 text-white'
                  : 'border border-stone-300 bg-white text-stone-400'
              }`}
            >
              {done ? '✓' : item.id}
            </span>
            <span
              className={`text-sm font-medium ${active || done ? 'text-emerald-950' : 'text-stone-400'}`}
            >
              {item.label}
            </span>
            {index < items.length - 1 && (
              <span className={`ml-auto hidden h-px flex-1 sm:block ${done ? 'bg-emerald-800' : 'bg-stone-200'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default function BookingCheckoutPage() {
  const [searchParams] = useSearchParams()
  const tourIdParam = searchParams.get('tour')
  const travelersParam = Number(searchParams.get('travelers') || 1)

  const { user } = useAuth()
  const { items, clearCart, total: cartTotal, subtotal: cartSubtotal, gst: cartGst, hasTicketGst } =
    useCart()
  const navigate = useNavigate()

  const [tour, setTour] = useState(null)
  const [step, setStep] = useState(1)
  const [travelDate, setTravelDate] = useState(todayIso())
  const [travelers, setTravelers] = useState(Math.max(1, travelersParam || 1))
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState([])
  const [paidMethod, setPaidMethod] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [pincode, setPincode] = useState('')

  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [upiId, setUpiId] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  const mode = tourIdParam ? 'tour' : items.length > 0 ? 'cart' : 'empty'

  useEffect(() => {
    if (!user) return
    setFullName((prev) => prev || user.full_name || '')
    setEmail((prev) => prev || user.email || '')
    setPhone((prev) => prev || user.phone || '')
  }, [user])

  useEffect(() => {
    if (!tourIdParam) return undefined
    let cancelled = false
    fetchTour(tourIdParam)
      .then((data) => {
        if (!cancelled) setTour(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this tour for booking.')
      })
    return () => {
      cancelled = true
    }
  }, [tourIdParam])

  const singleTotal = useMemo(() => {
    if (!tour?.starting_price) return null
    return Number(tour.starting_price) * travelers
  }, [tour, travelers])

  const orderTotal = useMemo(() => {
    if (mode === 'tour') return singleTotal
    if (mode === 'cart') return cartTotal > 0 ? cartTotal : null
    return null
  }, [mode, singleTotal, cartTotal])

  const customerSnapshot = useMemo(
    () => ({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    }),
    [fullName, email, phone]
  )

  function buildGuestNotes(base) {
    const lines = [
      base,
      '',
      'Guest details:',
      `Name: ${fullName.trim()}`,
      `Email: ${email.trim()}`,
      `Phone: ${phone.trim()}`,
      `Address: ${[address.trim(), city.trim(), stateName.trim(), pincode.trim()].filter(Boolean).join(', ')}`,
      `Payment method: ${paymentMethod === 'upi' ? 'UPI' : 'Card'}`,
    ]
    if (paymentMethod === 'upi' && upiId.trim()) {
      lines.push(`UPI ID: ${upiId.trim()}`)
    }
    if (paymentMethod === 'card') {
      const digits = onlyDigits(cardNumber, 16)
      if (digits.length >= 4) lines.push(`Card ending: **** ${digits.slice(-4)}`)
    }
    return lines.filter((line, idx) => !(line === '' && idx === 1 && !base)).join('\n')
  }

  function validateDetails() {
    if (!fullName.trim()) return 'Please enter your full name.'
    if (!isValidEmail(email)) return 'Please enter a valid email address.'
    if (onlyDigits(phone, 15).length < 10) return 'Please enter a valid 10-digit phone number.'
    if (!address.trim()) return 'Please enter your address.'
    if (!city.trim()) return 'Please enter your city.'
    if (!stateName.trim()) return 'Please enter your state.'
    if (onlyDigits(pincode, 6).length !== 6) return 'Please enter a valid 6-digit pincode.'
    if (!travelDate) return 'Please choose a travel date.'
    if (mode === 'tour' && travelers < 1) return 'Add at least one traveller.'
    return ''
  }

  function validatePayment() {
    if (paymentMethod === 'upi') {
      if (!isValidUpi(upiId)) return 'Enter a valid UPI ID (e.g. name@upi).'
      return ''
    }
    if (!cardName.trim()) return 'Enter the name on the card.'
    const digits = onlyDigits(cardNumber, 16)
    if (digits.length < 13) return 'Enter a valid card number.'
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry.trim())) return 'Enter expiry as MM/YY.'
    const [mm] = cardExpiry.split('/').map(Number)
    if (!mm || mm < 1 || mm > 12) return 'Enter a valid expiry month (01–12).'
    if (onlyDigits(cardCvv, 4).length < 3) return 'Enter a valid CVV.'
    return ''
  }

  function goToPayment(e) {
    e.preventDefault()
    if (!user) {
      navigate('/login', {
        state: { from: { pathname: '/booking', search: window.location.search }, cartLogin: true },
      })
      return
    }
    const err = validateDetails()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setStep(2)
  }

  async function submitTourBooking() {
    const booking = await createBooking({
      tour_id: Number(tour.id),
      travel_date: travelDate || null,
      travelers,
      notes: buildGuestNotes(notes || `Booking request for ${tour.title}`),
      total_amount: singleTotal,
    })
    return [
      {
        ...booking,
        displayTitle: tour.title,
        displayType: 'Tour package',
        displayMeta: [tour.destination_name, tour.category_name].filter(Boolean).join(' · '),
      },
    ]
  }

  async function submitCartBookings() {
    const results = []
    for (const row of items) {
      if (row.type === 'tour' && row.tourId) {
        const booking = await createBooking({
          tour_id: Number(row.tourId),
          travel_date: travelDate || null,
          travelers: row.quantity || 1,
          notes: buildGuestNotes(
            notes || `Cart booking: ${row.title}${row.meta ? ` — ${row.meta}` : ''}`
          ),
          total_amount:
            row.unitPrice != null ? Number(row.unitPrice) * (row.quantity || 1) : null,
        })
        results.push({
          ...booking,
          displayTitle: row.title,
          displayType: 'Tour package',
          displayMeta: row.meta || null,
        })
      } else if (row.type === 'ticket' || row.type === 'group_ticket') {
        const subtotal = ticketLineSubtotal(row)
        const tax = ticketGstAmount(subtotal)
        const total = ticketTotalWithGst(subtotal)
        const booking = await createBooking({
          tour_id: null,
          travel_date: travelDate || null,
          travelers: 1,
          notes: buildGuestNotes(
            notes ||
              `Tickets: ${row.title}${row.ticketId ? ` (#${row.ticketId})` : ''} — ${row.meta || ''} · GST 5%`
          ),
          subtotal_amount: subtotal,
          tax_amount: tax,
          total_amount: total,
        })
        results.push({
          ...booking,
          displayTitle: row.title,
          displayType: 'Ticket',
          displayMeta: row.meta || null,
        })
      }
    }
    return results
  }

  async function recordPayments(bookings) {
    const methodLabel = paymentMethod === 'upi' ? 'UPI' : 'Card'
    const refBase = `LX-${Date.now().toString(36).toUpperCase()}`
    for (let i = 0; i < bookings.length; i += 1) {
      const booking = bookings[i]
      const amount = booking.total_amount != null ? Number(booking.total_amount) : 0
      if (!amount || amount <= 0) continue
      try {
        await createPayment({
          booking_id: booking.id,
          amount,
          currency: 'INR',
          method: methodLabel,
          transaction_ref: `${refBase}-${i + 1}`,
        })
      } catch {
        // Booking still succeeds if payment row fails.
      }
    }
  }

  async function handlePay(e) {
    e.preventDefault()
    if (!user) {
      navigate('/login', {
        state: { from: { pathname: '/booking', search: window.location.search }, cartLogin: true },
      })
      return
    }
    const detailsErr = validateDetails()
    if (detailsErr) {
      setError(detailsErr)
      setStep(1)
      return
    }
    const payErr = validatePayment()
    if (payErr) {
      setError(payErr)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const results = mode === 'tour' ? await submitTourBooking() : await submitCartBookings()
      if (!results.length) {
        setError('Nothing to book. Add a tour or open a tour booking link.')
        return
      }
      await recordPayments(results)
      if (mode === 'cart') clearCart()
      setPaidMethod(paymentMethod === 'upi' ? 'UPI' : 'Card')
      setCreated(results)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Could not complete booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function onExpiryChange(value) {
    const digits = onlyDigits(value, 4)
    if (digits.length <= 2) {
      setCardExpiry(digits)
      return
    }
    setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`)
  }

  if (created.length > 0) {
    return (
      <div className="min-h-[70vh] bg-[#f7f4ef] px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Booking received
          </p>
          <h1 className="mt-3 font-serif text-4xl text-emerald-950">You’re booked in</h1>
          <p className="mt-3 text-stone-600">
            Payment via {paidMethod || 'online'} submitted. Your booking is pending confirmation from
            our team.
          </p>
          <ul className="mt-8 space-y-3 text-left">
            {created.map((b) => (
              <li key={b.id} className="rounded-2xl border border-stone-200 bg-[#faf8f5] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{b.booking_code}</p>
                    {b.displayTitle && (
                      <p className="mt-1 text-sm text-stone-700">{b.displayTitle}</p>
                    )}
                    <p className="mt-1 text-sm capitalize text-stone-600">Status: {b.status}</p>
                    {b.total_amount != null && (
                      <p className="mt-1 text-sm text-stone-600">
                        Amount: {formatTourPrice(b.total_amount)}
                        {b.tax_amount != null
                          ? ` (incl. GST ${formatTourPrice(b.tax_amount)})`
                          : ''}
                      </p>
                    )}
                  </div>
                  <DownloadBookingPdfButton
                    booking={b}
                    customer={customerSnapshot}
                    label="PDF"
                    className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {created.length > 1 && (
              <button
                type="button"
                onClick={() => downloadBookingsPdf(created, customerSnapshot)}
                className="rounded-full bg-emerald-950 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
              >
                Download all PDFs
              </button>
            )}
            {created.length === 1 && (
              <DownloadBookingPdfButton
                booking={created[0]}
                customer={customerSnapshot}
                label="Download PDF"
                className="rounded-full bg-emerald-950 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
              />
            )}
            <Link
              to="/dashboard/bookings"
              className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-stone-50"
            >
              View my bookings
            </Link>
            <Link
              to="/tours"
              className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-stone-50"
            >
              Browse more tours
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'empty') {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ef] px-4 py-20 text-center sm:px-6 lg:px-10">
        <h1 className="font-serif text-4xl text-slate-900">Nothing to book yet</h1>
        <p className="mt-3 text-lg text-stone-600">Choose a tour or add items to your cart first.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/tours" className="rounded-full bg-emerald-950 px-6 py-3 text-sm font-semibold text-white">
            View tours
          </Link>
          <Link to="/cart" className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold">
            Open cart
          </Link>
        </div>
      </div>
    )
  }

  const inputClass = 'w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-emerald-700'

  return (
    <div className="min-h-screen bg-[#f7f4ef] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Checkout</p>
          <h1 className="mt-2 font-serif text-4xl text-emerald-950 sm:text-5xl">
            {step === 1 ? 'Your details' : 'Payment'}
          </h1>
          <p className="mt-3 text-stone-600">
            {step === 1
              ? 'Fill in traveller and contact details, then continue to payment.'
              : 'Choose UPI or Card to complete your booking request.'}
          </p>

          <StepTabs step={step} />

          {step === 1 && (
            <form onSubmit={goToPayment} className="mt-8 space-y-5 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="full_name">
                    Full name
                  </label>
                  <input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    required
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(onlyDigits(e.target.value, 15))}
                    className={inputClass}
                    required
                    autoComplete="tel"
                    placeholder="10-digit mobile"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="address">
                    Address
                  </label>
                  <textarea
                    id="address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={inputClass}
                    required
                    autoComplete="street-address"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="city">
                    City
                  </label>
                  <input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                    required
                    autoComplete="address-level2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="state">
                    State
                  </label>
                  <input
                    id="state"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className={inputClass}
                    required
                    autoComplete="address-level1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="pincode">
                    Pincode
                  </label>
                  <input
                    id="pincode"
                    value={pincode}
                    onChange={(e) => setPincode(onlyDigits(e.target.value, 6))}
                    className={inputClass}
                    required
                    autoComplete="postal-code"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="travel_date">
                    Preferred travel date
                  </label>
                  <input
                    id="travel_date"
                    type="date"
                    min={todayIso()}
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                {mode === 'tour' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="travelers">
                      Travellers
                    </label>
                    <input
                      id="travelers"
                      type="number"
                      min={1}
                      max={99}
                      value={travelers}
                      onChange={(e) => setTravelers(Math.max(1, Number(e.target.value) || 1))}
                      className={inputClass}
                    />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="notes">
                    Notes for our team (optional)
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Pickup point, hotel preference, special requests…"
                    className={inputClass}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={mode === 'tour' && !tour}
                className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-4 text-base font-semibold text-white hover:from-amber-400 hover:to-amber-600 disabled:opacity-60"
              >
                Continue to payment
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handlePay} className="mt-8 space-y-5 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
              <div className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-4 text-sm text-stone-600">
                <p className="font-semibold text-slate-900">{fullName}</p>
                <p className="mt-1">
                  {email} · {phone}
                </p>
                <p className="mt-1">
                  {[address, city, stateName, pincode].filter(Boolean).join(', ')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setStep(1)
                  }}
                  className="mt-3 text-sm font-semibold text-emerald-900 underline-offset-2 hover:underline"
                >
                  Edit details
                </button>
              </div>

              <fieldset>
                <legend className="mb-3 text-sm font-medium text-stone-600">Pay with</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 ${
                      paymentMethod === 'upi'
                        ? 'border-emerald-800 bg-emerald-50'
                        : 'border-stone-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={() => setPaymentMethod('upi')}
                      className="h-4 w-4 accent-emerald-900"
                    />
                    <span>
                      <span className="block font-semibold text-slate-900">UPI</span>
                      <span className="text-sm text-stone-500">GPay, PhonePe, Paytm & more</span>
                    </span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 ${
                      paymentMethod === 'card'
                        ? 'border-emerald-800 bg-emerald-50'
                        : 'border-stone-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="h-4 w-4 accent-emerald-900"
                    />
                    <span>
                      <span className="block font-semibold text-slate-900">Card</span>
                      <span className="text-sm text-stone-500">Debit or credit card</span>
                    </span>
                  </label>
                </div>
              </fieldset>

              {paymentMethod === 'upi' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="upi_id">
                    UPI ID
                  </label>
                  <input
                    id="upi_id"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className={inputClass}
                    required
                    autoComplete="off"
                  />
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="card_name">
                      Name on card
                    </label>
                    <input
                      id="card_name"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className={inputClass}
                      required
                      autoComplete="cc-name"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="card_number">
                      Card number
                    </label>
                    <input
                      id="card_number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="XXXX XXXX XXXX XXXX"
                      className={inputClass}
                      required
                      inputMode="numeric"
                      autoComplete="cc-number"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="card_expiry">
                      Expiry (MM/YY)
                    </label>
                    <input
                      id="card_expiry"
                      value={cardExpiry}
                      onChange={(e) => onExpiryChange(e.target.value)}
                      placeholder="MM/YY"
                      className={inputClass}
                      required
                      inputMode="numeric"
                      autoComplete="cc-exp"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-600" htmlFor="card_cvv">
                      CVV
                    </label>
                    <input
                      id="card_cvv"
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(onlyDigits(e.target.value, 4))}
                      placeholder="•••"
                      className={inputClass}
                      required
                      inputMode="numeric"
                      autoComplete="cc-csc"
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting || (mode === 'tour' && !tour)}
                className="w-full rounded-full bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-4 text-base font-semibold text-white hover:from-amber-400 hover:to-amber-600 disabled:opacity-60"
              >
                {submitting
                  ? 'Processing…'
                  : orderTotal != null
                    ? `Pay ${formatTourPrice(orderTotal)}`
                    : 'Pay & confirm booking'}
              </button>
              <p className="text-center text-xs text-stone-500">
                Demo checkout — card/UPI details are validated locally. Full card numbers are never
                stored. Booking stays pending until Luxurisse confirms.
              </p>
            </form>
          )}
        </div>

        <aside className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-serif text-2xl text-slate-900">Order summary</h2>
          {mode === 'tour' && tour && (
            <div className="mt-4 space-y-2">
              <p className="font-semibold text-lg text-emerald-950">{tour.title}</p>
              <p className="text-sm text-stone-500">
                {[tour.destination_name, tour.category_name].filter(Boolean).join(' · ')}
              </p>
              <p className="text-sm text-stone-600">
                {travelers} traveller{travelers === 1 ? '' : 's'}
              </p>
              {singleTotal != null ? (
                <p className="mt-4 font-serif text-3xl font-bold text-emerald-950">
                  {formatTourPrice(singleTotal)}
                </p>
              ) : (
                <p className="mt-4 text-stone-500">Price on confirmation</p>
              )}
            </div>
          )}
          {mode === 'cart' && (
            <ul className="mt-4 space-y-3">
              {items.map((row, idx) => {
                const lineSub = ticketLineSubtotal(row)
                const isTicket = isTicketCartItem(row)
                const lineTotal = isTicket ? ticketTotalWithGst(lineSub) : lineSub
                return (
                  <li key={`${row.title}-${idx}`} className="border-b border-stone-100 pb-3">
                    <p className="font-medium text-slate-900">{row.title}</p>
                    <p className="text-sm text-stone-500">
                      {row.type === 'tour' ? `${row.quantity} traveller(s)` : row.meta || 'Ticket'}
                      {lineTotal != null ? ` · ${formatTourPrice(lineTotal)}` : ''}
                      {isTicket ? ' incl. 5% GST' : ''}
                    </p>
                  </li>
                )
              })}
              {cartTotal > 0 && (
                <div className="space-y-1 pt-2">
                  {hasTicketGst && (
                    <>
                      <p className="flex justify-between text-sm text-stone-600">
                        <span>Subtotal</span>
                        <span>{formatTourPrice(cartSubtotal)}</span>
                      </p>
                      <p className="flex justify-between text-sm text-stone-600">
                        <span>GST (5%)</span>
                        <span>{formatTourPrice(cartGst)}</span>
                      </p>
                    </>
                  )}
                  <p className="font-serif text-3xl font-bold text-emerald-950">
                    {formatTourPrice(cartTotal)}
                  </p>
                </div>
              )}
            </ul>
          )}
          {step === 2 && (
            <p className="mt-6 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Paying with {paymentMethod === 'upi' ? 'UPI' : 'Card'}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
