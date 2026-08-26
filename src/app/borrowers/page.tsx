'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

type Borrower = {
  id: string
  full_name: string
  date_of_birth: string
  national_id_number: string
  email: string | null
  phone: string
  address: string
  employment_status: string
  monthly_income: number
  status: string
}

const statusBadge: Record<string, string> = {
  active: 'b-emerald',
  inactive: 'b-gray',
  blacklisted: 'b-rose',
}

const tabDefs: [string, string][] = [
  ['all', 'All Borrowers'],
  ['active', 'Active'],
  ['blacklisted', 'Blacklisted'],
]

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function peso(n: number) {
  return '₱' + Number(n).toLocaleString('en-PH')
}

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    national_id_number: '',
    email: '',
    phone: '',
    address: '',
    employment_status: 'employed',
    monthly_income: '',
  })

  async function loadBorrowers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('borrowers')
      .select('*')
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })

    if (error) setErrorMsg(error.message)
    else setBorrowers(data as Borrower[])
    setLoading(false)
  }

  useEffect(() => {
    loadBorrowers()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')

    const { error } = await supabase.from('borrowers').insert({
      organization_id: ORG_ID,
      full_name: form.full_name,
      date_of_birth: form.date_of_birth,
      national_id_number: form.national_id_number,
      email: form.email || null,
      phone: form.phone,
      address: form.address,
      employment_status: form.employment_status,
      monthly_income: Number(form.monthly_income),
      status: 'active',
    })

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setForm({
      full_name: '',
      date_of_birth: '',
      national_id_number: '',
      email: '',
      phone: '',
      address: '',
      employment_status: 'employed',
      monthly_income: '',
    })
    setShowModal(false)
    setSaving(false)
    loadBorrowers()
  }

  // I-filter base sa tab (status) at search text
  const filtered = borrowers.filter((b) => {
    const matchesTab = activeTab === 'all' || b.status === activeTab
    const q = search.trim().toLowerCase()
    const matchesSearch =
      q === '' ||
      b.full_name.toLowerCase().includes(q) ||
      b.phone.toLowerCase().includes(q) ||
      b.national_id_number.toLowerCase().includes(q)
    return matchesTab && matchesSearch
  })

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Borrowers</div>
          <div className="page-subtitle">{borrowers.length} borrower profiles</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg"></i> Add Borrower
        </button>
      </div>

      <div className="tabs">
        {tabDefs.map(([key, label]) => (
          <div key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            {label}
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <i className="bi bi-search"></i>
          <input placeholder="Search by name, phone, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {errorMsg && (
        <p style={{ color: 'var(--rose-600)', background: 'var(--rose-50)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {errorMsg}
        </p>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="table-wrap">
          <div className="empty-state">
            <i className="bi bi-people"></i>
            <h4>Walang nahanap na borrower</h4>
            <p>Subukan mong palitan ang search o tab, o magdagdag ng bagong borrower.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Phone</th>
                <th>Employment</th>
                <th>Monthly Income</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ background: 'var(--blue-600)' }}>
                        {initials(b.full_name)}
                      </div>
                      <div>
                        <div className="cell-strong">{b.full_name}</div>
                        <div className="cell-sub">{b.national_id_number}</div>
                      </div>
                    </div>
                  </td>
                  <td>{b.phone}</td>
                  <td style={{ textTransform: 'capitalize' }}>{b.employment_status.replace('_', ' ')}</td>
                  <td>{peso(b.monthly_income)}</td>
                  <td>
                    <span className={`badge ${statusBadge[b.status] || 'b-gray'}`}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
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
              <h3>New Borrower</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input className="form-input" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Juan dela Cruz" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input className="form-input" type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} required />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">National ID Number</label>
                  <input className="form-input" name="national_id_number" value={form.national_id_number} onChange={handleChange} placeholder="0000-0000000-0" required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" name="phone" value={form.phone} onChange={handleChange} placeholder="0917 000 0000" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@email.com" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" name="address" value={form.address} onChange={handleChange} placeholder="Street, City, Province" required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Employment Status</label>
                    <select className="form-select" name="employment_status" value={form.employment_status} onChange={handleChange}>
                      <option value="employed">Employed</option>
                      <option value="self_employed">Self-employed</option>
                      <option value="unemployed">Unemployed</option>
                      <option value="retired">Retired</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Income</label>
                    <input className="form-input" type="number" name="monthly_income" value={form.monthly_income} onChange={handleChange} placeholder="₱ 0.00" required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Borrower'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}