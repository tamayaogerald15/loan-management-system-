'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

type Loan = {
  id: string
  principal_amount: number
  status: string
  loan_products: { name: string } | null
}

function peso(n: number) {
  return '₱' + Number(n).toLocaleString('en-PH')
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

export default function ReportsPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCollected, setTotalCollected] = useState(0)
  const [totalOutstanding, setTotalOutstanding] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: loanData } = await supabase
        .from('loans')
        .select('id, principal_amount, status, loan_products(name)')
        .eq('organization_id', ORG_ID)

      const { data: scheduleData } = await supabase
        .from('payment_schedules')
        .select('total_due, amount_paid')
        .eq('organization_id', ORG_ID)

      const collected = (scheduleData || []).reduce((sum, r) => sum + Number(r.amount_paid), 0)
      const outstanding = (scheduleData || []).reduce(
        (sum, r) => sum + (Number(r.total_due) - Number(r.amount_paid)),
        0
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLoans((loanData as any) || [])
      setTotalCollected(collected)
      setTotalOutstanding(outstanding)
      setLoading(false)
    }
    load()
  }, [])

  const totalPortfolio = loans.reduce((sum, l) => sum + Number(l.principal_amount), 0)
  const activeCount = loans.filter((l) => l.status === 'active').length
  const fullyPaidCount = loans.filter((l) => l.status === 'fully_paid').length
  const rejectedCount = loans.filter((l) => l.status === 'rejected').length

  // I-group ang loans base sa product name
  const byProduct: Record<string, { count: number; amount: number }> = {}
  loans.forEach((l) => {
    const name = l.loan_products?.name || 'Unknown'
    if (!byProduct[name]) byProduct[name] = { count: 0, amount: 0 }
    byProduct[name].count += 1
    byProduct[name].amount += Number(l.principal_amount)
  })

  // I-group base sa status
  const byStatus: Record<string, number> = {}
  loans.forEach((l) => {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1
  })

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Portfolio Report</div>
          <div className="page-subtitle">Aggregate performance of your loan portfolio</div>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="kpi-card">
              <div className="kpi-icon tint-blue"><i className="bi bi-briefcase"></i></div>
              <div className="kpi-value">{peso(totalPortfolio)}</div>
              <div className="kpi-label">Total Portfolio (Principal)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon tint-emerald"><i className="bi bi-cash-coin"></i></div>
              <div className="kpi-value">{peso(totalCollected)}</div>
              <div className="kpi-label">Total Collected</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon tint-amber"><i className="bi bi-hourglass-split"></i></div>
              <div className="kpi-value">{peso(totalOutstanding)}</div>
              <div className="kpi-label">Total Outstanding</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon tint-violet"><i className="bi bi-graph-up"></i></div>
              <div className="kpi-value">
                {totalPortfolio > 0 ? Math.round((totalCollected / (totalCollected + totalOutstanding || 1)) * 100) : 0}%
              </div>
              <div className="kpi-label">Collection Rate</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
            <div className="panel">
              <div className="section-title">Portfolio by Product</div>
              {Object.keys(byProduct).length === 0 ? (
                <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>No data yet.</p>
              ) : (
                Object.entries(byProduct).map(([name, stats]) => {
                  const pct = totalPortfolio > 0 ? Math.round((stats.amount / totalPortfolio) * 100) : 0
                  return (
                    <div key={name} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{name}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 999 }}>
                        <div style={{ height: 8, width: `${pct}%`, background: 'var(--blue-600)', borderRadius: 999 }}></div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="panel">
              <div className="section-title">Loans by Status</div>
              {Object.keys(byStatus).length === 0 ? (
                <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>No data yet.</p>
              ) : (
                Object.entries(byStatus).map(([status, count]) => (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <span className={`badge ${statusMeta[status]?.cls || 'b-gray'}`}>{statusMeta[status]?.label || status}</span>
                    <span className="cell-strong">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 20 }}>
            <div className="kpi-card">
              <div className="kpi-value">{activeCount}</div>
              <div className="kpi-label">Active Loans</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{fullyPaidCount}</div>
              <div className="kpi-label">Fully Paid Loans</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{rejectedCount}</div>
              <div className="kpi-label">Rejected Applications</div>
            </div>
          </div>
        </>
      )}
    </>
  )
}