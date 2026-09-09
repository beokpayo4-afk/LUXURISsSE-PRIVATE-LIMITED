import { downloadBookingPdf } from '../../utils/bookingPdf'

export default function DownloadBookingPdfButton({
  booking,
  customer,
  label = 'Download PDF',
  className = '',
}) {
  if (!booking?.booking_code) return null

  return (
    <button
      type="button"
      onClick={() => downloadBookingPdf(booking, customer)}
      className={
        className ||
        'inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-stone-50'
      }
    >
      ↓ {label}
    </button>
  )
}
