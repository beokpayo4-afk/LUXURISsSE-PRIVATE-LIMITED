import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  createTicket,
  deleteTicket,
  fetchTicket,
  fetchTickets,
  updateTicket,
} from '../../api'
import { EmptyState, ErrorState, LoadingState, Pagination } from '../../components/ui/Feedback'
import { INDIA_STATES } from '../../constants/indiaStates'
import { useToast } from '../../context/ToastContext'

const TICKET_TYPES = ['Local Bus', 'Tempo', 'E-Rickshaw', 'Other']
const TICKET_STATUSES = ['Active', 'Inactive']

const emptyForm = {
  name: '',
  type: 'Local Bus',
  state: 'Chhattisgarh',
  from_location: '',
  to_location: '',
  pickup: '',
  drop: '',
  date: '',
  time: '',
  price: '',
  status: 'Active',
}

function timeToInput(value) {
  if (!value) return ''
  // API may return "08:30:00" or "08:30:00.000000"
  return String(value).slice(0, 5)
}

function formatTimeDisplay(value) {
  const hhmm = timeToInput(value)
  if (!hhmm) return '—'
  const [hStr, mStr] = hhmm.split(':')
  let h = Number(hStr)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`
}

function formatPrice(value) {
  if (value == null || value === '') return '—'
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function TicketsAdminPage() {
  const toast = useToast()
  const { search: globalSearch = '', setSearch } = useOutletContext() || {}
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewRow, setViewRow] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const pageSize = 10

  const load = () => {
    setLoading(true)
    setError('')
    fetchTickets()
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not load tickets from the API.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    fetchTickets()
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setError('Could not load tickets from the API.')
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
      [r.name, r.type, r.state, r.from_location, r.to_location, r.pickup, r.drop, r.status, r.date]
        .filter((v) => v != null && v !== '')
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [rows, globalSearch])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = async (row) => {
    try {
      const full = await fetchTicket(row.id)
      setEditingId(full.id)
      setForm({
        name: full.name || '',
        type: full.type || 'Local Bus',
        state: full.state || 'Chhattisgarh',
        from_location: full.from_location || '',
        to_location: full.to_location || '',
        pickup: full.pickup || '',
        drop: full.drop || '',
        date: full.date || '',
        time: timeToInput(full.time),
        price: full.price != null ? String(full.price) : '',
        status: full.status || 'Active',
      })
      setShowForm(true)
    } catch {
      toast.error('Could not load ticket')
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.state.trim() || !form.from_location.trim() || !form.to_location.trim()) {
      toast.error('Name, State, From Location and To Location are required')
      return
    }
    if (!form.date || !form.time) {
      toast.error('Date and Time are required')
      return
    }
    if (!form.price || Number(form.price) <= 0) {
      toast.error('Price must be greater than 0')
      return
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      state: form.state.trim(),
      from_location: form.from_location.trim(),
      to_location: form.to_location.trim(),
      pickup: form.pickup.trim() || null,
      drop: form.drop.trim() || null,
      date: form.date,
      time: form.time.length === 5 ? `${form.time}:00` : form.time,
      price: Number(form.price),
      status: form.status,
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateTicket(editingId, payload)
        toast.success('Ticket updated')
      } else {
        await createTicket(payload)
        toast.success('Ticket added')
      }
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm)
      load()
    } catch (err) {
      const detail = err?.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Could not save ticket')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (row) => {
    if (!window.confirm(`Delete ticket “${row.name}”?`)) return
    try {
      await deleteTicket(row.id)
      toast.success('Ticket deleted')
      if (viewRow?.id === row.id) setViewRow(null)
      load()
    } catch {
      toast.error('Could not delete ticket')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-slate-900">Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">Local Bus, Tempo, E-Rickshaw and other routes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {globalSearch && (
            <button
              type="button"
              onClick={() => setSearch?.('')}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Clear search
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Add Ticket
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <h2 className="sm:col-span-2 lg:col-span-3 font-semibold text-lg text-slate-900">
            {editingId ? 'Edit Ticket' : 'Add Ticket'}
          </h2>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Ticket Name *</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Delhi → Noida Local Bus"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Transport Type *</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {TICKET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">State *</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              required
            >
              {INDIA_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Status *</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">From Location *</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.from_location}
              onChange={(e) => setForm((f) => ({ ...f, from_location: e.target.value }))}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">To Location *</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.to_location}
              onChange={(e) => setForm((f) => ({ ...f, to_location: e.target.value }))}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Pickup</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.pickup}
              onChange={(e) => setForm((f) => ({ ...f, pickup: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Drop</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.drop}
              onChange={(e) => setForm((f) => ({ ...f, drop: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Date *</span>
            <input
              type="date"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Time *</span>
            <input
              type="time"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Price *</span>
            <input
              type="number"
              min="1"
              step="0.01"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
            />
          </label>

          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : editingId ? 'Update Ticket' : 'Create Ticket'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
              }}
              className="rounded-md border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {viewRow && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Ticket details</p>
              <h2 className="mt-1 font-serif text-2xl text-slate-900">{viewRow.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => setViewRow(null)}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {[
              ['Type', viewRow.type],
              ['State', viewRow.state],
              ['From', viewRow.from_location],
              ['To', viewRow.to_location],
              ['Pickup', viewRow.pickup || '—'],
              ['Drop', viewRow.drop || '—'],
              ['Date', viewRow.date],
              ['Time', formatTimeDisplay(viewRow.time)],
              ['Price', formatPrice(viewRow.price)],
              ['Status', viewRow.status],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {loading && <LoadingState label="Loading tickets…" />}
      {error && <ErrorState description={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="No tickets yet" description="Add a ticket to publish local routes." />
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">State</th>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">To</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3">{row.type}</td>
                    <td className="px-4 py-3">{row.state}</td>
                    <td className="px-4 py-3">{row.from_location}</td>
                    <td className="px-4 py-3">{row.to_location}</td>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3">{formatTimeDisplay(row.time)}</td>
                    <td className="px-4 py-3">{formatPrice(row.price)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setViewRow(row)}
                          className="text-slate-700 hover:underline"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="text-amber-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          className="text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
