import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function IconButton({ label, onClick, to, children }) {
  const className =
    'inline-flex h-11 w-11 items-center justify-center rounded-full text-emerald-950 transition hover:bg-stone-100'
  if (to) {
    return (
      <Link to={to} aria-label={label} className={className}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={className}>
      {children}
    </button>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M7 8h12l-1.2 9.2a2 2 0 0 1-2 1.8H10a2 2 0 0 1-2-1.7L6.2 5.5A2 2 0 0 0 4.2 4H3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PublicHeaderActions({ cartCount = 0, cartTo = '/cart', cartState }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function submitSearch(e) {
    e.preventDefault()
    const q = query.trim()
    setOpen(false)
    navigate(q ? `/tours?q=${encodeURIComponent(q)}` : '/tours')
  }

  return (
    <div className="relative flex items-center gap-1 sm:gap-2">
      <IconButton label="Search tours" onClick={() => setOpen((v) => !v)}>
        <SearchIcon />
      </IconButton>

      <Link
        to={cartTo}
        state={cartState}
        aria-label={cartCount ? `Cart, ${cartCount} items` : 'Cart'}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-emerald-950 transition hover:bg-stone-100"
      >
        <CartIcon />
        {cartCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </Link>

      <IconButton label="Refresh page" onClick={() => window.location.reload()}>
        <RefreshIcon />
      </IconButton>

      <Link
        to="/tours"
        className="ml-1 inline-flex items-center rounded-full bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 sm:px-6 sm:text-base"
      >
        Book a trip
      </Link>

      {open && (
        <form
          onSubmit={submitSearch}
          className="absolute right-0 top-full z-30 mt-3 w-[min(92vw,22rem)] rounded-2xl border border-stone-200 bg-white p-3 shadow-xl"
        >
          <label className="sr-only" htmlFor="header-search">
            Search tours
          </label>
          <div className="flex gap-2">
            <input
              id="header-search"
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search destinations or tours…"
              className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none ring-emerald-900/20 focus:ring-2"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-950 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Go
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
