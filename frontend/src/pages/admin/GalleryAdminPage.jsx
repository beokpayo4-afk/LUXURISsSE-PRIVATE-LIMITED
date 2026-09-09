import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  deleteGalleryImage,
  fetchGalleries,
  fetchGalleryStats,
  setGalleryActive,
  setGalleryFeatured,
  updateGalleryImage,
  uploadGalleryImage,
} from '../../api'
import { ConfirmDialog, EmptyState, ErrorState, LoadingState, Pagination } from '../../components/ui/Feedback'
import { useToast } from '../../context/ToastContext'
import { mediaUrl } from '../../utils/media'

function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(value).slice(0, 10)
  }
}

const STAT_STYLES = [
  { key: 'total_images', label: 'Total Images', tone: 'bg-violet-100 text-violet-700', icon: '▣' },
  { key: 'total_albums', label: 'Total Albums', tone: 'bg-emerald-100 text-emerald-700', icon: '◫' },
  { key: 'storage', label: 'Total Storage', tone: 'bg-amber-100 text-amber-700', icon: '▤' },
  { key: 'active_images', label: 'Active Images', tone: 'bg-sky-100 text-sky-700', icon: '◉' },
  { key: 'featured_images', label: 'Featured Images', tone: 'bg-rose-100 text-rose-700', icon: '★' },
]

export default function GalleryAdminPage() {
  const toast = useToast()
  const { search: globalSearch = '', setSearch } = useOutletContext() || {}
  const fileRef = useRef(null)
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [album, setAlbum] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', category: 'Destinations', album: '', is_featured: false, is_active: true })
  const [menuId, setMenuId] = useState(null)

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([fetchGalleries(), fetchGalleryStats().catch(() => null)])
      .then(([items, s]) => {
        setRows(Array.isArray(items) ? items : [])
        setStats(s)
      })
      .catch(() => setError('Could not load gallery from the API.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(),
    [rows],
  )
  const albums = useMemo(
    () => [...new Set(rows.map((r) => r.album).filter(Boolean))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = String(globalSearch || '').trim().toLowerCase()
    return rows.filter((r) => {
      if (category && r.category !== category) return false
      if (album && r.album !== album) return false
      if (status === 'active' && !r.is_active) return false
      if (status === 'inactive' && r.is_active) return false
      if (status === 'featured' && !r.is_featured) return false
      if (!q) return true
      return [r.title, r.description, r.category, r.album, r.destination_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [rows, globalSearch, category, album, status])

  useEffect(() => {
    setPage(1)
  }, [globalSearch])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const statValues = {
    total_images: stats?.total_images ?? rows.length,
    total_albums: stats?.total_albums ?? albums.length,
    storage: formatBytes(stats?.storage_bytes ?? 0),
    active_images: stats?.active_images ?? rows.filter((r) => r.is_active).length,
    featured_images: stats?.featured_images ?? rows.filter((r) => r.is_featured).length,
  }

  const onUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'Gallery image'
    setUploading(true)
    try {
      await uploadGalleryImage({
        file,
        title,
        category: 'Destinations',
        album: 'Uploads',
        is_featured: false,
        is_active: true,
      })
      toast.success('Image uploaded')
      load()
    } catch (err) {
      const detail = err?.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const openEdit = (row) => {
    setMenuId(null)
    setEditRow(row)
    setEditForm({
      title: row.title || '',
      category: row.category || 'Destinations',
      album: row.album || '',
      is_featured: Boolean(row.is_featured),
      is_active: Boolean(row.is_active),
    })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editRow) return
    setBusyId(editRow.id)
    try {
      await updateGalleryImage(editRow.id, {
        title: editForm.title,
        description: editRow.description,
        image_url: editRow.image_url,
        category: editForm.category,
        album: editForm.album || null,
        destination_id: editRow.destination_id,
        sort_order: editRow.sort_order || 0,
        is_featured: editForm.is_featured,
        is_active: editForm.is_active,
      })
      toast.success('Image updated')
      setEditRow(null)
      load()
    } catch {
      toast.error('Update failed')
    } finally {
      setBusyId(null)
    }
  }

  const runAction = async (id, action, msg) => {
    setBusyId(id)
    setMenuId(null)
    try {
      await action()
      toast.success(msg)
      load()
    } catch {
      toast.error('Action failed')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await runAction(pendingDelete.id, () => deleteGalleryImage(pendingDelete.id), 'Image deleted')
    setPendingDelete(null)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl text-slate-900">Gallery</h1>
        <p className="mt-1 text-sm text-slate-500">Manage destination and marketing images.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {STAT_STYLES.map((s) => (
          <div key={s.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${s.tone}`}>{s.icon}</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className="mt-0.5 font-serif text-xl text-slate-900">{statValues[s.key]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <input
          value={globalSearch}
          onChange={(e) => {
            setSearch?.(e.target.value)
            setPage(1)
          }}
          placeholder="Search images…"
          className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={album}
          onChange={(e) => {
            setAlbum(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Album</option>
          {albums.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Status</option>
          <option value="active">Published</option>
          <option value="inactive">Inactive</option>
          <option value="featured">Featured</option>
        </select>
        <button type="button" onClick={load} className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
          Refresh
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : '+ Upload Image'}
        </button>
      </div>

      {loading && <LoadingState label="Loading gallery…" />}
      {!loading && error && <ErrorState description={error} onRetry={load} />}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState title="No gallery images" description="Upload an image or seed sample gallery photos." />
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageRows.map((row) => (
              <article key={row.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <img src={mediaUrl(row.image_url)} alt="" className="h-full w-full object-cover" />
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                    {row.is_featured && (
                      <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                        Featured
                      </span>
                    )}
                    {Date.now() - new Date(row.created_at).getTime() < 7 * 24 * 3600 * 1000 && (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                        New
                      </span>
                    )}
                  </div>
                  <div className="absolute right-2 top-2">
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 shadow"
                      onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                    >
                      ⋯
                    </button>
                    {menuId === row.id && (
                      <div className="absolute right-0 z-10 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                        <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => openEdit(row)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                          disabled={busyId === row.id}
                          onClick={() =>
                            runAction(
                              row.id,
                              () => setGalleryFeatured(row.id, !row.is_featured),
                              row.is_featured ? 'Removed featured' : 'Marked featured',
                            )
                          }
                        >
                          {row.is_featured ? 'Unfeature' : 'Feature'}
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                          disabled={busyId === row.id}
                          onClick={() =>
                            runAction(
                              row.id,
                              () => setGalleryActive(row.id, !row.is_active),
                              row.is_active ? 'Unpublished' : 'Published',
                            )
                          }
                        >
                          {row.is_active ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-rose-50"
                          onClick={() => {
                            setMenuId(null)
                            setPendingDelete(row)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="truncate font-medium text-slate-900">{row.title}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{row.category || 'Destinations'}</span>
                    <span>·</span>
                    <span>{formatDate(row.created_at)}</span>
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {row.is_active ? 'Published' : 'Inactive'}
                    </span>
                    <div className="flex gap-1">
                      <a
                        href={mediaUrl(row.image_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                        onClick={() => setPendingDelete(row)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm text-slate-500">
              Showing {(safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filtered.length)} of{' '}
              {filtered.length} results
            </p>
            <div className="flex items-center gap-3">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              >
                {[8, 12, 16, 24].map((n) => (
                  <option key={n} value={n}>
                    {n} per page
                  </option>
                ))}
              </select>
              <Pagination page={safePage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this image?"
        message="The gallery item will be soft-deleted and hidden from lists."
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="font-serif text-xl text-slate-900">Edit image</h2>
            <div className="mt-3 overflow-hidden rounded-xl">
              <img src={mediaUrl(editRow.image_url)} alt="" className="h-40 w-full object-cover" />
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Title</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Category</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {['Destinations', 'Activities', 'Hotels', 'Tours'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Album</span>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={editForm.album}
                  onChange={(e) => setEditForm((f) => ({ ...f, album: e.target.value }))}
                  placeholder="e.g. India Highlights"
                />
              </label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_featured}
                    onChange={(e) => setEditForm((f) => ({ ...f, is_featured: e.target.checked }))}
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  Published
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={() => setEditRow(null)}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === editRow.id}
                className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
