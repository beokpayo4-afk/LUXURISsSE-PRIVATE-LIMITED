import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/layouts/AdminLayout'
import CustomerLayout from './components/layouts/CustomerLayout'
import PublicLayout from './components/layouts/PublicLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import {
  BannersAdmin,
  BlogAdmin,
  BookingsAdmin,
  CustomersAdmin,
  EnquiriesAdmin,
  GstAdmin,
  HotelsAdmin,
  NotificationsAdmin,
  OffersAdmin,
  PagesAdmin,
  PaymentsAdmin,
  QuotationsAdmin,
  ReviewsAdmin,
  SettingsAdmin,
  StaffAdmin,
} from './pages/admin/AdminModules'
import CategoriesAdminPage from './pages/admin/CategoriesAdminPage'
import DestinationFormPage from './pages/admin/DestinationFormPage'
import DestinationsAdminPage from './pages/admin/DestinationsAdminPage'
import GalleryAdminPage from './pages/admin/GalleryAdminPage'
import ReportsPage from './pages/admin/ReportsPage'
import TourFormPage from './pages/admin/TourFormPage'
import ToursAdminPage from './pages/admin/ToursAdminPage'
import TicketsAdminPage from './pages/admin/TicketsAdminPage'
import TransportAdminPage from './pages/admin/TransportAdminPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import CustomerBookings from './pages/customer/CustomerBookings'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import CustomerEnquiries from './pages/customer/CustomerEnquiries'
import CartPage from './pages/public/CartPage'
import BookingCheckoutPage from './pages/public/BookingCheckoutPage'
import ContactPage from './pages/public/ContactPage'
import DestinationDetailPage from './pages/public/DestinationDetailPage'
import DestinationsPage from './pages/public/DestinationsPage'
import ExplorePage from './pages/public/ExplorePage'
import TicketsPage from './pages/public/TicketsPage'
import HomePage from './pages/public/HomePage'
import ToursPage from './pages/public/ToursPage'
import TourDetailPage from './pages/public/TourDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="destinations" element={<DestinationsPage />} />
          <Route path="destinations/:id" element={<DestinationDetailPage />} />
          <Route path="tours" element={<ToursPage />} />
          <Route path="tours/:id" element={<TourDetailPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="group-tickets" element={<Navigate to="/tickets" replace />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="cart" element={<CartPage />} />
            <Route path="booking" element={<BookingCheckoutPage />} />
            <Route path="dashboard" element={<CustomerLayout />}>
              <Route index element={<CustomerDashboard />} />
              <Route path="bookings" element={<CustomerBookings />} />
              <Route path="enquiries" element={<CustomerEnquiries />} />
            </Route>
          </Route>
        </Route>

        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="tours" element={<ToursAdminPage />} />
            <Route path="tours/new" element={<TourFormPage />} />
            <Route path="tours/:id" element={<TourFormPage />} />
            <Route path="destinations" element={<DestinationsAdminPage />} />
            <Route path="destinations/new" element={<DestinationFormPage />} />
            <Route path="destinations/:id" element={<DestinationFormPage />} />
            <Route path="categories" element={<CategoriesAdminPage />} />
            <Route path="hotels" element={<HotelsAdmin />} />
            <Route path="transport" element={<TransportAdminPage />} />
            <Route path="tickets" element={<TicketsAdminPage />} />
            <Route path="bookings" element={<BookingsAdmin />} />
            <Route path="customers" element={<CustomersAdmin />} />
            <Route path="enquiries" element={<EnquiriesAdmin />} />
            <Route path="quotations" element={<QuotationsAdmin />} />
            <Route path="payments" element={<PaymentsAdmin />} />
            <Route path="offers" element={<OffersAdmin />} />
            <Route path="reviews" element={<ReviewsAdmin />} />
            <Route path="gallery" element={<GalleryAdminPage />} />
            <Route path="banners" element={<BannersAdmin />} />
            <Route path="blog" element={<BlogAdmin />} />
            <Route path="pages" element={<PagesAdmin />} />
            <Route path="notifications" element={<NotificationsAdmin />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="staff" element={<StaffAdmin />} />
            <Route path="gst" element={<GstAdmin />} />
            <Route path="settings" element={<SettingsAdmin />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
