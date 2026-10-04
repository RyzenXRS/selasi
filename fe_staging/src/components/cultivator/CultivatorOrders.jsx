import React, { useState, useEffect } from 'react';
import { cultivatorApi } from '../../services/api';
import { ShoppingBag, Clock, CheckCircle2, AlertTriangle, Truck, MapPin } from 'lucide-react';

export const CultivatorOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await cultivatorApi.getOrders();
      setOrders(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      await cultivatorApi.updateOrderStatus(orderId, { order_status: newStatus });
      await fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui status pesanan.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'waiting_payment':
        return <span className="badge badge-warning"><Clock size={12} />Menunggu Bayar</span>;
      case 'processing':
        return <span className="badge badge-info"><Clock size={12} />Sedang Dikemas</span>;
      case 'ready_pickup':
        return <span className="badge badge-purple"><Truck size={12} />Siap Kirim / Diambil</span>;
      case 'completed':
        return <span className="badge badge-success"><CheckCircle2 size={12} />Selesai</span>;
      case 'cancelled':
        return <span className="badge badge-danger"><AlertTriangle size={12} />Dibatalkan</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Pesanan Masuk</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Daftar pesanan selada dari pembeli beserta status konfirmasi dan pembayaran.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Memuat pesanan masuk...
        </div>
      ) : orders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map(order => (
            <div key={order.id} className="card" style={{ padding: '20px' }}>
              {/* Order Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{order.order_number}</span>
                    {getStatusBadge(order.order_status)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Waktu Pesan: {new Date(order.created_at).toLocaleString('id-ID')}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Pesanan:</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                    Rp {order.total_price.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Order Body */}
              <div className="grid-2" style={{ marginBottom: '16px' }}>
                {/* Items */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Item Pembelian:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {order.items?.map(it => (
                      <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>
                          <strong>{it.quantity}x</strong> {it.product_name} ({it.lettuce_type})
                        </span>
                        <span style={{ fontWeight: 600 }}>Rp {it.subtotal.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery & Payment details */}
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Pembeli:</span>{' '}
                    <strong>{order.buyer?.name || 'Pelanggan'}</strong> ({order.buyer?.phone || '-'})
                  </div>
                  <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <MapPin size={14} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{order.delivery_address}</span>
                  </div>
                  {order.notes && (
                    <div style={{ fontStyle: 'italic', color: '#64748b', marginBottom: '6px' }}>
                      Catatan: "{order.notes}"
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-color)' }}>
                    <span>Metode: <strong style={{ textTransform: 'uppercase' }}>{order.payment?.method || 'midtrans'}</strong></span>
                    <span>Status Bayar: <strong style={{ color: order.payment?.status === 'paid' ? '#059669' : '#d97706' }}>{order.payment?.status?.toUpperCase()}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Status Selector */}
              {order.order_status !== 'completed' && order.order_status !== 'cancelled' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                  {order.order_status === 'waiting_payment' && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleUpdateStatus(order.id, 'processing')}
                      disabled={updatingId === order.id}
                    >
                      Konfirmasi & Kemas
                    </button>
                  )}
                  {order.order_status === 'processing' && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleUpdateStatus(order.id, 'ready_pickup')}
                      disabled={updatingId === order.id}
                    >
                      Tandai Siap Kirim / Ambil
                    </button>
                  )}
                  {order.order_status === 'ready_pickup' && (
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      disabled={updatingId === order.id}
                    >
                      Selesaikan Pesanan
                    </button>
                  )}
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (confirm('Batalkan pesanan ini? Stok akan dikembalikan otomatis.')) {
                        handleUpdateStatus(order.id, 'cancelled');
                      }
                    }}
                    disabled={updatingId === order.id}
                  >
                    Batalkan
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <ShoppingBag size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Belum Ada Pesanan Masuk</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Pesanan dari pembeli akan muncul di halaman ini.
          </p>
        </div>
      )}
    </div>
  );
};
