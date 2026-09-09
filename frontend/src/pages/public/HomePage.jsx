import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDestinations, fetchTours } from '../../api'
import TourCard from '../../components/tours/TourCard'
import { COMPANY } from '../../constants/company'
import { mediaUrl } from '../../utils/media'

export default function HomePage() {
  const [destinations, setDestinations] = useState([])
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)

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
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const popularDestinations = useMemo(() => {
    const ranked = [...destinations].sort((a, b) => {
      const score = (d) => (d.is_featured ? 2 : 0) + (d.is_popular ? 1 : 0)
      return score(b) - score(a) || String(a.name).localeCompare(String(b.name))
    })
    return ranked.slice(0, 6)
  }, [destinations])

  const localPackages = useMemo(() => {
    const local = tours.filter(
      (t) =>
        t.category_name === 'Local Tours' ||
        String(t.code || '').startsWith('LX-LOC-')
    )
    const ranked = [...local].sort((a, b) => {
      const score = (t) => (t.is_featured ? 2 : 0) + (t.starting_price != null ? 1 : 0)
      return score(b) - score(a) || String(a.title).localeCompare(String(b.title))
    })
    return ranked.slice(0, 6)
  }, [tours])

  const featuredTours = useMemo(() => {
    const ranked = [...tours]
      .filter(
        (t) =>
          t.category_name !== 'Local Tours' &&
          !String(t.code || '').startsWith('LX-LOC-')
      )
      .sort((a, b) => {
        const score = (t) => (t.is_featured ? 2 : 0) + (t.starting_price != null ? 1 : 0)
        return score(b) - score(a) || String(a.title).localeCompare(String(b.title))
      })
    return ranked.slice(0, 6)
  }, [tours])

  return (
    <div className="bg-[#f7f4ef] text-slate-900">
      <section className="relative min-h-screen w-full overflow-hidden text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              popularDestinations[0]?.cover_image_url
                ? `url(${mediaUrl(popularDestinations[0].cover_image_url)})`
                : undefined,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/75 to-amber-950/70" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_15%_20%,rgba(245,158,11,0.45),transparent_42%),radial-gradient(circle_at_85%_10%,rgba(56,189,248,0.25),transparent_36%)]" />
        <div className="relative flex min-h-screen w-full flex-col justify-end px-4 pb-20 pt-32 sm:px-6 lg:px-10 sm:pb-24">
          <p className="font-serif text-5xl leading-tight tracking-tight sm:text-6xl lg:text-8xl xl:text-9xl">{COMPANY.name}</p>
          <p className="mt-6 max-w-3xl text-xl text-stone-200 sm:text-2xl lg:text-3xl">
            Tour and travel planning from Raipur — curated journeys with personal attention.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/tours"
              className="rounded-lg bg-amber-500 px-7 py-3.5 text-base font-semibold text-slate-900 hover:bg-amber-400"
            >
              Explore tours
            </Link>
            <Link
              to="/destinations"
              className="rounded-lg border border-white/35 px-7 py-3.5 text-base font-semibold hover:bg-white/10"
            >
              Popular destinations
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full px-4 py-16 sm:px-6 lg:px-10 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl">Popular Destinations</h2>
            <p className="mt-3 text-lg text-stone-600 sm:text-xl lg:text-2xl">
              Places we plan journeys around — from Chhattisgarh to across India.
            </p>
          </div>
          <Link to="/destinations" className="text-base font-medium text-amber-800 hover:underline">
            View all destinations
          </Link>
        </div>

        {loading && <p className="mt-12 text-lg text-stone-500">Loading destinations…</p>}
        {!loading && popularDestinations.length === 0 && (
          <p className="mt-12 text-lg text-stone-500">Destinations will appear here once published.</p>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularDestinations.map((d) => (
            <Link
              key={d.id}
              to={`/destinations/${d.id}`}
              className="group relative block min-h-[320px] overflow-hidden sm:min-h-[380px] lg:min-h-[440px] xl:min-h-[500px]"
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
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="font-serif text-3xl text-white sm:text-4xl">{d.name}</p>
                <p className="mt-2 text-base text-stone-300 sm:text-lg">
                  {[d.city_name, d.state].filter(Boolean).join(' · ') || 'India'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="w-full border-y border-stone-200/80 bg-emerald-950 text-white">
        <div className="w-full px-4 py-16 sm:px-6 lg:px-10 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400">From Raipur</p>
              <h2 className="mt-2 font-serif text-4xl sm:text-5xl lg:text-6xl">Local Packages</h2>
              <p className="mt-3 text-lg text-stone-300 sm:text-xl lg:text-2xl">
                Chhattisgarh tours — Raipur, Bastar, Chitrakote, Mainpat and more.
              </p>
            </div>
            <Link to="/tours" className="text-base font-medium text-amber-300 hover:underline">
              View all local tours
            </Link>
          </div>

          {loading && <p className="mt-12 text-lg text-stone-400">Loading local packages…</p>}
          {!loading && localPackages.length === 0 && (
            <p className="mt-12 text-lg text-stone-400">Local packages will appear here once published.</p>
          )}

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {localPackages.map((t) => (
              <li key={t.id}>
                <TourCard tour={t} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="w-full border-y border-stone-200/80 bg-white/70">
        <div className="w-full px-4 py-16 sm:px-6 lg:px-10 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl">Featured Tours</h2>
              <p className="mt-3 text-lg text-stone-600 sm:text-xl lg:text-2xl">
                Published packages from our catalogue with starting prices.
              </p>
            </div>
            <Link to="/tours" className="text-base font-medium text-amber-800 hover:underline">
              View all tours
            </Link>
          </div>

          {loading && <p className="mt-12 text-lg text-stone-500">Loading tours…</p>}
          {!loading && featuredTours.length === 0 && (
            <p className="mt-12 text-lg text-stone-500">Tour packages will appear here once published.</p>
          )}

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTours.map((t) => (
              <li key={t.id}>
                <TourCard tour={t} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="w-full px-4 py-16 sm:px-6 lg:px-10 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl">Plan your next journey</h2>
            <p className="mt-4 text-lg text-stone-600 sm:text-xl lg:text-2xl">
              Share your dates and preferences — we will help shape the itinerary from Raipur.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 lg:justify-end">
            <Link
              to="/contact"
              className="rounded-lg bg-slate-900 px-7 py-3.5 text-base font-semibold text-white hover:bg-slate-800"
            >
              Send enquiry
            </Link>
            <a
              href={`tel:${COMPANY.phone}`}
              className="rounded-lg border border-stone-300 px-7 py-3.5 text-base font-semibold text-slate-800 hover:bg-white"
            >
              Call {COMPANY.phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
