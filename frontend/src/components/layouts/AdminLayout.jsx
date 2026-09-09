import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AdminHeader from '../admin/AdminHeader'
import AdminSidebar from '../admin/AdminSidebar'
import { ADMIN_NAV } from '../admin/adminNav'
import { Breadcrumbs } from '../ui/Feedback'

function titleFromPath(pathname) {
  const item = ADMIN_NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))
  return item?.label || 'Admin'
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const location = useLocation()
  const title = useMemo(() => titleFromPath(location.pathname), [location.pathname])
  const isAnalyticsHome = location.pathname === '/admin' || location.pathname === '/admin/'

  return (
    <div
      className={`min-h-screen lg:grid lg:grid-cols-[20rem_1fr] ${
        isAnalyticsHome ? 'bg-[#0b1220]' : 'bg-[#f4f6fb]'
      }`}
    >
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0">
        <AdminHeader
          onMenu={() => setSidebarOpen(true)}
          search={search}
          onSearch={setSearch}
          dark={isAnalyticsHome}
        />
        <main className="px-5 py-6 lg:px-8 lg:py-8">
          {!isAnalyticsHome && (
            <Breadcrumbs
              items={[
                { label: 'Admin', to: '/admin' },
                { label: title },
              ]}
            />
          )}
          <div className={isAnalyticsHome ? '' : 'mt-4'}>
            <Outlet context={{ search, setSearch }} />
          </div>
        </main>
      </div>
    </div>
  )
}
