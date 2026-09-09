import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDestinations, fetchTours } from '../../api'
import TourCard from '../../components/tours/TourCard'
import { mediaUrl } from '../../utils/media'

export default function ExplorePage() {
  const [destinations, setDestinations] = useState([])
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchDestinations({ published_only: true }).catch(() => []),
      fetchTours({ published_only: true }).catch(() => []),
    ])
      .then(([destRows, tourRows]) => {
        if (cancelled) return
        setDestinations(Array.isArray(destRows) ? destRows : [])
        setTours(Array.isArray(tourRows) ? tourRows : [])
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load catalogue.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const popularDestinations = useMemo(() => {
    return [...destinations]
      .sort((a, b) => {
        const score = (d) => (d.is_featured ? 2 : 0) + (d.is_popular ? 1 : 0)
        return score(b) - score(a) || String(a.name).localeCompare(String(b.name))
      })
      .slice(0, 6)
  }, [destinations])

  const featuredTours = useMemo(() => {
    return [...tours]
      .sort((a, b) => {
        const score = (t) => (t.is_featured ? 2 : 0) + (t.starting_price != null ? 1 : 0)
        return score(b) - score(a) || String(a.title).localeCompare(String(b.title))
      })
      .slice(0, 6)
  }, [tours])

  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      <section className="border-b border-stone-200/80 bg-white/60">
        <div className="w-full px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            Tours & Destinations
          </p>
          <h1 className="mt-2 font-serif text-4xl text-slate-900 sm:text-5xl lg:text-6xl">All</h1>
          <p className="mt-3 max-w-3xl text-lg text-stone-600 sm:text-xl">
            Browse destinations and tour packages in one place.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-950 px-4 py-2 text-sm font-medium text-white">All</span>
            <Link
              to="/destinations"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-stone-200 hover:bg-stone-50"
            >
              Destinations
            </Link>
            <Link
              to="/tours"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-stone-200 hover:bg-stone-50"
            >
              Tours
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
        {loading && <p className="text-lg text-stone-500">Loading…</p>}
        {error && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl text-slate-900 sm:text-4xl">Destinations</h2>
                <p className="mt-2 text-stone-600">{destinations.length} published places</p>
              </div>
              <Link to="/destinations" className="text-sm font-medium text-amber-800 hover:underline">
                View all destinations
              </Link>
            </div>

            {popularDestinations.length === 0 ? (
              <p className="mt-6 text-stone-500">No destinations published yet.</p>
            ) : (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {popularDestinations.map((d) => (
                  <Link
                    key={d.id}
                    to={`/destinations/${d.id}`}
                    className="group relative block min-h-[280px] overflow-hidden rounded-2xl"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="font-serif text-2xl text-white sm:text-3xl">{d.name}</p>
                      <p className="mt-1 text-sm text-stone-300">
                        {[d.city_name, d.state].filter(Boolean).join(' · ') || 'India'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-16 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl text-slate-900 sm:text-4xl">Tours</h2>
                <p className="mt-2 text-stone-600">{tours.length} published packages</p>
              </div>
              <Link to="/tours" className="text-sm font-medium text-amber-800 hover:underline">
                View all tours
              </Link>
            </div>

            {featuredTours.length === 0 ? (
              <p className="mt-6 text-stone-500">No tours published yet.</p>
            ) : (
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {featuredTours.map((t) => (
                  <li key={t.id}>
                    <TourCard tour={t} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  )
}
