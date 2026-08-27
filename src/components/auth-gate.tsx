'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const PUBLIC_ROUTES = ['/login', '/signup']

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      window.location.href = '/login'
    }
  }, [loading, user, isPublicRoute])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (isPublicRoute) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--blue-600), var(--violet-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', animation: 'pulse 2s ease infinite' }}>
            <i className="bi bi-cash-coin" style={{ color: '#fff', fontSize: 18 }}></i>
          </div>
          <p style={{ color: 'var(--gray-500)', fontSize: 13, fontWeight: 500 }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Redirecting to login...</p>
        </div>
      </div>
    )
  }

  function initials(name: string) {
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  }

  const navItems = [
    { href: '/', icon: 'bi-grid-1x2', label: 'Dashboard', match: '/' },
    { href: '/loans', icon: 'bi-file-earmark-text', label: 'Loans', match: '/loans' },
    { href: '/borrowers', icon: 'bi-people', label: 'Borrowers', match: '/borrowers' },
    { href: '/collections', icon: 'bi-cash-stack', label: 'Collections', match: '/collections' },
  ]

  const reportItems = [
    { href: '/reports', icon: 'bi-bar-chart', label: 'Portfolio Report', match: '/reports' },
  ]

  const adminItems = user.role === 'admin' ? [
    { href: '/products', icon: 'bi-boxes', label: 'Loan Products', match: '/products' },
    { href: '/settings', icon: 'bi-gear', label: 'Settings', match: '/settings' },
  ] : []

  return (
    <>
      <div id="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className={`bi ${sidebarOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
          </button>
          <div className="org-pill">
            <div className="sq">
              <i className="bi bi-bank2"></i>
            </div>
            <span>Loan Management System</span>
          </div>
        </div>
        <div className="header-right">
          <span className="user-name-text" style={{ fontSize: 13, color: '#cbd5e1' }}>
            {user.full_name} <span className="badge b-blue" style={{ marginLeft: 6 }}>{user.role}</span>
          </span>
          <div className="header-icon" onClick={logout} style={{ cursor: 'pointer' }} title="Logout">
            <i className="bi bi-box-arrow-right"></i>
          </div>
          <div className="avatar">{initials(user.full_name)}</div>
        </div>
      </div>

      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      <div id="sidebar" className={sidebarOpen ? 'open' : ''}>
        <div className="module-brand">
          <div className="sq">
            <i className="bi bi-cash-coin"></i>
          </div>
          <span>Loan Management</span>
        </div>

        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.match || (item.match !== '/' && pathname.startsWith(item.match)) ? 'active' : ''}`}
          >
            <span>
              <i className={`bi ${item.icon}`}></i>{item.label}
            </span>
          </Link>
        ))}

        <div className="nav-label">Reports</div>
        {reportItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname.startsWith(item.match) ? 'active' : ''}`}
          >
            <span>
              <i className={`bi ${item.icon}`}></i>{item.label}
            </span>
          </Link>
        ))}

        {adminItems.length > 0 && (
          <>
            <div className="nav-label">Admin</div>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname.startsWith(item.match) ? 'active' : ''}`}
              >
                <span>
                  <i className={`bi ${item.icon}`}></i>{item.label}
                </span>
              </Link>
            ))}
          </>
        )}

        <div className="sidebar-footer">Loan Management · v0.1</div>
      </div>

      <div id="main">{children}</div>
    </>
  )
}
