'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Incorrect email or password.')
        setLoading(false)
        return
      }

      login(data.user)
      window.location.href = '/'
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-100)' }}>
      <div className="panel" style={{ width: 400, maxWidth: '92vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="sq" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--blue-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
            <i className="bi bi-cash-coin" style={{ color: '#fff', fontSize: 20 }}></i>
          </div>
          <div className="page-title" style={{ justifyContent: 'center' }}>Loan Management System</div>
          <div className="page-subtitle">Sign in to your account</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-500)', marginTop: 18 }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </div>

      {/* ---------- Error Popup Modal ---------- */}
      {errorMsg && (
        <div className="modal-overlay open">
          <div className="modal" style={{ width: 380 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '28px 20px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--rose-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
                <i className="bi bi-x-circle" style={{ color: 'var(--rose-600)', fontSize: 22 }}></i>
              </div>
              <h3 style={{ margin: '0 0 6px 0' }}>Login Failed</h3>
              <p style={{ color: 'var(--gray-500)', fontSize: 13.5, margin: 0 }}>{errorMsg}</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setErrorMsg('')}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}