'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

type Loan = {
  id: string
  principal_amount: number
  interest_rate_snapshot: number | null
  term_months: number
  purpose: string | null
  status: string
  rejection_reason: string | null
  borrowers: { id: string; full_name: string; status: string } | null
  loan_products: { id: string; name: string; interest_rate: number } | null
}

type Assessment = {
  id: string
  credit_score: number | null
  debt_to_income_ratio: number | null
  recommendation: string
  notes: string
  assessed_at: string
}

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

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [loan, setLoan] = useState<Loan | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const [showAssessModal, setShowAssessModal] = useState(false)
  const [assessForm, setAssessForm] = useState({
    credit_score: '',
    debt_to_income_ratio: '',
    recommendation: 'approve',
    notes: '',
  })

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  async function loadLoan() {
    setLoading(true)
    const { data, error } = await supabase
      .from('loans')
      .select('*, borrowers(id, full_name, status), loan_products(id, name, interest_rate)')
      .eq('id', id)
      .single()

    if (error) {
      setErrorMsg(error.message)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLoan(data as any)
    }

    const { data: assessData } = await supabase
      .from('credit_assessments')
      .select('*')
      .eq('loan_id', id)
      .order('assessed_at', { ascending: false })

    setAssessments(assessData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadLoan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSubmitLoan() {
    if (!loan) return
    setBusy(true)
    setErrorMsg('')

    if (loan.borrowers?.status !== 'active') {
      setErrorMsg('Ang borrower ay hindi active. Hindi maaaring i-submit ang loan.')
      setBusy(false)
      return
    }

    const { error } = await supabase.from('loans').update({ status: 'submitted' }).eq('id', loan.id)
    if (error) setErrorMsg(error.message)
    else await loadLoan()
    setBusy(false)
  }

  async function handleAssessmentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!loan) return
    setBusy(true)
    setErrorMsg('')

    const { error } = await supabase.from('credit_assessments').insert({
      organization_id: '00000000-0000-0000-0000-000000000001',
      loan_id: loan.id,
      assessed_by: (await getFirstUserId()),
      credit_score: assessForm.credit_score ? Number(assessForm.credit_score) : null,
      debt_to_income_ratio: assessForm.debt_to_income_ratio ? Number(assessForm.debt_to_income_ratio) : null,
      recommendation: assessForm.recommendation,
      notes: assessForm.notes,
    })

    if (error) {
      setErrorMsg(error.message)
      setBusy(false)
      return
    }

    if (loan.status === 'submitted') {
      await supabase.from('loans').update({ status: 'under_review' }).eq('id', loan.id)
    }

    setAssessForm({ credit_score: '', debt_to_income_ratio: '', recommendation: 'approve', notes: '' })
    setShowAssessModal(false)
    setBusy(false)
    await loadLoan()
  }

  async function handleApprove() {
    if (!loan || !loan.loan_products) return
    if (!isAdmin) {
      setErrorMsg('Only Admin can approve loans.')
      return
    }
    setBusy(true)
    setErrorMsg('')

    const hasApproval = assessments.some((a) => a.recommendation === 'approve')
    if (!hasApproval) {
      setErrorMsg('Kailangan muna ng credit assessment na may recommendation na "Approve" bago ma-approve ang loan.')
      setBusy(false)
      return
    }

    const { error } = await supabase
      .from('loans')
      .update({
        status: 'approved',
        interest_rate_snapshot: loan.loan_products.interest_rate,
        approved_at: new Date().toISOString(),
      })
      .eq('id', loan.id)

    if (error) setErrorMsg(error.message)
    else await loadLoan()
    setBusy(false)
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault()
    if (!loan) return
    if (!isAdmin) {
      setErrorMsg('Only Admin can reject loans.')
      return
    }
    setBusy(true)
    setErrorMsg('')

    const { error } = await supabase
      .from('loans')
      .update({ status: 'rejected', rejection_reason: rejectReason })
      .eq('id', loan.id)

    if (error) setErrorMsg(error.message)
    else {
      setShowRejectModal(false)
      await loadLoan()
    }
    setBusy(false)
  }

  async function handleRelease() {
    if (!loan) return
    if (!isAdmin) {
      setErrorMsg('Only Admin can release loans.')
      return
    }
    setBusy(true)
    setErrorMsg('')

    const { error } = await supabase.rpc('release_loan', { p_loan_id: loan.id })

    if (error) setErrorMsg(error.message)
    else await loadLoan()
    setBusy(false)
  }

  async function getFirstUserId() {
    const { data } = await supabase.from('users').select('id').limit(1).single()
    return data?.id
  }

  if (loading) {
    return (
      <>
        <div className="breadcrumb"><Link href="/loans">Loans</Link> <i className="bi bi-chevron-right" style={{ fontSize: 10 }}></i> ...</div>
        <div className="page-header"><div className="page-header-left"><div className="skeleton skeleton-line h-20 w-60" style={{ height: 24, marginBottom: 8 }}></div><div className="skeleton skeleton-line w-40" style={{ height: 14 }}></div></div></div>
        <div className="detail-grid">
          <div className="panel"><div className="skeleton skeleton-card" style={{ height: 280 }}></div></div>
          <div className="panel"><div className="skeleton skeleton-card" style={{ height: 120 }}></div></div>
        </div>
      </>
    )
  }

  if (!loan) return <p>Loan not found.</p>

  return (
    <>
      <div className="breadcrumb">
        <Link href="/loans">Loans</Link> <i className="bi bi-chevron-right" style={{ fontSize: 10 }}></i> {loan.id.slice(0, 8)}
      </div>

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">
            {loan.borrowers?.full_name} <span className={`badge ${statusMeta[loan.status]?.cls}`}>{statusMeta[loan.status]?.label}</span>
          </div>
          <div className="page-subtitle">{loan.loan_products?.name} · {peso(loan.principal_amount)} · {loan.term_months} months</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {loan.status === 'draft' && (
            <button className="btn btn-primary" onClick={handleSubmitLoan} disabled={busy}>
              <i className="bi bi-send"></i> Submit Application
            </button>
          )}
          {(loan.status === 'submitted' || loan.status === 'under_review') && (
            <button className="btn btn-secondary" onClick={() => setShowAssessModal(true)} disabled={busy}>
              <i className="bi bi-clipboard-check"></i> Record Credit Assessment
            </button>
          )}
          {loan.status === 'under_review' && isAdmin && (
            <>
              <button className="btn btn-danger" onClick={() => setShowRejectModal(true)} disabled={busy}>
                <i className="bi bi-x-lg"></i> Reject
              </button>
              <button className="btn btn-success" onClick={handleApprove} disabled={busy}>
                <i className="bi bi-check-lg"></i> Approve
              </button>
            </>
          )}
          {loan.status === 'under_review' && !isAdmin && (
            <span className="badge b-gray">Waiting for Admin approval</span>
          )}
          {loan.status === 'approved' && isAdmin && (
            <button className="btn btn-primary" onClick={handleRelease} disabled={busy}>
              {busy ? 'Releasing...' : <><i className="bi bi-cash"></i> Release Loan</>}
            </button>
          )}
          {loan.status === 'approved' && !isAdmin && (
            <span className="badge b-gray">Waiting for Admin to release</span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div style={{ color: 'var(--rose-700)', background: 'var(--rose-50)', border: '1px solid var(--rose-200)', padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="bi bi-exclamation-circle" style={{ fontSize: 15 }}></i>
          {errorMsg}
        </div>
      )}

      <div className="detail-grid">
        <div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="section-title">Loan Details</div>
            <div className="info-row"><span className="k">Borrower</span><span className="v">{loan.borrowers?.full_name}</span></div>
            <div className="info-row"><span className="k">Product</span><span className="v">{loan.loan_products?.name}</span></div>
            <div className="info-row"><span className="k">Principal Amount</span><span className="v">{peso(loan.principal_amount)}</span></div>
            <div className="info-row"><span className="k">Term</span><span className="v">{loan.term_months} months</span></div>
            <div className="info-row"><span className="k">Interest Rate</span><span className="v">{loan.interest_rate_snapshot ?? loan.loan_products?.interest_rate}%/mo</span></div>
            <div className="info-row"><span className="k">Purpose</span><span className="v">{loan.purpose || '—'}</span></div>
            {loan.status === 'rejected' && (
              <div className="info-row"><span className="k">Rejection Reason</span><span className="v" style={{ color: 'var(--rose-600)' }}>{loan.rejection_reason}</span></div>
            )}
          </div>

          <div className="panel">
            <div className="section-title">Credit Assessments</div>
            {assessments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <i className="bi bi-clipboard-data" style={{ fontSize: 28, color: 'var(--gray-300)' }}></i>
                <p style={{ color: 'var(--gray-500)', fontSize: 13, marginTop: 8 }}>No assessment recorded yet.</p>
              </div>
            ) : (
              <div className="timeline">
                {assessments.map((a) => (
                  <div className="tl-item" key={a.id}>
                    <div className="tl-dot" style={{ background: a.recommendation === 'approve' ? 'var(--emerald-600)' : a.recommendation === 'reject' ? 'var(--rose-600)' : 'var(--amber-600)' }}></div>
                    <div>
                      <div className="tl-title">
                        {a.recommendation === 'approve' ? 'Recommended: Approve' : a.recommendation === 'reject' ? 'Recommended: Reject' : 'Needs more info'}
                        {a.credit_score && <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}> · Score: {a.credit_score}</span>}
                      </div>
                      <div className="tl-sub">{a.notes}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="panel" style={{ height: 'fit-content' }}>
          <div className="section-title">Status</div>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <span className={`badge ${statusMeta[loan.status]?.cls}`} style={{ fontSize: 14, padding: '8px 18px' }}>
              {statusMeta[loan.status]?.label}
            </span>
          </div>
          {loan.status === 'active' && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link href={`/loans/${loan.id}/schedule`} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                <i className="bi bi-calendar-check"></i> View Payment Schedule
              </Link>
            </div>
          )}
          {loan.status === 'draft' && (
            <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--gray-400)', textAlign: 'center' }}>
              Submit this application to begin the review process.
            </p>
          )}
        </div>
      </div>

      {showAssessModal && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h3>Record Credit Assessment</h3>
              <button className="modal-close" onClick={() => setShowAssessModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleAssessmentSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Credit Score (optional)</label>
                    <input className="form-input" type="number" value={assessForm.credit_score} onChange={(e) => setAssessForm({ ...assessForm, credit_score: e.target.value })} placeholder="e.g. 750" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Debt-to-Income Ratio (optional)</label>
                    <input className="form-input" type="number" step="0.01" value={assessForm.debt_to_income_ratio} onChange={(e) => setAssessForm({ ...assessForm, debt_to_income_ratio: e.target.value })} placeholder="e.g. 0.35" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Recommendation</label>
                  <select className="form-select" value={assessForm.recommendation} onChange={(e) => setAssessForm({ ...assessForm, recommendation: e.target.value })}>
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                    <option value="needs_more_info">Needs more info</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={4} required value={assessForm.notes} onChange={(e) => setAssessForm({ ...assessForm, notes: e.target.value })} placeholder="Describe the assessment findings..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssessModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h3>Reject Application</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleReject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Rejection Reason</label>
                  <textarea className="form-textarea" rows={3} required value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this application is being rejected..."></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" disabled={busy}>
                  {busy ? 'Saving...' : 'Reject Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
