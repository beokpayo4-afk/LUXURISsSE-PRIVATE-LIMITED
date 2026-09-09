import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { submitEnquiry } from '../../api'
import { COMPANY } from '../../constants/company'

export default function ContactPage() {
  const [searchParams] = useSearchParams()
  const defaultSubject = searchParams.get('subject') || ''
  const defaultMessage = searchParams.get('message') || ''
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { subject: defaultSubject, message: defaultMessage },
  })
  const [status, setStatus] = useState('')

  const onSubmit = async (values) => {
    setStatus('')
    try {
      await submitEnquiry(values)
      setStatus('Thank you. Your enquiry has been received.')
      reset()
    } catch {
      setStatus('Could not send enquiry. Please try again or call us.')
    }
  }

  return (
    <div className="w-full px-4 py-16 sm:px-6 lg:px-10 sm:py-20 grid gap-10 lg:grid-cols-2">
      <div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl">Contact</h1>
        <p className="mt-3 text-lg text-stone-600 sm:text-xl">Reach LUXURISSE PRIVATE LIMITED using the verified details below.</p>
        <dl className="mt-8 space-y-4 text-base sm:text-lg">
          <div>
            <dt className="text-stone-500">Address</dt>
            <dd className="font-medium">{COMPANY.address}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Email</dt>
            <dd>
              <a className="text-amber-800 hover:underline" href={`mailto:${COMPANY.email}`}>
                {COMPANY.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Phone</dt>
            <dd>
              <a className="text-amber-800 hover:underline" href={`tel:${COMPANY.phone}`}>
                {COMPANY.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Managing Director</dt>
            <dd className="font-medium">{COMPANY.managingDirector}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Director</dt>
            <dd className="font-medium">{COMPANY.director}</dd>
          </div>
        </dl>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-xl border border-stone-200 bg-white p-6 space-y-4"
      >
        <h2 className="font-semibold text-lg">Send an enquiry</h2>
        <div>
          <label className="block text-sm mb-1" htmlFor="name">Name</label>
          <input
            id="name"
            className="w-full rounded-md border border-stone-300 px-3 py-2"
            {...register('name', { required: true })}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">Name is required</p>}
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="w-full rounded-md border border-stone-300 px-3 py-2"
            {...register('email', { required: true })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="phone">Phone</label>
          <input
            id="phone"
            className="w-full rounded-md border border-stone-300 px-3 py-2"
            {...register('phone')}
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="subject">Subject</label>
          <input
            id="subject"
            className="w-full rounded-md border border-stone-300 px-3 py-2"
            {...register('subject')}
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="message">Message</label>
          <textarea
            id="message"
            rows={4}
            className="w-full rounded-md border border-stone-300 px-3 py-2"
            {...register('message', { required: true })}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isSubmitting ? 'Sending…' : 'Submit enquiry'}
        </button>
        {status && <p className="text-sm text-stone-600">{status}</p>}
      </form>
    </div>
  )
}
