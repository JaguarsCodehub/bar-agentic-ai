'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { PurchaseOrder, Supplier, Product } from '@/types';
import { Plus, X, Package, Check, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', notes: '', items: [{ product_id: '', quantity: '', unit_cost: '' }] });

  useEffect(() => { loadAll(); }, []);
  const loadAll = async () => {
    try {
      const [ordRes, supRes, prodRes] = await Promise.all([
        api.get('/purchase-orders'), api.get('/suppliers'), api.get('/products', { params: { limit: 200 } }),
      ]);
      setOrders(ordRes.data);
      setSuppliers(supRes.data);
      setProducts(prodRes.data.products);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: '', quantity: '', unit_cost: '' }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i: number, field: string, value: string) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/purchase-orders', {
        supplier_id: form.supplier_id, notes: form.notes || null,
        items: form.items.filter(i => i.product_id).map(i => ({
          product_id: i.product_id, quantity: parseFloat(i.quantity), unit_cost: parseFloat(i.unit_cost),
        })),
      });
      toast.success('Purchase order created');
      setShowModal(false); loadAll();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const receiveOrder = async (id: string) => {
    if (!confirm('Mark this order as received? Stock will be updated automatically.')) return;
    try { await api.post(`/purchase-orders/${id}/receive`); toast.success('Order received! Stock updated.'); loadAll(); }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      draft: 'badge badge-draft', ordered: 'badge badge-warning', received: 'badge badge-success', cancelled: 'badge badge-critical',
    };
    return <span className={classes[status] || 'badge'}>{status.toUpperCase()}</span>;
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Purchase Orders</h1>
          <p style={{ color: '#8b8b9e', fontSize: 14 }}>{orders.length} orders</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ supplier_id: '', notes: '', items: [{ product_id: '', quantity: '', unit_cost: '' }] }); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> New Order
        </button>
      </div>

      {loading ? <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 40 }}>Loading...</p> :
      orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9e' }}>
          <ShoppingCart size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>No purchase orders yet</h3>
          <p>Create orders to track supplier deliveries</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Order ID</th><th>Supplier</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{o.id.slice(0, 8)}</td>
                  <td>{suppliers.find(s => s.id === o.supplier_id)?.name || 'Unknown'}</td>
                  <td>{o.items.length} items</td>
                  <td style={{ fontWeight: 600 }}>₹{o.total_cost.toLocaleString()}</td>
                  <td>{getStatusBadge(o.status)}</td>
                  <td style={{ fontSize: 13, color: '#8b8b9e' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    {o.status !== 'received' && o.status !== 'cancelled' && (
                      <button className="btn-primary" onClick={() => receiveOrder(o.id)}
                        style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={12} /> Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>New Purchase Order</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Supplier *</label>
                <select value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})} required>
                  <option value="">Select supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: '#8b8b9e', fontWeight: 600 }}>Order Items</label>
                  <button type="button" onClick={addItem} style={{ background: 'none', border: 'none', color: '#a29bfe', cursor: 'pointer', fontSize: 13 }}>+ Add Item</button>
                </div>
                {form.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                    <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} required>
                      <option value="">Select product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} required />
                    <input type="number" step="0.01" placeholder="Cost" value={item.unit_cost} onChange={e => updateItem(i, 'unit_cost', e.target.value)} required />
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 8 }}><X size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
