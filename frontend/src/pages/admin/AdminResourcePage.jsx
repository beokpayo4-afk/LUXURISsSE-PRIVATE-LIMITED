import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, Pagination } from '../../components/ui/Feedback'
import { useToast } from '../../context/ToastContext'

/**
 * Reusable admin list page: search, pagination, loading/empty/error, optional delete confirm.
 */
export default function AdminResourcePage({
  title,
  description,
  fetcher,
  columns,
  rowKey = 'id',
  searchKeys = [],
  onDelete,
}) {
  const toast = useToast()
  const outlet = useOutletContext() || {}
  const globalSearch = outlet.search || ''
  const setSearch = outlet.setSearch
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const pageSize = 10

  useEffect(() => {
    let cancelled = false
    fetcher()
      .then((data) => {
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : [])
          setError('')
        }
      })
      .catch(() => {
        if (!cancelled) setError(`Could not load ${title.toLowerCase()} from the API.`)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetcher, title, reloadKey])

  const refresh = () => {
    setLoading(true)
    setReloadKey((k) => k + 1)
  }

  const query = String(globalSearch || '').trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!query) return rows
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(query)),
    )
  }, [rows, query, searchKeys])

  useEffect(() => {
    setPage(1)
  }, [globalSearch])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const confirmDelete = async () => {
    if (!onDelete || !pendingDelete) return
    setDeleting(true)
    try {
      await onDelete(pendingDelete)
      toast.success('Deleted successfully')
      setPendingDelete(null)
      refresh()
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={globalSearch}
            onChange={(e) => {
              setSearch?.(e.target.value)
              setPage(1)
            }}
            placeholder={`Filter ${title.toLowerCase()}…`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && <LoadingState />}
        {!loading && error && (
          <div className="p-4">
            <ErrorState description={error} onRetry={refresh} />
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="p-4">
            <EmptyState title={`No ${title.toLowerCase()} found`} />
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 font-semibold">
                      {c.label}
                    </th>
                  ))}
                  {onDelete && <th className="px-4 py-3 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row[rowKey]} className="border-t border-slate-100">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-slate-700">
                        {c.render ? c.render(row) : row[c.key] ?? '—'}
                      </td>
                    ))}
                    {onDelete && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="text-sm text-red-700 hover:underline"
                          onClick={() => setPendingDelete(row)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
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
        title={`Delete ${title.slice(0, -1) || 'item'}?`}
        message="This action uses the API soft/hard delete for the selected record."
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
