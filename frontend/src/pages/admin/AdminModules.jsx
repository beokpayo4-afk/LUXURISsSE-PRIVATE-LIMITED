import AdminResourcePage from './AdminResourcePage'
import {
  fetchBanners,
  fetchBookings,
  fetchCoupons,
  fetchEnquiries,
  fetchGstSettings,
  fetchHotels,
  fetchNotifications,
  fetchOffers,
  fetchPages,
  fetchPayments,
  fetchQuotations,
  fetchReviews,
  fetchRoles,
  fetchSettings,
  fetchTransport,
  fetchUsers,
  fetchBlogPosts,
} from '../../api'
import { mediaUrl } from '../../utils/media'

async function fetchOffersAndCoupons() {
  const [offers, coupons] = await Promise.all([fetchOffers(), fetchCoupons()])
  return [
    ...offers.map((o) => ({ ...o, kind: 'offer' })),
    ...coupons.map((c) => ({ ...c, kind: 'coupon', title: c.title || c.code })),
  ]
}

async function fetchStaffAndRoles() {
  const [users, roles] = await Promise.all([fetchUsers(), fetchRoles()])
  return [
    ...roles.map((r) => ({ id: `role-${r.id}`, kind: 'role', name: r.name, detail: r.description || '' })),
    ...users
      .filter((u) => u.role !== 'customer')
      .map((u) => ({ id: `user-${u.id}`, kind: 'staff', name: u.full_name, detail: `${u.email} · ${u.role}` })),
  ]
}

export function HotelsAdmin() {
  return (
    <AdminResourcePage
      title="Hotels"
      fetcher={fetchHotels}
      searchKeys={['name', 'city', 'address']}
      columns={[
        {
          key: 'cover',
          label: 'Photo',
          render: (r) =>
            r.cover_image_url ? (
              <img src={mediaUrl(r.cover_image_url)} alt="" className="h-10 w-14 rounded object-cover" />
            ) : (
              <span className="text-slate-400">—</span>
            ),
        },
        { key: 'name', label: 'Name' },
        { key: 'city', label: 'City' },
        { key: 'star_rating', label: 'Stars', render: (r) => (r.star_rating != null ? `${r.star_rating}★` : '—') },
        { key: 'amenities', label: 'Amenities', render: (r) => r.amenities || '—' },
        { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
      ]}
    />
  )
}

export function TransportAdmin() {
  return (
    <AdminResourcePage
      title="Transport"
      fetcher={fetchTransport}
      searchKeys={['name', 'service_type']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'service_type', label: 'Type' },
        { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
      ]}
    />
  )
}

export function BookingsAdmin() {
  return (
    <AdminResourcePage
      title="Bookings"
      fetcher={fetchBookings}
      searchKeys={['booking_code', 'status']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'booking_code', label: 'Code' },
        { key: 'user_id', label: 'User' },
        { key: 'status', label: 'Status' },
        { key: 'travelers', label: 'Travelers' },
        { key: 'total_amount', label: 'Total' },
      ]}
    />
  )
}

export function CustomersAdmin() {
  return (
    <AdminResourcePage
      title="Customers"
      description="User accounts (filter by role in a later phase)"
      fetcher={fetchUsers}
      searchKeys={['full_name', 'email', 'role', 'phone']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'role', label: 'Role' },
      ]}
    />
  )
}

export function EnquiriesAdmin() {
  return (
    <AdminResourcePage
      title="Enquiries"
      fetcher={fetchEnquiries}
      searchKeys={['name', 'email', 'subject', 'status']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'subject', label: 'Subject' },
        { key: 'status', label: 'Status' },
      ]}
    />
  )
}

export function QuotationsAdmin() {
  const money = (v) => (v != null && v !== '' ? `₹${Number(v).toLocaleString('en-IN')}` : '—')
  const tone = (s) => {
    const v = String(s || '').toLowerCase()
    if (v === 'accepted') return 'bg-emerald-50 text-emerald-700'
    if (v === 'sent') return 'bg-sky-50 text-sky-700'
    if (v === 'draft') return 'bg-amber-50 text-amber-700'
    if (v === 'rejected' || v === 'expired') return 'bg-rose-50 text-rose-700'
    return 'bg-slate-100 text-slate-600'
  }
  return (
    <AdminResourcePage
      title="Quotations"
      description="Trip quotes sent to customers. Sample rows are tagged SAMPLE-QT."
      fetcher={fetchQuotations}
      searchKeys={['quotation_code', 'title', 'status', 'details']}
      columns={[
        { key: 'quotation_code', label: 'Code' },
        { key: 'title', label: 'Title' },
        { key: 'enquiry_id', label: 'Enquiry', render: (r) => (r.enquiry_id ? `#${r.enquiry_id}` : '—') },
        { key: 'total_amount', label: 'Total', render: (r) => money(r.total_amount ?? r.amount) },
        {
          key: 'valid_until',
          label: 'Valid until',
          render: (r) => (r.valid_until ? String(r.valid_until).slice(0, 10) : '—'),
        },
        {
          key: 'status',
          label: 'Status',
          render: (r) => (
            <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${tone(r.status)}`}>{r.status}</span>
          ),
        },
      ]}
    />
  )
}

export function PaymentsAdmin() {
  return (
    <AdminResourcePage
      title="Payments"
      fetcher={fetchPayments}
      searchKeys={['transaction_ref', 'status', 'method']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'amount', label: 'Amount' },
        { key: 'status', label: 'Status' },
        { key: 'method', label: 'Method' },
        { key: 'transaction_ref', label: 'Reference' },
      ]}
    />
  )
}

export function OffersAdmin() {
  return (
    <AdminResourcePage
      title="Offers & Coupons"
      description="Offers and coupons from the marketing tables"
      fetcher={fetchOffersAndCoupons}
      searchKeys={['title', 'code', 'kind']}
      columns={[
        { key: 'kind', label: 'Type' },
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title' },
        { key: 'code', label: 'Code' },
        { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
      ]}
    />
  )
}

export function ReviewsAdmin() {
  return (
    <AdminResourcePage
      title="Reviews"
      fetcher={fetchReviews}
      searchKeys={['comment', 'rating']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'user_id', label: 'User ID' },
        { key: 'tour_id', label: 'Tour ID' },
        {
          key: 'rating',
          label: 'Rating',
          render: (r) => `${'★'.repeat(Number(r.rating) || 0)}${'☆'.repeat(Math.max(0, 5 - (Number(r.rating) || 0)))}`,
        },
        {
          key: 'comment',
          label: 'Comment',
          render: (r) => (
            <span className="line-clamp-2 max-w-md text-slate-700">{r.comment || '—'}</span>
          ),
        },
        { key: 'is_approved', label: 'Approved', render: (r) => (r.is_approved ? 'Yes' : 'Pending') },
      ]}
    />
  )
}

export function BannersAdmin() {
  return (
    <AdminResourcePage
      title="Banners"
      fetcher={fetchBanners}
      searchKeys={['title']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title' },
        { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
      ]}
    />
  )
}

export function BlogAdmin() {
  return (
    <AdminResourcePage
      title="Blog"
      fetcher={fetchBlogPosts}
      searchKeys={['title', 'slug', 'status']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title' },
        { key: 'slug', label: 'Slug' },
        { key: 'status', label: 'Status' },
      ]}
    />
  )
}

export function PagesAdmin() {
  return (
    <AdminResourcePage
      title="Pages"
      fetcher={fetchPages}
      searchKeys={['title', 'slug', 'status']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title' },
        { key: 'slug', label: 'Slug' },
        { key: 'status', label: 'Status' },
      ]}
    />
  )
}

export function NotificationsAdmin() {
  return (
    <AdminResourcePage
      title="Notifications"
      fetcher={fetchNotifications}
      searchKeys={['title', 'body', 'channel']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title' },
        { key: 'channel', label: 'Channel' },
        { key: 'is_read', label: 'Read', render: (r) => (r.is_read ? 'Yes' : 'No') },
      ]}
    />
  )
}

export function StaffAdmin() {
  return (
    <AdminResourcePage
      title="Staff & Roles"
      fetcher={fetchStaffAndRoles}
      searchKeys={['name', 'detail', 'kind']}
      columns={[
        { key: 'kind', label: 'Type' },
        { key: 'name', label: 'Name' },
        { key: 'detail', label: 'Detail' },
      ]}
    />
  )
}

export function GstAdmin() {
  return (
    <AdminResourcePage
      title="GST / Tax"
      description="GSTIN remains empty until a verified value is provided by the company."
      fetcher={fetchGstSettings}
      searchKeys={['name', 'gstin']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'gstin', label: 'GSTIN', render: (r) => r.gstin || '—' },
        { key: 'cgst_rate', label: 'CGST' },
        { key: 'sgst_rate', label: 'SGST' },
        { key: 'igst_rate', label: 'IGST' },
      ]}
    />
  )
}

export function SettingsAdmin() {
  return (
    <AdminResourcePage
      title="Settings"
      fetcher={fetchSettings}
      searchKeys={['key', 'label', 'value']}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'key', label: 'Key' },
        { key: 'label', label: 'Label' },
        { key: 'value', label: 'Value' },
      ]}
    />
  )
}
