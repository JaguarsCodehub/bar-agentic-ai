export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'staff' | 'manager' | 'owner';
  bar_id: string;
  is_active: boolean;
}

export interface Bar {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  created_at: string;
}

export interface Product {
  id: string;
  bar_id: string;
  name: string;
  category: 'spirits' | 'rum' | 'beer' | 'wine' | 'mixers' | 'cocktails' | 'other';
  unit: 'bottle' | 'ml' | 'pint' | 'can' | 'keg';
  volume_ml?: number;
  cost_price: number;
  sale_price: number;
  image_url?: string;
  description?: string;
  current_stock: number;
  min_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  bar_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface PurchaseOrder {
  id: string;
  bar_id: string;
  supplier_id: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  total_cost: number;
  notes?: string;
  ordered_at?: string;
  received_at?: string;
  created_at: string;
  items: PurchaseOrderItem[];
}

export interface StockMovement {
  id: string;
  bar_id: string;
  product_id: string;
  staff_id: string;
  type: 'IN' | 'OUT';
  reason: 'delivery' | 'wastage' | 'breakage' | 'theft' | 'adjustment' | 'return' | 'other';
  quantity: number;
  notes?: string;
  created_at: string;
}

export interface ShiftStockCount {
  id: string;
  product_id: string;
  opening_count: number;
  closing_count?: number;
}

export interface Shift {
  id: string;
  bar_id: string;
  staff_id: string;
  start_time: string;
  end_time?: string;
  status: 'open' | 'closed';
  notes?: string;
  created_at: string;
  stock_counts: ShiftStockCount[];
}

export interface SalesRecord {
  id: string;
  bar_id: string;
  product_id: string;
  shift_id: string;
  quantity_sold: number;
  sale_amount: number;
  created_at: string;
}

export interface Reconciliation {
  id: string;
  bar_id: string;
  shift_id: string;
  product_id: string;
  date: string;
  opening_stock: number;
  received: number;
  sold: number;
  expected_closing: number;
  actual_closing: number;
  discrepancy: number;
  created_at: string;
}

export interface LossReport {
  id: string;
  bar_id: string;
  reconciliation_id: string;
  product_id: string;
  shift_id: string;
  discrepancy_quantity: number;
  loss_value: number;
  severity: 'critical' | 'warning' | 'info';
  reason_code?: 'theft' | 'over_pour' | 'wastage' | 'entry_error' | 'unresolved';
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
}

export interface LossSummary {
  total_loss_value: number;
  total_incidents: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  unresolved_count: number;
  top_loss_products: { product_id: string; product_name: string; total_loss: number; incidents: number }[];
}

export interface DashboardSummary {
  total_products: number;
  total_stock_value: number;
  active_shifts: number;
  monthly_revenue: number;
  today_loss_value: number;
  today_loss_incidents: number;
  unresolved_alerts: number;
}

export interface ManagerDashboard {
  summary: DashboardSummary;
  low_stock_alerts: {
    id: string;
    name: string;
    current_stock: number;
    min_threshold: number;
    category: string;
  }[];
  loss_trend: { date: string; total_loss: number; incidents: number }[];
}
