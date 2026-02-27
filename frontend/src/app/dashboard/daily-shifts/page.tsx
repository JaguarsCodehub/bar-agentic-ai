'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { User, DailyShiftsResponse, DailyShiftEntry } from '@/types';
import { CalendarDays, Clock, Users, CheckCircle, X, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

function formatDuration(hours?: number): string {
  if (hours === undefined || hours === null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatTime(dt: string): string {
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DailyShiftsPage() {
  const [date, setDate] = useState(todayString());
  const [staffFilter, setStaffFilter] = useState('');
  const [data, setData] = useState<DailyShiftsResponse | null>(null);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    loadDailyShifts();
  }, [date, staffFilter]);

  const loadStaff = async () => {
    try {
      const res = await api.get('/auth/staff');
      setStaff(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDailyShifts = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { date };
      if (staffFilter) params.staff_id = staffFilter;
      const res = await api.get('/shifts/daily', { params });
      setData(res.data);
    } catch (err: any) {
      toast.error('Failed to load daily shifts');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Daily Shifts</h1>
        <p style={{ color: '#8b8b9e', fontSize: 14 }}>Full shift logbook — who worked, for how long, and what was done</p>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarDays size={16} color="#8b8b9e" />
          <label style={{ fontSize: 13, color: '#8b8b9e', fontWeight: 500 }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 14 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={16} color="#8b8b9e" />
          <label style={{ fontSize: 13, color: '#8b8b9e', fontWeight: 500 }}>Staff</label>
          <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, fontSize: 14, minWidth: 160 }}>
            <option value="">All Staff</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
        </div>

        {formattedDate && (
          <div style={{ marginLeft: 'auto', fontSize: 13, color: '#8b8b9e', fontStyle: 'italic' }}>
            {formattedDate}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Shifts', value: data.total_shifts, icon: Clock, color: '#6c5ce7' },
            { label: 'Total Hours Worked', value: formatDuration(data.total_hours_worked), icon: TrendingUp, color: '#00b894' },
            { label: 'Open Shifts', value: data.open_shifts_count, icon: CheckCircle, color: data.open_shifts_count > 0 ? '#fdcb6e' : '#8b8b9e' },
          ].map(stat => (
            <div key={stat.label} className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${stat.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={20} color={stat.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: '#8b8b9e' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shifts Table */}
      {loading ? (
        <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 60 }}>Loading shifts...</p>
      ) : !data || data.shifts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9e' }}>
          <CalendarDays size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>No Shifts Found</h3>
          <p>No shifts were recorded on this date</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.shifts.map((s, i) => {
            const isExpanded = expandedId === s.id;
            const isOpen = s.status === 'open';

            return (
              <div key={s.id} className="glass-card" style={{
                overflow: 'hidden',
                animationDelay: `${i * 0.04}s`,
                border: isOpen ? '1px solid rgba(0, 206, 201, 0.2)' : '1px solid var(--color-border)',
              }}>
                {/* Main row */}
                <div
                  onClick={() => toggleExpand(s.id)}
                  style={{ padding: '18px 24px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr 130px 180px 120px 100px 80px 40px', gap: 16, alignItems: 'center' }}
                >
                  {/* Staff Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, rgba(108,92,231,0.3), rgba(108,92,231,0.1))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 15, color: '#a29bfe',
                    }}>
                      {s.staff_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.staff_name}</div>
                      <div style={{ fontSize: 11, color: '#8b8b9e' }}>{s.id.slice(0, 8)}…</div>
                    </div>
                  </div>

                  {/* Status */}
                  <span style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: isOpen ? 'rgba(0, 206, 201, 0.12)' : 'rgba(139, 139, 158, 0.1)',
                    color: isOpen ? '#00cec9' : '#8b8b9e',
                    display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content',
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', background: 'currentColor',
                      animation: isOpen ? 'pulse-glow 2s infinite' : 'none',
                    }} />
                    {isOpen ? 'OPEN' : 'CLOSED'}
                  </span>

                  {/* Times */}
                  <div style={{ fontSize: 13, color: '#f0f0f5' }}>
                    <span>{formatTime(s.start_time)}</span>
                    {s.end_time && <span style={{ color: '#8b8b9e' }}> → {formatTime(s.end_time)}</span>}
                  </div>

                  {/* Duration */}
                  <div style={{ fontSize: 14, fontWeight: 600, color: s.duration_hours ? '#a29bfe' : '#8b8b9e' }}>
                    {formatDuration(s.duration_hours)}
                  </div>

                  {/* Sales */}
                  <div style={{ fontSize: 13, color: '#8b8b9e' }}>
                    <span style={{ fontWeight: 600, color: '#f0f0f5' }}>{s.sales_count}</span> sales
                  </div>

                  {/* Opened/Closed by */}
                  <div style={{ fontSize: 11, color: '#8b8b9e', lineHeight: 1.6 }}>
                    {s.opened_by_name && <div>▶ {s.opened_by_name}</div>}
                    {s.closed_by_name && <div>■ {s.closed_by_name}</div>}
                  </div>

                  {/* Expand icon */}
                  <div style={{ color: '#8b8b9e', display: 'flex', justifyContent: 'center' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{
                    padding: '0 24px 20px',
                    borderTop: '1px solid var(--color-border)',
                    background: 'rgba(0,0,0,0.15)',
                  }}>
                    <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8b8b9e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                          Shift Audit Trail
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                            <span style={{ color: '#00b894', width: 20 }}>▶</span>
                            <span style={{ color: '#8b8b9e' }}>Opened by:</span>
                            <span style={{ fontWeight: 600 }}>{s.opened_by_name || s.staff_name}</span>
                            <span style={{ color: '#8b8b9e' }}>at {formatTime(s.start_time)}</span>
                          </div>
                          {s.closed_by_name && s.end_time && (
                            <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                              <span style={{ color: '#d63031', width: 20 }}>■</span>
                              <span style={{ color: '#8b8b9e' }}>Closed by:</span>
                              <span style={{ fontWeight: 600 }}>{s.closed_by_name}</span>
                              <span style={{ color: '#8b8b9e' }}>at {formatTime(s.end_time)}</span>
                            </div>
                          )}
                          {isOpen && (
                            <div style={{ fontSize: 12, color: '#fdcb6e', marginTop: 4 }}>
                              ⚡ Shift is currently active
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#8b8b9e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                          Summary
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#8b8b9e' }}>Duration</span>
                            <span style={{ fontWeight: 600 }}>{formatDuration(s.duration_hours)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#8b8b9e' }}>Sales Records</span>
                            <span style={{ fontWeight: 600 }}>{s.sales_count}</span>
                          </div>
                          {s.notes && (
                            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 12, color: '#8b8b9e', lineHeight: 1.5 }}>
                              📝 {s.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
