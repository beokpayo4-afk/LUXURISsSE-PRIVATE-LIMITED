import { useAuth } from '../../context/AuthContext'

export default function CustomerDashboard() {
  const { user } = useAuth()
  return (
    <div>
      <h1 className="font-serif text-2xl">Welcome, {user?.full_name}</h1>
      <p className="mt-2 text-stone-600 text-sm">
        Manage your bookings and trip enquiries from this customer dashboard.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 p-4">
          <h2 className="font-medium">Account</h2>
          <p className="text-sm text-stone-600 mt-1">{user?.email}</p>
          <p className="text-sm text-stone-500 capitalize">Role: {user?.role}</p>
        </div>
        <div className="rounded-lg border border-stone-200 p-4">
          <h2 className="font-medium">Next steps</h2>
          <p className="text-sm text-stone-600 mt-1">
            Browse tours on the public site, then book once packages are published.
          </p>
        </div>
      </div>
    </div>
  )
}
