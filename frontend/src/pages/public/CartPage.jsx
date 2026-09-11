import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { isTicketCartItem, ticketGstAmount, ticketLineSubtotal, ticketTotalWithGst } from '../../utils/ticketGst'
import { formatTourPrice } from '../../utils/tours'

export default function CartPage() {
  const { items, count, total, subtotal, gst, hasTicketGst, updateQuantity, removeItem, clearCart, itemKey } =
    useCart()

  if (count === 0) {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ef] px-4 py-20 text-center sm:px-6 lg:px-10">
        <h1 className="font-serif text-4xl text-slate-900">Your cart is empty</h1>
        <p className="mt-3 text-lg text-stone-600">Browse tours or configure tickets to get started.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/tours"
            className="rounded-full bg-emerald-950 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
          >
            View tours
          </Link>
          <Link
            to="/tickets"
            className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-white"
          >
            Tickets
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f4ef] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-slate-900 sm:text-5xl">Cart</h1>
          <p className="mt-2 text-lg text-stone-600">{count} item{count === 1 ? '' : 's'}</p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-sm font-medium text-stone-500 hover:text-red-700"
        >
          Clear cart
        </button>
      </div>

      <ul className="mt-10 space-y-4">
        {items.map((row) => {
          const key = itemKey(row)
          const lineSub = ticketLineSubtotal(row)
          const isTicket = isTicketCartItem(row)
          const lineTotal = isTicket ? ticketTotalWithGst(lineSub) : lineSub
          return (
            <li
              key={key}
              className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div>
                <p className="font-semibold text-lg text-slate-900">{row.title}</p>
                {row.meta && <p className="mt-1 text-sm text-stone-500">{row.meta}</p>}
                {row.unitPrice != null ? (
                  <p className="mt-2 text-sm text-stone-600">
                    {formatTourPrice(row.unitPrice)}
                    {row.type === 'tour' ? ' per person' : ''}
                    {isTicket ? ' · +5% GST' : ''}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-stone-500">Price on enquiry</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {row.type === 'tour' && (
                  <div className="flex items-center rounded-full border border-stone-200 px-2">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(key, row.quantity - 1)}
                      className="h-9 w-9 text-lg text-stone-600 hover:text-slate-900"
                    >
                      −
                    </button>
                    <span className="min-w-[2rem] text-center font-semibold">{row.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(key, row.quantity + 1)}
                      className="h-9 w-9 text-lg text-stone-600 hover:text-slate-900"
                    >
                      +
                    </button>
                  </div>
                )}
                {lineTotal != null && (
                  <div className="text-right">
                    <p className="font-serif text-xl font-bold text-emerald-950">{formatTourPrice(lineTotal)}</p>
                    {isTicket && lineSub != null && (
                      <p className="text-xs text-stone-500">
                        incl. GST {formatTourPrice(ticketGstAmount(lineSub))}
                      </p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(key)}
                  className="text-sm text-stone-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        {total > 0 && (
          <div className="space-y-2">
            {hasTicketGst && (
              <>
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>Subtotal</span>
                  <span>{formatTourPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>GST (5% on tickets)</span>
                  <span>{formatTourPrice(gst)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between text-lg">
              <span className="text-stone-600">Payable total</span>
              <span className="font-serif text-3xl font-bold text-emerald-950">{formatTourPrice(total)}</span>
            </div>
          </div>
        )}
        <p className="mt-3 text-sm text-stone-500">
          Ticket bookings include 5% GST. Checkout asks for your details, then UPI or Card payment.
        </p>
        <Link
          to="/booking"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-4 text-base font-semibold text-white hover:from-amber-400 hover:to-amber-600 sm:w-auto"
        >
          Proceed to booking
        </Link>
      </div>
    </div>
  )
}
