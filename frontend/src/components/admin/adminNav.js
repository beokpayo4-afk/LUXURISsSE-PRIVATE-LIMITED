export const ADMIN_NAV_GROUPS = [
  {
    title: 'Main',
    items: [
      { to: '/admin', label: 'Dashboard', end: true },
      { to: '/admin/bookings', label: 'Bookings' },
      { to: '/admin/customers', label: 'Customers' },
      { to: '/admin/enquiries', label: 'Enquiries' },
    ],
  },
  {
    title: 'Tour Management',
    items: [
      { to: '/admin/tours', label: 'Tours' },
      { to: '/admin/destinations', label: 'Destinations' },
      { to: '/admin/categories', label: 'Categories' },
      { to: '/admin/hotels', label: 'Hotels' },
      { to: '/admin/transport', label: 'Transport' },
      { to: '/admin/tickets', label: 'Tickets' },
    ],
  },
  {
    title: 'Sales & Finance',
    items: [
      { to: '/admin/quotations', label: 'Quotations' },
      { to: '/admin/payments', label: 'Payments' },
      { to: '/admin/offers', label: 'Offers & Coupons' },
      { to: '/admin/gst', label: 'GST / Tax' },
    ],
  },
  {
    title: 'Content',
    items: [
      { to: '/admin/reviews', label: 'Reviews' },
      { to: '/admin/gallery', label: 'Gallery' },
      { to: '/admin/banners', label: 'Banners' },
      { to: '/admin/blog', label: 'Blog' },
      { to: '/admin/pages', label: 'Pages' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/notifications', label: 'Notifications' },
      { to: '/admin/reports', label: 'Reports' },
      { to: '/admin/staff', label: 'Staff & Roles' },
      { to: '/admin/settings', label: 'Settings' },
    ],
  },
]

/** Flat list for breadcrumbs / title lookup */
export const ADMIN_NAV = ADMIN_NAV_GROUPS.flatMap((g) => g.items)
