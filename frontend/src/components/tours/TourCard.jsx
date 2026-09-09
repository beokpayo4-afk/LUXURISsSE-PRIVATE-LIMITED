import { Link } from 'react-router-dom'
import { mediaUrl } from '../../utils/media'
import { formatTourPrice, tourMetaLine } from '../../utils/tours'

export default function TourCard({ tour, variant = 'light' }) {
  const price = formatTourPrice(tour.starting_price)
  const isDark = variant === 'dark'
  const detailPath = `/tours/${tour.id}`

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition hover:shadow-lg ${
        isDark
          ? 'border-white/10 bg-emerald-900/40'
          : 'border-stone-200/80 bg-[#faf8f5]'
      }`}
    >
      <Link to={detailPath} className="relative block aspect-[4/3] overflow-hidden">
        {tour.cover_image_url ? (
          <img
            src={mediaUrl(tour.cover_image_url)}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-emerald-800 to-amber-900" />
        )}
        <span className="absolute left-3 top-3 rounded-md bg-slate-900/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white sm:left-4 sm:top-4 sm:px-3 sm:text-[11px]">
          Free cancellation
        </span>
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-white/95 px-4 py-3 text-sm font-medium text-slate-800 transition duration-300 group-hover:translate-y-0">
          View trip →
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {tour.category_name && (
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] sm:text-xs ${
              isDark ? 'text-amber-300' : 'text-amber-700'
            }`}
          >
            {tour.category_name}
          </p>
        )}
        <Link to={detailPath}>
          <h3
            className={`mt-2 font-serif text-lg leading-snug transition sm:text-xl ${
              isDark
                ? 'text-white group-hover:text-amber-200'
                : 'text-slate-900 group-hover:text-emerald-900'
            }`}
          >
            {tour.title}
          </h3>
        </Link>
        <p
          className={`mt-2 line-clamp-2 flex-1 text-sm leading-relaxed ${
            isDark ? 'text-stone-400' : 'text-stone-500'
          }`}
        >
          {tourMetaLine(tour)}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-200/60 pt-4">
          <div>
            {price ? (
              <p className={`text-xl font-bold sm:text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {price}
              </p>
            ) : (
              <p className={`text-sm ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>Price on enquiry</p>
            )}
          </div>
          <Link
            to={`/booking?tour=${tour.id}&travelers=1`}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              isDark
                ? 'bg-amber-400 text-slate-900 hover:bg-amber-300'
                : 'bg-emerald-950 text-white hover:bg-emerald-900'
            }`}
          >
            Book now
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </article>
  )
}
