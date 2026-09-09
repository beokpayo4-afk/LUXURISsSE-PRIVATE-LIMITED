import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchNotifications } from '../../api'

function formatToday() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AdminHeader({ onMenu, search, onSearch, dark = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState([])
  const menuRef = useRef(null)

  useEffect(() => {
    fetchNotifications()
      .then(setNotes)
      .catch(() => setNotes([]))
  }, [])

  useEffect(() => {
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setNotesOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const unread = notes.filter((n) => !n.is_read).length
  const roleLabel = (user?.role || 'staff').replaceAll('_', ' ')

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur ${
        dark ? 'border-white/10 bg-[#0b1220]/95' : 'border-slate-200 bg-white/95'
      }`}
    >
      <div className="flex items-center gap-4 px-5 py-4 lg:px-8 lg:py-5">
        <button
          type="button"
          className={`rounded-lg border px-4 py-2.5 text-base lg:hidden ${
            dark ? 'border-white/10 text-slate-200' : 'border-slate-200'
          }`}
          onClick={onMenu}
          aria-label="Open menu"
        >
          Menu
        </button>

        <div className="relative min-w-0 flex-1">
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search destinations, packages, bookings…"
            className={`w-full rounded-2xl border px-5 py-3.5 text-base outline-none sm:text-lg ${
              dark
                ? 'border-white/10 bg-[#121a2b] text-slate-100 placeholder:text-slate-500 focus:border-sky-500'
                : 'border-slate-200 bg-slate-50 focus:border-violet-500 focus:bg-white'
            }`}
          />
        </div>

        <p className={`hidden text-base xl:block ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          {formatToday()}
        </p>

        <div className="relative" ref={menuRef}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setNotesOpen((v) => !v)
                setMenuOpen(false)
              }}
              className={`relative rounded-xl border px-4 py-3 text-base ${
                dark
                  ? 'border-white/10 text-slate-200 hover:bg-white/5'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              aria-label="Notifications"
            >
              Alerts
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-2 text-xs font-semibold text-white">
                  {unread}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen((v) => !v)
                setNotesOpen(false)
              }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left ${
                dark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-full text-base font-semibold ${
                  dark ? 'bg-sky-500/20 text-sky-300' : 'bg-violet-100 text-violet-700'
                }`}
              >
                {(user?.full_name || 'A').slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:block">
                <span className={`block text-base font-semibold sm:text-lg ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {user?.full_name || 'Account'}
                </span>
                <span className={`block text-sm capitalize ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {roleLabel}
                </span>
              </span>
            </button>
          </div>

          {notesOpen && (
            <div
              className={`absolute right-0 mt-2 w-96 rounded-xl border p-3 shadow-xl ${
                dark ? 'border-white/10 bg-[#121a2b]' : 'border-slate-200 bg-white'
              }`}
            >
              <p
                className={`px-2 py-1 text-sm font-semibold uppercase tracking-wider ${
                  dark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Notifications
              </p>
              {notes.length === 0 ? (
                <p className={`px-2 py-5 text-base ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  No notifications in the database.
                </p>
              ) : (
                <ul className="max-h-80 overflow-auto">
                  {notes.slice(0, 8).map((n) => (
                    <li
                      key={n.id}
                      className={`rounded-lg px-2 py-3 text-base ${dark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                    >
                      <p className={`font-medium ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{n.title}</p>
                      <p className={`line-clamp-2 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{n.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {menuOpen && (
            <div
              className={`absolute right-0 mt-2 w-64 rounded-xl border p-2 shadow-xl ${
                dark ? 'border-white/10 bg-[#121a2b]' : 'border-slate-200 bg-white'
              }`}
            >
              <div className={`border-b px-3 py-3 ${dark ? 'border-white/10' : 'border-slate-100'}`}>
                <p className={`text-base font-medium ${dark ? 'text-white' : 'text-slate-900'}`}>{user?.full_name}</p>
                <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</p>
                <p className={`mt-1 text-xs uppercase tracking-wider ${dark ? 'text-sky-400' : 'text-violet-700'}`}>
                  {user?.role}
                </p>
              </div>
              <Link
                to="/"
                className={`mt-1 block rounded-lg px-3 py-3 text-base ${dark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
              >
                View website
              </Link>
              <button
                type="button"
                className={`block w-full rounded-lg px-3 py-3 text-left text-base ${
                  dark ? 'text-rose-300 hover:bg-rose-500/10' : 'text-red-700 hover:bg-red-50'
                }`}
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
