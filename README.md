# Smart Lettuce Cultivation Management System — API Documentation & Web Integration Guide

Dokumentasi lengkap REST API dan panduan integrasi ke aplikasi frontend (Web/Mobile).

---

## 🚀 Persiapan & Menjalankan Server API

### 1. Requirements
- PHP 8.3+
- MySQL Database (`lettuce_db`)
- Composer

### 2. Langkah Menjalankan Server
```bash
# Migration database
php artisan migrate

# Jalankan server lokal
php artisan serve
# Server akan berjalan di: http://127.0.0.1:8000
```

---

## 🔑 Konsep Autentikasi (Sanctum Token)

Sistem ini menggunakan **Bearer Token** via Laravel Sanctum.
1. Frontend melakukan permintaan `POST /api/v1/auth/login` atau `POST /api/v1/auth/register`.
2. Backend merespon dengan membawa string `token`.
3. Frontend menyimpan `token` tersebut di `localStorage` / `sessionStorage` / `Cookie`.
4. Untuk setiap *request* yang membutuhkan login, tambahkan header:
   ```http
   Authorization: Bearer <TOKEN_ANDA>
   Accept: application/json
   ```

---

## 📚 Ringkasan API Endpoints

Semua endpoint diawali dengan prefix: `http://127.0.0.1:8000/api/v1`

### 1. Autentikasi & Profil (`/auth`, `/profile`)

| Method | Endpoint | Access | Keterangan |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Registrasi pembudidaya (`cultivator`) / pembeli (`buyer`) |
| `POST` | `/auth/login` | Public | Login akun & mendapatkan Bearer token |
| `POST` | `/auth/logout` | Protected | Logout & hapus token aktif |
| `POST` | `/auth/forgot-password` | Public | Request link/token reset password |
| `GET` | `/profile` | Protected | Ambil data profil user yang sedang login |
| `PUT` | `/profile` | Protected | Update data profil (nama, phone, address, profile_photo) |

---

### 2. Modul Pembudidaya (`role: cultivator`)

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/dashboard` | Metric dashboard (jumlah tanaman, fase, estimasi panen, stok, pesanan masuk) |
| `GET` | `/batches` | Ambil daftar batch budidaya (paginated) |
| `POST` | `/batches` | Tambah batch budidaya baru |
| `GET` | `/batches/{id}` | Detail batch budidaya + riwayat pengecekan & panen |
| `PUT` | `/batches/{id}` | Update status/kondisi batch budidaya |
| `DELETE` | `/batches/{id}` | Hapus batch budidaya |
| `GET` | `/batches/{batchId}/checks` | Ambil riwayat monitoring harian batch (pH, TDS ppm, suhu) |
| `POST` | `/batches/{batchId}/checks` | Tambah catatan monitoring harian |
| `POST` | `/batches/{batchId}/phases` | Catat perpindahan fase tanaman (Semai → Vegetatif → Pendewasaan → Panen) |
| `POST` | `/batches/{batchId}/harvests` | Catat hasil panen (jumlah & berat gram) |
| `GET` | `/tasks` | Daftar tugas/to-do list harian |
| `POST` | `/tasks` | Tambah tugas baru |
| `POST` | `/tasks/{id}/complete` | Tandai tugas selesai |
| `POST` | `/products` | Tambah produk selada ke katalog toko |
| `PUT` | `/products/{id}` | Update produk & stok selada |
| `DELETE` | `/products/{id}` | Hapus produk |
| `GET` | `/cultivator/orders` | Lihat pesanan masuk dari pembeli |
| `PUT` | `/cultivator/orders/{id}/status` | Update status pesanan (`processing`, `ready_pickup`, `completed`, `cancelled`) |

---

### 3. Modul Pembeli & Katalog (`role: buyer` / Public)

| Method | Endpoint | Access | Keterangan |
|---|---|---|---|
| `GET` | `/products` | Public | Browse katalog produk selada (filter `search`, `type`) |
| `GET` | `/products/{id}` | Public | Detail produk selada & rating ulasan |
| `GET` | `/buyer/dashboard` | Buyer | Metric dashboard transaksi pembeli |
| `GET` | `/cart` | Buyer | Lihat keranjang belanja saat ini |
| `POST` | `/cart` | Buyer | Tambah item ke keranjang (`product_id`, `quantity`) |
| `PUT` | `/cart/items/{itemId}` | Buyer | Update jumlah item di keranjang |
| `DELETE` | `/cart/items/{itemId}` | Buyer | Hapus item dari keranjang |
| `DELETE` | `/cart` | Buyer | Kosongkan keranjang belanja |
| `GET` | `/orders` | Buyer | Daftar riwayat pesanan pembeli |
| `POST` | `/orders/checkout` | Buyer | Checkout keranjang belanja (`delivery_address`, `payment_method`) |
| `GET` | `/orders/{id}` | Buyer | Detail pesanan & status pengiriman |
| `POST` | `/orders/{id}/cancel` | Buyer | Batalkan pesanan |
| `POST` | `/orders/{id}/pay` | Buyer | Unggah bukti pembayaran (QRIS) |
| `POST` | `/products/{productId}/reviews` | Buyer | Beri ulasan & rating bintang (1-5) setelah order selesai |

---

## 💻 Panduan Integrasi ke Aplikasi Web (Frontend JavaScript)

Berikut adalah contoh implementasi pada aplikasi Web (React, Vue, atau Vanilla JS) menggunakan **Fetch API** / **Axios**.

### 1. Setup Axios Client (Recommended)

```javascript
// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor untuk otomatis menyisipkan Bearer Token dari localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

### 2. Alur Login & Simpan Token

```javascript
// authService.js
import api from './api';

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    
    // Simpan token & data user ke localStorage
    const { token, user } = response.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    console.log('Login berhasil! Role:', user.role);
    return user;
  } catch (error) {
    console.error('Login gagal:', error.response?.data?.message);
    throw error;
  }
};
```

---

### 3. Pembudidaya: Mengambil Data Dashboard

```javascript
// cultivatorDashboard.js
import api from './api';

export const getCultivatorDashboard = async () => {
  const res = await api.get('/dashboard');
  const dashboardData = res.data.data;

  console.log('Total Tanaman Aktif:', dashboardData.summary.total_active_plants);
  console.log('Distribusi Fase:', dashboardData.phase_distribution);
  console.log('Estimasi Panen:', dashboardData.estimated_harvests);
  
  return dashboardData;
};
```

---

### 4. Pembudidaya: Menambah Catatan Monitoring Harian (pH & TDS)

```javascript
// cultivationService.js
import api from './api';

export const addDailyCheck = async (batchId, checkData) => {
  const res = await api.post(`/batches/${batchId}/checks`, {
    check_date: checkData.date, // '2026-09-23'
    plant_condition: 'sangat_baik',
    water_ph: 6.2,
    tds_ppm: 1050,
    temperature: 25.8,
    installation_condition: 'baik',
    notes: 'Kondisi air dan nutrisi sangat stabil',
  });

  return res.data.data;
};
```

---

### 5. Pembeli: Tambah ke Keranjang & Checkout

```javascript
// buyerService.js
import api from './api';

// 1. Tambah ke keranjang
export const addToCart = async (productId, quantity) => {
  const res = await api.post('/cart', {
    product_id: productId,
    quantity: quantity,
  });
  return res.data.data;
};

// 2. Checkout Pesanan
export const checkoutOrder = async (deliveryAddress, paymentMethod) => {
  const res = await api.post('/orders/checkout', {
    delivery_address: deliveryAddress,
    payment_method: paymentMethod, // 'qris' atau 'cod'
    notes: 'Mohon dikemas dengan rapi',
  });
  return res.data.data;
};
```

---

## 🎨 Contoh Format Response JSON Standard

Semua endpoint memberikan respon konsisten dengan struktur berikut:

### Success Response (200 / 201)
```json
{
  "success": true,
  "message": "Batch budidaya berhasil dibuat.",
  "data": {
    "id": 1,
    "batch_code": "BATCH-20260923-A8F2",
    "seed_date": "2026-09-01",
    "plant_quantity": 200,
    "current_phase": "Semai",
    "conditions": {
      "plant": "baik",
      "water": "baik",
      "nutrition": "baik",
      "installation": "baik",
      "environment": "baik"
    },
    "status": "normal"
  }
}
```

### Error / Validation Response (422)
```json
{
  "success": false,
  "message": "Validation error.",
  "errors": {
    "email": [
      "Email ini sudah terdaftar."
    ]
  }
}
```