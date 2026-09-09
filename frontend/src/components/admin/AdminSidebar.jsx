import { NavLink } from 'react-router-dom'
import { COMPANY } from '../../constants/company'
import { ADMIN_NAV_GROUPS } from './adminNav'

export default function AdminSidebar({ open, onClose }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 lg:hidden ${open ? 'block' : 'hidden'}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-[#0b1220] text-slate-300 transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-600 text-lg font-bold text-white">
              L
            </div>
            <div className="min-w-0">
              <p className="truncate font-serif text-xl text-white sm:text-2xl">{COMPANY.shortName}</p>
              <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-sky-300">Analytics console</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-6">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {group.title}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `mb-1 block rounded-xl px-4 py-3 text-base transition ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-sm shadow-sky-900/40'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
