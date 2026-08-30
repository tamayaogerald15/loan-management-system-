'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

type Loan = {
  id: string
  principal_amount: number
  status: string
  released_at: string | null
  borrowers: { full_name: string } | null
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

function loanCode(id: string) {
  return 'LN-' + id.slice(0, 4).toUpperCase()
}

export default function LendersPage() {
  const [loading, setLoading] = useState(true)
  const [outstandingPortfolio, setOutstandingPortfolio] = useState(0)
  const [activeLoansCount, setActiveLoansCount] = useState(0)
  const [overdueAmount, setOverdueAmount] = useState(0)
  const [collectionsMTD, setCollectionsMTD] = useState(0)
  const [allLoans, setAllLoans] = useState<Loan[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const { count: activeCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ORG_ID)
        .eq('status', 'active')

      const { data: scheduleRows } = await supabase
        .from('payment_schedules')
        .select('due_date, total_due, amount_paid, status')
        .eq('organization_id', ORG_ID)
        .neq('status', 'paid')

      const outstanding = (scheduleRows || []).reduce(
        (sum, r) => sum + (Number(r.total_due) - Number(r.amount_paid)), 0
      )
      const overdue = (scheduleRows || [])
        .filter((r) => new Date(r.due_date) < now)
        .reduce((sum, r) => sum + (Number(r.total_due) - Number(r.amount_paid)), 0)

      const { data: paymentsMTD } = await supabase
        .from('payments')
        .select('amount, received_at')
        .eq('organization_id', ORG_ID)
        .gte('received_at', startOfMonth)
      const collected = (paymentsMTD || []).reduce((sum, p) => sum + Number(p.amount), 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: loanData } = await supabase
        .from('loans')
        .select('id, principal_amount, status, released_at, borrowers(full_name)')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })
        .limit(10)

      setActiveLoansCount(activeCount || 0)
      setOutstandingPortfolio(outstanding)
      setOverdueAmount(overdue)
      setCollectionsMTD(collected)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setAllLoans((loanData as any) || [])
      setLoading(false)
    }

    load()
  }, [])

  const kpiCards = [
    { icon: 'bi-briefcase', tint: 'tint-blue', value: peso(outstandingPortfolio), label: 'Outstanding Portfolio', sub: `Across ${activeLoansCount} active loans` },
    { icon: 'bi-check-circle', tint: 'tint-emerald', value: activeLoansCount, label: 'Active Loans', sub: 'Currently disbursed' },
    { icon: 'bi-exclamation-triangle', tint: 'tint-rose', value: peso(overdueAmount), label: 'Overdue Amount', sub: 'Past due' },
    { icon: 'bi-graph-up-arrow', tint: 'tint-violet', value: peso(collectionsMTD), label: 'Collections (MTD)', sub: 'Received this month' },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Portfolio Overview</div>
          <div className="page-subtitle">Track how your funded loans are performing</div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Loading portfolio...</p>
      ) : (
        <>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {kpiCards.map((kpi, idx) => (
              <div key={idx} className="kpi-card animate-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className={`kpi-icon ${kpi.tint}`}><i className={`bi ${kpi.icon}`}></i></div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-sub">{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div className="section-title">Recent Loans</div>
          {allLoans.length === 0 ? (
            <div className="table-wrap">
              <div className="empty-state">
                <i className="bi bi-file-earmark-text"></i>
                <h4>No loans yet</h4>
              </div>
            </div>
          ) : (
            <div className="table-wrap animate-in-delay-1">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Loan ID</th>
                    <th>Borrower</th>
                    <th>Principal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allLoans.map((l) => (
                    <tr key={l.id}>
                      <td className="cell-strong mono" style={{ fontSize: 12.5 }}>{loanCode(l.id)}</td>
                      <td className="cell-strong">{l.borrowers?.full_name || '—'}</td>
                      <td className="cell-strong">{peso(l.principal_amount)}</td>
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
        </>
      )}
    </>
  )
}