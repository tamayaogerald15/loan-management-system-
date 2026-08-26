'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

type LoanProduct = {
  id: string
  name: string
  interest_rate: number
  interest_type: string
  min_amount: number
  max_amount: number
  min_term_months: number
  max_term_months: number
  penalty_rate: number
  is_active: boolean
}

function peso(n: number) {
  return '₱' + Number(n).toLocaleString('en-PH')
}

export default function ProductsPage() {
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    interest_rate: '',
    interest_type: 'declining_balance',
    min_amount: '',
    max_amount: '',
    min_term_months: '',
    max_term_months: '',
    penalty_rate: '',
  })

  async function loadProducts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('loan_products')
      .select('*')
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })

    if (error) setErrorMsg(error.message)
    else setProducts(data as LoanProduct[])
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')

    const { error } = await supabase.from('loan_products').insert({
      organization_id: ORG_ID,
      name: form.name,
      interest_rate: Number(form.interest_rate),
      interest_type: form.interest_type,
      min_amount: Number(form.min_amount),
      max_amount: Number(form.max_amount),
      min_term_months: Number(form.min_term_months),
      max_term_months: Number(form.max_term_months),
      penalty_rate: Number(form.penalty_rate || 0),
      is_active: true,
    })

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setForm({
      name: '',
      interest_rate: '',
      interest_type: 'declining_balance',
      min_amount: '',
      max_amount: '',
      min_term_months: '',
      max_term_months: '',
      penalty_rate: '',
    })
    setShowModal(false)
    setSaving(false)
    loadProducts()
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Loan Products</div>
          <div className="page-subtitle">Configure the loan offerings for your organization</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> New Product
        </button>
      </div>

      {errorMsg && (
        <p style={{ color: 'var(--rose-600)', background: 'var(--rose-50)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {errorMsg}
        </p>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : products.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <i className="bi bi-boxes"></i>
            <h4>Wala pang loan product</h4>
            <p>I-click ang &quot;New Product&quot; para gumawa ng una mong loan product.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Interest Rate</th>
                <th>Type</th>
                <th>Amount Range</th>
                <th>Term</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="cell-strong">{p.name}</td>
                  <td>{p.interest_rate}%/mo</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.interest_type.replace('_', ' ')}</td>
                  <td>
                    {peso(p.min_amount)} – {peso(p.max_amount)}
                  </td>
                  <td>
                    {p.min_term_months}–{p.max_term_months} mo
                  </td>
                  <td>
                    <span className={`badge ${p.is_active ? 'b-emerald' : 'b-gray'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
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
              <h3>New Loan Product</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Salary Loan" required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Interest Rate (% / month)</label>
                    <input className="form-input" type="number" step="0.01" name="interest_rate" value={form.interest_rate} onChange={handleChange} placeholder="2.5" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interest Type</label>
                    <select className="form-select" name="interest_type" value={form.interest_type} onChange={handleChange}>
                      <option value="declining_balance">Declining Balance</option>
                      <option value="flat">Flat</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Min Amount</label>
                    <input className="form-input" type="number" name="min_amount" value={form.min_amount} onChange={handleChange} placeholder="₱ 0.00" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Amount</label>
                    <input className="form-input" type="number" name="max_amount" value={form.max_amount} onChange={handleChange} placeholder="₱ 0.00" required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Min Term (months)</label>
                    <input className="form-input" type="number" name="min_term_months" value={form.min_term_months} onChange={handleChange} placeholder="6" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Max Term (months)</label>
                    <input className="form-input" type="number" name="max_term_months" value={form.max_term_months} onChange={handleChange} placeholder="24" required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Penalty Rate (% per overdue installment)</label>
                  <input className="form-input" type="number" step="0.01" name="penalty_rate" value={form.penalty_rate} onChange={handleChange} placeholder="1.0" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}