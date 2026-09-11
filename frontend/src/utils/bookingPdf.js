import { jsPDF } from 'jspdf'
import { COMPANY } from '../constants/company'
import { formatTourPrice } from './tours'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(value)
  }
}

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

function bookingKind(booking) {
  if (booking.displayType) return booking.displayType
  const notes = String(booking.notes || '').toLowerCase()
  if (notes.includes('ticket') || notes.includes('custom')) return 'Ticket'
  return 'Tour package'
}

function bookingTitle(booking) {
  if (booking.displayTitle) return booking.displayTitle
  if (booking.notes) {
    const line = String(booking.notes).split('\n')[0]
    return line.length > 90 ? `${line.slice(0, 87)}…` : line
  }
  return bookingKind(booking)
}

/**
 * Generate and download a booking confirmation PDF.
 * @param {object} booking - API booking row, optionally with displayTitle/displayType/displayMeta
 * @param {object} customer - { full_name, email, phone }
 */
export function downloadBookingPdf(booking, customer = {}) {
  if (!booking?.booking_code) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18
  let y = 20

  const addLine = (text, size = 11, style = 'normal', color = [30, 41, 59]) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(text), pageW - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * (size * 0.42) + 2
  }

  const addLabelValue = (label, value) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120, 113, 108)
    doc.text(label, margin, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    const lines = doc.splitTextToSize(String(value || '—'), pageW - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 5 + 4
  }

  // Header bar
  doc.setFillColor(6, 78, 59)
  doc.rect(0, 0, pageW, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(COMPANY.shortName, margin, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Tours, transfers & experiences', margin, 20)
  doc.setFontSize(8)
  doc.text(COMPANY.name, margin, 26)

  y = 42
  addLine('Booking confirmation', 16, 'bold', [6, 78, 59])
  addLine('Download this voucher for your records. Pending until confirmed by our team.', 10, 'normal', [100, 116, 139])

  y += 2
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  addLabelValue('Booking code', booking.booking_code)
  addLabelValue('Status', String(booking.status || 'pending').replace(/_/g, ' '))
  addLabelValue('Type', bookingKind(booking))
  addLabelValue('Details', bookingTitle(booking))

  if (booking.displayMeta) {
    addLabelValue('Route / package', booking.displayMeta)
  }

  if (customer.full_name || customer.email) {
    addLabelValue(
      'Booked by',
      [customer.full_name, customer.email, customer.phone].filter(Boolean).join(' · ')
    )
  }

  addLabelValue('Travel date', formatDate(booking.travel_date))
  addLabelValue('Travellers', booking.travelers ?? 1)

  if (booking.total_amount != null) {
    if (booking.subtotal_amount != null || booking.tax_amount != null) {
      if (booking.subtotal_amount != null) {
        addLabelValue('Fare (subtotal)', formatTourPrice(booking.subtotal_amount))
      }
      if (booking.tax_amount != null) {
        addLabelValue('GST (5%)', formatTourPrice(booking.tax_amount))
      }
      addLabelValue('Total payable', formatTourPrice(booking.total_amount))
    } else {
      addLabelValue('Amount', formatTourPrice(booking.total_amount))
    }
  }

  if (booking.notes && !booking.displayTitle) {
    addLabelValue('Notes', booking.notes)
  }

  addLabelValue('Booked on', formatDateTime(booking.created_at))

  y += 4
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  addLine(COMPANY.address, 9, 'normal', [100, 116, 139])
  addLine(`${COMPANY.email} · ${COMPANY.phone}`, 9, 'normal', [100, 116, 139])
  addLine(`MD: ${COMPANY.managingDirector} · Director: ${COMPANY.director}`, 8, 'normal', [148, 163, 184])

  y += 6
  addLine(
    'This PDF is your booking request receipt. Luxurisse will contact you to confirm final details and payment.',
    8,
    'italic',
    [148, 163, 184]
  )

  const safeCode = String(booking.booking_code).replace(/[^\w-]+/g, '_')
  doc.save(`Luxurisse-Booking-${safeCode}.pdf`)
}

/**
 * Download one PDF containing all bookings (multi-item checkout).
 */
export function downloadBookingsPdf(bookings, customer = {}) {
  if (!Array.isArray(bookings) || bookings.length === 0) return
  if (bookings.length === 1) {
    downloadBookingPdf(bookings[0], customer)
    return
  }

  bookings.forEach((booking, index) => {
    setTimeout(() => {
      downloadBookingPdf(booking, customer)
    }, index * 400)
  })
}
