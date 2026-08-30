'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Organization = {
  id: string
  name: string
  created_at: string
}

type ManagedUser = {
  id: string
  organization_id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

const ROLE_OPTIONS = ['admin', 'staff', 'lender', 'superadmin']

const roleBadgeClass: Record<string, string> = {
  admin: 'b-violet',
  staff: 'b-blue',
  lender: 'b-emerald',
  superadmin: 'b-rose',
}

export default function SuperadminPage() {
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [totalLoans, setTotalLoans] = useState(0)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formFullName, setFormFullName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('staff')
  const [formOrgId, setFormOrgId] = useState('')
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const [actionError, setActionError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)

    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .order('created_at', { ascending: true })

    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: false })

    const { count: loanCount } = await supabase
      .from('loans')
      .select('*', { count: 'exact', head: true })

    setOrganizations(orgData || [])
    setUsers(userData || [])
    setTotalLoans(loanCount || 0)

    if (orgData && orgData.length > 0 && !formOrgId) {
      setFormOrgId(orgData[0].id)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formFullName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          organization_id: formOrgId,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || 'Unable to create account.')
        setFormLoading(false)
        return
      }

      setFormFullName('')
      setFormEmail('')
      setFormPassword('')
      setFormRole('staff')
      setShowCreateModal(false)
      setFormLoading(false)
      loadData()
    } catch {
      setFormError('Something went wrong. Please try again.')
      setFormLoading(false)
    }
  }

  async function handleToggleStatus(user: ManagedUser) {
    setActionError('')
    try {
      const res = await fetch('/api/admin/toggle-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, is_active: !user.is_active }),
      })
      const data = await res.json()

      if (!res.ok) {
        setActionError(data.error || 'Unable to update account status.')
        return
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      )
    } catch {
      setActionError('Something went wrong. Please try again.')
    }
  }

  async function handleDeleteUser(userId: string) {
    setActionError('')
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setActionError(data.error || 'Unable to delete account.')
        setConfirmDeleteId(null)
        return
      }

            if (data.softDeleted) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: false } : u))
        )
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
      }
      setConfirmDeleteId(null)
    } catch {
      setActionError('Something went wrong. Please try again.')
      setConfirmDeleteId(null)
    }
  }

  function orgName(orgId: string) {
    return organizations.find((o) => o.id === orgId)?.name || '—'
  }

  const kpiCards = [
    { icon: 'bi-building', tint: 'tint-blue', value: organizations.length, label: 'Organizations', sub: 'Registered on the platform' },
    { icon: 'bi-people', tint: 'tint-violet', value: users.length, label: 'Total Users', sub: 'Admins, staff, and lenders' },
    { icon: 'bi-file-earmark-text', tint: 'tint-emerald', value: totalLoans, label: 'Total Loans', sub: 'Across all organizations' },
  ]

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Superadmin Overview</div>
          <div className="page-subtitle">System-wide administration and configuration</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <i className="bi bi-plus-lg"></i> Create Account
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Loading system data...</p>
      ) : (
        <>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {kpiCards.map((kpi, idx) => (
              <div key={idx} className="kpi-card animate-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className={`kpi-icon ${kpi.tint}`}><i className={`bi ${kpi.icon}`}></i></div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-sub">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {actionError && (
            <div style={{ background: 'var(--rose-50)', color: 'var(--rose-600)', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
              {actionError}
            </div>
          )}

          <div className="section-title">Organizations</div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id}>
                    <td className="cell-strong">{org.name}</td>
                    <td>{new Date(org.created_at).toLocaleDateString('en-PH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-title">Users</div>
          <div className="table-wrap animate-in-delay-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-strong">{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{orgName(u.organization_id)}</td>
                    <td>
                      <span className={`badge ${roleBadgeClass[u.role] || 'b-gray'}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'b-emerald' : 'b-gray'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 10px', fontSize: 12.5 }}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 10px', fontSize: 12.5, color: 'var(--rose-600)' }}
                          onClick={() => setConfirmDeleteId(u.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showCreateModal && (
        <div className="modal-overlay open">
          <div className="modal" style={{ width: 440 }}>
            <div className="modal-body" style={{ padding: '28px 24px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 17 }}>Create Account</h3>
              <p style={{ color: 'var(--gray-500)', fontSize: 13, margin: '0 0 20px 0' }}>
                Add a new admin, staff, or lender account.
              </p>

              <form onSubmit={handleCreateUser}>
                <div className="form-group">
                  <label className="form-label">Full name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input
                    className="form-input"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-input"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Organization</label>
                  <select
                    className="form-input"
                    value={formOrgId}
                    onChange={(e) => setFormOrgId(e.target.value)}
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                {formError && (
                  <p style={{ color: 'var(--rose-600)', fontSize: 13, margin: '4px 0 0 0' }}>{formError}</p>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    disabled={formLoading}
                  >
                    {formLoading ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="modal-overlay open">
          <div className="modal" style={{ width: 400 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--rose-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <i className="bi bi-exclamation-triangle" style={{ color: 'var(--rose-600)', fontSize: 26 }}></i>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 17 }}>Delete this account?</h3>
              <p style={{ color: 'var(--gray-500)', fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>
                This action cannot be undone. The account will be permanently removed.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', gap: 10, paddingTop: 0 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--rose-600)' }}
                onClick={() => handleDeleteUser(confirmDeleteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}