import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { peekPendingCartItem, takePendingCartItem } from '../../utils/pendingCart'

export default function LoginPage() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm()
  const { login } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')

  const cartLogin = Boolean(location.state?.cartLogin || peekPendingCartItem())
  const returnTo = location.state?.returnTo

  const onSubmit = async ({ email, password }) => {
    setError('')
    try {
      const user = await login(email, password)
      const pending = takePendingCartItem()
      if (pending) {
        addItem(pending)
        navigate('/cart', { replace: true })
        return
      }
      const from = location.state?.from
      if (from?.pathname) {
        navigate(`${from.pathname}${from.search || ''}`, { replace: true })
        return
      }
      if (['super_admin', 'admin', 'manager', 'staff'].includes(user.role)) {
        navigate('/admin', { replace: true })
      } else navigate('/dashboard', { replace: true })
    } catch (err) {
      if (!err?.response) {
        setError('Cannot reach the API. Is the Luxurisse backend running on port 8000?')
        return
      }
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Login failed. Check your email and password.')
    }
  }

  return (
    <div className="w-full px-4 py-16 sm:px-6 lg:px-10 sm:py-20">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl">Login</h1>
        <p className="mt-3 text-lg text-stone-600 sm:text-xl">
          {cartLogin
            ? 'Sign in to continue your booking or save items to your cart.'
            : 'Customer and admin access use the same secure login.'}
        </p>
        {cartLogin && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            After login you’ll continue to checkout — not the contact form.
            {returnTo ? ' Your previous page is also saved.' : ''}
          </p>
        )}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-10 space-y-6 border border-stone-200 bg-white p-8 sm:p-10"
        >
          <div>
            <label className="mb-2 block text-base font-medium sm:text-lg" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-lg border border-stone-300 px-4 py-3.5 text-lg"
              {...register('email', { required: true })}
            />
          </div>
          <div>
            <label className="mb-2 block text-base font-medium sm:text-lg" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-lg border border-stone-300 px-4 py-3.5 text-lg"
              {...register('password', { required: true })}
            />
          </div>
          {error && <p className="text-base text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 py-4 text-lg font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : cartLogin ? 'Sign in to continue' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-base text-stone-600 sm:text-lg">
          New customer?{' '}
          <Link
            className="font-medium text-amber-800 underline"
            to="/register"
            state={location.state}
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
