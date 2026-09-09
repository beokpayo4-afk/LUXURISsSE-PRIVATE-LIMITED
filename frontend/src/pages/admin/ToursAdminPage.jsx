import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  deleteTour,
  fetchAdminTours,
  publishTour,
  setTourFeatured,
  unpublishTour,
  updateTourPricing,
} from '../../api'
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, Pagination } from '../../components/ui/Feedback'
import { useToast } from '../../context/ToastContext'
import { mediaUrl } from '../../utils/media'

function money(value) {
  if (value == null || value === '') return '—'
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function toNum(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const emptyPriceForm = {
  starting_price: '',
  mrp: '',
  discount: '',
  adult_price: '',
  child_price: '',
  infant_price: '',
}

export default function ToursAdminPage() {
  const toast = useToast()
  const { search: globalSearch = '', setSearch } = useOutletContext() || {}
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [priceTour, setPriceTour] = useState(null)
  const [priceForm, setPriceForm] = useState(emptyPriceForm)
  const [savingPrice, setSavingPrice] = useState(false)
  const pageSize = 10

  const load = () => {
    setLoading(true)
    setError('')
    fetchAdminTours()
      .then(setRows)
      .catch(() => setError('Could not load tours from the API.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    fetchAdminTours()
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load tours from the API.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = String(globalSearch || '').trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.title, r.code, r.slug, r.status, r.category_name, r.destination_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [rows, globalSearch])

  useEffect(() => {
    setPage(1)
  }, [globalSearch])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const runAction = async (id, action, successMsg) => {
    setBusyId(id)
    try {
      await action()
      toast.success(successMsg)
      load()
    } catch {
      toast.error('Action failed')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await runAction(pendingDelete.id, () => deleteTour(pendingDelete.id), 'Tour soft-deleted')
    setPendingDelete(null)
  }

  const openPrice = (row) => {
    setPriceTour(row)
    setPriceForm({
      starting_price: row.starting_price ?? '',
      mrp: row.mrp ?? '',
      discount: row.discount ?? '',
      adult_price: row.starting_price ?? '',
      child_price: '',
      infant_price: '',
    })
  }

  const savePrice = async (e) => {
    e.preventDefault()
    if (!priceTour) return
    const starting = toNum(priceForm.starting_price)
    const adult = toNum(priceForm.adult_price)
    if (starting == null && adult == null) {
      toast.error('Enter at least a starting or adult price')
      return
    }
    setSavingPrice(true)
    try {
      await updateTourPricing(priceTour.id, {
        starting_price: starting ?? adult,
        mrp: toNum(priceForm.mrp),
        discount: toNum(priceForm.discount),
        adult_price: adult ?? starting,
        child_price: toNum(priceForm.child_price),
        infant_price: toNum(priceForm.infant_price),
        currency: 'INR',
        label: 'Standard',
      })
      toast.success('Price updated')
      setPriceTour(null)
      load()
    } catch (err) {
      const detail = err?.response?.data?.detail
      const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg : 'Could not save price'
      toast.error(message || 'Could not save price')
    } finally {
      setSavingPrice(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-slate-900">Tour Packages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set package prices from the list (Set price) or in the full tour editor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={globalSearch}
            onChange={(e) => {
              setSearch?.(e.target.value)
              setPage(1)
            }}
            placeholder="Search tours…"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <button type="button" onClick={load} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm">
            Refresh
          </button>
          <Link
            to="/admin/tours/new"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            Add Tour Package
          </Link>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && <LoadingState label="Loading tours…" />}
        {!loading && error && (
          <div className="p-4">
            <ErrorState description={error} onRetry={load} />
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="No tours yet"
              description="Create a tour package with pricing, itinerary, inclusions, and publish state. Category and destination are required."
            />
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                to="/admin/tours/new"
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Add Tour Package
              </Link>
              <Link to="/admin/destinations" className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
                Manage destinations
              </Link>
              <Link to="/admin/categories" className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
                Manage categories
              </Link>
            </div>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tour</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {row.cover_image_url ? (
                          <img
                            src={mediaUrl(row.cover_image_url)}
                            alt=""
                            className="h-12 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="h-12 w-16 rounded bg-slate-100" />
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{row.title}</p>
                          <p className="text-xs text-slate-500">
                            {row.duration_days ? `${row.duration_days}D` : '—'}
                            {row.duration_nights != null ? ` / ${row.duration_nights}N` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-3">{row.category_name || '—'}</td>
                    <td className="px-4 py-3">{row.destination_name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={row.starting_price == null ? 'text-amber-700' : 'text-slate-900'}>
                          {money(row.starting_price)}
                        </span>
                        <button
                          type="button"
                          className="text-left text-xs font-medium text-violet-700 hover:underline"
                          onClick={() => openPrice(row)}
                        >
                          Set price
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <span>{row.is_featured ? 'Featured' : '—'}</span>
                        <span>{row.is_published ? 'Published' : 'Unpublished'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{row.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1 text-sm">
                        <Link to={`/admin/tours/${row.id}`} className="text-amber-700 hover:underline">
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          className="text-slate-700 hover:underline disabled:opacity-40"
                          onClick={() =>
                            runAction(
                              row.id,
                              () => (row.is_published ? unpublishTour(row.id) : publishTour(row.id)),
                              row.is_published ? 'Tour unpublished' : 'Tour published',
                            )
                          }
                        >
                          {row.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          className="text-slate-700 hover:underline disabled:opacity-40"
                          onClick={() =>
                            runAction(
                              row.id,
                              () => setTourFeatured(row.id, !row.is_featured),
                              row.is_featured ? 'Removed from featured' : 'Marked featured',
                            )
                          }
                        >
                          {row.is_featured ? 'Unfeature' : 'Feature'}
                        </button>
                        <button
                          type="button"
                          className="text-red-700 hover:underline"
                          onClick={() => setPendingDelete(row)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 px-4 py-3">
              <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Soft-delete this tour?"
        message="The tour will be archived and hidden from lists. Nested package data remains in the database."
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      {priceTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 className="font-serif text-xl text-slate-900">Set tour price</h2>
            <p className="mt-1 text-sm text-slate-500">{priceTour.title}</p>
            <form onSubmit={savePrice} className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Starting price (₹) — shown on website</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={priceForm.starting_price}
                  onChange={(e) =>
                    setPriceForm((f) => ({
                      ...f,
                      starting_price: e.target.value,
                      adult_price: f.adult_price === '' || f.adult_price === f.starting_price ? e.target.value : f.adult_price,
                    }))
                  }
                  placeholder="e.g. 12999"
                  autoFocus
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">MRP (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={priceForm.mrp}
                    onChange={(e) => setPriceForm((f) => ({ ...f, mrp: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Discount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={priceForm.discount}
                    onChange={(e) => setPriceForm((f) => ({ ...f, discount: e.target.value }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Adult</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={priceForm.adult_price}
                    onChange={(e) => setPriceForm((f) => ({ ...f, adult_price: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Child</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={priceForm.child_price}
                    onChange={(e) => setPriceForm((f) => ({ ...f, child_price: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">Infant</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={priceForm.infant_price}
                    onChange={(e) => setPriceForm((f) => ({ ...f, infant_price: e.target.value }))}
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  onClick={() => setPriceTour(null)}
                  disabled={savingPrice}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                  disabled={savingPrice}
                >
                  {savingPrice ? 'Saving…' : 'Save price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
