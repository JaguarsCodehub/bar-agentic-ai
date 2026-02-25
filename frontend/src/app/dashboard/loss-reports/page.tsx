'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { LossReport, Product, LossSummary } from '@/types';
import { AlertTriangle, X, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

const REASON_CODES = [
  { value: 'theft', label: 'Theft' },
  { value: 'over_pour', label: 'Over Pour' },
  { value: 'wastage', label: 'Wastage' },
  { value: 'entry_error', label: 'Entry Error' },
];

export default function LossReportsPage() {
  const [reports, setReports] = useState<LossReport[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<LossSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<LossReport | null>(null);
  const [reasonCode, setReasonCode] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [repRes, prodRes, sumRes] = await Promise.all([
        api.get('/loss-reports', { params: { limit: 100 } }),
        api.get('/products', { params: { limit: 200 } }),
        api.get('/loss-reports/summary', { params: { days: 30 } }),
      ]);
      setReports(repRes.data.reports);
      setProducts(prodRes.data.products);
      setSummary(sumRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const assignReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    try {
      await api.patch(`/loss-reports/${selectedReport.id}`, { reason_code: reasonCode, notes: notes || null });
      toast.success('Reason code assigned');
      setShowReasonModal(false); loadData();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';
  const getSeverityClass = (s: string) => ({ critical: 'badge badge-critical', warning: 'badge badge-warning', info: 'badge badge-info' }[s] || 'badge');

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Loss Reports</h1>
        <p style={{ color: '#8b8b9e', fontSize: 14 }}>Review and resolve inventory discrepancies</p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#8b8b9e', marginBottom: 4 }}>Total Loss (30d)</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ff6b6b' }}>₹{summary.total_loss_value.toLocaleString()}</div>
          </div>
          <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#8b8b9e', marginBottom: 4 }}>Incidents</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.total_incidents}</div>
          </div>
          <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#8b8b9e', marginBottom: 4 }}>Critical</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ff6b6b' }}>{summary.critical_count}</div>
          </div>
          <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#8b8b9e', marginBottom: 4 }}>Unresolved</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fdcb6e' }}>{summary.unresolved_count}</div>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 40 }}>Loading...</p> :
      reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9e' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>No loss reports</h3>
          <p>Close shifts to generate reconciliation reports</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Product</th><th>Discrepancy</th><th>Loss Value</th><th>Severity</th><th>Reason</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{getProductName(r.product_id)}</td>
                  <td style={{ fontWeight: 600, color: '#ff6b6b' }}>{r.discrepancy_quantity}</td>
                  <td style={{ fontWeight: 600 }}>₹{r.loss_value.toLocaleString()}</td>
                  <td><span className={getSeverityClass(r.severity)}>{r.severity.toUpperCase()}</span></td>
                  <td>
                    {r.reason_code ? (
                      <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>{r.reason_code.replace('_', ' ')}</span>
                    ) : (
                      <span style={{ color: '#fdcb6e', fontSize: 12 }}>⚠ Unresolved</span>
                    )}
                  </td>
                  <td style={{ color: '#8b8b9e', fontSize: 13 }}>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    {!r.reason_code && (
                      <button className="btn-secondary" onClick={() => { setSelectedReport(r); setReasonCode(''); setNotes(''); setShowReasonModal(true); }}
                        style={{ padding: '4px 10px', fontSize: 12 }}>Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showReasonModal && selectedReport && (
        <div className="modal-overlay" onClick={() => setShowReasonModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Assign Reason Code</h2>
              <button onClick={() => setShowReasonModal(false)} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: 13, color: '#8b8b9e', marginBottom: 16 }}>
              <strong>{getProductName(selectedReport.product_id)}</strong> — {selectedReport.discrepancy_quantity} units, ₹{selectedReport.loss_value}
            </p>
            <form onSubmit={assignReason} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Reason *</label>
                <select value={reasonCode} onChange={e => setReasonCode(e.target.value)} required>
                  <option value="">Select reason</option>
                  {REASON_CODES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select></div>
              <div><label style={{ fontSize: 12, color: '#8b8b9e', display: 'block', marginBottom: 4 }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Additional notes..." /></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowReasonModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Resolve</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
