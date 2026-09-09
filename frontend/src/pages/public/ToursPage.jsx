import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchTours } from '../../api'
import TourCard from '../../components/tours/TourCard'

export default function ToursPage() {
  const [searchParams] = useSearchParams()
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchTours({ published_only: true })
      .then(setItems)
      .catch(() => setError('Unable to load tours. Is the API running?'))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const names = [...new Set(items.map((t) => t.category_name).filter(Boolean))].sort()
    return names
  }, [items])

  const filtered = useMemo(() => {
    let list = items
    if (filter !== 'all') list = list.filter((t) => t.category_name === filter)
    if (q) {
      list = list.filter((t) => {
        const hay = [t.title, t.destination_name, t.category_name, t.summary, t.code]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }
    return list
  }, [items, filter, q])

  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      <section className="border-b border-stone-200/80 bg-white/60">
        <div className="w-full px-4 py-12 sm:px-6 lg:px-10 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            Luxurisse · Tours & experiences
          </p>
          <h1 className="mt-2 font-serif text-4xl text-slate-900 sm:text-5xl lg:text-6xl">
            Tour packages
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-stone-600 sm:text-xl">
            Curated journeys across Chhattisgarh and India — pick a trip, view details, and book.
          </p>
          {q && (
            <p className="mt-3 text-base text-emerald-900">
              Showing results for <span className="font-semibold">“{searchParams.get('q')}”</span>
            </p>
          )}

          {categories.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === 'all'
                    ? 'bg-emerald-950 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-stone-200 hover:bg-stone-50'
                }`}
              >
                All tours
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === c
                      ? 'bg-emerald-950 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="w-full px-4 py-12 sm:px-6 lg:px-10 sm:py-16">
        {loading && <p className="text-lg text-stone-500">Loading tours…</p>}
        {error && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">{error}</p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-lg text-stone-500">
            {q ? 'No tours matched your search.' : 'No tour packages published yet.'}
          </p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => (
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
