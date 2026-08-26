'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Installment = {
  id: string
  installment_number: number
  due_date: string
  principal_due: number
  interest_due: number
  total_due: number
  amount_paid: number
  status: string
}

type Loan = {
  id: string
  status: string
  principal_amount: number
  borrowers: { full_name: string } | null
}

const statusMeta: Record<string, string> = {
  upcoming: 'b-gray',
  due: 'b-blue',
  partially_paid: 'b-amber',
  paid: 'b-emerald',
  overdue: 'b-rose',
}

function peso(n: number) {
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

export default function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [loan, setLoan] = useState<Loan | null>(null)
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const [payModalFor, setPayModalFor] = useState<Installment | null>(null)
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    received_at: new Date().toISOString().slice(0, 10),
  })

  async function loadData() {
    setLoading(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: loanData } = await supabase
      .from('loans')
      .select('id, status, principal_amount, borrowers(full_name)')
      .eq('id', id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setLoan(loanData as any)

    const { data: scheduleData } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('loan_id', id)
      .order('installment_number', { ascending: true })

    setInstallments(scheduleData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function openPayModal(inst: Installment) {
    const remaining = Number(inst.total_due) - Number(inst.amount_paid)
    setPayForm({
      amount: remaining.toFixed(2),
      payment_method: 'cash',
      reference_number: '',
      received_at: new Date().toISOString().slice(0, 10),
    })
    setPayModalFor(inst)
    setErrorMsg('')
  }

  async function getFirstUserId() {
    const { data } = await supabase.from('users').select('id').limit(1).single()
    return data?.id
  }

  async function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!payModalFor) return
    setBusy(true)
    setErrorMsg('')

    const recordedBy = await getFirstUserId()

    const { error } = await supabase.rpc('record_payment', {
      p_schedule_id: payModalFor.id,
      p_amount: Number(payForm.amount),
      p_method: payForm.payment_method,
      p_reference: payForm.reference_number,
      p_received_at: new Date(payForm.received_at).toISOString(),
      p_recorded_by: recordedBy,
    })

    if (error) {
      setErrorMsg(error.message)
      setBusy(false)
      return
    }

    setPayModalFor(null)
    setBusy(false)
    await loadData()
  }

  if (loading) return <p>Loading...</p>

  const totalDue = installments.reduce((sum, i) => sum + Number(i.total_due), 0)
  const totalPaid = installments.reduce((sum, i) => sum + Number(i.amount_paid), 0)

  return (
    <>
      <div className="breadcrumb">
        <Link href="/loans">Loans</Link> <i className="bi bi-chevron-right" style={{ fontSize: 10 }}></i>{' '}
        <Link href={`/loans/${id}`}>{id.slice(0, 8)}</Link> <i className="bi bi-chevron-right" style={{ fontSize: 10 }}></i> Schedule
      </div>

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">
            Payment Schedule {loan?.status === 'fully_paid' && <span className="badge b-emerald">Fully Paid</span>}
          </div>
          <div className="page-subtitle">{loan?.borrowers?.full_name} · {peso(loan?.principal_amount || 0)} principal</div>
        </div>
      </div>

      {errorMsg && (
        <p style={{ color: 'var(--rose-600)', background: 'var(--rose-50)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {errorMsg}
        </p>
      )}

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-icon tint-blue"><i className="bi bi-calendar-check"></i></div>
          <div className="kpi-value">{installments.length}</div>
          <div className="kpi-label">Total Installments</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon tint-emerald"><i className="bi bi-cash"></i></div>
          <div className="kpi-value">{peso(totalDue)}</div>
          <div className="kpi-label">Total Due (Principal + Interest)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon tint-amber"><i className="bi bi-hourglass-split"></i></div>
          <div className="kpi-value">{peso(totalPaid)}</div>
          <div className="kpi-label">Total Paid So Far</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Due Date</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Total Due</th>
              <th>Paid</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {installments.map((i) => (
              <tr key={i.id}>
                <td className="cell-strong">{i.installment_number}</td>
                <td>{new Date(i.due_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                <td>{peso(i.principal_due)}</td>
                <td>{peso(i.interest_due)}</td>
                <td className="cell-strong">{peso(i.total_due)}</td>
                <td>{peso(i.amount_paid)}</td>
                <td>
                  <span className={`badge ${statusMeta[i.status] || 'b-gray'}`}>
                    {i.status.charAt(0).toUpperCase() + i.status.slice(1).replace('_', ' ')}
                  </span>
                </td>
                <td>
                  {i.status !== 'paid' && (
                    <button className="btn btn-sm btn-primary" onClick={() => openPayModal(i)}>
                      Record Payment
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payModalFor && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h3>Record Payment — Installment #{payModalFor.installment_number}</h3>
              <button className="modal-close" onClick={() => setPayModalFor(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handlePaySubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount</label>
                    <input className="form-input" type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                      <option value="check">Check</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Reference Number</label>
                    <input className="form-input" value={payForm.reference_number} onChange={(e) => setPayForm({ ...payForm, reference_number: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date Received</label>
                    <input className="form-input" type="date" value={payForm.received_at} onChange={(e) => setPayForm({ ...payForm, received_at: e.target.value })} required />
                  </div>
                </div>
                <div className="form-hint">
                  Natitirang balanse sa installment na ito: {peso(Number(payModalFor.total_due) - Number(payModalFor.amount_paid))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPayModalFor(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Posting...' : 'Post Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}