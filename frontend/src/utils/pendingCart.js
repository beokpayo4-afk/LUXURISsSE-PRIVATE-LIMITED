const PENDING_KEY = 'luxurisse_pending_cart'

export function stashPendingCartItem(item) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(item))
}

export function peekPendingCartItem() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function takePendingCartItem() {
  const item = peekPendingCartItem()
  sessionStorage.removeItem(PENDING_KEY)
  return item
}
