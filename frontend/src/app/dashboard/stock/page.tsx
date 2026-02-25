'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { StockMovement, Product } from '@/types';
import { Plus, X, ArrowLeftRight, ArrowDown, ArrowUp } from 'lucide-react';
import toast from 'react-hot-toast';

const REASONS = ['delivery', 'wastage', 'breakage', 'theft', 'adjustment', 'return', 'other'];

export default function StockPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product_id: '', type: 'OUT', reason: 'wastage', quantity: '', notes: '' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [movRes, prodRes] = await Promise.all([
        api.get('/stock-movements', { params: { limit: 100 } }),
        api.get('/products', { params: { limit: 200 } }),
      ]);
      setMovements(movRes.data.movements);
      setProducts(prodRes.data.products);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/stock-movements', {
        product_id: form.product_id, type: form.type, reason: form.reason,
        quantity: parseFloat(form.quantity), notes: form.notes || null,
      });
      toast.success(`Stock ${form.type === 'IN' ? 'added' : 'removed'}`);
      setShowModal(false); loadData();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Stock Movements</h1>
          <p style={{ color: '#8b8b9e', fontSize: 14 }}>Track all stock in/out events</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ product_id: '', type: 'OUT', reason: 'wastage', quantity: '', notes: '' }); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Log Movement
        </button>
      </div>

      {loading ? <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 40 }}>Loading...</p> :
      movements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9e' }}>
          <ArrowLeftRight size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>No stock movements yet</h3>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Type</th><th>Product</th><th>Qty</th><th>Reason</th><th>Notes</th><th>Date</th></tr></thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m.type === 'IN' ? <ArrowDown size={14} color="#00cec9" /> : <ArrowUp size={14} color="#ff6b6b" />}
                    <span style={{ color: m.type === 'IN' ? '#00cec9' : '#ff6b6b', fontWeight: 600, fontSize: 13 }}>{m.type}</span>
                  </div></td>
                  <td style={{ fontWeight: 500 }}>{getProductName(m.product_id)}</td>
                  <td style={{ fontWeight: 600 }}>{m.quantity}</td>
                  <td><span className="badge badge-draft" style={{ textTransform: 'capitalize' }}>{m.reason.replace('_', ' ')}</span></td>
                  <td style={{ color: '#8b8b9e', fontSize: 13 }}>{m.notes || '—'}</td>
                  <td style={{ color: '#8b8b9e', fontSize: 13 }}>{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Log Stock Movement</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Type *</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="IN">Stock IN</option><option value="OUT">Stock OUT</option>
                  </select></div>
                <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Reason *</label>
                  <select value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}>
                    {REASONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select></div>
              </div>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Product *</label>
                <select value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})} required>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.current_stock})</option>)}
                </select></div>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Quantity *</label>
                <input type="number" step="0.01" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required /></div>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Log Movement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
