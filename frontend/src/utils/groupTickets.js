/** Group ticket pricing — size 100–1000 scales linearly with indicative fare. */

export const TICKET_MIN = 100
export const TICKET_MAX = 1000
export const TICKET_PRESETS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

export const BASE_CITY = 'Raipur'

/** Approximate road distance (km) from Raipur for indicative group-ticket sizing. */
export const GROUP_TICKET_DESTINATIONS = [
  { id: 'raipur', name: 'Raipur City', km: 0 },
  { id: 'bhilai', name: 'Bhilai', km: 25 },
  { id: 'durg', name: 'Durg', km: 40 },
  { id: 'bilaspur', name: 'Bilaspur', km: 115 },
  { id: 'jagdalpur', name: 'Jagdalpur', km: 290 },
  { id: 'mainpat', name: 'Mainpat', km: 350 },
  { id: 'nagpur', name: 'Nagpur', km: 280 },
  { id: 'bhubaneswar', name: 'Bhubaneswar', km: 520 },
  { id: 'kolkata', name: 'Kolkata', km: 920 },
  { id: 'mumbai', name: 'Mumbai', km: 1020 },
  { id: 'delhi', name: 'Delhi', km: 1210 },
  { id: 'goa', name: 'Goa', km: 1180 },
].sort((a, b) => a.km - b.km)

export function ticketPrice(ticketSize) {
  const size = clampTicketSize(ticketSize)
  return Math.round(size * 15)
}

export function clampTicketSize(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return TICKET_MIN
  return Math.min(TICKET_MAX, Math.max(TICKET_MIN, Math.round(n)))
}

export function formatInr(value) {
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
