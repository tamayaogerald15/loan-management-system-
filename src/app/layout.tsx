import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Loan Management System',
  description: 'Metro Lending Cooperative',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.11.3/font/bootstrap-icons.min.css"
        />
      </head>
      <body>
        <div id="header">
          <div className="org-pill">
            <div className="sq">
              <i className="bi bi-bank2"></i>
            </div>
            <span>Metro Lending Cooperative</span>
            <i className="bi bi-chevron-down" style={{ fontSize: 11, color: '#94a3b8' }}></i>
          </div>
          <div className="header-right">
            <i className="bi bi-question-circle header-icon"></i>
            <div className="header-icon">
              <i className="bi bi-bell"></i>
              <span className="dot"></span>
            </div>
            <div className="avatar">GT</div>
          </div>
        </div>

        <div id="sidebar">
          <div className="module-brand">
            <div className="sq">
              <i className="bi bi-cash-coin"></i>
            </div>
            <span>Loan Management</span>
          </div>

          <Link href="/" className="nav-item">
            <span>
              <i className="bi bi-grid-1x2"></i>Dashboard
            </span>
          </Link>
          <Link href="/loans" className="nav-item">
            <span>
              <i className="bi bi-file-earmark-text"></i>Loans
            </span>
          </Link>
          <Link href="/borrowers" className="nav-item">
            <span>
              <i className="bi bi-people"></i>Borrowers
            </span>
          </Link>
          <Link href="/collections" className="nav-item">
            <span>
              <i className="bi bi-cash-stack"></i>Collections
            </span>
          </Link>

          <div className="nav-label">Reports</div>
          <Link href="/reports" className="nav-item">
            <span>
              <i className="bi bi-bar-chart"></i>Portfolio Report
            </span>
          </Link>

          <div className="nav-label">Settings</div>
          <Link href="/products" className="nav-item">
            <span>
              <i className="bi bi-boxes"></i>Loan Products
            </span>
          </Link>
          <Link href="/settings" className="nav-item">
            <span>
              <i className="bi bi-gear"></i>Settings
            </span>
          </Link>

          <div className="sidebar-footer">Loan Management · v0.1</div>
        </div>

        <div id="main">{children}</div>
      </body>
    </html>
  )
}