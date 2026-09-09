import { NavLink, Outlet } from 'react-router-dom'

const items = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/bookings', label: 'My bookings' },
  { to: '/dashboard/enquiries', label: 'Enquiries' },
]

export default function CustomerLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-xl border border-stone-200 bg-white p-4 h-fit">
        <p className="text-xs uppercase tracking-wider text-stone-500 mb-3">Customer</p>
        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-slate-900 text-white' : 'hover:bg-stone-100'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  )
}
