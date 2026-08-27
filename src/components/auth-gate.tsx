'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const PUBLIC_ROUTES = ['/login', '/signup']

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      window.location.href = '/login'
    }
  }, [loading, user, isPublicRoute])

  // Login/Signup pages: walang sidebar/header, buo ang page
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Habang chine-check pa kung may naka-login
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  // Walang naka-login, papunta na sa /login (habang naghihintay ng redirect)
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Redirecting to login...</p>
      </div>
    )
  }

  function initials(name: string) {
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <>
      <div id="header">
        <div className="org-pill">
          <div className="sq">
            <i className="bi bi-bank2"></i>
          </div>
          <span>Loan Management System</span>
        </div>
        <div className="header-right">
          <span style={{ fontSize: 13, color: '#cbd5e1' }}>
            {user.full_name} <span className="badge b-blue" style={{ marginLeft: 6 }}>{user.role}</span>
          </span>
          <div className="header-icon" onClick={logout} style={{ cursor: 'pointer' }} title="Logout">
            <i className="bi bi-box-arrow-right"></i>
          </div>
          <div className="avatar">{initials(user.full_name)}</div>
        </div>
      </div>

      <div id="sidebar">
        <div className="module-brand">
          <div className="sq">
            <i className="bi bi-cash-coin"></i>
          </div>
          <span>Loan Management</span>
        </div>

        <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
          <span>
            <i className="bi bi-grid-1x2"></i>Dashboard
          </span>
        </Link>
        <Link href="/loans" className={`nav-item ${pathname.startsWith('/loans') ? 'active' : ''}`}>
          <span>
            <i className="bi bi-file-earmark-text"></i>Loans
          </span>
        </Link>
        <Link href="/borrowers" className={`nav-item ${pathname.startsWith('/borrowers') ? 'active' : ''}`}>
          <span>
            <i className="bi bi-people"></i>Borrowers
          </span>
        </Link>
        <Link href="/collections" className={`nav-item ${pathname.startsWith('/collections') ? 'active' : ''}`}>
          <span>
            <i className="bi bi-cash-stack"></i>Collections
          </span>
        </Link>

        <div className="nav-label">Reports</div>
        <Link href="/reports" className={`nav-item ${pathname.startsWith('/reports') ? 'active' : ''}`}>
          <span>
            <i className="bi bi-bar-chart"></i>Portfolio Report
          </span>
        </Link>

        {user.role === 'admin' && (
          <>
            <div className="nav-label">Admin</div>
            <Link href="/products" className={`nav-item ${pathname.startsWith('/products') ? 'active' : ''}`}>
              <span>
                <i className="bi bi-boxes"></i>Loan Products
              </span>
            </Link>
            <Link href="/settings" className={`nav-item ${pathname.startsWith('/settings') ? 'active' : ''}`}>
              <span>
                <i className="bi bi-gear"></i>Settings
              </span>
            </Link>
          </>
        )}

        <div className="sidebar-footer">Loan Management · v0.1</div>
      </div>

      <div id="main">{children}</div>
    </>
  )
}