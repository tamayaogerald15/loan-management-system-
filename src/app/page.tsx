'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
}

function peso(n: number) {
  return '₱' + Number(n).toLocaleString('en-PH')
}

const guideSteps = [
  { title: 'Visit the Borrowers page', desc: 'Click on "Borrowers" from the sidebar menu.' },
  { title: 'Add your details', desc: 'Click "Add Borrower" and fill up your personal information.' },
  { title: 'Go to the Loans page', desc: 'Click on "Loans" from the sidebar menu.' },
  { title: 'Fill up a new application', desc: 'Click "New Loan Application," enter the details, and choose a loan product. Then click "Create Draft."' },
  { title: 'Submit your application', desc: 'Click your name and submit your application, then wait for approval.' },
  { title: 'Loan releasing', desc: 'Once approved, your loan will be released to you.' },
]

export default function LandingPage() {
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showGuideModal, setShowGuideModal] = useState(false)

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from('loan_products')
        .select('id, name, interest_rate, interest_type, min_amount, max_amount, min_term_months, max_term_months')
        .eq('organization_id', ORG_ID)
        .eq('is_active', true)
        .order('min_amount', { ascending: true })

      setProducts(data || [])
      setLoading(false)
    }

    loadProducts()
  }, [])

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-brand">
          <div className="landing-logo">
            <i className="bi bi-cash-coin"></i>
          </div>
          <span>Loan Management System</span>
        </div>
        <div className="landing-nav-actions">
          <button className="btn btn-ghost" onClick={() => setShowGuideModal(true)}>
            <i className="bi bi-signpost-2"></i> Guidelines
          </button>
          <Link href="/login" className="btn btn-primary">Sign In</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <h1 className="landing-hero-title">
          Modern Loan Management,<br />Built for Growing Lenders
        </h1>
        <p className="landing-hero-subtitle">
          Track applications, manage borrowers, and monitor your portfolio —
          all in one platform designed for lending cooperatives.
        </p>
        <div className="landing-hero-actions">
          <Link href="/login" className="btn btn-primary btn-lg">
            Sign In to Your Account
          </Link>
        </div>
      </section>

      <section className="landing-products">
        <div className="landing-products-header">
          <h2>Our Loan Products</h2>
          <p>Choose the loan that fits your needs — transparent rates, no hidden fees.</p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>Loading loan products...</p>
        ) : products.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>No loan products available yet.</p>
        ) : (
          <div className="landing-products-grid">
            {products.map((p) => (
              <div key={p.id} className="landing-product-card">
                <div className="landing-product-name">{p.name}</div>
                <div className="landing-product-rate">
                  {p.interest_rate}%<span>/month</span>
                </div>
                <div className="landing-product-rate-type">
                  {p.interest_type.replace('_', ' ')} interest
                </div>
                <div className="landing-product-detail">
                  <i className="bi bi-cash"></i>
                  {peso(p.min_amount)} – {peso(p.max_amount)}
                </div>
                <div className="landing-product-detail">
                  <i className="bi bi-calendar3"></i>
                  {p.min_term_months}–{p.max_term_months} months to pay
                </div>
                <Link href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                  Apply Now
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="landing-features">
        <div className="landing-feature-card">
          <div className="landing-feature-icon tint-blue">
            <i className="bi bi-briefcase"></i>
          </div>
          <h3>Portfolio Tracking</h3>
          <p>Real-time visibility into outstanding balances, active loans, and collections.</p>
        </div>
        <div className="landing-feature-card">
          <div className="landing-feature-icon tint-emerald">
            <i className="bi bi-people"></i>
          </div>
          <h3>Borrower Management</h3>
          <p>Centralized records for borrower profiles, documents, and credit assessments.</p>
        </div>
        <div className="landing-feature-card">
          <div className="landing-feature-icon tint-violet">
            <i className="bi bi-graph-up-arrow"></i>
          </div>
          <h3>Reports & Insights</h3>
          <p>Monthly disbursement and collection trends to guide lending decisions.</p>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Loan Management System · Metro Lending Cooperative</p>
      </footer>

      {showGuideModal && (
        <div className="modal-overlay open">
          <div className="modal" style={{ width: 520 }}>
            <div className="modal-header">
              <h3>How to Avail a Loan</h3>
              <button className="modal-close" onClick={() => setShowGuideModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body">
              {guideSteps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 14, marginBottom: idx === guideSteps.length - 1 ? 0 : 20 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--blue-600), var(--violet-600))',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 2 }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gray-500)', lineHeight: 1.5 }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowGuideModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}