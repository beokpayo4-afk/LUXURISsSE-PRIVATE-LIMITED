import api from './client'

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload)
  return data
}

export async function login(payload) {
  const { data } = await api.post('/auth/login', payload)
  return data
}

export async function logout(refreshToken) {
  const { data } = await api.post('/auth/logout', { refresh_token: refreshToken || null })
  return data
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function fetchPublicSettings() {
  const { data } = await api.get('/settings/public')
  return data
}

export async function fetchReportSummary() {
  const { data } = await api.get('/reports/summary')
  return data
}

export async function fetchDashboard() {
  const { data } = await api.get('/reports/dashboard')
  return data
}

export async function fetchMyBookings() {
  const { data } = await api.get('/bookings/my')
  return data
}

export async function createBooking(payload) {
  const { data } = await api.post('/bookings', payload)
  return data
}

export async function createPayment(payload) {
  const { data } = await api.post('/payments', payload)
  return data
}

export async function submitEnquiry(payload) {
  const { data } = await api.post('/enquiries', payload)
  return data
}

export async function fetchDestinations(params = {}) {
  const { data } = await api.get('/destinations', { params })
  return data
}

export async function fetchAdminDestinations() {
  const { data } = await api.get('/destinations/admin')
  return data
}

export async function fetchDestination(id) {
  const { data } = await api.get(`/destinations/${id}`)
  return data
}

export async function createDestination(payload) {
  const { data } = await api.post('/destinations', payload)
  return data
}

export async function updateDestination(id, payload) {
  const { data } = await api.put(`/destinations/${id}`, payload)
  return data
}

export async function deleteDestination(id) {
  await api.delete(`/destinations/${id}`)
}

export async function publishDestination(id) {
  const { data } = await api.post(`/destinations/${id}/publish`)
  return data
}

export async function unpublishDestination(id) {
  const { data } = await api.post(`/destinations/${id}/unpublish`)
  return data
}

export async function setDestinationFeatured(id, isFeatured) {
  const { data } = await api.patch(`/destinations/${id}/featured`, { is_featured: isFeatured })
  return data
}

export async function uploadDestinationImages(id, files, setCoverFirst = true) {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  form.append('set_cover_first', String(setCoverFirst))
  const { data } = await api.post(`/destinations/${id}/images`, form, {
    headers: { 'Content-Type': undefined },
  })
  return data
}

export async function deleteDestinationImage(destinationId, imageId) {
  const { data } = await api.delete(`/destinations/${destinationId}/images/${imageId}`)
  return data
}

export async function fetchTours(params = {}) {
  const { data } = await api.get('/tours', { params })
  return data
}

export async function fetchAdminTours() {
  const { data } = await api.get('/tours/admin')
  return data
}

export async function fetchTour(id) {
  const { data } = await api.get(`/tours/${id}`)
  return data
}

export async function createTour(payload) {
  const { data } = await api.post('/tours', payload)
  return data
}

export async function updateTour(id, payload) {
  const { data } = await api.put(`/tours/${id}`, payload)
  return data
}

export async function deleteTour(id) {
  await api.delete(`/tours/${id}`)
}

export async function publishTour(id) {
  const { data } = await api.post(`/tours/${id}/publish`)
  return data
}

export async function unpublishTour(id) {
  const { data } = await api.post(`/tours/${id}/unpublish`)
  return data
}

export async function setTourFeatured(id, isFeatured) {
  const { data } = await api.patch(`/tours/${id}/featured`, { is_featured: isFeatured })
  return data
}

export async function updateTourPricing(id, payload) {
  const { data } = await api.patch(`/tours/${id}/pricing`, payload)
  return data
}

export async function uploadTourImages(id, files, setCoverFirst = true) {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  form.append('set_cover_first', String(setCoverFirst))
  const { data } = await api.post(`/tours/${id}/images`, form, {
    headers: { 'Content-Type': undefined },
  })
  return data
}

export async function deleteTourImage(tourId, imageId) {
  const { data } = await api.delete(`/tours/${tourId}/images/${imageId}`)
  return data
}

export async function fetchCategories() {
  const { data } = await api.get('/categories')
  return data
}

export async function createCategory(payload) {
  const { data } = await api.post('/categories', payload)
  return data
}

export async function fetchHotels() {
  const { data } = await api.get('/hotels')
  return data
}

export async function fetchTransport() {
  const { data } = await api.get('/transport')
  return data
}

export async function createTransport(payload) {
  const { data } = await api.post('/transport', payload)
  return data
}

export async function updateTransportPricing(id, payload) {
  const { data } = await api.patch(`/transport/${id}`, payload)
  return data
}

export async function fetchTickets(params = {}) {
  const { data } = await api.get('/tickets', { params })
  return data
}

export async function fetchTicket(id) {
  const { data } = await api.get(`/tickets/${id}`)
  return data
}

export async function createTicket(payload) {
  const { data } = await api.post('/tickets', payload)
  return data
}

export async function updateTicket(id, payload) {
  const { data } = await api.put(`/tickets/${id}`, payload)
  return data
}

export async function deleteTicket(id) {
  await api.delete(`/tickets/${id}`)
}

export async function fetchBookings() {
  const { data } = await api.get('/bookings')
  return data
}

export async function fetchUsers() {
  const { data } = await api.get('/users')
  return data
}

export async function fetchEnquiries() {
  const { data } = await api.get('/enquiries')
  return data
}

export async function fetchQuotations() {
  const { data } = await api.get('/quotations')
  return data
}

export async function fetchPayments() {
  const { data } = await api.get('/payments')
  return data
}

export async function fetchOffers() {
  const { data } = await api.get('/offers')
  return data
}

export async function fetchCoupons() {
  const { data } = await api.get('/coupons')
  return data
}

export async function fetchReviews() {
  const { data } = await api.get('/reviews')
  return data
}

export async function fetchGalleries() {
  const { data } = await api.get('/galleries')
  return data
}

export async function fetchGalleryStats() {
  const { data } = await api.get('/galleries/stats')
  return data
}

export async function uploadGalleryImage({
  file,
  title,
  description,
  category = 'Destinations',
  album,
  destinationId,
  isFeatured = false,
  isActive = true,
}) {
  const form = new FormData()
  form.append('file', file)
  form.append('title', title)
  if (description) form.append('description', description)
  form.append('category', category)
  if (album) form.append('album', album)
  if (destinationId != null) form.append('destination_id', String(destinationId))
  form.append('is_featured', String(isFeatured))
  form.append('is_active', String(isActive))
  const { data } = await api.post('/galleries/upload', form, {
    headers: { 'Content-Type': undefined },
  })
  return data
}

export async function updateGalleryImage(id, payload) {
  const { data } = await api.put(`/galleries/${id}`, payload)
  return data
}

export async function setGalleryFeatured(id, isFeatured) {
  const { data } = await api.patch(`/galleries/${id}/featured`, { is_featured: isFeatured })
  return data
}

export async function setGalleryActive(id, isActive) {
  const { data } = await api.patch(`/galleries/${id}/active`, { is_active: isActive })
  return data
}

export async function deleteGalleryImage(id) {
  await api.delete(`/galleries/${id}`)
}

export async function fetchBanners() {
  const { data } = await api.get('/banners')
  return data
}

export async function fetchBlogPosts() {
  const { data } = await api.get('/blog')
  return data
}

export async function fetchPages() {
  const { data } = await api.get('/pages')
  return data
}

export async function fetchNotifications() {
  const { data } = await api.get('/notifications')
  return data
}

export async function fetchRoles() {
  const { data } = await api.get('/roles')
  return data
}

export async function fetchGstSettings() {
  const { data } = await api.get('/gst')
  return data
}

export async function fetchSettings() {
  const { data } = await api.get('/settings')
  return data
}
