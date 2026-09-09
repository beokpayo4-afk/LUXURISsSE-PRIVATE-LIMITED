import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

const ITEMS = [
  { to: '/explore', label: 'All', description: 'Destinations & tours together' },
  { to: '/destinations', label: 'Destinations', description: 'Places to explore' },
  { to: '/tours', label: 'Tours', description: 'Packages & experiences' },
]

export default function ToursDestinationsMenu({ linkClass }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const location = useLocation()

  const active = ['/explore', '/destinations', '/tours'].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  )

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={
          typeof linkClass === 'function'
            ? linkClass({ isActive: active })
            : linkClass
        }
      >
        <span className="inline-flex items-center gap-1.5">
          Tours & Destinations
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`}
            fill="currentColor"
            aria-hidden
          >
            <path d="M5.25 7.5 10 12.25 14.75 7.5" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 min-w-[16rem] overflow-hidden rounded-2xl border border-stone-200 bg-white py-2 shadow-xl">
          <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Tours & Destinations
          </p>
          {ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/explore'}
              className={({ isActive: itemActive }) =>
                `block px-4 py-2.5 transition ${
                  itemActive ? 'bg-emerald-950 text-white' : 'text-slate-800 hover:bg-stone-50'
                }`
              }
            >
              {({ isActive: itemActive }) => (
                <>
                  <span className="block text-base font-medium">{item.label}</span>
                  <span className={`mt-0.5 block text-xs ${itemActive ? 'text-emerald-100' : 'text-stone-500'}`}>
                    {item.description}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <div className="mt-1 border-t border-stone-100 px-4 py-2">
            <Link to="/explore" className="text-xs font-medium text-amber-800 hover:underline">
              Browse everything →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
