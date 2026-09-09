import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { stashPendingCartItem } from '../utils/pendingCart'

/** Add to cart when logged in; otherwise save the item and send user to login. */
export function useAddToCart() {
  const { user } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(
    (item) => {
      if (user) {
        addItem(item)
        navigate('/cart')
        return
      }

      stashPendingCartItem(item)
      navigate('/login', {
        state: {
          from: { pathname: '/cart' },
          cartLogin: true,
          returnTo: `${location.pathname}${location.search}`,
        },
      })
    },
    [user, addItem, navigate, location.pathname, location.search]
  )
}
