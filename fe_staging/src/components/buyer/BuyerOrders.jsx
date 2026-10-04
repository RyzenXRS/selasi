import React, { useState, useEffect } from 'react';
import { buyerApi } from '../../services/api';
import { ShoppingBag, Clock, CheckCircle2, AlertTriangle, Truck, CreditCard, Star, MessageSquare, X } from 'lucide-react';

export const BuyerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReviewOrder, setSelectedReviewOrder] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    product_id: '',
    rating: 5,
    comment: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await buyerApi.getOrders();
      setOrders(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaySnap = (order) => {
    const snapToken = order.payment?.snap_token;
    if (window.snap && snapToken) {
      window.snap.pay(snapToken, {
        onSuccess: function (result) {
          alert('Pembayaran Berhasil!');
          fetchOrders();
        },
        onPending: function (result) {
          alert('Menunggu pembayaran diselesaikan.');
          fetchOrders();
        },
        onError: function (result) {
          alert('Pembayaran gagal atau kedaluwarsa.');
        }
      });
    } else {
      alert('Token pembayaran Midtrans tidak ditemukan. Silakan hubungi admin.');
    }
  };

  const handleCancel = async (orderId) => {
    const reason = prompt('Masukkan alasan pembatalan:');
    if (reason) {
      try {
        await buyerApi.cancelOrder(orderId, reason);
        fetchOrders();
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal membatalkan pesanan.');
      }
    }
  };

  const handleOpenReviewModal = (order) => {
    setSelectedReviewOrder(order);
    setReviewForm({
      product_id: order.items?.[0]?.product_id || '',
      rating: 5,
      comment: '',
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      setSubmittingReview(true);
      await buyerApi.createReview(reviewForm.product_id, {
        order_id: selectedReviewOrder.id,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      alert('Terima kasih atas ulasan dan rating Anda!');
      setSelectedReviewOrder(null);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirim ulasan.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting_payment':
        return <span className="badge badge-warning"><Clock size={12} />Menunggu Pembayaran</span>;
      case 'processing':
        return <span className="badge badge-info"><Clock size={12} />Sedang Dikemas Petani</span>;
      case 'ready_pickup':
        return <span className="badge badge-purple"><Truck size={12} />Siap Kirim / Diambil</span>;
      case 'completed':
        return <span className="badge badge-success"><CheckCircle2 size={12} />Pesanan Selesai</span>;
      case 'cancelled':
        return <span className="badge badge-danger"><AlertTriangle size={12} />Dibatalkan</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Pesanan Saya</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Pantau status pengiriman selada segar hidroponik dan riwayat pembelian Anda.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Memuat riwayat pesanan...
        </div>
      ) : orders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => (
            <div key={order.id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{order.order_number}</span>
                    {getStatusBadge(order.order_status)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Tanggal: {new Date(order.created_at).toLocaleString('id-ID')}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Pembayaran</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                    Rp {order.total_price.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {order.items?.map(it => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>
                      <strong>{it.quantity}x</strong> {it.product_name} ({it.lettuce_type})
                    </span>
                    <span style={{ fontWeight: 600 }}>Rp {it.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              {/* Bottom Info & Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '14px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Metode: <strong style={{ textTransform: 'uppercase' }}>{order.payment?.method}</strong> &bull; Status Bayar:{' '}
                  <strong style={{ color: order.payment?.status === 'paid' ? '#059669' : '#d97706' }}>
                    {order.payment?.status?.toUpperCase()}
                  </strong>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Pay with Snap if still waiting */}
                  {order.order_status === 'waiting_payment' && order.payment?.snap_token && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handlePaySnap(order)}
                    >
                      <CreditCard size={14} />
                      <span>Bayar via Midtrans Snap</span>
                    </button>
                  )}

                  {/* Review Button if completed */}
                  {order.order_status === 'completed' && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenReviewModal(order)}
                    >
                      <Star size={14} color="#f59e0b" />
                      <span>Beri Ulasan & Rating</span>
                    </button>
                  )}

                  {/* Cancel if still waiting or processing */}
                  {(order.order_status === 'waiting_payment' || order.order_status === 'processing') && (
                    <button 
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#ef4444' }}
                      onClick={() => handleCancel(order.id)}
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <ShoppingBag size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Belum Ada Pesanan</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Anda belum pernah memesan selada segar. Kunjungi katalog untuk mulai berbelanja!
          </p>
        </div>
      )}

      {/* MODAL BERI ULASAN */}
      {selectedReviewOrder && (
        <div className="modal-overlay" onClick={() => setSelectedReviewOrder(null)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Ulasan Produk Selada</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedReviewOrder(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitReview}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Pilih Produk yang Diulas</label>
                  <select 
                    className="form-select"
                    value={reviewForm.product_id}
                    onChange={e => setReviewForm({ ...reviewForm, product_id: e.target.value })}
                    required
                  >
                    {selectedReviewOrder.items?.map(it => (
                      <option key={it.product_id} value={it.product_id}>
                        {it.product_name} ({it.lettuce_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Rating Kepuasan (1 - 5 Bintang)</label>
                  <div style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        size={28}
                        color={star <= reviewForm.rating ? '#f59e0b' : '#cbd5e1'}
                        fill={star <= reviewForm.rating ? '#f59e0b' : 'none'}
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Komentar / Ulasan Kesegaran</label>
                  <textarea 
                    className="form-textarea"
                    placeholder="Ceritakan kerenyahan, kebersihan, rasa, atau kecepatan kirim..."
                    value={reviewForm.comment}
                    onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedReviewOrder(null)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                  {submittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
