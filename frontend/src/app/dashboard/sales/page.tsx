'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { SalesRecord, Product, Shift } from '@/types';
import { Plus, X, DollarSign, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SalesPage() {
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product_id: '', shift_id: '', quantity_sold: '', sale_amount: '' });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [salesRes, prodRes, shiftRes] = await Promise.all([
        api.get('/sales', { params: { limit: 100 } }),
        api.get('/products', { params: { limit: 200 } }),
        api.get('/shifts', { params: { limit: 20 } }),
      ]);
      setRecords(salesRes.data.records);
      setProducts(prodRes.data.products);
      setShifts(shiftRes.data.shifts);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/sales', {
        product_id: form.product_id, shift_id: form.shift_id,
        quantity_sold: parseFloat(form.quantity_sold), sale_amount: parseFloat(form.sale_amount),
      });
      toast.success('Sale recorded');
      setShowModal(false); loadData();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const openShift = shifts.find(s => s.status === 'open');
    if (!openShift) { toast.error('No open shift found. Open a shift first.'); return; }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/sales/import-csv?shift_id=${openShift.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Imported ${res.data.created} sales records`);
      if (res.data.errors?.length) { toast.error(`${res.data.errors.length} errors during import`); }
      loadData();
    } catch (err: any) { toast.error('Import failed'); }
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Sales Records</h1>
          <p style={{ color: '#8b8b9e', fontSize: 14 }}>{records.length} sales logged</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <Upload size={16} /> Import CSV
            <input type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} />
          </label>
          <button className="btn-primary" onClick={() => { setForm({ product_id: '', shift_id: '', quantity_sold: '', sale_amount: '' }); setShowModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> Add Sale
          </button>
        </div>
      </div>

      {loading ? <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 40 }}>Loading...</p> :
      records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9e' }}>
          <DollarSign size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>No sales recorded yet</h3>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Product</th><th>Qty Sold</th><th>Amount</th><th>Shift</th><th>Date</th></tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{getProductName(r.product_id)}</td>
                  <td>{r.quantity_sold}</td>
                  <td style={{ fontWeight: 600, color: '#00cec9' }}>₹{r.sale_amount.toLocaleString()}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{r.shift_id.slice(0, 8)}</td>
                  <td style={{ color: '#8b8b9e', fontSize: 13 }}>{new Date(r.created_at).toLocaleString()}</td>
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
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Record Sale</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Shift *</label>
                <select value={form.shift_id} onChange={e => setForm({...form, shift_id: e.target.value})} required>
                  <option value="">Select shift</option>
                  {shifts.filter(s => s.status === 'open').map(s => <option key={s.id} value={s.id}>Shift #{s.id.slice(0, 8)} (Open)</option>)}
                </select></div>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Product *</label>
                <select value={form.product_id} onChange={e => {
                  const prod = products.find(p => p.id === e.target.value);
                  setForm({...form, product_id: e.target.value, sale_amount: prod ? (parseFloat(form.quantity_sold || '1') * prod.sale_price).toString() : form.sale_amount });
                }} required>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.sale_price})</option>)}
                </select></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Quantity *</label>
                  <input type="number" step="0.01" value={form.quantity_sold} onChange={e => {
                    const prod = products.find(p => p.id === form.product_id);
                    setForm({...form, quantity_sold: e.target.value, sale_amount: prod ? (parseFloat(e.target.value || '0') * prod.sale_price).toString() : form.sale_amount });
                  }} required /></div>
                <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Sale Amount (₹) *</label>
                  <input type="number" step="0.01" value={form.sale_amount} onChange={e => setForm({...form, sale_amount: e.target.value})} required /></div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Record Sale</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
