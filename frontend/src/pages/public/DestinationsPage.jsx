import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDestinations } from '../../api'
import { mediaUrl } from '../../utils/media'

export default function DestinationsPage() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDestinations({ published_only: true })
      .then(setItems)
      .catch(() => setError('Unable to load destinations. Is the API running?'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      <section className="border-b border-stone-200/80 bg-white/60">
        <div className="w-full px-4 py-12 sm:px-6 lg:px-10 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            Luxurisse · Destinations
          </p>
          <h1 className="mt-2 font-serif text-4xl text-slate-900 sm:text-5xl lg:text-6xl">Destinations</h1>
          <p className="mt-3 max-w-3xl text-lg text-stone-600 sm:text-xl">
            Explore places we plan journeys around — pick a destination to see tours and experiences.
          </p>
        </div>
      </section>

      <section className="w-full px-4 py-12 sm:px-6 lg:px-10 sm:py-16">
        {loading && <p className="text-lg text-stone-500">Loading…</p>}
        {error && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-base text-amber-800">{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="text-lg text-stone-500">No destinations published yet.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => (
            <Link
              key={d.id}
              to={`/destinations/${d.id}`}
              className="group relative block min-h-[320px] overflow-hidden rounded-2xl sm:min-h-[380px] lg:min-h-[420px]"
            >
              {d.cover_image_url ? (
                <img
                  src={mediaUrl(d.cover_image_url)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-amber-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="font-serif text-3xl text-white sm:text-4xl">{d.name}</p>
                <p className="mt-2 text-base text-stone-300 sm:text-lg">
                  {[d.city_name, d.state, d.country].filter(Boolean).join(' · ') || 'India'}
                </p>
                {d.tour_count > 0 && (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                    {d.tour_count} {d.tour_count === 1 ? 'experience' : 'experiences'}
                  </p>
                )}
                {d.summary && (
                  <p className="mt-2 line-clamp-2 text-sm text-stone-400 sm:text-base">{d.summary}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
