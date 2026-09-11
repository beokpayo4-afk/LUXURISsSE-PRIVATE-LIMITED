/** Distance-based local ticket fare from Raipur — clamped ₹100–₹1000. */

export const TICKET_FARE_MIN = 100
export const TICKET_FARE_MAX = 1000
export const BASE_CITY = 'Raipur'

/** Approximate road distance (km) from Raipur. */
export const DISTANCE_DESTINATIONS = [
  { id: 'raipur', name: 'Raipur City', km: 0 },
  { id: 'bhilai', name: 'Bhilai', km: 25 },
  { id: 'durg', name: 'Durg', km: 40 },
  { id: 'bilaspur', name: 'Bilaspur', km: 115 },
  { id: 'rajnandgaon', name: 'Rajnandgaon', km: 70 },
  { id: 'jagdalpur', name: 'Jagdalpur', km: 290 },
  { id: 'mainpat', name: 'Mainpat', km: 350 },
  { id: 'nagpur', name: 'Nagpur', km: 280 },
  { id: 'bhubaneswar', name: 'Bhubaneswar', km: 520 },
  { id: 'kolkata', name: 'Kolkata', km: 920 },
  { id: 'mumbai', name: 'Mumbai', km: 1020 },
  { id: 'delhi', name: 'Delhi', km: 1210 },
  { id: 'goa', name: 'Goa', km: 1180 },
].sort((a, b) => a.km - b.km)

const MAX_KM = Math.max(...DISTANCE_DESTINATIONS.map((d) => d.km), 1)

/** Map distance to fare: 0 km → ₹100, farthest → ₹1000. */
export function fareForDistanceKm(km) {
  const distance = Math.max(0, Number(km) || 0)
  const ratio = Math.min(1, distance / MAX_KM)
  const raw = TICKET_FARE_MIN + ratio * (TICKET_FARE_MAX - TICKET_FARE_MIN)
  return clampFare(Math.round(raw))
}

export function clampFare(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return TICKET_FARE_MIN
  return Math.min(TICKET_FARE_MAX, Math.max(TICKET_FARE_MIN, Math.round(n)))
}

export function formatInr(value) {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
