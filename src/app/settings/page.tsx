'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

type StaffUser = {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export default function SettingsPage() {
  const { user } = useAuth()
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', email: '', role: 'staff' })

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_active, created_at')
      .eq('organization_id', ORG_ID)
      .order('created_at', { ascending: false })

    if (error) setErrorMsg(error.message)
    else setUsers(data as StaffUser[])
    setLoading(false)
  }

  useEffect(() => {
    if (isAdmin) loadUsers()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  function openEditModal(u: StaffUser) {
    setEditingUser(u)
    setEditForm({ full_name: u.full_name, email: u.email, role: u.role })
    setShowEditModal(true)
    setErrorMsg('')
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setSaving(true)
    setErrorMsg('')

    const { error } = await supabase
      .from('users')
      .update({ full_name: editForm.full_name, email: editForm.email, role: editForm.role })
      .eq('id', editingUser.id)

    if (error) {
      setErrorMsg(error.message)
      setSaving(false)
      return
    }

    setShowEditModal(false)
    setEditingUser(null)
    setSaving(false)
    loadUsers()
  }

    async function toggleActive(u: StaffUser) {
    if (u.id === user?.id) {
      setErrorMsg('You cannot deactivate your own account.')
      return
    }
    if (u.role === 'superadmin') {
      setErrorMsg('You do not have permission to modify a Superadmin account.')
      return
    }
    const { error } = await supabase.from('users').update({ is_active: !u.is_active }).eq('id', u.id)
    if (error) setErrorMsg(error.message)
    else loadUsers()
  }

  if (!isAdmin) {
    return (
      <div className="table-wrap">
        <div className="empty-state">
          <i className="bi bi-shield-lock"></i>
          <h4>Access Denied</h4>
          <p>Only Admin can access Settings.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Manage staff accounts for Metro Lending Cooperative</div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ color: 'var(--rose-700)', background: 'var(--rose-50)', border: '1px solid var(--rose-200)', padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="bi bi-exclamation-circle" style={{ fontSize: 15 }}></i>
          {errorMsg}
        </div>
      )}

      <div className="section-title">Staff Accounts</div>

      {loading ? (
        <div className="table-wrap">
          <div style={{ padding: 24 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-table-row" style={{ marginBottom: 8 }}></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-strong">{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'b-violet' : 'b-blue'}`}>
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'b-emerald' : 'b-gray'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                    <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm btn-ghost" title="Edit user" onClick={() => openEditModal(u)}>
                      <i className="bi bi-pencil" style={{ fontSize: 14 }}></i>
                    </button>
                    {u.id !== user?.id && u.role !== 'superadmin' && (
                      <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(u)}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showEditModal && editingUser && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit User</h3>
              <button className="modal-close" onClick={() => { setShowEditModal(false); setEditingUser(null) }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); setEditingUser(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
