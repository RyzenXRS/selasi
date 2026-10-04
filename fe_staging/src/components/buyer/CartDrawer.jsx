import React from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { X, Trash2, ShoppingCart, ArrowRight, Plus, Minus } from 'lucide-react';

export const CartDrawer = () => {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeItem, cartTotal, setCheckoutOpen } = useCart();
  const { user, setAuthModalOpen, setAuthModalMode } = useAuth();

  if (!isCartOpen) return null;

  const items = cart?.items || [];

  const handleProceedCheckout = () => {
    if (!user) {
      setIsCartOpen(false);
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }
    setIsCartOpen(false);
    setCheckoutOpen(true);
  };

  return (
    <div className="cart-drawer-overlay" onClick={() => setIsCartOpen(false)}>
      <div className="cart-drawer" onClick={e => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingCart size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Keranjang Belanja</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setIsCartOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Drawer Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {items.length > 0 ? (
            items.map(item => (
              <div 
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: '#f8fafc'
                }}
              >
                <div style={{ flex: 1, paddingRight: '12px' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {item.product?.name || 'Produk Selada'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Rp {item.price?.toLocaleString('id-ID')} / unit
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                    Rp {item.subtotal?.toLocaleString('id-ID')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Quantity Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: '#fff' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ padding: '4px 8px' }}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, padding: '0 6px' }}>
                      {item.quantity}
                    </span>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ padding: '4px 8px' }}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button 
                    className="btn btn-ghost btn-sm" 
                    style={{ padding: '6px', color: '#ef4444' }}
                    onClick={() => removeItem(item.id)}
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <ShoppingCart size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
              <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                Keranjang Kosong
              </div>
              <p style={{ fontSize: '0.82rem' }}>
                Pilih selada segar dari katalog dan tambahkan ke keranjang.
              </p>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Pembayaran:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                Rp {cartTotal?.toLocaleString('id-ID')}
              </span>
            </div>

            <button 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%' }}
              onClick={handleProceedCheckout}
            >
              <span>Lanjut ke Pembayaran</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
