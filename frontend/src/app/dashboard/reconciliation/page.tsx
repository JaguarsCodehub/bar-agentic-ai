'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Reconciliation, Product } from '@/types';
import { FileText } from 'lucide-react';

export default function ReconciliationPage() {
  const [data, setData] = useState<Reconciliation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [recRes, prodRes] = await Promise.all([
        api.get('/reconciliation', { params: { limit: 100 } }),
        api.get('/products', { params: { limit: 200 } }),
      ]);
      setData(recRes.data.reconciliations);
      setProducts(prodRes.data.products);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Reconciliation</h1>
        <p style={{ color: '#8b8b9e', fontSize: 14 }}>Expected vs actual stock comparison per shift</p>
      </div>

      {loading ? <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 40 }}>Loading...</p> :
      data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9e' }}>
          <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>No reconciliation data</h3>
          <p>Close shifts to generate reconciliation reports</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Product</th><th>Opening</th><th>Received</th><th>Sold</th><th>Expected</th><th>Actual</th><th>Discrepancy</th></tr></thead>
            <tbody>
              {data.map(r => (
                <tr key={r.id}>
                  <td style={{ fontSize: 13 }}>{r.date}</td>
                  <td style={{ fontWeight: 500 }}>{getProductName(r.product_id)}</td>
                  <td>{r.opening_stock}</td>
                  <td style={{ color: '#00cec9' }}>+{r.received}</td>
                  <td style={{ color: '#fdcb6e' }}>-{r.sold}</td>
                  <td style={{ fontWeight: 600 }}>{r.expected_closing}</td>
                  <td style={{ fontWeight: 600 }}>{r.actual_closing}</td>
                  <td style={{
                    fontWeight: 700,
                    color: Math.abs(r.discrepancy) > 0.5 ? '#ff6b6b' : '#00cec9',
                  }}>
                    {r.discrepancy > 0 ? `-${r.discrepancy}` : r.discrepancy === 0 ? '✓ 0' : `+${Math.abs(r.discrepancy)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
