import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center text-slate-600">
        Loading…
      </div>
    )
  }

  if (!user) {
    const cartLogin = location.pathname === '/cart' || location.pathname === '/booking'
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location, cartLogin }}
      />
    )
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
