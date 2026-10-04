import React, { useState, useEffect } from 'react';
import { cultivatorApi, buyerApi } from '../../services/api';
import { Package, Plus, Trash2, Edit2, X, Check, AlertCircle } from 'lucide-react';

export const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState({
    name: '',
    lettuce_type: 'Romaine',
    description: '',
    price: 15000,
    price_unit: 'ikat (250g)',
    stock: 25,
    status: 'active',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch public products or cultivator's products
      const res = await buyerApi.getProducts();
      setProducts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      lettuce_type: 'Romaine',
      description: '',
      price: 15000,
      price_unit: 'ikat (250g)',
      stock: 25,
      status: 'active',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      lettuce_type: p.lettuce_type,
      description: p.description || '',
      price: p.price,
      price_unit: p.price_unit,
      stock: p.stock,
      status: p.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await cultivatorApi.updateProduct(editingProduct.id, form);
      } else {
        await cultivatorApi.createProduct(form);
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan produk.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Hapus produk selada ini dari katalog?')) {
      try {
        await cultivatorApi.deleteProduct(id);
        fetchProducts();
      } catch (err) {
        alert('Gagal menghapus produk.');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Katalog Produk & Stok Selada</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Kelola produk selada hasil panen hidroponik yang dijual ke pembeli.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Memuat katalog produk...
        </div>
      ) : products.length > 0 ? (
        <div className="grid-3">
          {products.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span className="badge badge-info">{p.lettuce_type}</span>
                  <span className={`badge ${p.stock > 0 ? 'badge-success' : 'badge-danger'}`}>
                    {p.stock > 0 ? `Stok: ${p.stock}` : 'Habis'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>{p.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                  {p.description || 'Selada segar renyah hidroponik berkualitas.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                    Rp {p.price.toLocaleString('id-ID')}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    / {p.price_unit}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ flex: 1 }}
                  onClick={() => handleOpenEdit(p)}
                >
                  <Edit2 size={14} />
                  <span>Edit Stok / Harga</span>
                </button>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => handleDelete(p.id)}
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <Package size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Belum Ada Produk</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Tambahkan produk selada Anda ke katalog agar dapat dibeli oleh konsumen.
          </p>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>Tambah Produk</span>
          </button>
        </div>
      )}

      {/* MODAL FORM PRODUK */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {editingProduct ? 'Edit Produk Selada' : 'Tambah Produk Baru'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Produk</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Contoh: Selada Romaine Crispy"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Jenis Selada</label>
                    <select 
                      className="form-select"
                      value={form.lettuce_type}
                      onChange={e => setForm({ ...form, lettuce_type: e.target.value })}
                    >
                      <option value="Romaine">Romaine</option>
                      <option value="Butterhead">Butterhead</option>
                      <option value="Iceberg">Iceberg</option>
                      <option value="Lollo Rosso">Lollo Rosso / Bionda</option>
                      <option value="Batavia">Batavia</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Satuan Kemasan</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. ikat (250g) atau kg"
                      value={form.price_unit}
                      onChange={e => setForm({ ...form, price_unit: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Harga Satuan (Rp)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0"
                      value={form.price}
                      onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Jumlah Stok Siap Jual</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      min="0"
                      value={form.stock}
                      onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi Produk</label>
                  <textarea 
                    className="form-textarea"
                    placeholder="Keunggulan selada (renyah, bebas pestisida, dipanen segar pagi hari)"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Perbarui Produk' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
