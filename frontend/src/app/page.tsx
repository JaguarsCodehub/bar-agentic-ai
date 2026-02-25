'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Wine, ArrowRight, BarChart3, Shield, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [barName, setBarName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  if (user) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, fullName, barName);
        toast.success('Account created! Welcome aboard 🍻');
      } else {
        await login(email, password);
        toast.success('Welcome back!');
      }
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left side — branding */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #0f0f13 0%, #1a1024 50%, #0f0f13 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative gradient orbs */}
        <div style={{
          position: 'absolute', top: '10%', left: '20%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,92,231,0.15), transparent 70%)',
          filter: 'blur(60px)'
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '10%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,206,201,0.1), transparent 70%)',
          filter: 'blur(40px)'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Wine size={28} color="white" />
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>BarPulse</span>
          </div>

          <h1 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.15, marginBottom: 20, letterSpacing: '-1px' }}>
            Stop Losing Revenue<br />
            <span style={{ background: 'linear-gradient(135deg, #6c5ce7, #00cec9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Start Tracking Every Drop
            </span>
          </h1>

          <p style={{ color: '#8b8b9e', fontSize: 18, lineHeight: 1.6, maxWidth: 480, marginBottom: 48 }}>
            Real-time inventory tracking, automated loss detection, and shift-level reconciliation. Built for bars that refuse to bleed money.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: BarChart3, text: 'Real-time stock & loss dashboards' },
              { icon: Shield, text: 'Automated discrepancy detection per shift' },
              { icon: Zap, text: 'Reconciliation in under 2 minutes' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#a29bfe' }}>
                <Icon size={20} />
                <span style={{ color: '#c8c8d8', fontSize: 15 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div style={{
        width: 480, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)'
      }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          {isRegister ? 'Create your account' : 'Welcome back'}
        </h2>
        <p style={{ color: '#8b8b9e', marginBottom: 32, fontSize: 15 }}>
          {isRegister ? 'Set up your bar in under a minute' : 'Sign in to your dashboard'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isRegister && (
            <>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#8b8b9e', marginBottom: 6, display: 'block' }}>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith" required />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#8b8b9e', marginBottom: 6, display: 'block' }}>Bar Name</label>
                <input value={barName} onChange={e => setBarName(e.target.value)} placeholder="My Bar & Lounge" required />
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#8b8b9e', marginBottom: 6, display: 'block' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@mybar.com" required />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#8b8b9e', marginBottom: 6, display: 'block' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', width: '100%' }}>
            {loading ? 'Please wait...' : (
              <>
                {isRegister ? 'Create Account' : 'Sign In'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={() => setIsRegister(!isRegister)}
            style={{ background: 'none', border: 'none', color: '#a29bfe', cursor: 'pointer', fontSize: 14 }}>
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
