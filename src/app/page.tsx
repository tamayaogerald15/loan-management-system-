'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

type Loan = {
  id: string
  principal_amount: number
  status: string
  borrowers: { full_name: string } | null
  loan_products: { name: string } | null
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

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [totalBorrowers, setTotalBorrowers] = useState(0)
  const [activeLoans, setActiveLoans] = useState(0)
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)
  const [recentLoans, setRecentLoans] = useState<Loan[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)

      const { count: borrowerCount } = await supabase
        .from('borrowers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ORG_ID)

      const { count: activeLoanCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ORG_ID)
        .eq('status', 'active')

      const { data: outstandingRows } = await supabase
        .from('payment_schedules')
        .select('total_due, amount_paid')
        .eq('organization_id', ORG_ID)
        .neq('status', 'paid')

      const outstanding = (outstandingRows || []).reduce(
        (sum, r) => sum + (Number(r.total_due) - Number(r.amount_paid)),
        0
      )

      const { count: overdueRowCount } = await supabase
        .from('payment_schedules')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ORG_ID)
        .eq('status', 'overdue')

      const { data: recentLoanData } = await supabase
        .from('loans')
        .select('id, principal_amount, status, borrowers(full_name), loan_products(name)')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })
        .limit(5)

      setTotalBorrowers(borrowerCount || 0)
      setActiveLoans(activeLoanCount || 0)
      setTotalOutstanding(outstanding)
      setOverdueCount(overdueRowCount || 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecentLoans((recentLoanData as any) || [])
      setLoading(false)
    }

    load()
  }, [])

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Overview ng loan portfolio mo</div>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="kpi-card">
              <div className="kpi-icon tint-blue"><i className="bi bi-people"></i></div>
              <div className="kpi-value">{totalBorrowers}</div>
              <div className="kpi-label">Total Borrowers</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon tint-emerald"><i className="bi bi-file-earmark-check"></i></div>
              <div className="kpi-value">{activeLoans}</div>
              <div className="kpi-label">Active Loans</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon tint-violet"><i className="bi bi-cash-stack"></i></div>
              <div className="kpi-value">{peso(totalOutstanding)}</div>
              <div className="kpi-label">Total Outstanding</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon tint-rose"><i className="bi bi-exclamation-triangle"></i></div>
              <div className="kpi-value">{overdueCount}</div>
              <div className="kpi-label">Overdue Installments</div>
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 8 }}>Recent Loans</div>
          {recentLoans.length === 0 ? (
            <div className="table-wrap">
              <div className="empty-state">
                <i className="bi bi-file-earmark-text"></i>
                <h4>Wala pang loan</h4>
                <p>
                  Pumunta sa <Link href="/loans" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>Loans</Link> para gumawa ng una.
                </p>
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
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLoans.map((l) => (
                    <tr key={l.id} onClick={() => (window.location.href = `/loans/${l.id}`)}>
                      <td className="cell-strong">{l.borrowers?.full_name || '—'}</td>
                      <td>{l.loan_products?.name || '—'}</td>
                      <td>{peso(l.principal_amount)}</td>
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