'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Product } from '@/types';
import { Plus, Search, Package, Upload, X, Edit2, Trash2, AlertTriangle, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

const CATEGORIES = ['spirits', 'rum', 'beer', 'wine', 'mixers', 'cocktails', 'other'];
const UNITS = ['bottle', 'ml', 'pint', 'can', 'keg'];
const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8000';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', category: 'spirits', unit: 'bottle',
    volume_ml: '', cost_price: '', sale_price: '',
    description: '', min_stock_threshold: '5', current_stock: '0',
  });

  useEffect(() => { loadProducts(); }, [search, categoryFilter]);

  const loadProducts = async () => {
    try {
      const params: any = { page: 1, limit: 100 };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      const res = await api.get('/products', { params });
      setProducts(res.data.products);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }, maxFiles: 1, maxSize: 5 * 1024 * 1024,
  });

  const openAddModal = () => {
    setEditProduct(null);
    setForm({ name: '', category: 'spirits', unit: 'bottle', volume_ml: '', cost_price: '', sale_price: '', description: '', min_stock_threshold: '5', current_stock: '0' });
    setImageFile(null); setImagePreview(null);
    setShowModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, category: p.category, unit: p.unit,
      volume_ml: p.volume_ml?.toString() || '', cost_price: p.cost_price.toString(),
      sale_price: p.sale_price.toString(), description: p.description || '',
      min_stock_threshold: p.min_stock_threshold.toString(), current_stock: p.current_stock.toString(),
    });
    setImageFile(null);
    setImagePreview(p.image_url ? `${API_HOST}${p.image_url}` : null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name, category: form.category, unit: form.unit,
        volume_ml: form.volume_ml ? parseInt(form.volume_ml) : null,
        cost_price: parseFloat(form.cost_price), sale_price: parseFloat(form.sale_price),
        description: form.description || null,
        min_stock_threshold: parseFloat(form.min_stock_threshold),
        current_stock: parseFloat(form.current_stock),
      };

      let product: Product;
      if (editProduct) {
        const res = await api.patch(`/products/${editProduct.id}`, payload);
        product = res.data;
        toast.success('Product updated');
      } else {
        const res = await api.post('/products', payload);
        product = res.data;
        toast.success('Product created');
      }

      // Upload image if selected
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        await api.post(`/products/${product.id}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save product');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Deactivate this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deactivated');
      loadProducts();
    } catch (err: any) { toast.error('Failed to delete'); }
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      spirits: '#6c5ce7', beer: '#fdcb6e', wine: '#e84393',
      mixers: '#00cec9', cocktails: '#fd79a8', other: '#8b8b9e',
      rum: '#945624ff',
    };
    return colors[cat] || '#8b8b9e';
  };

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Products</h1>
          <p style={{ color: '#8b8b9e', fontSize: 14 }}>{products.length} drinks in your catalogue</p>
        </div>
        <button className="btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8b8b9e' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            style={{ paddingLeft: '40px !important', width: '100%' }} />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: 180 }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {/* Product Grid */}
      {loading ? (
        <p style={{ color: '#8b8b9e', textAlign: 'center', padding: 40 }}>Loading products...</p>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9e' }}>
          <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>No products yet</h3>
          <p style={{ marginBottom: 24 }}>Add your first drink to get started</p>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Your First Product
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {products.map((p, i) => (
            <div key={p.id} className="glass-card" style={{ overflow: 'hidden', animationDelay: `${i * 0.03}s` }}>
              {/* Product Image */}
              <div style={{
                height: 160, background: 'var(--color-surface-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative',
              }}>
                {p.image_url ? (
                  <img src={`${API_HOST}${p.image_url}`} alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={40} color="#333" />
                )}
                {/* Low stock badge */}
                {p.current_stock <= p.min_stock_threshold && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(255,107,107,0.9)', color: 'white',
                    padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <AlertTriangle size={10} /> LOW STOCK
                  </div>
                )}
              </div>

              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{p.name}</h3>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: `${getCategoryColor(p.category)}20`,
                    color: getCategoryColor(p.category),
                    textTransform: 'uppercase',
                  }}>{p.category}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, fontSize: 13 }}>
                  <div><span style={{ color: '#8b8b9e' }}>Cost:</span> <strong>₹{p.cost_price}</strong></div>
                  <div><span style={{ color: '#8b8b9e' }}>Sale:</span> <strong>₹{p.sale_price}</strong></div>
                  <div><span style={{ color: '#8b8b9e' }}>Stock:</span> <strong style={{ color: p.current_stock <= p.min_stock_threshold ? '#ff6b6b' : '#00cec9' }}>{p.current_stock}</strong></div>
                  <div><span style={{ color: '#8b8b9e' }}>Unit:</span> <strong>{p.unit}</strong></div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" onClick={() => openEditModal(p)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', fontSize: 13 }}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <button className="btn-danger" onClick={() => deleteProduct(p.id)} style={{ padding: '8px 12px', fontSize: 13 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#8b8b9e', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Image Upload */}
              <div {...getRootProps()} style={{
                border: `2px dashed ${isDragActive ? '#6c5ce7' : 'var(--color-border)'}`,
                borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer',
                background: isDragActive ? 'rgba(108,92,231,0.05)' : 'transparent',
                transition: 'all 0.2s ease',
              }}>
                <input {...getInputProps()} />
                {imagePreview ? (
                  <div style={{ position: 'relative' }}>
                    <img src={imagePreview} alt="Preview" style={{ maxHeight: 120, borderRadius: 8, objectFit: 'cover' }} />
                    <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                      style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: '#ff6b6b', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={28} style={{ margin: '0 auto 8px', color: '#8b8b9e' }} />
                    <p style={{ fontSize: 13, color: '#8b8b9e' }}>
                      {isDragActive ? 'Drop image here' : 'Drag & drop product image, or click to browse'}
                    </p>
                    <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>JPG, PNG, WebP — max 5MB</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, color: '#8b8b9e', marginBottom: 4, display: 'block' }}>Product Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jameson Irish Whiskey" required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8b8b9e', marginBottom: 4, display: 'block' }}>Category *</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8b8b9e', marginBottom: 4, display: 'block' }}>Unit *</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8b8b9e', marginBottom: 4, display: 'block' }}>Volume (ml)</label>
                  <input type="number" value={form.volume_ml} onChange={e => setForm({ ...form, volume_ml: e.target.value })} placeholder="750" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8b8b9e', marginBottom: 4, display: 'block' }}>Cost Price (₹) *</label>
                  <input type="number" step="0.01" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} placeholder="800" required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8b8b9e', marginBottom: 4, display: 'block' }}>Sale Price (₹) *</label>
                  <input type="number" step="0.01" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })} placeholder="1200" required />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8b8b9e', marginBottom: 4, display: 'block' }}>Current Stock</label>
                  <input type="number" step="0.01" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8b8b9e', marginBottom: 4, display: 'block' }}>Min Stock Alert</label>
                  <input type="number" step="0.01" value={form.min_stock_threshold} onChange={e => setForm({ ...form, min_stock_threshold: e.target.value })} placeholder="5" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, color: '#8b8b9e', marginBottom: 4, display: 'block' }}>Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional product description..." rows={2} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editProduct ? 'Update Product' : 'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
