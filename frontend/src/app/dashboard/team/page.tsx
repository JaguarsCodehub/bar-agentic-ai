'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { User } from '@/types';
import { Users, Plus, X, Shield, UserCheck, UserX, Edit2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  owner: { bg: 'rgba(108, 92, 231, 0.15)', text: '#a29bfe' },
  manager: { bg: 'rgba(0, 184, 148, 0.15)', text: '#00b894' },
  staff: { bg: 'rgba(116, 185, 255, 0.15)', text: '#74b9ff' },
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
};

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'staff' });
  const [submitting, setSubmitting] = useState(false);

  const isOwner = currentUser?.role === 'owner';

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/auth/staff');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/staff', form);
      toast.success(`${ROLE_LABELS[form.role]} account created!`);
      setShowCreateModal(false);
      setForm({ full_name: '', email: '', password: '', role: 'staff' });
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const updateRole = async (userId: string) => {
    try {
      await api.patch(`/auth/staff/${userId}`, { role: editRole });
      toast.success('Role updated!');
      setEditingId(null);
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update role');
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await api.patch(`/auth/staff/${u.id}`, { is_active: !u.is_active });
      toast.success(u.is_active ? 'User deactivated' : 'User reactivated');
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update user');
    }
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditRole(u.role);
  };

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Team</h1>
          <p style={{ color: '#8b8b9e', fontSize: 14 }}>Manage your bar staff, roles, and access</p>
        </div>
        {isOwner && (
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> Add Team Member
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Members', value: users.length, color: '#6c5ce7' },
          { label: 'Active', value: users.filter(u => u.is_active).length, color: '#00b894' },
          { label: 'Inactive', value: users.filter(u => !u.is_active).length, color: '#d63031' },
        ].map(stat => (
          <div key={stat.label} className="glass-card" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${stat.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#8b8b9e' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      {loading ? (
        <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 40 }}>Loading team...</p>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Team Member', 'Role', 'Status', 'Joined', isOwner ? 'Actions' : ''].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#8b8b9e', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const roleColor = ROLE_COLORS[u.role];
                  const isEditing = editingId === u.id;
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} style={{
                      borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      opacity: u.is_active ? 1 : 0.5,
                      transition: 'background 0.15s',
                    }}>
                      {/* Avatar + Name */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: `linear-gradient(135deg, ${roleColor.text}44, ${roleColor.text}22)`,
                            border: `1px solid ${roleColor.text}44`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15, fontWeight: 700, color: roleColor.text,
                            flexShrink: 0,
                          }}>
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              {u.full_name}
                              {isSelf && <span style={{ marginLeft: 6, fontSize: 10, color: '#a29bfe', background: 'rgba(108,92,231,0.15)', padding: '2px 6px', borderRadius: 4 }}>You</span>}
                            </div>
                            <div style={{ fontSize: 12, color: '#8b8b9e' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '16px 20px' }}>
                        {isEditing && isOwner && !isSelf ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <select value={editRole} onChange={e => setEditRole(e.target.value)}
                              style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, minWidth: 110 }}>
                              <option value="staff">Staff</option>
                              <option value="manager">Manager</option>
                            </select>
                            <button onClick={() => updateRole(u.id)}
                              style={{ background: '#00b894', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Check size={14} color="white" />
                            </button>
                            <button onClick={() => setEditingId(null)}
                              style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer', padding: '6px 4px' }}>
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: roleColor.bg, color: roleColor.text,
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                            <Shield size={10} />
                            {ROLE_LABELS[u.role]}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: u.is_active ? 'rgba(0, 184, 148, 0.1)' : 'rgba(214, 48, 49, 0.1)',
                          color: u.is_active ? '#00b894' : '#d63031',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Joined */}
                      <td style={{ padding: '16px 20px', fontSize: 13, color: '#8b8b9e' }}>
                        {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Actions (Owner only) */}
                      {isOwner && (
                        <td style={{ padding: '16px 20px' }}>
                          {!isSelf && u.role !== 'owner' ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => startEdit(u)} title="Edit role"
                                style={{ background: 'rgba(108,92,231,0.1)', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: '#a29bfe', display: 'flex', alignItems: 'center' }}>
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => toggleActive(u)} title={u.is_active ? 'Deactivate' : 'Reactivate'}
                                style={{
                                  background: u.is_active ? 'rgba(214, 48, 49, 0.08)' : 'rgba(0, 184, 148, 0.08)',
                                  border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
                                  color: u.is_active ? '#d63031' : '#00b894', display: 'flex', alignItems: 'center',
                                }}>
                                {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: '#8b8b9e' }}>—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add Team Member</h2>
                <p style={{ fontSize: 13, color: '#8b8b9e', marginTop: 4 }}>Create a new account with access to BarPulse</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8b8b9e', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                <input required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                  placeholder="e.g. Raj Sharma" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8b8b9e', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. raj@yourbar.com" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8b8b9e', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <input required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 6 characters" minLength={6} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8b8b9e', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="staff">Staff — Can open/close shifts and log stock</option>
                  {isOwner && <option value="manager">Manager — Can view reports and manage products</option>}
                </select>
                <p style={{ fontSize: 11, color: '#8b8b9e', marginTop: 6 }}>
                  {form.role === 'manager'
                    ? '🔑 Manager can view all reports and loss data for this bar.'
                    : '👤 Staff can log stock movements and open/close their own shifts.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
