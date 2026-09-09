import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Navigate to a protected booking path; stash return URL and send guests to login. */
export function useRequireLoginNavigate() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(
    (to) => {
      if (user) {
        navigate(to)
        return
      }
      const path = typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}`
      navigate('/login', {
        state: {
          from: typeof to === 'string' ? { pathname: path.split('?')[0], search: path.includes('?') ? `?${path.split('?')[1]}` : '' } : to,
          cartLogin: true,
          returnTo: `${location.pathname}${location.search}`,
        },
      })
    },
    [user, navigate, location.pathname, location.search]
  )
}
