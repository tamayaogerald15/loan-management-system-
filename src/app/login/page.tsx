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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <i className="bi bi-cash-coin" style={{ color: '#fff', fontSize: 24 }}></i>
        </div>
        <div className="auth-title">Welcome back</div>
        <div className="auth-subtitle">Sign in to your Loan Management account</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@company.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-arrow-repeat" style={{ animation: 'spin 1s linear infinite' }}></i>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--gray-100)' }}>
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
              Create account
            </Link>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="modal-overlay open">
          <div className="modal" style={{ width: 400 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--rose-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', animation: 'scaleIn 0.2s ease' }}>
                <i className="bi bi-x-circle" style={{ color: 'var(--rose-600)', fontSize: 26 }}></i>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 17 }}>Login Failed</h3>
              <p style={{ color: 'var(--gray-500)', fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>{errorMsg}</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', paddingTop: 0 }}>
              <button className="btn btn-primary" onClick={() => setErrorMsg('')}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
