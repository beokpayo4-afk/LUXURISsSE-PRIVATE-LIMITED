import { useState } from 'react'
import { useForm } from 'react-hook-form'
import AdminResourcePage from './AdminResourcePage'
import { createCategory, fetchCategories } from '../../api'
import { useToast } from '../../context/ToastContext'
import { slugify } from '../../utils/media'

export default function CategoriesAdminPage() {
  const toast = useToast()
  const [reloadKey, setReloadKey] = useState(0)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: { name: '', slug: '', description: '' },
  })

  const onSubmit = async (values) => {
    try {
      const name = values.name.trim()
      const slug = (values.slug || '').trim() || slugify(name)
      await createCategory({
        name,
        slug,
        description: values.description?.trim() || null,
        is_active: true,
      })
      toast.success('Category created')
      reset({ name: '', slug: '', description: '' })
      setReloadKey((k) => k + 1)
    } catch (err) {
      const detail = err?.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Could not create category')
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-slate-900">Add category</h2>
        <p className="mt-1 text-sm text-slate-500">Categories are required before creating tour packages.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Name *</span>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              {...register('name', { required: 'Name is required' })}
              onBlur={() => {
                const { name, slug } = getValues()
                if (!slug && name) setValue('slug', slugify(name))
              }}
            />
            {errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Slug</span>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" {...register('slug')} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Description</span>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" {...register('description')} />
          </label>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-3 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Create category'}
        </button>
      </form>

      <AdminResourcePage
        key={reloadKey}
        title="Categories"
        description="Tour categories from /api/v1/categories"
        fetcher={fetchCategories}
        searchKeys={['name', 'slug']}
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'slug', label: 'Slug' },
          { key: 'is_active', label: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
        ]}
      />
    </div>
  )
}
