import React, { useState, useEffect } from 'react';
import { buyerApi } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingBag, 
  Search, 
  Star, 
  Plus, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Truck, 
  Sprout,
  X,
  MessageSquare
} from 'lucide-react';

export const BuyerMarketplace = () => {
  const { addToCart, setIsCartOpen } = useCart();
  const { user, isBuyer, setAuthModalOpen, setAuthModalMode } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, selectedType]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedType !== 'ALL') params.type = selectedType;

      const res = await buyerApi.getProducts(params);
      setProducts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (e, product) => {
    e.stopPropagation();
    if (!user) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }
    try {
      setAddingId(product.id);
      await addToCart(product.id, 1);
    } catch (err) {
      // toast shown in context
    } finally {
      setAddingId(null);
    }
  };

  const handleOpenDetail = async (product) => {
    setSelectedProduct(product);
    try {
      setLoadingReviews(true);
      const res = await buyerApi.getProductReviews(product.id);
      setReviews(res.data.data);
    } catch (err) {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const lettuceTypes = ['ALL', 'Romaine', 'Butterhead', 'Iceberg', 'Lollo Rosso'];

  return (
    <div className="animate-fade-in">
      {/* Hero Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #047857 60%, #10b981 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 36px',
          color: '#ffffff',
          marginBottom: '36px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ maxWidth: '680px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
              <Sparkles size={12} />
              100% Hidroponik Bersih & Higienis
            </span>
            <span className="badge" style={{ background: '#34d399', color: '#064e3b' }}>
              Bebas Pestisida
            </span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '14px' }}>
            Selada Segar Premium Langsung dari GreenHouse
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Dipanen saat Anda memesan dengan metode hidroponik modern. Renyah maksimal, segar lebih lama, dan kaya nutrisi alami.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} color="#a7f3d0" />
              <span>Garansi Kesegaran</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={18} color="#a7f3d0" />
              <span>Pengiriman Cepat (Bandung & Sekitarnya)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sprout size={18} color="#a7f3d0" />
              <span>Nutrisi Terstandarisasi</span>
            </div>
          </div>
        </div>

        {/* Decorative Leaf Icon */}
        <div style={{ position: 'absolute', right: '-40px', bottom: '-40px', opacity: 0.12, transform: 'rotate(-10deg)', pointerEvents: 'none' }}>
          <Sprout size={320} />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        {/* Type Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {lettuceTypes.map(t => (
            <button
              key={t}
              className={`btn btn-sm ${selectedType === t ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '9999px', padding: '6px 16px', fontSize: '0.82rem' }}
              onClick={() => setSelectedType(t)}
            >
              {t === 'ALL' ? 'Semua Jenis' : t}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} color="var(--text-light)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Cari varietas selada..." 
            style={{ paddingLeft: '36px', borderRadius: '9999px', fontSize: '0.85rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Product Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Memuat produk segar...
        </div>
      ) : products.length > 0 ? (
        <div className="grid-3" style={{ gap: '24px' }}>
          {products.map(p => (
            <div 
              key={p.id} 
              className="card"
              style={{ 
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
                position: 'relative'
              }}
              onClick={() => handleOpenDetail(p)}
            >
              <div>
                {/* Visual Header / Type Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="badge badge-info">{p.lettuce_type}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <span>{p.rating_avg || '5.0'}</span>
                    <span style={{ color: 'var(--text-light)', fontWeight: 500 }}>({p.reviews_count || 1})</span>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                  {p.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px' }}>
                  {p.description || 'Selada segar renyah hidroponik berkualitas tinggi bebas kimia.'}
                </p>

                {/* Stock info */}
                <div style={{ fontSize: '0.75rem', color: p.stock > 0 ? '#059669' : '#ef4444', fontWeight: 600, marginBottom: '14px' }}>
                  {p.stock > 0 ? `Tersedia ${p.stock} ${p.price_unit}` : 'Stok Habis'}
                </div>
              </div>

              {/* Price & Add to Cart button */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Harga</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                    Rp {p.price.toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                    per {p.price_unit}
                  </div>
                </div>

                <button 
                  className="btn btn-primary"
                  style={{ borderRadius: 'var(--radius-md)', padding: '10px 16px' }}
                  onClick={(e) => handleAddToCart(e, p)}
                  disabled={p.stock <= 0 || addingId === p.id}
                >
                  <Plus size={16} />
                  <span>{addingId === p.id ? 'Menambahkan...' : 'Beli'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <ShoppingBag size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Produk Tidak Ditemukan</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Coba ubah kata kunci pencarian atau pilih jenis selada lainnya.
          </p>
        </div>
      )}

      {/* MODAL DETAIL PRODUK & ULASAN */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-dialog" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge badge-info" style={{ marginBottom: '4px' }}>{selectedProduct.lettuce_type}</span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedProduct.name}</h3>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedProduct(null)}><X size={18} /></button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                  Rp {selectedProduct.price.toLocaleString('id-ID')}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  / {selectedProduct.price_unit}
                </span>
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>Deskripsi Produk:</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                {selectedProduct.description}
              </p>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>Informasi Panen & Kualitas:</h4>
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '18px', lineHeight: 1.6 }}>
                  <li>Sistem budidaya hidroponik Nutrient Film Technique (NFT).</li>
                  <li>Bebas pestisida kimia sintetis & higienis dari tanah.</li>
                  <li>Kadar air optimal, menjaga kerenyahan hingga 7 hari di lemari pendingin.</li>
                </ul>
              </div>

              {/* Ulasan Pembeli */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={16} color="var(--primary)" />
                <span>Ulasan Pembeli ({reviews.length})</span>
              </h4>

              {loadingReviews ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Memuat ulasan...</div>
              ) : reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                  {reviews.map(r => (
                    <div key={r.id} style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700 }}>{r.buyer?.name || 'Pelanggan'}</span>
                        <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                          {[...Array(r.rating || 5)].map((_, i) => (
                            <Star key={i} size={12} fill="#f59e0b" color="#f59e0b" />
                          ))}
                        </div>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        "{r.comment}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Belum ada ulasan untuk produk ini.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Tersedia: <strong>{selectedProduct.stock} unit</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedProduct(null)}>Tutup</button>
                <button 
                  className="btn btn-primary"
                  onClick={(e) => {
                    handleAddToCart(e, selectedProduct);
                    setSelectedProduct(null);
                  }}
                  disabled={selectedProduct.stock <= 0}
                >
                  <Plus size={16} />
                  <span>Tambah ke Keranjang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
