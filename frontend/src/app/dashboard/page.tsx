'use client';

import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ManagerDashboard } from '@/types';
import {
  Package, DollarSign, AlertTriangle, TrendingDown,
  Clock, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/dashboard/manager');
      setData(res.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: '#8b8b9e' }}>Loading dashboard...</p>
      </div>
    );
  }

  const summary = data?.summary;

  const statCards = [
    { label: 'Total Products', value: summary?.total_products || 0, icon: Package, color: '#6c5ce7' },
    { label: 'Stock Value', value: `₹${(summary?.total_stock_value || 0).toLocaleString()}`, icon: DollarSign, color: '#00cec9' },
    { label: 'Monthly Revenue', value: `₹${(summary?.monthly_revenue || 0).toLocaleString()}`, icon: TrendingDown, color: '#00cec9' },
    { label: "Today's Loss", value: `₹${(summary?.today_loss_value || 0).toLocaleString()}`, icon: AlertTriangle, color: summary?.today_loss_value ? '#ff6b6b' : '#00cec9' },
    { label: 'Active Shifts', value: summary?.active_shifts || 0, icon: Clock, color: '#fdcb6e' },
    { label: 'Unresolved Alerts', value: summary?.unresolved_alerts || 0, icon: Activity, color: summary?.unresolved_alerts ? '#ff6b6b' : '#00cec9' },
  ];

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
          Welcome back, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: '#8b8b9e', fontSize: 15 }}>Here's what's happening at your bar today</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {statCards.map((card, i) => (
          <div key={i} className="glass-card" style={{ padding: 24, animationDelay: `${i * 0.05}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#8b8b9e', fontWeight: 500 }}>{card.label}</span>
              <card.icon size={20} color={card.color} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Loss Trend Chart */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Loss Trend (Last 7 Days)</h3>
          {data?.loss_trend && data.loss_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.loss_trend}>
                <defs>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" stroke="#8b8b9e" fontSize={12} />
                <YAxis stroke="#8b8b9e" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#22222e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f0f0f5' }}
                />
                <Area type="monotone" dataKey="total_loss" stroke="#ff6b6b" fill="url(#lossGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8b9e' }}>
              No loss data yet. Close shifts to see trends.
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Low Stock Alerts</h3>
          {data?.low_stock_alerts && data.low_stock_alerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.low_stock_alerts.slice(0, 6).map((alert, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255, 107, 107, 0.06)',
                  border: '1px solid rgba(255, 107, 107, 0.1)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{alert.name}</div>
                    <div style={{ fontSize: 11, color: '#8b8b9e', textTransform: 'capitalize' }}>{alert.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#ff6b6b' }}>{alert.current_stock}</div>
                    <div style={{ fontSize: 10, color: '#8b8b9e' }}>min: {alert.min_threshold}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#00cec9', fontSize: 14, padding: 20, textAlign: 'center' }}>
              ✓ All products above minimum threshold
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
