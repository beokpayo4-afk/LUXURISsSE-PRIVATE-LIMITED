import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { peekPendingCartItem, takePendingCartItem } from '../../utils/pendingCart'

export default function RegisterPage() {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm()
  const { register: signUp } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')

  const cartLogin = Boolean(location.state?.cartLogin || peekPendingCartItem())

  const onSubmit = async (values) => {
    setError('')
    try {
      await signUp(values)
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
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Registration failed. Email may already be in use.')
    }
  }

  return (
    <div className="w-full px-4 py-16 sm:px-6 lg:px-10 sm:py-20">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl">Create account</h1>
        <p className="mt-3 text-lg text-stone-600 sm:text-xl">
          {cartLogin
            ? 'Create an account to save your cart item and continue later.'
            : 'Customer registration for bookings and enquiries.'}
        </p>
        {cartLogin && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your selected item is saved and will be added to your cart after registration.
          </p>
        )}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-10 space-y-6 border border-stone-200 bg-white p-8 sm:p-10"
        >
          <div>
            <label className="mb-2 block text-base font-medium sm:text-lg" htmlFor="full_name">
              Full name
            </label>
            <input
              id="full_name"
              className="w-full rounded-lg border border-stone-300 px-4 py-3.5 text-lg"
              {...register('full_name', { required: true, minLength: 2 })}
            />
            {errors.full_name && <p className="mt-1 text-sm text-red-600">Name is required</p>}
          </div>
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
            <label className="mb-2 block text-base font-medium sm:text-lg" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              className="w-full rounded-lg border border-stone-300 px-4 py-3.5 text-lg"
              {...register('phone')}
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
              {...register('password', { required: true, minLength: 8 })}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">Minimum 8 characters</p>}
          </div>
          {error && <p className="text-base text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 py-4 text-lg font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : cartLogin ? 'Register & continue' : 'Register'}
          </button>
        </form>
        <p className="mt-6 text-base text-stone-600 sm:text-lg">
          Already registered?{' '}
          <Link className="font-medium text-amber-800 underline" to="/login" state={location.state}>
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
