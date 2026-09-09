import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchTour } from '../../api'
import TourBookingPanel from '../../components/tours/TourBookingPanel'
import { mediaUrl } from '../../utils/media'
import { tourDurationLabel } from '../../utils/tours'
export default function TourDetailPage() {
  const { id } = useParams()
  const [tour, setTour] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchTour(id)
      .then((data) => {
        if (!cancelled) {
          setTour(data)
          setError('')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this tour.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const cover =
    tour?.images?.find((i) => i.is_cover)?.image_url ||
    tour?.images?.[0]?.image_url ||
    tour?.cover_image_url

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ef] px-4 py-20 text-center text-stone-500">
        Loading tour…
      </div>
    )
  }

  if (error || !tour) {
    return (
      <div className="min-h-[60vh] bg-[#f7f4ef] px-4 py-20 text-center">
        <p className="text-stone-600">{error || 'Tour not found.'}</p>
        <Link to="/tours" className="mt-4 inline-block text-amber-800 underline">
          Back to tours
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-[#f7f4ef]">
      <div className="bg-emerald-950 pb-24 pt-8 sm:pb-32 sm:pt-10">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
          <Link to="/tours" className="text-sm text-emerald-200/90 hover:text-white">
            ← All tours
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="-mt-20 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-10">
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-stone-200/80">
            {cover ? (
              <img src={mediaUrl(cover)} alt="" className="aspect-[4/5] w-full object-cover sm:aspect-[5/6]" />
            ) : (
              <div className="aspect-[4/5] w-full bg-gradient-to-br from-emerald-800 to-amber-900 sm:aspect-[5/6]" />
            )}
            <div className="flex flex-wrap gap-2 p-4">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                ✓ Free cancellation
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                {tourDurationLabel(tour)}
              </span>
            </div>
          </div>

          <TourBookingPanel tour={tour} />
        </div>

        {(tour.description || tour.highlights || tour.inclusions?.length > 0) && (
          <div className="mt-12 grid gap-8 pb-16 lg:grid-cols-2">
            {tour.description && (
              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200/80 sm:p-8">
                <h2 className="font-serif text-2xl text-slate-900">About this trip</h2>
                <p className="mt-4 whitespace-pre-line text-stone-600">{tour.description}</p>
              </section>
            )}
            {(tour.highlights || tour.inclusions?.length > 0) && (
              <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200/80 sm:p-8">
                <h2 className="font-serif text-2xl text-slate-900">Highlights & inclusions</h2>
                {tour.highlights && (
                  <p className="mt-4 whitespace-pre-line text-stone-600">{tour.highlights}</p>
                )}
                {tour.inclusions?.length > 0 && (
                  <ul className="mt-4 space-y-2 text-stone-600">
                    {tour.inclusions.map((inc) => (
                      <li key={inc.id} className="flex gap-2">
                        <span className="text-emerald-700">✓</span>
                        {inc.item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}

        {tour.itineraries?.length > 0 && (
          <section className="mb-16 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200/80 sm:p-8">
            <h2 className="font-serif text-2xl text-slate-900">Itinerary</h2>
            <ol className="mt-6 space-y-4">
              {tour.itineraries.map((day) => (
                <li key={day.id} className="rounded-2xl border border-stone-100 bg-[#faf8f5] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Day {day.day_number}
                  </p>
                  <p className="mt-1 font-medium text-slate-900">{day.title}</p>
                  {day.description && <p className="mt-2 text-sm text-stone-600">{day.description}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  )
}
