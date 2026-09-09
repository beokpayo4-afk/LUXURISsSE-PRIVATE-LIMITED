import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createDestination,
  deleteDestinationImage,
  fetchDestination,
  updateDestination,
  uploadDestinationImages,
} from '../../api'
import { ErrorState, LoadingState } from '../../components/ui/Feedback'
import { useToast } from '../../context/ToastContext'
import { mediaUrl, slugify } from '../../utils/media'

const emptyForm = {
  name: '',
  slug: '',
  country: '',
  state: '',
  city_name: '',
  summary: '',
  description: '',
  best_time_to_visit: '',
  travel_information: '',
  is_featured: false,
  is_published: false,
  status: 'draft',
  images: [],
  attractions: [{ name: '', description: '', image_url: '', location: '', entry_information: '', status: 'published' }],
}

function buildPayload(values) {
  return {
    name: values.name.trim(),
    slug: values.slug?.trim() || null,
    country: values.country?.trim() || null,
    state: values.state?.trim() || null,
    city_name: values.city_name?.trim() || null,
    summary: values.summary || null,
    description: values.description || null,
    best_time_to_visit: values.best_time_to_visit || null,
    travel_information: values.travel_information || null,
    is_featured: Boolean(values.is_featured),
    is_published: Boolean(values.is_published),
    is_popular: Boolean(values.is_featured),
    status: values.status,
    images: (values.images || [])
      .filter((img) => img.image_url?.trim())
      .map((img, idx) => ({
        image_url: img.image_url.trim(),
        alt_text: img.alt_text || null,
        sort_order: idx,
        is_cover: Boolean(img.is_cover),
      })),
    attractions: (values.attractions || [])
      .filter((a) => a.name?.trim())
      .map((a, idx) => ({
        name: a.name.trim(),
        description: a.description || null,
        image_url: a.image_url?.trim() || null,
        location: a.location || null,
        entry_information: a.entry_information || null,
        status: a.status || 'published',
        sort_order: idx,
      })),
  }
}

function mapDestinationToForm(dest) {
  return {
    name: dest.name || '',
    slug: dest.slug || '',
    country: dest.country || '',
    state: dest.state || '',
    city_name: dest.city_name || '',
    summary: dest.summary || '',
    description: dest.description || '',
    best_time_to_visit: dest.best_time_to_visit || '',
    travel_information: dest.travel_information || '',
    is_featured: Boolean(dest.is_featured),
    is_published: Boolean(dest.is_published),
    status: dest.status || 'draft',
    images: (dest.images || []).map((img) => ({
      id: img.id,
      image_url: img.image_url,
      alt_text: img.alt_text || '',
      is_cover: Boolean(img.is_cover),
    })),
    attractions:
      dest.attractions?.length > 0
        ? dest.attractions.map((a) => ({
            name: a.name || '',
            description: a.description || '',
            image_url: a.image_url || '',
            location: a.location || '',
            entry_information: a.entry_information || '',
            status: a.status || 'published',
          }))
        : emptyForm.attractions,
  }
}

function Field({ label, error, children, required }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500'
const sectionClass = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'

export default function DestinationFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const [bootLoading, setBootLoading] = useState(Boolean(isEdit))
  const [bootError, setBootError] = useState('')
  const [pendingFiles, setPendingFiles] = useState([])
  const [linkedTours, setLinkedTours] = useState([])

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: emptyForm })

  const images = useFieldArray({ control, name: 'images' })
  const attractions = useFieldArray({ control, name: 'attractions' })

  useEffect(() => {
    if (!isEdit) return undefined
    let cancelled = false
    fetchDestination(id)
      .then((dest) => {
        if (cancelled) return
        reset(mapDestinationToForm(dest))
        setLinkedTours(dest.linked_tours || [])
      })
      .catch(() => {
        if (!cancelled) setBootError('Could not load destination.')
      })
      .finally(() => {
        if (!cancelled) setBootLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, isEdit, reset])

  const onSubmit = async (values) => {
    try {
      const payload = buildPayload(values)
      let dest
      if (isEdit) {
        dest = await updateDestination(id, payload)
        toast.success('Destination updated')
      } else {
        dest = await createDestination(payload)
        toast.success('Destination created')
      }
      if (pendingFiles.length) {
        await uploadDestinationImages(dest.id, pendingFiles, true)
        setPendingFiles([])
        toast.success('Images uploaded')
      }
      navigate(`/admin/destinations/${dest.id}`)
      if (isEdit) {
        const refreshed = await fetchDestination(dest.id)
        reset(mapDestinationToForm(refreshed))
        setLinkedTours(refreshed.linked_tours || [])
      }
    } catch (err) {
      const detail = err?.response?.data?.detail
      const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg : 'Save failed'
      toast.error(message || 'Save failed')
    }
  }

  const removeExistingImage = async (index) => {
    const row = images.fields[index]
    if (isEdit && row.id) {
      try {
        const dest = await deleteDestinationImage(id, row.id)
        reset(mapDestinationToForm(dest))
        toast.success('Image removed')
      } catch {
        toast.error('Could not remove image')
      }
      return
    }
    images.remove(index)
  }

  if (bootLoading) return <LoadingState label="Loading form…" />
  if (bootError) return <ErrorState description={bootError} />

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-slate-900">{isEdit ? 'Edit destination' : 'Add destination'}</h1>
          <p className="mt-1 text-sm text-slate-500">Destinations connect to tour packages via destination selection.</p>
        </div>
        <Link to="/admin/destinations" className="text-sm text-amber-700 hover:underline">
          Back to destinations
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <section className={sectionClass}>
          <h2 className="font-medium text-slate-900">Basic details</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Destination Name" required error={errors.name?.message}>
              <input
                className={inputClass}
                {...register('name', { required: 'Destination name is required' })}
                onBlur={() => {
                  const { name, slug } = getValues()
                  if (!slug && name) setValue('slug', slugify(name))
                }}
              />
            </Field>
            <Field label="Slug">
              <input className={inputClass} {...register('slug')} placeholder="auto from name if empty" />
            </Field>
            <Field label="Country">
              <input className={inputClass} {...register('country')} />
            </Field>
            <Field label="State">
              <input className={inputClass} {...register('state')} />
            </Field>
            <Field label="City">
              <input className={inputClass} {...register('city_name')} />
            </Field>
            <Field label="Status">
              <select className={inputClass} {...register('status')}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register('is_published')} />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register('is_featured')} />
              Featured destination
            </label>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-slate-900">Descriptions</h2>
          <div className="mt-4 grid gap-3">
            <Field label="Short description">
              <textarea rows={2} className={inputClass} {...register('summary')} />
            </Field>
            <Field label="Description">
              <textarea rows={5} className={inputClass} {...register('description')} />
            </Field>
            <Field label="Best time to visit">
              <textarea rows={2} className={inputClass} {...register('best_time_to_visit')} />
            </Field>
            <Field label="Travel information">
              <textarea rows={3} className={inputClass} {...register('travel_information')} />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-slate-900">Main image & gallery</h2>
          <div className="mt-3 space-y-3">
            {images.fields.map((field, index) => (
              <div key={field.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 p-3">
                {field.image_url && (
                  <img src={mediaUrl(field.image_url)} alt="" className="h-14 w-20 rounded object-cover" />
                )}
                <input className={`${inputClass} min-w-[14rem] flex-1`} placeholder="Image URL" {...register(`images.${index}.image_url`)} />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" {...register(`images.${index}.is_cover`)} />
                  Main
                </label>
                <button type="button" className="text-sm text-red-700" onClick={() => removeExistingImage(index)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="text-sm text-amber-700" onClick={() => images.append({ image_url: '', alt_text: '', is_cover: false })}>
              + Add image URL
            </button>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700">Upload multiple images</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={(e) => setPendingFiles(Array.from(e.target.files || []))}
              />
              {pendingFiles.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">{pendingFiles.length} file(s) will upload after save.</p>
              )}
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Attractions</h2>
            <button
              type="button"
              className="text-sm text-amber-700"
              onClick={() =>
                attractions.append({
                  name: '',
                  description: '',
                  image_url: '',
                  location: '',
                  entry_information: '',
                  status: 'published',
                })
              }
            >
              + Add attraction
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {attractions.fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-slate-100 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">Attraction {index + 1}</p>
                  <button type="button" className="text-xs text-red-700" onClick={() => attractions.remove(index)}>
                    Remove
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input className={inputClass} placeholder="Attraction name *" {...register(`attractions.${index}.name`)} />
                  <input className={inputClass} placeholder="Location" {...register(`attractions.${index}.location`)} />
                  <input className={inputClass} placeholder="Image URL" {...register(`attractions.${index}.image_url`)} />
                  <select className={inputClass} {...register(`attractions.${index}.status`)}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                  <textarea rows={2} className={`${inputClass} md:col-span-2`} placeholder="Description" {...register(`attractions.${index}.description`)} />
                  <textarea rows={2} className={`${inputClass} md:col-span-2`} placeholder="Entry information" {...register(`attractions.${index}.entry_information`)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {isEdit && (
          <section className={sectionClass}>
            <h2 className="font-medium text-slate-900">Linked tours</h2>
            {linkedTours.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No tours linked yet. Choose this destination when creating a tour.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {linkedTours.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <span>
                      {t.title} <span className="text-xs text-slate-500">({t.code})</span>
                    </span>
                    <Link to={`/admin/tours/${t.id}`} className="text-amber-700 hover:underline">
                      Open tour
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="flex justify-end gap-2 pb-8">
          <Link to="/admin/destinations" className="rounded-md border border-slate-200 px-4 py-2 text-sm">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : isEdit ? 'Update destination' : 'Create destination'}
          </button>
        </div>
      </form>
    </div>
  )
}
