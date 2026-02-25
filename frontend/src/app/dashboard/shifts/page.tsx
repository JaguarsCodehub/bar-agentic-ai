'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Shift, Product } from '@/types';
import { Play, Square, Clock, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [shiftRes, prodRes] = await Promise.all([
        api.get('/shifts', { params: { limit: 50 } }),
        api.get('/products', { params: { limit: 200 } }),
      ]);
      setShifts(shiftRes.data.shifts);
      setProducts(prodRes.data.products);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const openShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const stock_counts = Object.entries(counts)
        .filter(([_, v]) => v !== '')
        .map(([product_id, count]) => ({ product_id, count: parseFloat(count) }));
      if (stock_counts.length === 0) { toast.error('Enter at least one stock count'); return; }
      await api.post('/shifts/open', { stock_counts });
      toast.success('Shift opened!');
      setShowOpenModal(false); setCounts({}); loadData();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const closeShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift) return;
    try {
      const stock_counts = Object.entries(counts)
        .filter(([_, v]) => v !== '')
        .map(([product_id, count]) => ({ product_id, count: parseFloat(count) }));
      await api.post(`/shifts/${selectedShift.id}/close`, { stock_counts });
      toast.success('Shift closed! Reconciliation complete.');
      setShowCloseModal(false); setCounts({}); setSelectedShift(null); loadData();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const initCloseModal = (shift: Shift) => {
    setSelectedShift(shift);
    const c: Record<string, string> = {};
    shift.stock_counts.forEach(sc => { c[sc.product_id] = ''; });
    setCounts(c);
    setShowCloseModal(true);
  };

  const initOpenModal = () => {
    const c: Record<string, string> = {};
    products.forEach(p => { c[p.id] = p.current_stock.toString(); });
    setCounts(c);
    setShowOpenModal(true);
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Shifts</h1>
          <p style={{ color: '#8b8b9e', fontSize: 14 }}>Manage shifts with opening & closing stock counts</p>
        </div>
        <button className="btn-primary" onClick={initOpenModal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Play size={18} /> Open Shift
        </button>
      </div>

      {loading ? <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 40 }}>Loading...</p> :
      shifts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9e' }}>
          <Clock size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>No shifts yet</h3>
          <p>Open your first shift to start tracking</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shifts.map((s, i) => (
            <div key={s.id} className="glass-card" style={{ padding: 20, animationDelay: `${i * 0.03}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: s.status === 'open' ? '#00cec9' : '#8b8b9e',
                    animation: s.status === 'open' ? 'pulse-glow 2s infinite' : 'none',
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>Shift #{s.id.slice(0, 8)}</div>
                    <div style={{ fontSize: 12, color: '#8b8b9e' }}>
                      {new Date(s.start_time).toLocaleString()}
                      {s.end_time && ` — ${new Date(s.end_time).toLocaleString()}`}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`badge ${s.status === 'open' ? 'badge-success' : 'badge-draft'}`}>{s.status.toUpperCase()}</span>
                  <span style={{ fontSize: 13, color: '#8b8b9e' }}>{s.stock_counts.length} products</span>
                  {s.status === 'open' && (
                    <button className="btn-danger" onClick={() => initCloseModal(s)}
                      style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Square size={12} /> Close Shift
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="modal-overlay" onClick={() => setShowOpenModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Open New Shift</h2>
              <button onClick={() => setShowOpenModal(false)} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: '#8b8b9e', fontSize: 13, marginBottom: 16 }}>Enter opening stock counts for each product:</p>
            <form onSubmit={openShift}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {products.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                    <input type="number" step="0.01" value={counts[p.id] || ''}
                      onChange={e => setCounts({...counts, [p.id]: e.target.value})}
                      placeholder="0" style={{ width: 100, textAlign: 'center' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowOpenModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Open Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && selectedShift && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Close Shift</h2>
              <button onClick={() => setShowCloseModal(false)} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: '#8b8b9e', fontSize: 13, marginBottom: 16 }}>Enter closing stock counts. Reconciliation will run automatically.</p>
            <form onSubmit={closeShift}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {selectedShift.stock_counts.map(sc => (
                  <div key={sc.product_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{getProductName(sc.product_id)}
                      <span style={{ color: '#8b8b9e', fontSize: 11, marginLeft: 6 }}>(opened: {sc.opening_count})</span>
                    </span>
                    <input type="number" step="0.01" value={counts[sc.product_id] || ''}
                      onChange={e => setCounts({...counts, [sc.product_id]: e.target.value})}
                      placeholder="0" style={{ width: 100, textAlign: 'center' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCloseModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Close & Reconcile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
