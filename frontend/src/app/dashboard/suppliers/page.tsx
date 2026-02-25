'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Supplier } from '@/types';
import { Plus, X, Edit2, Trash2, Truck, Mail, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try { const res = await api.get('/suppliers'); setSuppliers(res.data); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const openAdd = () => { setEditItem(null); setForm({ name: '', contact_person: '', phone: '', email: '', address: '' }); setShowModal(true); };
  const openEdit = (s: Supplier) => {
    setEditItem(s);
    setForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) { await api.patch(`/suppliers/${editItem.id}`, form); toast.success('Supplier updated'); }
      else { await api.post('/suppliers', form); toast.success('Supplier added'); }
      setShowModal(false); loadData();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    try { await api.delete(`/suppliers/${id}`); toast.success('Deleted'); loadData(); }
    catch (err) { toast.error('Failed to delete'); }
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Suppliers</h1>
          <p style={{ color: '#8b8b9e', fontSize: 14 }}>{suppliers.length} registered suppliers</p>
        </div>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {loading ? <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 40 }}>Loading...</p> :
      suppliers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9e' }}>
          <Truck size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>No suppliers yet</h3>
          <p style={{ marginBottom: 24 }}>Add your first supplier to start placing orders</p>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Supplier</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {suppliers.map((s, i) => (
            <div key={s.id} className="glass-card" style={{ padding: 20, animationDelay: `${i * 0.03}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{s.name}</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer' }}><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#8b8b9e' }}>
                {s.contact_person && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Truck size={13} /> {s.contact_person}</div>}
                {s.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={13} /> {s.phone}</div>}
                {s.email && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={13} /> {s.email}</div>}
                {s.address && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={13} /> {s.address}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editItem ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Company Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Contact Person</label>
                <input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              </div>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} /></div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editItem ? 'Update' : 'Add Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
