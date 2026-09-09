import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createTour,
  deleteTourImage,
  fetchCategories,
  fetchAdminDestinations,
  fetchTour,
  updateTour,
  uploadTourImages,
} from '../../api'
import { ErrorState, LoadingState } from '../../components/ui/Feedback'
import { useToast } from '../../context/ToastContext'
import { mediaUrl, slugify } from '../../utils/media'

const emptyForm = {
  title: '',
  code: '',
  slug: '',
  category_id: '',
  destination_id: '',
  duration_days: '',
  duration_nights: '',
  starting_price: '',
  mrp: '',
  discount: '',
  max_travellers: '',
  summary: '',
  description: '',
  highlights: '',
  hotel_information: '',
  meal_plan: '',
  transportation: '',
  activities: '',
  is_featured: false,
  is_published: false,
  status: 'draft',
  images: [],
  itineraries: [{ day_number: 1, title: '', description: '', meals: '', hotel: '', activities: '' }],
  inclusions: [{ item: '', sort_order: 0 }],
  exclusions: [{ item: '', sort_order: 0 }],
  pricing: [{ label: 'Standard', currency: 'INR', adult_price: '', child_price: '', infant_price: '', is_active: true }],
  departure_dates: [],
}

function toOptionalNumber(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function buildPayload(values) {
  const startingPrice = toOptionalNumber(values.starting_price)
  const pricingRows = (values.pricing || []).map((p) => ({
    label: p.label?.trim() || 'Standard',
    currency: p.currency?.trim() || 'INR',
    adult_price: toOptionalNumber(p.adult_price),
    child_price: toOptionalNumber(p.child_price),
    infant_price: toOptionalNumber(p.infant_price),
    is_active: p.is_active !== false,
  }))
  const firstAdult = pricingRows.find((p) => p.adult_price != null)?.adult_price ?? null
  return {
    title: values.title.trim(),
    code: values.code.trim(),
    slug: values.slug?.trim() || null,
    category_id: Number(values.category_id),
    destination_id: Number(values.destination_id),
    duration_days: toOptionalNumber(values.duration_days),
    duration_nights: toOptionalNumber(values.duration_nights),
    starting_price: startingPrice ?? firstAdult,
    mrp: toOptionalNumber(values.mrp),
    discount: toOptionalNumber(values.discount),
    max_travellers: toOptionalNumber(values.max_travellers),
    summary: values.summary || null,
    description: values.description || null,
    highlights: values.highlights || null,
    hotel_information: values.hotel_information || null,
    meal_plan: values.meal_plan || null,
    transportation: values.transportation || null,
    activities: values.activities || null,
    is_featured: Boolean(values.is_featured),
    is_published: Boolean(values.is_published),
    status: values.status,
    images: (values.images || [])
      .filter((img) => img.image_url?.trim())
      .map((img, idx) => ({
        image_url: img.image_url.trim(),
        alt_text: img.alt_text || null,
        sort_order: idx,
        is_cover: Boolean(img.is_cover),
      })),
    itineraries: (values.itineraries || [])
      .filter((d) => d.title?.trim())
      .map((d, idx) => ({
        day_number: Number(d.day_number) || idx + 1,
        title: d.title.trim(),
        description: d.description || null,
        meals: d.meals || null,
        hotel: d.hotel || null,
        activities: d.activities || null,
      })),
    inclusions: (values.inclusions || [])
      .filter((r) => r.item?.trim())
      .map((r, idx) => ({ item: r.item.trim(), sort_order: idx })),
    exclusions: (values.exclusions || [])
      .filter((r) => r.item?.trim())
      .map((r, idx) => ({ item: r.item.trim(), sort_order: idx })),
    pricing: pricingRows,
    departure_dates: (values.departure_dates || [])
      .filter((d) => d.departure_date)
      .map((d) => ({
        departure_date: d.departure_date,
        seats_total: toOptionalNumber(d.seats_total),
        seats_available: toOptionalNumber(d.seats_available),
        is_active: d.is_active !== false,
      })),
  }
}

function mapTourToForm(tour) {
  return {
    title: tour.title || '',
    code: tour.code || '',
    slug: tour.slug || '',
    category_id: String(tour.category_id || ''),
    destination_id: String(tour.destination_id || ''),
    duration_days: tour.duration_days ?? '',
    duration_nights: tour.duration_nights ?? '',
    starting_price: tour.starting_price ?? '',
    mrp: tour.mrp ?? '',
    discount: tour.discount ?? '',
    max_travellers: tour.max_travellers ?? '',
    summary: tour.summary || '',
    description: tour.description || '',
    highlights: tour.highlights || '',
    hotel_information: tour.hotel_information || '',
    meal_plan: tour.meal_plan || '',
    transportation: tour.transportation || '',
    activities: tour.activities || '',
    is_featured: Boolean(tour.is_featured),
    is_published: Boolean(tour.is_published),
    status: tour.status || 'draft',
    images: (tour.images || []).map((img) => ({
      id: img.id,
      image_url: img.image_url,
      alt_text: img.alt_text || '',
      is_cover: Boolean(img.is_cover),
    })),
    itineraries:
      tour.itineraries?.length > 0
        ? tour.itineraries.map((d) => ({
            day_number: d.day_number,
            title: d.title || '',
            description: d.description || '',
            meals: d.meals || '',
            hotel: d.hotel || '',
            activities: d.activities || '',
          }))
        : emptyForm.itineraries,
    inclusions:
      tour.inclusions?.length > 0
        ? tour.inclusions.map((r) => ({ item: r.item, sort_order: r.sort_order }))
        : emptyForm.inclusions,
    exclusions:
      tour.exclusions?.length > 0
        ? tour.exclusions.map((r) => ({ item: r.item, sort_order: r.sort_order }))
        : emptyForm.exclusions,
    pricing:
      tour.pricing?.length > 0
        ? tour.pricing.map((p) => ({
            label: p.label,
            currency: p.currency,
            adult_price: p.adult_price ?? '',
            child_price: p.child_price ?? '',
            infant_price: p.infant_price ?? '',
            is_active: p.is_active,
          }))
        : emptyForm.pricing,
    departure_dates: (tour.departure_dates || []).map((d) => ({
      departure_date: d.departure_date,
      seats_total: d.seats_total ?? '',
      seats_available: d.seats_available ?? '',
      is_active: d.is_active,
    })),
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

export default function TourFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const [bootLoading, setBootLoading] = useState(true)
  const [bootError, setBootError] = useState('')
  const [categories, setCategories] = useState([])
  const [destinations, setDestinations] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: emptyForm })

  const itineraries = useFieldArray({ control, name: 'itineraries' })
  const inclusions = useFieldArray({ control, name: 'inclusions' })
  const exclusions = useFieldArray({ control, name: 'exclusions' })
  const pricing = useFieldArray({ control, name: 'pricing' })
  const departures = useFieldArray({ control, name: 'departure_dates' })
  const images = useFieldArray({ control, name: 'images' })

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchCategories(), fetchAdminDestinations(), isEdit ? fetchTour(id) : Promise.resolve(null)])
      .then(([cats, dests, tour]) => {
        if (cancelled) return
        setCategories(cats)
        setDestinations(dests)
        if (tour) {
          reset(mapTourToForm(tour))
        } else {
          const defaults = { ...emptyForm }
          if (cats.length === 1) defaults.category_id = String(cats[0].id)
          if (dests.length === 1) defaults.destination_id = String(dests[0].id)
          reset(defaults)
        }
      })
      .catch(() => {
        if (!cancelled) setBootError('Could not load tour form data.')
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
      if (!payload.category_id || !payload.destination_id) {
        toast.error('Category and destination are required')
        return
      }
      let tour
      if (isEdit) {
        tour = await updateTour(id, payload)
        toast.success('Tour updated')
      } else {
        tour = await createTour(payload)
        toast.success('Tour package created')
      }
      if (pendingFiles.length) {
        await uploadTourImages(tour.id, pendingFiles, true)
        setPendingFiles([])
        toast.success('Images uploaded')
      }
      navigate(`/admin/tours/${tour.id}`)
      if (isEdit) {
        const refreshed = await fetchTour(tour.id)
        reset(mapTourToForm(refreshed))
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
        const tour = await deleteTourImage(id, row.id)
        reset(mapTourToForm(tour))
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
    <div className="mx-auto max-w-5xl pb-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-slate-900">
            {isEdit ? 'Edit Tour Package' : 'Add Tour Package'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Fill package details, pricing, itinerary, inclusions, images, then save. Publish when ready.
          </p>
        </div>
        <Link to="/admin/tours" className="text-sm text-violet-700 hover:underline">
          Back to tours
        </Link>
      </div>

      {(categories.length === 0 || destinations.length === 0) && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {categories.length === 0 && (
            <p>
              Create at least one category before saving a tour.{' '}
              <Link to="/admin/categories" className="underline">
                Open Categories
              </Link>
            </p>
          )}
          {destinations.length === 0 && (
            <p>
              Create at least one destination before saving a tour.{' '}
              <Link to="/admin/destinations/new" className="underline">
                Add Destination
              </Link>
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <section className={sectionClass}>
          <h2 className="font-medium text-slate-900">1. Package details</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Package Name" required error={errors.title?.message}>
              <input
                className={inputClass}
                {...register('title', { required: 'Tour name is required' })}
                onBlur={() => {
                  const { title, slug } = getValues()
                  if (!slug && title) setValue('slug', slugify(title))
                }}
              />
            </Field>
            <Field label="Tour Code / SKU" required error={errors.code?.message}>
              <input className={inputClass} {...register('code', { required: 'Tour code/SKU is required' })} />
            </Field>
            <Field label="Slug" error={errors.slug?.message}>
              <input className={inputClass} {...register('slug')} placeholder="auto from name if empty" />
            </Field>
            <Field label="Category" required error={errors.category_id?.message}>
              <select className={inputClass} {...register('category_id', { required: 'Category is required' })}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Destination" required error={errors.destination_id?.message}>
              <select className={inputClass} {...register('destination_id', { required: 'Destination is required' })}>
                <option value="">Select destination ({destinations.length})</option>
                {[...destinations]
                  .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                  .map((d) => {
                    const place = [d.city_name, d.state].filter(Boolean).join(', ')
                    return (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {place && place !== d.name ? ` — ${place}` : ''}
                      </option>
                    )
                  })}
              </select>
            </Field>
            <Field label="Duration (days)">
              <input type="number" min="1" className={inputClass} {...register('duration_days')} />
            </Field>
            <Field label="Duration (nights)">
              <input type="number" min="0" className={inputClass} {...register('duration_nights')} />
            </Field>
            <Field label="Max travellers">
              <input type="number" min="1" className={inputClass} {...register('max_travellers')} />
            </Field>
            <Field label="Meal plan">
              <input className={inputClass} {...register('meal_plan')} placeholder="e.g. MAP / CP / EP" />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-slate-900">2. Pricing (₹ INR)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Starting price appears on the public tours page. Adult / child / infant are used for package tiers.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="Starting price (₹)" required>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                placeholder="e.g. 12999"
                {...register('starting_price')}
              />
            </Field>
            <Field label="MRP (₹)">
              <input type="number" min="0" step="0.01" className={inputClass} {...register('mrp')} />
            </Field>
            <Field label="Discount (₹)">
              <input type="number" min="0" step="0.01" className={inputClass} {...register('discount')} />
            </Field>
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Price tiers</p>
            {pricing.fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded-lg border border-slate-100 p-3 md:grid-cols-6">
                <input className={inputClass} placeholder="Label" {...register(`pricing.${index}.label`)} />
                <input className={inputClass} placeholder="Currency" {...register(`pricing.${index}.currency`)} />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  placeholder="Adult ₹"
                  {...register(`pricing.${index}.adult_price`)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  placeholder="Child ₹"
                  {...register(`pricing.${index}.child_price`)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  placeholder="Infant ₹"
                  {...register(`pricing.${index}.infant_price`)}
                />
                <button type="button" className="text-sm text-red-700" onClick={() => pricing.remove(index)}>
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-amber-700"
              onClick={() =>
                pricing.append({
                  label: 'Standard',
                  currency: 'INR',
                  adult_price: '',
                  child_price: '',
                  infant_price: '',
                  is_active: true,
                })
              }
            >
              + Add pricing tier
            </button>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-slate-900">3. Descriptions</h2>
          <div className="mt-4 grid gap-3">
            <Field label="Short description">
              <textarea rows={2} className={inputClass} {...register('summary')} />
            </Field>
            <Field label="Full description">
              <textarea rows={5} className={inputClass} {...register('description')} />
            </Field>
            <Field label="Highlights">
              <textarea rows={3} className={inputClass} {...register('highlights')} />
            </Field>
            <Field label="Hotel information">
              <textarea rows={3} className={inputClass} {...register('hotel_information')} />
            </Field>
            <Field label="Transportation">
              <textarea rows={2} className={inputClass} {...register('transportation')} />
            </Field>
            <Field label="Activities">
              <textarea rows={2} className={inputClass} {...register('activities')} />
            </Field>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-slate-900">4. Publishing</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
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
              Featured tour
            </label>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-slate-900">5. Tour images</h2>
          <div className="mt-3 space-y-3">
            {images.fields.map((field, index) => (
              <div key={field.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 p-3">
                {field.image_url && (
                  <img src={mediaUrl(field.image_url)} alt="" className="h-14 w-20 rounded object-cover" />
                )}
                <input className={`${inputClass} min-w-[14rem] flex-1`} placeholder="Image URL" {...register(`images.${index}.image_url`)} />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" {...register(`images.${index}.is_cover`)} />
                  Cover
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
            <h2 className="font-medium text-slate-900">6. Itinerary</h2>
            <button
              type="button"
              className="text-sm text-amber-700"
              onClick={() =>
                itineraries.append({
                  day_number: itineraries.fields.length + 1,
                  title: '',
                  description: '',
                  meals: '',
                  hotel: '',
                  activities: '',
                })
              }
            >
              + Add day
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {itineraries.fields.map((field, index) => (
              <div key={field.id} className="rounded-lg border border-slate-100 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">Day {index + 1}</p>
                  <button type="button" className="text-xs text-red-700" onClick={() => itineraries.remove(index)}>
                    Remove
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input type="number" min="1" className={inputClass} placeholder="Day number" {...register(`itineraries.${index}.day_number`, { valueAsNumber: true })} />
                  <input className={inputClass} placeholder="Title *" {...register(`itineraries.${index}.title`)} />
                  <input className={inputClass} placeholder="Meals" {...register(`itineraries.${index}.meals`)} />
                  <input className={inputClass} placeholder="Hotel" {...register(`itineraries.${index}.hotel`)} />
                  <textarea rows={2} className={`${inputClass} md:col-span-2`} placeholder="Description" {...register(`itineraries.${index}.description`)} />
                  <textarea rows={2} className={`${inputClass} md:col-span-2`} placeholder="Activities" {...register(`itineraries.${index}.activities`)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-slate-900">7. Inclusions</h2>
          <div className="mt-3 space-y-2">
            {inclusions.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input className={inputClass} placeholder="Inclusion item" {...register(`inclusions.${index}.item`)} />
                <button type="button" className="text-sm text-red-700" onClick={() => inclusions.remove(index)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="text-sm text-amber-700" onClick={() => inclusions.append({ item: '', sort_order: inclusions.fields.length })}>
              + Add inclusion
            </button>
          </div>
        </section>

        <section className={sectionClass}>
          <h2 className="font-medium text-slate-900">8. Exclusions</h2>
          <div className="mt-3 space-y-2">
            {exclusions.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input className={inputClass} placeholder="Exclusion item" {...register(`exclusions.${index}.item`)} />
                <button type="button" className="text-sm text-red-700" onClick={() => exclusions.remove(index)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="text-sm text-amber-700" onClick={() => exclusions.append({ item: '', sort_order: exclusions.fields.length })}>
              + Add exclusion
            </button>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-900">9. Departure dates</h2>
            <button
              type="button"
              className="text-sm text-amber-700"
              onClick={() =>
                departures.append({
                  departure_date: '',
                  seats_total: '',
                  seats_available: '',
                  is_active: true,
                })
              }
            >
              + Add date
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {departures.fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 md:grid-cols-4">
                <input type="date" className={inputClass} {...register(`departure_dates.${index}.departure_date`)} />
                <input type="number" min="0" className={inputClass} placeholder="Seats total" {...register(`departure_dates.${index}.seats_total`)} />
                <input type="number" min="0" className={inputClass} placeholder="Seats available" {...register(`departure_dates.${index}.seats_available`)} />
                <button type="button" className="text-sm text-red-700" onClick={() => departures.remove(index)}>
                  Remove
                </button>
              </div>
            ))}
            {departures.fields.length === 0 && <p className="text-sm text-slate-500">No departure dates yet.</p>}
          </div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-72">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Required: Package Name, Code/SKU, Category, Destination
            </p>
            <div className="flex gap-2">
              <Link to="/admin/tours" className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : isEdit ? 'Update tour package' : 'Create tour package'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
