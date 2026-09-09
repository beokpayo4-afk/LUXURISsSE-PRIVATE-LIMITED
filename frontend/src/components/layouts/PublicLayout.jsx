import { Link, NavLink, Outlet } from 'react-router-dom'
import { COMPANY } from '../../constants/company'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import PublicHeaderActions from './PublicHeaderActions'
import ToursDestinationsMenu from './ToursDestinationsMenu'

const linkClass = ({ isActive }) =>
  `px-3 py-2 text-base font-medium rounded-lg sm:px-4 sm:text-lg ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`

export default function PublicLayout() {
  const { user, logout, isAdmin } = useAuth()
  const { count, clearCart } = useCart()

  async function handleLogout() {
    clearCart()
    await logout()
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
          <Link to="/" className="font-serif text-3xl tracking-wide text-slate-900 sm:text-4xl">
            {COMPANY.shortName}
            <span className="mt-0.5 block font-sans text-sm uppercase tracking-[0.22em] text-amber-700">
              Tours, transfers & experiences
            </span>
          </Link>

          <nav className="order-3 flex w-full flex-wrap items-center gap-1 md:order-none md:w-auto md:justify-center">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
            <ToursDestinationsMenu linkClass={linkClass} />
            <NavLink to="/tickets" className={linkClass}>
              Tickets
            </NavLink>
            <NavLink to="/contact" className={linkClass}>
              Contact
            </NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className={linkClass}>
                  My account
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" className={linkClass}>
                    Admin
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-base text-slate-600 hover:text-slate-900 sm:px-4 sm:text-lg"
                >
                  Log out
                </button>
              </>
            ) : (
              <NavLink to="/login" className={linkClass}>
                Login
              </NavLink>
            )}
          </nav>

          <PublicHeaderActions
            cartCount={user ? count : 0}
            cartTo={user ? '/cart' : '/login'}
            cartState={user ? undefined : { from: { pathname: '/cart' }, cartLogin: true }}
          />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-slate-900 text-stone-200">
        <div className="grid w-full gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:px-10">
          <div>
            <p className="font-serif text-lg text-white">{COMPANY.name}</p>
            <p className="mt-2 max-w-md text-sm text-stone-400">{COMPANY.address}</p>
          </div>
          <div className="space-y-1 text-sm sm:text-right">
            <p>
              <a className="hover:text-white" href={`mailto:${COMPANY.email}`}>
                {COMPANY.email}
              </a>
            </p>
            <p>
              <a className="hover:text-white" href={`tel:${COMPANY.phone}`}>
                {COMPANY.phone}
              </a>
            </p>
            <p className="pt-2 text-stone-400">MD: {COMPANY.managingDirector}</p>
            <p className="text-stone-400">Director: {COMPANY.director}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
