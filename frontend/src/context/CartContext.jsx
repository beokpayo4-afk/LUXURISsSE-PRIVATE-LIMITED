import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'luxurisse_cart'

const CartContext = createContext(null)

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function itemKey(item) {
  if (item.type === 'tour') return `tour-${item.tourId}`
  if (item.type === 'ticket') return `ticket-${item.ticketId}`
  if (item.type === 'group_ticket') return `ticket-${item.destinationId}-${item.ticketSize}`
  return `item-${item.title}`
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  useEffect(() => {
    saveCart(items)
  }, [items])

  const addItem = useCallback((item) => {
    const key = itemKey(item)
    setItems((prev) => {
      const idx = prev.findIndex((row) => itemKey(row) === key)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + (item.quantity || 1),
        }
        return next
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }]
    })
  }, [])

  const updateQuantity = useCallback((key, quantity) => {
    setItems((prev) =>
      prev
        .map((row) => (itemKey(row) === key ? { ...row, quantity } : row))
        .filter((row) => row.quantity > 0)
    )
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((row) => itemKey(row) !== key))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const count = useMemo(() => items.reduce((sum, row) => sum + row.quantity, 0), [items])

  const total = useMemo(
    () =>
      items.reduce((sum, row) => {
        if (row.unitPrice == null) return sum
        return sum + row.unitPrice * row.quantity
      }, 0),
    [items]
  )

  const value = useMemo(
    () => ({
      items,
      count,
      total,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      itemKey,
    }),
    [items, count, total, addItem, updateQuantity, removeItem, clearCart]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
