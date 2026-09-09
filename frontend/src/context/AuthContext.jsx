import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchMe, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'luxurisse_token'
const REFRESH_KEY = 'luxurisse_refresh'
const USER_KEY = 'luxurisse_user'

const STAFF_ROLES = new Set(['super_admin', 'admin', 'manager', 'staff'])

function readCachedUser() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return { token: null, user: null }
  const cached = localStorage.getItem(USER_KEY)
  if (!cached) return { token, user: null }
  try {
    return { token, user: JSON.parse(cached) }
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    return { token: null, user: null }
  }
}

function persist(accessToken, user, refreshToken) {
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
}

function clear() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

export function AuthProvider({ children }) {
  const initial = readCachedUser()
  const [user, setUser] = useState(initial.user)
  const [loading, setLoading] = useState(Boolean(initial.token))

  useEffect(() => {
    if (!initial.token) return undefined

    let cancelled = false
    fetchMe()
      .then((next) => {
        if (cancelled) return
        setUser(next)
        localStorage.setItem(USER_KEY, JSON.stringify(next))
      })
      .catch(() => {
        if (cancelled) return
        clear()
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initial.token])

  const login = useCallback(async (email, password) => {
    const data = await apiLogin({ email, password })
    persist(data.access_token, data.user, data.refresh_token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (payload) => {
    await apiRegister(payload)
    return login(payload.email, payload.password)
  }, [login])

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem(REFRESH_KEY)
    try {
      if (localStorage.getItem(TOKEN_KEY)) {
        await apiLogout(refresh)
      }
    } catch {
      // Local logout still proceeds if API is unreachable.
    }
    clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: STAFF_ROLES.has(user?.role),
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
