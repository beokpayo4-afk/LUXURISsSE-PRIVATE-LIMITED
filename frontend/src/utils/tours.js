export function formatTourPrice(value) {
  if (value == null || value === '') return null
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function tourMetaLine(tour) {
  const place = tour.destination_name || 'India'
  const type = tour.category_name || 'Tour package'
  const days =
    tour.duration_days != null
      ? `${tour.duration_days} day${tour.duration_days === 1 ? '' : 's'}`
      : null
  const lead = [place, type].filter(Boolean).join(' · ')
  const tail = tour.summary || (days ? `${days} itinerary` : '')
  return tail ? `${lead} — ${tail}` : lead
}

export function tourDurationLabel(tour) {
  const days = tour.duration_days
  const nights = tour.duration_nights
  if (days == null && nights == null) return 'Flexible duration'
  if (nights != null && nights > 0) return `${days}D / ${nights}N`
  if (days != null) return `${days} day${days === 1 ? '' : 's'}`
  return 'Tour package'
}
