/** Resolve uploaded media paths against the API origin. */
export function mediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  // Empty VITE_API_ORIGIN = same-origin (use Vite proxy in local dev).
  const configured = import.meta.env.VITE_API_ORIGIN
  const base =
    configured === undefined || configured === null
      ? 'http://localhost:8000'
      : String(configured).replace(/\/$/, '')
  const relative = path.startsWith('/') ? path : `/${path}`
  if (!base) return relative
  return `${base}${relative}`
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-')
    .slice(0, 270)
}
