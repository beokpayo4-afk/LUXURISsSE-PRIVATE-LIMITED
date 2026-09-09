import { Link } from 'react-router-dom'

export default function CustomerEnquiries() {
  return (
    <div>
      <h1 className="font-serif text-2xl">Enquiries</h1>
      <p className="mt-2 text-sm text-stone-600">
        Submit a new trip enquiry from the contact page. Admin responses and quotations will appear here in a later phase.
      </p>
      <Link to="/contact" className="inline-block mt-4 text-sm text-amber-800 underline">
        Go to contact form
      </Link>
    </div>
  )
}
