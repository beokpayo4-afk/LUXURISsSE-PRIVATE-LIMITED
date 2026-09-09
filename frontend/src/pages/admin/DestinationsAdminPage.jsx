import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  deleteDestination,
  fetchAdminDestinations,
  publishDestination,
  setDestinationFeatured,
  unpublishDestination,
} from '../../api'
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, Pagination } from '../../components/ui/Feedback'
import { useToast } from '../../context/ToastContext'
import { mediaUrl } from '../../utils/media'

export default function DestinationsAdminPage() {
  const toast = useToast()
  const { search: globalSearch = '', setSearch } = useOutletContext() || {}
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const pageSize = 10

  const load = () => {
    setLoading(true)
    setError('')
    fetchAdminDestinations()
      .then(setRows)
      .catch(() => setError('Could not load destinations from the API.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    fetchAdminDestinations()
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load destinations from the API.')
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
      [r.name, r.slug, r.country, r.state, r.city_name, r.status]
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
    } catch (err) {
      const detail = err?.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-slate-900">Destinations</h1>
          <p className="mt-1 text-sm text-slate-500">Manage places linked to tour packages.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={globalSearch}
            onChange={(e) => {
              setSearch?.(e.target.value)
              setPage(1)
            }}
            placeholder="Search destinations…"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <button type="button" onClick={load} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm">
            Refresh
          </button>
          <Link
            to="/admin/destinations/new"
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            Add destination
          </Link>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && <LoadingState label="Loading destinations…" />}
        {!loading && error && (
          <div className="p-4">
            <ErrorState description={error} onRetry={load} />
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="p-4">
            <EmptyState title="No destinations yet" description="Create a destination before linking tours." />
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Tours</th>
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
                          <img src={mediaUrl(row.cover_image_url)} alt="" className="h-12 w-16 rounded object-cover" />
                        ) : (
                          <div className="h-12 w-16 rounded bg-slate-100" />
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{row.name}</p>
                          <p className="text-xs text-slate-500">{row.attraction_count} attractions</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {[row.city_name, row.state, row.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">{row.tour_count}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-1">
                        <span>{row.is_featured ? 'Featured' : '—'}</span>
                        <span>{row.is_published ? 'Published' : 'Unpublished'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{row.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1 text-sm">
                        <Link to={`/admin/destinations/${row.id}`} className="text-amber-700 hover:underline">
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          className="text-slate-700 hover:underline disabled:opacity-40"
                          onClick={() =>
                            runAction(
                              row.id,
                              () => (row.is_published ? unpublishDestination(row.id) : publishDestination(row.id)),
                              row.is_published ? 'Destination unpublished' : 'Destination published',
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
                              () => setDestinationFeatured(row.id, !row.is_featured),
                              row.is_featured ? 'Removed from featured' : 'Marked featured',
                            )
                          }
                        >
                          {row.is_featured ? 'Unfeature' : 'Feature'}
                        </button>
                        <button type="button" className="text-red-700 hover:underline" onClick={() => setPendingDelete(row)}>
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
        title="Soft-delete this destination?"
        message="Destinations linked to tours cannot be deleted until those tours are reassigned."
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return
          await runAction(pendingDelete.id, () => deleteDestination(pendingDelete.id), 'Destination deleted')
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
