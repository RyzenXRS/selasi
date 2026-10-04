import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { buyerApi } from '../../services/api';
import { X, ShieldCheck, CreditCard, Truck, AlertCircle, CheckCircle2 } from 'lucide-react';

export const CheckoutModal = () => {
  const { checkoutOpen, setCheckoutOpen, cart, cartTotal, fetchCart, showToast } = useCart();
  const { user, setActiveTab } = useAuth();

  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || 'Jl. Cisitu Indah No. 25, Dago, Bandung');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('midtrans');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!checkoutOpen) return null;

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await buyerApi.checkout({
        delivery_address: deliveryAddress,
        notes: notes || undefined,
        payment_method: paymentMethod,
      });

      const order = res.data.data;
      await fetchCart(); // Cart is cleared on backend

      // Check if Midtrans Snap popup is available
      if (paymentMethod === 'midtrans') {
        const snapToken = order.payment?.snap_token;

        if (window.snap && snapToken) {
          window.snap.pay(snapToken, {
            onSuccess: function (result) {
              console.log('Midtrans Snap Success:', result);
              showToast('Pembayaran berhasil dikonfirmasi! Pesanan sedang diproses.');
              setCheckoutOpen(false);
              setActiveTab('buyer_orders');
            },
            onPending: function (result) {
              console.log('Midtrans Snap Pending:', result);
              showToast('Silakan selesaikan pembayaran sesuai petunjuk Midtrans.');
              setCheckoutOpen(false);
              setActiveTab('buyer_orders');
            },
            onError: function (result) {
              console.error('Midtrans Snap Error:', result);
              showToast('Pembayaran dibatalkan atau gagal.');
              setCheckoutOpen(false);
              setActiveTab('buyer_orders');
            },
            onClose: function () {
              console.log('Midtrans Snap popup closed.');
              showToast('Popup ditutup. Anda dapat membayar nanti di halaman Pesanan Saya.');
              setCheckoutOpen(false);
              setActiveTab('buyer_orders');
            }
          });
        } else {
          // Fallback if window.snap is not loaded or snapToken is deferred
          showToast('Pesanan berhasil dibuat! Silakan lakukan pembayaran.');
          setCheckoutOpen(false);
          setActiveTab('buyer_orders');
        }
      } else {
        // COD
        showToast('Pesanan berhasil dibuat (Metode COD). Petani akan segera menyiapkan selada Anda!');
        setCheckoutOpen(false);
        setActiveTab('buyer_orders');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal memproses checkout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setCheckoutOpen(false)}>
      <div className="modal-dialog" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Konfirmasi Checkout Pesanan</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Pilih alamat pengiriman dan metode pembayaran
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setCheckoutOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCheckout}>
          <div className="modal-body">
            {error && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {/* Total Ringkasan */}
            <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-border)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 600 }}>Total Pembayaran</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                  Rp {cartTotal?.toLocaleString('id-ID')}
                </div>
              </div>
              <span className="badge badge-success">
                {cart?.items?.length || 0} Macam Selada
              </span>
            </div>

            {/* Alamat Pengiriman */}
            <div className="form-group">
              <label className="form-label">Alamat Lengkap Pengiriman</label>
              <textarea 
                className="form-textarea"
                placeholder="Alamat rumah / kantor penerima selada segar"
                value={deliveryAddress}
                onChange={e => setDeliveryAddress(e.target.value)}
                required
              />
            </div>

            {/* Catatan untuk Petani */}
            <div className="form-group">
              <label className="form-label">Catatan Tambahan (Opsional)</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="Contoh: Tolong pilih yang daunnya segar, kirim pagi hari"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Metode Pembayaran */}
            <div className="form-group">
              <label className="form-label">Metode Pembayaran</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Midtrans Snap */}
                <div 
                  onClick={() => setPaymentMethod('midtrans')}
                  style={{
                    border: `2px solid ${paymentMethod === 'midtrans' ? 'var(--primary)' : 'var(--border-color)'}`,
                    background: paymentMethod === 'midtrans' ? 'var(--primary-light)' : '#ffffff',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <CreditCard size={18} color={paymentMethod === 'midtrans' ? 'var(--primary)' : '#64748b'} />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Midtrans Snap</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    QRIS (GoPay, OVO), Virtual Account BCA/BNI/BRI/Mandiri
                  </div>
                </div>

                {/* COD */}
                <div 
                  onClick={() => setPaymentMethod('cod')}
                  style={{
                    border: `2px solid ${paymentMethod === 'cod' ? '#0284c7' : 'var(--border-color)'}`,
                    background: paymentMethod === 'cod' ? '#e0f2fe' : '#ffffff',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Truck size={18} color={paymentMethod === 'cod' ? '#0284c7' : '#64748b'} />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Bayar di Tempat</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    COD saat kurir mengantarkan selada
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
              <ShieldCheck size={16} color="var(--primary)" />
              <span>Transaksi aman & garansi selada hidroponik tiba dalam kondisi segar.</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setCheckoutOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Membuat Pesanan...' : paymentMethod === 'midtrans' ? 'Bayar dengan Midtrans' : 'Konfirmasi Pesanan COD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
