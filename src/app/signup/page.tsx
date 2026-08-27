'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function SignupPage() {
  const { login } = useAuth()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (form.password !== form.confirm_password) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          role: 'staff',
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong.')
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
        <div className="auth-title">Create your account</div>
        <div className="auth-subtitle">Staff account for Metro Lending Cooperative</div>

        {errorMsg && (
          <div style={{ color: 'var(--rose-700)', background: 'var(--rose-50)', border: '1px solid var(--rose-200)', padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 20, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-exclamation-circle" style={{ fontSize: 15 }}></i>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-input" name="full_name" value={form.full_name} onChange={handleChange} required autoFocus placeholder="Juan dela Cruz" />
          </div>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@company.com" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" name="password" value={form.password} onChange={handleChange} required minLength={6} placeholder="Min. 6 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input className="form-input" type="password" name="confirm_password" value={form.confirm_password} onChange={handleChange} required minLength={6} placeholder="Repeat password" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Staff Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--gray-100)' }}>
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--blue-600)', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
