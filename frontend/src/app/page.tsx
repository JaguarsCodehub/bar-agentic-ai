'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Wine, ArrowRight } from 'lucide-react';
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
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0a0a0a' }}>

      {/* Left — Video Hero */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '48px',
      }}>
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.55,
          }}
        >
          <source src="/bar.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlay — bottom fade for text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)',
        }} />

        {/* Logo */}
        <div style={{
          position: 'absolute',
          top: 48,
          left: 48,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 1,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Wine size={22} color="#0a0a0a" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>BarPulse</span>
        </div>

        {/* Hero copy */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560 }}>
          <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', color: '#aaa', textTransform: 'uppercase', marginBottom: 16 }}>
            Bar Management, Simplified
          </p>
          <h1 style={{
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.1,
            color: '#fff',
            letterSpacing: '-1.5px',
            marginBottom: 20,
          }}>
            Every Pour.<br />Accounted For.
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, maxWidth: 440 }}>
            Know exactly where your stock goes — every shift, every bottle, every drop. No more guessing.
          </p>
        </div>
      </div>

      {/* Right — Auth form */}
      <div style={{
        width: 460,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 52px',
        background: '#111',
        borderLeft: '1px solid #1f1f1f',
      }}>
        {/* Form header */}
        <div style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8, letterSpacing: '-0.3px' }}>
            {isRegister ? 'Create your account' : 'Sign in to BarPulse'}
          </h2>
          <p style={{ color: '#666', fontSize: 14 }}>
            {isRegister ? 'Set up your bar in under a minute.' : 'Enter your credentials to continue.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isRegister && (
            <>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Smith"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Bar Name</label>
                <input
                  value={barName}
                  onChange={e => setBarName(e.target.value)}
                  placeholder="My Bar & Lounge"
                  required
                  style={inputStyle}
                />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@mybar.com"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '13px 24px',
              width: '100%',
              background: loading ? '#333' : '#fff',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
              letterSpacing: '-0.1px',
            }}
          >
            {loading ? 'Please wait...' : (
              <>
                {isRegister ? 'Create Account' : 'Sign In'}
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
          >
            {isRegister ? 'Already have an account? Sign in →' : "Don't have an account? Create one →"}
          </button>
        </div>
      </div>

    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#888',
  marginBottom: 6,
  letterSpacing: '0.02em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: 9,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};
