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
  const isAdmin = user?.role === 'admin'

  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

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

  async function toggleActive(u: StaffUser) {
    if (u.id === user?.id) {
      setErrorMsg('You cannot deactivate your own account.')
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
        <p style={{ color: 'var(--rose-600)', background: 'var(--rose-50)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {errorMsg}
        </p>
      )}

      <div className="section-title">Staff Accounts</div>

      {loading ? (
        <p>Loading...</p>
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
                <th></th>
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
                  <td>
                    {u.id !== user?.id && (
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
    </>
  )
}