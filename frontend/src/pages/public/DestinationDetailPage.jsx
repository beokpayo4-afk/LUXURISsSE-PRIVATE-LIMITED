import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchDestination, fetchTours } from '../../api'
import TourCard from '../../components/tours/TourCard'
import { mediaUrl } from '../../utils/media'

function destinationCover(destination) {
  if (!destination) return null
  const cover = destination.images?.find((img) => img.is_cover)
  return cover?.image_url || destination.images?.[0]?.image_url || null
}

function locationLine(destination) {
  return [destination?.city_name, destination?.state, destination?.country].filter(Boolean).join(' · ')
}

export default function DestinationDetailPage() {
  const { id } = useParams()
  const [destination, setDestination] = useState(null)
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    Promise.all([fetchDestination(id), fetchTours({ published_only: true })])
      .then(([dest, tourRows]) => {
        if (cancelled) return
        setDestination(dest)
        const published = (Array.isArray(tourRows) ? tourRows : []).filter(
          (t) => Number(t.destination_id) === Number(dest.id)
        )
        setTours(published)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this destination.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const cover = useMemo(() => destinationCover(destination), [destination])
  const location = useMemo(() => locationLine(destination), [destination])
  const subtitle =
    destination?.summary ||
    (location ? `${location} — handpicked tours, transfers and experiences.` : 'Handpicked tours, transfers and experiences.')

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ef] px-4 py-20 text-center text-lg text-stone-500">
        Loading destination…
      </div>
    )
  }

  if (error || !destination) {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ef] px-4 py-20 text-center">
        <p className="text-stone-600">{error || 'Destination not found.'}</p>
        <Link to="/destinations" className="mt-4 inline-block text-amber-800 underline">
          Back to destinations
        </Link>
      </div>
    )
  }

  if (!destination.is_published) {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ef] px-4 py-20 text-center">
        <p className="text-stone-600">This destination is not published yet.</p>
        <Link to="/destinations" className="mt-4 inline-block text-amber-800 underline">
          Browse destinations
        </Link>
      </div>
    )
  }

  const name = destination.name

  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={cover ? { backgroundImage: `url(${mediaUrl(cover)})` } : undefined}
        />
        {!cover && <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-emerald-950" />}
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/20" />

        <div className="relative w-full px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-10 lg:pb-24 lg:pt-16">
          <nav className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-300 sm:text-sm">
            <Link to="/destinations" className="transition hover:text-white">
              Destinations
            </Link>
            <span className="mx-2 text-stone-500">/</span>
            <span className="text-white">{name}</span>
          </nav>

          <h1 className="mt-8 max-w-4xl font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            {name}{' '}
            <span className="text-amber-400">experiences</span>
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-stone-300 sm:text-xl lg:text-2xl">{subtitle}</p>

          <p className="mt-8 inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm sm:text-sm">
            {tours.length} {tours.length === 1 ? 'experience' : 'experiences'}
          </p>
        </div>
      </section>

      <section className="w-full px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        {tours.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white/80 p-8 text-center sm:p-12">
            <p className="text-lg text-stone-600 sm:text-xl">
              No published experiences for {name} yet.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex rounded-full bg-emerald-950 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Plan a custom trip
            </Link>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {tours.map((t) => (
              <li key={t.id}>
                <TourCard tour={t} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
