'use client';

import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  Wine, LayoutDashboard, Package, Truck, ShoppingCart,
  ArrowLeftRight, Clock, DollarSign, AlertTriangle,
  FileText, LogOut, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Suppliers', href: '/dashboard/suppliers', icon: Truck },
  { label: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ShoppingCart },
  { label: 'Stock Movements', href: '/dashboard/stock', icon: ArrowLeftRight },
  { label: 'Shifts', href: '/dashboard/shifts', icon: Clock },
  { label: 'Sales', href: '/dashboard/sales', icon: DollarSign },
  { label: 'Loss Reports', href: '/dashboard/loss-reports', icon: AlertTriangle },
  { label: 'Reconciliation', href: '/dashboard/reconciliation', icon: FileText },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-glow" style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wine size={24} color="white" />
          </div>
          <p style={{ color: '#8b8b9e' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 30,
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Wine size={22} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>BarPulse</div>
              <div style={{ fontSize: 11, color: '#8b8b9e' }}>Management System</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {menuItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', marginBottom: 2,
                borderRadius: 10, textDecoration: 'none',
                color: isActive ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(108, 92, 231, 0.1)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
                transition: 'all 0.15s ease',
              }}>
                <Icon size={18} />
                <span>{label}</span>
                {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white',
            }}>
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user.full_name}</div>
              <div style={{ fontSize: 11, color: '#8b8b9e', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
          </div>
          <button onClick={() => { logout(); router.push('/'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', color: '#8b8b9e',
              cursor: 'pointer', fontSize: 13, padding: '6px 0',
            }}>
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 260, padding: '32px 40px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
