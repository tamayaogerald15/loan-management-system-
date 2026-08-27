'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

type Installment = {
  id: string
  loan_id: string
  installment_number: number
  due_date: string
  total_due: number
  amount_paid: number
  status: string
  loans: { id: string; borrowers: { full_name: string } | null } | null
}

type Payment = {
  id: string
  amount: number
  payment_method: string
  received_at: string
  status: string
  loans: { borrowers: { full_name: string } | null } | null
}

const statusMeta: Record<string, string> = {
  upcoming: 'b-gray',
  due: 'b-blue',
  partially_paid: 'b-amber',
  overdue: 'b-rose',
  paid: 'b-emerald',
}

function peso(n: number) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

function loanCode(id: string) {
  return 'LN-' + id.slice(0, 4).toUpperCase()
}

export default function CollectionsPage() {
  const [tab, setTab] = useState<'due_today' | 'overdue' | 'history' | 'penalties'>('overdue')
  const [search, setSearch] = useState('')
  const [installments, setInstallments] = useState<Installment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: scheduleData } = await supabase
        .from('payment_schedules')
        .select('id, loan_id, installment_number, due_date, total_due, amount_paid, status, loans(id, borrowers(full_name))')
        .eq('organization_id', ORG_ID)
        .neq('status', 'paid')
        .order('due_date', { ascending: true })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: paymentData } = await supabase
        .from('payments')
        .select('id, amount, payment_method, received_at, status, loans(borrowers(full_name))')
        .eq('organization_id', ORG_ID)
        .order('received_at', { ascending: false })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setInstallments((scheduleData as any) || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPayments((paymentData as any) || [])
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueToday = installments.filter((i) => {
    const d = new Date(i.due_date)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })

  const overdue = installments.filter((i) => {
    const d = new Date(i.due_date)
    d.setHours(0, 0, 0, 0)
    return d.getTime() < today.getTime()
  })

  function matchesSearch(name: string | undefined, loanId: string) {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (name || '').toLowerCase().includes(q) || loanCode(loanId).toLowerCase().includes(q)
  }

  const filteredDueToday = dueToday.filter((i) => matchesSearch(i.loans?.borrowers?.full_name, i.loan_id))
  const filteredOverdue = overdue.filter((i) => matchesSearch(i.loans?.borrowers?.full_name, i.loan_id))
  const filteredHistory = payments.filter((p) => matchesSearch(p.loans?.borrowers?.full_name, p.id))

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Collections</div>
          <div className="page-subtitle">Payments and penalties across all loans</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'due_today' ? 'active' : ''}`} onClick={() => setTab('due_today')}>
          Due Today
        </div>
        <div className={`tab ${tab === 'overdue' ? 'active' : ''}`} onClick={() => setTab('overdue')}>
          Overdue
        </div>
        <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          Payment History
        </div>
        <div className={`tab ${tab === 'penalties' ? 'active' : ''}`} onClick={() => setTab('penalties')}>
          Penalties
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <i className="bi bi-search"></i>
          <input placeholder="Search by loan ID or borrower..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="table-wrap">
          <div style={{ padding: 24 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skeleton-table-row" style={{ marginBottom: 8 }}></div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ---------- Due Today ---------- */}
          {tab === 'due_today' && (
            filteredDueToday.length === 0 ? (
              <div className="table-wrap">
                <div className="empty-state">
                  <i className="bi bi-calendar-check"></i>
                  <h4>Nothing due today</h4>
                  <p>No installments are due today.</p>
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Loan ID</th>
                      <th>Borrower</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDueToday.map((i) => (
                      <tr key={i.id} onClick={() => (window.location.href = `/loans/${i.loan_id}/schedule`)}>
                        <td className="cell-strong">{loanCode(i.loan_id)}</td>
                        <td>{i.loans?.borrowers?.full_name || '—'}</td>
                        <td>{peso(Number(i.total_due) - Number(i.amount_paid))}</td>
                        <td>
                          <span className={`badge ${statusMeta[i.status] || 'b-gray'}`}>
                            {i.status.charAt(0).toUpperCase() + i.status.slice(1).replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ---------- Overdue ---------- */}
          {tab === 'overdue' && (
            filteredOverdue.length === 0 ? (
              <div className="table-wrap">
                <div className="empty-state">
                  <i className="bi bi-check-circle"></i>
                  <h4>No overdue installments</h4>
                  <p>Everything is on track.</p>
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Loan ID</th>
                      <th>Borrower</th>
                      <th>Due Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOverdue.map((i) => (
                      <tr key={i.id} onClick={() => (window.location.href = `/loans/${i.loan_id}/schedule`)}>
                        <td className="cell-strong">{loanCode(i.loan_id)}</td>
                        <td>{i.loans?.borrowers?.full_name || '—'}</td>
                        <td>{new Date(i.due_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td>{peso(Number(i.total_due) - Number(i.amount_paid))}</td>
                        <td>
                          <span className="badge b-rose">Overdue</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ---------- Payment History ---------- */}
          {tab === 'history' && (
            filteredHistory.length === 0 ? (
              <div className="table-wrap">
                <div className="empty-state">
                  <i className="bi bi-clock-history"></i>
                  <h4>No payments recorded yet</h4>
                  <p>Payments will show up here once recorded.</p>
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Borrower</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Date Received</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((p) => (
                      <tr key={p.id}>
                        <td className="cell-strong">{p.loans?.borrowers?.full_name || '—'}</td>
                        <td>{peso(p.amount)}</td>
                        <td style={{ textTransform: 'capitalize' }}>{p.payment_method.replace('_', ' ')}</td>
                        <td>{new Date(p.received_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td>
                          <span className={`badge ${p.status === 'posted' ? 'b-emerald' : 'b-gray'}`}>
                            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ---------- Penalties (coming soon) ---------- */}
          {tab === 'penalties' && (
            <div className="table-wrap">
              <div className="empty-state">
                <i className="bi bi-exclamation-diamond"></i>
                <h4>No penalties applied yet</h4>
                <p>Penalty application and waiver is planned for a future update.</p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}