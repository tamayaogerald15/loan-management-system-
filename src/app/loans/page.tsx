'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

type Loan = {
  id: string
  principal_amount: number
  term_months: number
  status: string
  purpose: string | null
  borrowers: { full_name: string } | null
  loan_products: { name: string } | null
}

type Borrower = { id: string; full_name: string }
type LoanProduct = { id: string; name: string; min_amount: number; max_amount: number; min_term_months: number; max_term_months: number }

const statusMeta: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'b-gray' },
  submitted: { label: 'Submitted', cls: 'b-blue' },
  under_review: { label: 'Under Review', cls: 'b-amber' },
  approved: { label: 'Approved', cls: 'b-violet' },
  rejected: { label: 'Rejected', cls: 'b-rose' },
  released: { label: 'Released', cls: 'b-blue' },
  active: { label: 'Active', cls: 'b-emerald' },
  fully_paid: { label: 'Fully Paid', cls: 'b-emerald' },
  defaulted: { label: 'Defaulted', cls: 'b-rose' },
  written_off: { label: 'Written Off', cls: 'b-gray' },
  cancelled: { label: 'Cancelled', cls: 'b-gray' },
}

function peso(n: number) {
  return '₱' + Number(n).toLocaleString('en-PH')
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    borrower_id: '',
    loan_product_id: '',
    principal_amount: '',
    term_months: '',
    purpose: '',
  })

  async function loadAll() {
    setLoading(true)

    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .select('id, principal_amount, term_months, status, purpose, borrowers(full_name), loan_products(name)')
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })

    const { data: borrowerData } = await supabase
      .from('borrowers')
      .select('id, full_name')
      .eq('organization_id', ORG_ID)
      .eq('status', 'active')

    const { data: productData } = await supabase
      .from('loan_products')
      .select('id, name, min_amount, max_amount, min_term_months, max_term_months')
      .eq('organization_id', ORG_ID)
      .eq('is_active', true)

    if (loanError) setErrorMsg(loanError.message)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else setLoans((loanData as any) || [])

    setBorrowers(borrowerData || [])
    setProducts(productData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')

    // Guard: dapat within min/max range ng piniling product
    const product = products.find((p) => p.id === form.loan_product_id)
    const amount = Number(form.principal_amount)
    const term = Number(form.term_months)

    if (product) {
      if (amount < product.min_amount || amount > product.max_amount) {
        setErrorMsg(`Ang amount ay dapat nasa pagitan ng ${peso(product.min_amount)} - ${peso(product.max_amount)} para sa product na ito.`)
        setSaving(false)
        return
      }
      if (term < product.min_term_months || term > product.max_term_months) {
        setErrorMsg(`Ang term ay dapat nasa pagitan ng ${product.min_term_months}-${product.max_term_months} buwan para sa product na ito.`)
        setSaving(false)
        return
      }
    }

    const { error } = await supabase.from('loans').insert({
      organization_id: ORG_ID,
      borrower_id: form.borrower_id,
      loan_product_id: form.loan_product_id,
      principal_amount: amount,
      term_months: term,
      purpose: form.purpose || null,
      status: 'draft',
    })

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setForm({ borrower_id: '', loan_product_id: '', principal_amount: '', term_months: '', purpose: '' })
    setShowModal(false)
    setSaving(false)
    loadAll()
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Loans</div>
          <div className="page-subtitle">Manage loan applications from draft to release</div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          disabled={borrowers.length === 0 || products.length === 0}
        >
          <i className="bi bi-plus-lg"></i> New Loan Application
        </button>
      </div>

      {(borrowers.length === 0 || products.length === 0) && (
        <p style={{ color: 'var(--amber-700)', background: 'var(--amber-50)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          Kailangan mo munang gumawa ng kahit isang <Link href="/borrowers" style={{ textDecoration: 'underline' }}>borrower</Link> at isang{' '}
          <Link href="/products" style={{ textDecoration: 'underline' }}>loan product</Link> bago ka makagawa ng loan application.
        </p>
      )}

      {errorMsg && (
        <div style={{ color: 'var(--rose-700)', background: 'var(--rose-50)', border: '1px solid var(--rose-200)', padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="bi bi-exclamation-circle" style={{ fontSize: 15 }}></i>
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="table-wrap">
          <div style={{ padding: 24 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skeleton-table-row" style={{ marginBottom: 8 }}></div>
            ))}
          </div>
        </div>
      ) : loans.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <i className="bi bi-file-earmark-text"></i>
            <h4>Wala pang loan application</h4>
            <p>I-click ang &quot;New Loan Application&quot; para gumawa ng una.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Product</th>
                <th>Principal</th>
                <th>Term</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id} onClick={() => (window.location.href = `/loans/${l.id}`)}>
                  <td className="cell-strong">{l.borrowers?.full_name || '—'}</td>
                  <td>{l.loan_products?.name || '—'}</td>
                  <td>{peso(l.principal_amount)}</td>
                  <td>{l.term_months} mo</td>
                  <td>
                    <span className={`badge ${statusMeta[l.status]?.cls || 'b-gray'}`}>
                      {statusMeta[l.status]?.label || l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h3>New Loan Application</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Borrower</label>
                  <select className="form-select" name="borrower_id" value={form.borrower_id} onChange={handleChange} required>
                    <option value="">Select a borrower…</option>
                    {borrowers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Loan Product</label>
                  <select className="form-select" name="loan_product_id" value={form.loan_product_id} onChange={handleChange} required>
                    <option value="">Select a product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Principal Amount</label>
                    <input className="form-input" type="number" name="principal_amount" value={form.principal_amount} onChange={handleChange} placeholder="₱ 0.00" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Term (months)</label>
                    <input className="form-input" type="number" name="term_months" value={form.term_months} onChange={handleChange} placeholder="12" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Purpose</label>
                  <textarea className="form-textarea" rows={3} name="purpose" value={form.purpose} onChange={handleChange} placeholder="Working capital, tuition, etc."></textarea>
                </div>
                <div className="form-hint">The loan will be created in <b>Draft</b> status.</div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}