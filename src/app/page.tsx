'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

type Loan = {
  id: string
  principal_amount: number
  status: string
  released_at: string | null
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

function pesoShort(n: number) {
  if (n >= 1000000) return '₱' + (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return '₱' + (n / 1000).toFixed(0) + 'K'
  return '₱' + n.toLocaleString('en-PH')
}

function loanCode(id: string) {
  return 'LN-' + id.slice(0, 4).toUpperCase()
}

function SkeletonLoader() {
  return (
    <>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="kpi-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="skeleton skeleton-card" style={{ height: 38, width: 38, borderRadius: 10, marginBottom: 12 }}></div>
            <div className="skeleton skeleton-line h-20 w-60" style={{ marginBottom: 8 }}></div>
            <div className="skeleton skeleton-line w-40" style={{ height: 12 }}></div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="panel"><div className="skeleton skeleton-card" style={{ height: 240 }}></div></div>
        <div className="panel"><div className="skeleton skeleton-card" style={{ height: 240 }}></div></div>
      </div>
    </>
  )
}

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [outstandingPortfolio, setOutstandingPortfolio] = useState(0)
  const [activeLoansCount, setActiveLoansCount] = useState(0)
  const [pendingApproval, setPendingApproval] = useState(0)
  const [overdueAmount, setOverdueAmount] = useState(0)
  const [collectionsMTD, setCollectionsMTD] = useState(0)
  const [disbursedMTD, setDisbursedMTD] = useState(0)
  const [recentLoans, setRecentLoans] = useState<Loan[]>([])
  const [monthlyData, setMonthlyData] = useState<{ label: string; disbursed: number; collected: number }[]>([])
  const [productBreakdown, setProductBreakdown] = useState<{ name: string; pct: number }[]>([])
  const [hoveredBar, setHoveredBar] = useState<{ month: string; type: 'disbursed' | 'collected'; value: number } | null>(null)

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

      const { count: pendingCount } = await supabase
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ORG_ID)
        .in('status', ['submitted', 'under_review'])

      const { data: scheduleRows } = await supabase
        .from('payment_schedules')
        .select('due_date, total_due, amount_paid, status')
        .eq('organization_id', ORG_ID)
        .neq('status', 'paid')

      const outstanding = (scheduleRows || []).reduce(
        (sum, r) => sum + (Number(r.total_due) - Number(r.amount_paid)),
        0
      )
      const overdue = (scheduleRows || [])
        .filter((r) => new Date(r.due_date) < now)
        .reduce((sum, r) => sum + (Number(r.total_due) - Number(r.amount_paid)),
        0)

      const { data: paymentsMTD } = await supabase
  .from('payments')
  .select('amount, received_at')
  .eq('organization_id', ORG_ID)
  .gte('received_at', startOfMonth)
const collected = (paymentsMTD || []).reduce((sum, p) => sum + Number(p.amount), 0)

      const { data: releasedMTD } = await supabase
        .from('loans')
        .select('principal_amount, released_at')
        .eq('organization_id', ORG_ID)
        .gte('released_at', startOfMonth)

      const disbursed = (releasedMTD || []).reduce((sum, l) => sum + Number(l.principal_amount), 0)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: recentLoanData } = await supabase
        .from('loans')
        .select('id, principal_amount, status, released_at, borrowers(full_name), loan_products(name)')
        .eq('organization_id', ORG_ID)
        .order('created_at', { ascending: false })
        .limit(5)

      const { data: allLoansForChart } = await supabase
        .from('loans')
        .select('principal_amount, released_at')
        .eq('organization_id', ORG_ID)
        .not('released_at', 'is', null)

      const { data: allPaymentsForChart } = await supabase
        .from('payments')
        .select('amount, received_at')
        .eq('organization_id', ORG_ID)

      const months: { label: string; year: number; month: number; disbursed: number; collected: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({ label: d.toLocaleDateString('en-PH', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), disbursed: 0, collected: 0 })
      }

      ;(allLoansForChart || []).forEach((l) => {
        const d = new Date(l.released_at as string)
        const m = months.find((mo) => mo.year === d.getFullYear() && mo.month === d.getMonth())
        if (m) m.disbursed += Number(l.principal_amount)
      })
      ;(allPaymentsForChart || []).forEach((p) => {
        const d = new Date(p.received_at)
        const m = months.find((mo) => mo.year === d.getFullYear() && mo.month === d.getMonth())
        if (m) m.collected += Number(p.amount)
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allLoansForProduct } = await supabase
        .from('loans')
        .select('principal_amount, loan_products(name)')
        .eq('organization_id', ORG_ID)

      const byProduct: Record<string, number> = {}
      let totalPrincipal = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(allLoansForProduct as any[] || []).forEach((l) => {
        const name = l.loan_products?.name || 'Unknown'
        byProduct[name] = (byProduct[name] || 0) + Number(l.principal_amount)
        totalPrincipal += Number(l.principal_amount)
      })
      const productList = Object.entries(byProduct)
        .map(([name, amount]) => ({ name, pct: totalPrincipal > 0 ? Math.round((amount / totalPrincipal) * 100) : 0 }))
        .sort((a, b) => b.pct - a.pct)

      setOutstandingPortfolio(outstanding)
      setActiveLoansCount(activeCount || 0)
      setPendingApproval(pendingCount || 0)
      setOverdueAmount(overdue)
      setCollectionsMTD(collected)
      setDisbursedMTD(disbursed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecentLoans((recentLoanData as any) || [])
      setMonthlyData(months)
      setProductBreakdown(productList)
      setLoading(false)
    }

    load()
  }, [])

  const maxChartValue = Math.max(1, ...monthlyData.flatMap((m) => [m.disbursed, m.collected]))
  const productColors = ['var(--blue-600)', 'var(--violet-600)', 'var(--amber-600)', 'var(--emerald-600)', 'var(--rose-600)']

  const kpiCards = [
    { icon: 'bi-briefcase', tint: 'tint-blue', value: peso(outstandingPortfolio), label: 'Outstanding Portfolio', sub: `Across ${activeLoansCount} active loans` },
    { icon: 'bi-check-circle', tint: 'tint-emerald', value: activeLoansCount, label: 'Active Loans', sub: 'Currently disbursed' },
    { icon: 'bi-hourglass-split', tint: 'tint-amber', value: pendingApproval, label: 'Pending Approval', sub: 'Awaiting credit review' },
    { icon: 'bi-exclamation-triangle', tint: 'tint-rose', value: peso(overdueAmount), label: 'Overdue Amount', sub: 'Past due' },
    { icon: 'bi-graph-up-arrow', tint: 'tint-violet', value: peso(collectionsMTD), label: 'Collections (MTD)', sub: 'Received this month' },
    { icon: 'bi-send', tint: 'tint-gray', value: peso(disbursedMTD), label: 'Disbursed (MTD)', sub: 'Released this month' },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Portfolio overview for Loan Management System</div>
        </div>
        <Link href="/loans" className="btn btn-primary">
          <i className="bi bi-plus-lg"></i> New Loan Application
        </Link>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : (
        <>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
            {kpiCards.map((kpi, idx) => (
              <div key={idx} className="kpi-card animate-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className={`kpi-icon ${kpi.tint}`}><i className={`bi ${kpi.icon}`}></i></div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-sub">{kpi.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="panel animate-in-delay-1">
              <div className="section-title">Disbursed vs. Collected — last 6 months</div>
              <div className="chart-container" style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: 200, paddingTop: 20, position: 'relative' }}>
                {monthlyData.map((m) => (
                  <div key={m.label} className="chart-bar-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                    onMouseLeave={() => setHoveredBar(null)}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 150 }}>
                      <div
                        onMouseEnter={() => setHoveredBar({ month: m.label, type: 'disbursed', value: m.disbursed })}
                        style={{ width: 18, height: `${Math.max(2, (m.disbursed / maxChartValue) * 150)}px`, background: 'linear-gradient(180deg, var(--blue-600), var(--blue-700))', borderRadius: '4px 4px 0 0', transition: 'all 0.2s', opacity: hoveredBar && hoveredBar.month === m.label && hoveredBar.type !== 'disbursed' ? 0.4 : 1 }}
                      ></div>
                      <div
                        onMouseEnter={() => setHoveredBar({ month: m.label, type: 'collected', value: m.collected })}
                        style={{ width: 18, height: `${Math.max(2, (m.collected / maxChartValue) * 150)}px`, background: 'linear-gradient(180deg, var(--gray-300), var(--gray-400))', borderRadius: '4px 4px 0 0', transition: 'all 0.2s', opacity: hoveredBar && hoveredBar.month === m.label && hoveredBar.type !== 'collected' ? 0.4 : 1 }}
                      ></div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>{m.label}</div>
                  </div>
                ))}
                {hoveredBar && (
                  <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', zIndex: 5 }}>
                    {hoveredBar.month} · {hoveredBar.type === 'disbursed' ? 'Disbursed' : 'Collected'}: {peso(hoveredBar.value)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 18, marginTop: 10, fontSize: 12.5, color: 'var(--gray-600)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--blue-600)' }}></span>Disbursed</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--gray-300)' }}></span>Collected</span>
              </div>
            </div>

            <div className="panel animate-in-delay-2">
              <div className="section-title">Portfolio by Product</div>
              {productBreakdown.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <i className="bi bi-pie-chart" style={{ fontSize: 28, color: 'var(--gray-300)' }}></i>
                  <p style={{ color: 'var(--gray-500)', fontSize: 13, marginTop: 10 }}>No data yet.</p>
                </div>
              ) : (
                productBreakdown.map((p, idx) => (
                  <div key={p.name} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{p.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--gray-700)' }}>{p.pct}%</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: 8, width: `${p.pct}%`, background: `linear-gradient(90deg, ${productColors[idx % productColors.length]}, ${productColors[idx % productColors.length]}dd)`, borderRadius: 999, transition: 'width 0.6s ease' }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section-title">Recent Loan Applications</div>
          {recentLoans.length === 0 ? (
            <div className="table-wrap">
              <div className="empty-state">
                <i className="bi bi-file-earmark-text"></i>
                <h4>No loans yet</h4>
                <p>
                  Go to <Link href="/loans" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>Loans</Link> to create your first one.
                </p>
              </div>
            </div>
          ) : (
            <div className="table-wrap animate-in-delay-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Loan ID</th>
                    <th>Borrower</th>
                    <th>Product</th>
                    <th>Principal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLoans.map((l) => (
                    <tr key={l.id} onClick={() => (window.location.href = `/loans/${l.id}`)}>
                      <td className="cell-strong mono" style={{ fontSize: 12.5 }}>{loanCode(l.id)}</td>
                      <td className="cell-strong">{l.borrowers?.full_name || '—'}</td>
                      <td>{l.loan_products?.name || '—'}</td>
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
