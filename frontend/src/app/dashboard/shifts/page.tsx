'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Shift, Product, User } from '@/types';
import { Play, Square, Clock, X, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

function formatDuration(startTime: string, endTime?: string): string {
  if (!endTime) return '—';
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export default function ShiftsPage() {
  const { user: currentUser } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [staffFilter, setStaffFilter] = useState('');

  const isManager = currentUser?.role === 'manager' || currentUser?.role === 'owner';

  useEffect(() => { loadData(); }, [staffFilter]);

  const loadData = async () => {
    try {
      const params: Record<string, any> = { limit: 50 };
      if (staffFilter) params.staff_id = staffFilter;

      const [shiftRes, prodRes] = await Promise.all([
        api.get('/shifts', { params }),
        api.get('/products', { params: { limit: 200 } }),
      ]);

      if (isManager) {
        const staffRes = await api.get('/auth/staff');
        setStaff(staffRes.data);
      }

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

      {/* Staff filter (Manager+) */}
      {isManager && staff.length > 0 && (
        <div className="glass-card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Filter size={15} color="#8b8b9e" />
          <span style={{ fontSize: 13, color: '#8b8b9e' }}>Filter by staff:</span>
          <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={{ minWidth: 180, fontSize: 13, padding: '6px 10px' }}>
            <option value="">All Staff</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          {staffFilter && (
            <button onClick={() => setStaffFilter('')} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      )}

      {loading ? <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 40 }}>Loading...</p> :
        shifts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9e' }}>
            <Clock size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>No shifts yet</h3>
            <p>Open your first shift to start tracking</p>
          </div>
        ) : (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Status', 'Staff', 'Started', 'Duration', 'Opened By', 'Closed By', 'Products', 'Action'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#8b8b9e', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < shifts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: s.status === 'open' ? '#00cec9' : '#8b8b9e',
                          animation: s.status === 'open' ? 'pulse-glow 2s infinite' : 'none',
                        }} />
                        <span className={`badge ${s.status === 'open' ? 'badge-success' : 'badge-draft'}`} style={{ fontSize: 11 }}>
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600 }}>
                      {s.staff_name || s.staff_id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#8b8b9e' }}>
                      {new Date(s.start_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: s.end_time ? '#a29bfe' : '#8b8b9e' }}>
                      {formatDuration(s.start_time, s.end_time)}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#00b894' }}>
                      {s.opened_by_name || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: s.closed_by_name ? '#d63031' : '#8b8b9e' }}>
                      {s.closed_by_name || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#8b8b9e' }}>
                      {s.stock_counts.length}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {s.status === 'open' && (
                        <button className="btn-danger" onClick={() => initCloseModal(s)}
                          style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Square size={12} /> Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                      onChange={e => setCounts({ ...counts, [p.id]: e.target.value })}
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
                      onChange={e => setCounts({ ...counts, [sc.product_id]: e.target.value })}
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
