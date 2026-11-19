import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './Admin.css'

export default function Admin() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  async function loadUsers() {
    setLoading(true)
    setMessage('')

    const { data: authData, error: authError } =
      await supabase.auth.getUser()

    if (authError || !authData.user) {
      setMessage('Please log in first.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, approved')
      .eq('id', authData.user.id)
      .single()

    if (profileError || profile?.role !== 'admin' || !profile?.approved) {
      setMessage('Access denied. Admins only.')
      setLoading(false)
      return
    }

    setIsAdmin(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
    } else {
      setUsers(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function updateUser(id: string, approved: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({
        approved,
        rejected: !approved,
      })
      .eq('id', id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(approved ? 'Member approved!' : 'Member rejected!')
    loadUsers()
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (loading) {
    return <div className="admin-page">Loading dashboard...</div>
  }

  if (!isAdmin) {
    return <div className="admin-page">{message}</div>
  }

  const pending = users.filter(
    user => !user.approved && !user.rejected
  )

  const approved = users.filter(user => user.approved)

  const rejected = users.filter(user => user.rejected)

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Jeet's Gallery</h1>
          <p>Administrator Dashboard</p>
        </div>

        <button onClick={logout}>Logout</button>
      </header>

      <div className="admin-stats">
        <div>
          <h2>{users.length}</h2>
          <p>Total Users</p>
        </div>

        <div>
          <h2>{pending.length}</h2>
          <p>Pending</p>
        </div>

        <div>
          <h2>{approved.length}</h2>
          <p>Approved</p>
        </div>

        <div>
          <h2>{rejected.length}</h2>
          <p>Rejected</p>
        </div>
      </div>

      <h2 className="admin-section-title">
        Registration Requests
      </h2>

      {message && <p className="admin-message">{message}</p>}

      {pending.length === 0 ? (
        <p>No pending registrations.</p>
      ) : (
        pending.map(user => (
          <div className="admin-user-card" key={user.id}>
            <h3>
              {user.first_name} {user.last_name}
            </h3>

            <p><strong>Phone:</strong> {user.phone}</p>
            <p><strong>Email:</strong> {user.email || 'Not available'}</p>
            <p><strong>Date of Birth:</strong> {user.date_of_birth}</p>
            <p><strong>Address:</strong> {user.address}</p>

            <div className="admin-actions">
              <button
                onClick={() => updateUser(user.id, true)}
                className="approve-btn"
              >
                Approve
              </button>

              <button
                onClick={() => updateUser(user.id, false)}
                className="reject-btn"
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}