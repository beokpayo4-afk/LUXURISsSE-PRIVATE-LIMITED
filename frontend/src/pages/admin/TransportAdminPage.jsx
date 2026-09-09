import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { createTransport, fetchTransport, updateTransportPricing } from '../../api'
import { EmptyState, ErrorState, LoadingState, Pagination } from '../../components/ui/Feedback'
import { useToast } from '../../context/ToastContext'

const emptyForm = {
  name: '',
  vehicle_type: 'sedan',
  service_type: 'transfer',
  capacity: '',
  registration_number: '',
  price_per_day: '',
  price_per_trip: '',
  description: '',
  is_active: true,
}

function toNum(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const VEHICLE_TYPES = ['sedan', 'suv', 'muv', 'tempo', 'van', 'bus', 'other']
const SERVICE_TYPES = [
  'transfer',
  'airport_transfer',
  'local_sightseeing',
  'outstation',
  'tour_cab',
  'group_tour',
  'event',
]

export default function TransportAdminPage() {
  const toast = useToast()
  const { search: globalSearch = '', setSearch } = useOutletContext() || {}
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [priceRow, setPriceRow] = useState(null)
  const [priceForm, setPriceForm] = useState({ price_per_day: '', price_per_trip: '' })
  const [savingPrice, setSavingPrice] = useState(false)
  const pageSize = 10

  const load = () => {
    setLoading(true)
    setError('')
    fetchTransport()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load transport from the API.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [globalSearch])

  const filtered = useMemo(() => {
    const q = String(globalSearch || '').trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.name, r.service_type, r.vehicle_type, r.registration_number, r.description, r.capacity]
        .filter((v) => v != null && v !== '')
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [rows, globalSearch])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      await createTransport({
        name: form.name.trim(),
        vehicle_type: form.vehicle_type,
        service_type: form.service_type,
        capacity: form.capacity === '' ? null : Number(form.capacity),
        registration_number: form.registration_number.trim() || null,
        description: form.description.trim() || null,
        price_per_day: toNum(form.price_per_day),
        price_per_trip: toNum(form.price_per_trip),
        is_active: form.is_active,
      })
      toast.success('Transport added')
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      const detail = err?.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Could not add transport')
    } finally {
      setSaving(false)
    }
  }

  const openPriceModal = (row) => {
    setPriceRow(row)
    setPriceForm({
      price_per_day: row.price_per_day ?? '',
      price_per_trip: row.price_per_trip ?? '',
    })
  }

  const savePrice = async () => {
    if (!priceRow) return
    setSavingPrice(true)
    try {
      await updateTransportPricing(priceRow.id, {
        price_per_day: toNum(priceForm.price_per_day),
        price_per_trip: toNum(priceForm.price_per_trip),
      })
      toast.success('Price updated')
      setPriceRow(null)
      load()
    } catch {
      toast.error('Could not update price')
    } finally {
      setSavingPrice(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-slate-900 sm:text-3xl">Transport</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Vehicles and transfer services from Raipur. Set day or trip rates below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={globalSearch}
            onChange={(e) => {
              setSearch?.(e.target.value)
              setPage(1)
            }}
            placeholder="Search transport…"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={load}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            {showForm ? 'Close form' : 'Add Transport'}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Service name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="e.g. Raipur Airport Transfer (Innova)"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Vehicle type</label>
            <select
              value={form.vehicle_type}
              onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Service type</label>
            <select
              value={form.service_type}
              onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Capacity (seats)</label>
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="e.g. 6"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Registration no. (optional)</label>
            <input
              value={form.registration_number}
              onChange={(e) => setForm((f) => ({ ...f, registration_number: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="CG-04-…"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Price per day (₹)</label>
            <input
              type="number"
              min="0"
              value={form.price_per_day}
              onChange={(e) => setForm((f) => ({ ...f, price_per_day: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="e.g. 3499"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Price per trip (₹)</label>
            <input
              type="number"
              min="0"
              value={form.price_per_trip}
              onChange={(e) => setForm((f) => ({ ...f, price_per_trip: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="e.g. 999"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Route, inclusions, notes…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setForm(emptyForm)
              }}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save transport'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && <LoadingState label="Loading transport…" />}
        {!loading && error && (
          <div className="p-4">
            <ErrorState description={error} onRetry={load} />
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="p-4">
            <EmptyState
              title="No transport yet"
              description="Add a vehicle service, or ask to seed the sample fleet."
            />
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Seats</th>
                  <th className="px-4 py-3 font-semibold">Reg. no.</th>
                  <th className="px-4 py-3 font-semibold">Rate / day</th>
                  <th className="px-4 py-3 font-semibold">Rate / trip</th>
                  <th className="px-4 py-3 font-semibold">Active</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      {r.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{r.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{r.vehicle_type || '—'}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">
                      {String(r.service_type || '').replaceAll('_', ' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.capacity ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{r.registration_number || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.price_per_day != null
                        ? `₹${Number(r.price_per_day).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {r.price_per_trip != null
                        ? `₹${Number(r.price_per_trip).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{r.is_active ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openPriceModal(r)}
                        className="text-sm font-medium text-violet-700 hover:underline"
                      >
                        Set price
                      </button>
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

      {priceRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 className="font-serif text-xl text-slate-900">Set price</h2>
            <p className="mt-1 text-sm text-slate-500">{priceRow.name}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-700">Price per day (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={priceForm.price_per_day}
                  onChange={(e) => setPriceForm((f) => ({ ...f, price_per_day: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-700">Price per trip (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={priceForm.price_per_trip}
                  onChange={(e) => setPriceForm((f) => ({ ...f, price_per_trip: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPriceRow(null)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPrice}
                onClick={savePrice}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingPrice ? 'Saving…' : 'Save price'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
