// Pustaka Pesanan Pembeli: checkout (UC43 sampai UC45), daftar dan detail pesanan (UC46), pembatalan (UC49).
// Dimuat setelah config.js, pembeli-guard.js, dan pembeli-cart.js (memakai objek Keranjang).

const Pesanan = (function () {
  const K = Keranjang;
  // Kunci baru untuk Pembeli. Kunci "pesanan" di config.js milik Pembudidaya (/cultivator/orders), jadi tidak dipakai di sini.
  const PATH = ENDPOINTS.pesananPembeli || "/pesanan";                  // GET daftar, GET /{id}, POST /{id}/cancel
  const PATH_CHECKOUT = ENDPOINTS.checkoutPembeli || "/pesanan/checkout"; // POST

  // Status pesanan yang masih boleh dibatalkan. Aturan sebenarnya ada di backend (OrderService); ini hanya
  // menentukan kapan tombol Batalkan Pesanan tampil. Kalau backend menolak, pesan dari backend yang ditampilkan.
  const DAPAT_DIBATALKAN = ["MENUNGGU_PEMBAYARAN", "DIBAYAR"];

  const MSG = {
    dibuat: "Pesanan berhasil dibuat.",                                                                  // UC43
    dataTidakLengkap: "Mohon lengkapi seluruh data checkout terlebih dahulu, sebelum membuat pesanan.", // UC43
    konfirmasiBatal: "Apakah Anda yakin ingin membatalkan pesanan ini?",                                // UC49
    batalOk: "Pesanan berhasil dibatalkan.",                                                             // UC49
    server: "Tidak bisa terhubung ke server. Coba lagi nanti.",
  };

  // ---------- Label ----------
  const STATUS_PESANAN = {
    MENUNGGU_PEMBAYARAN: "Menunggu Pembayaran", DIBAYAR: "Dibayar", DIPROSES: "Diproses",
    SIAP_DIAMBIL: "Siap Diambil", SELESAI: "Selesai", DIBATALKAN: "Dibatalkan",
  };
  // Dokumen: Menunggu Pembayaran, Berhasil, Gagal. Backend: MENUNGGU, LUNAS, GAGAL (+ KADALUARSA, DIBATALKAN).
  const STATUS_BAYAR = {
    MENUNGGU: "Menunggu Pembayaran", LUNAS: "Berhasil", GAGAL: "Gagal",
    KADALUARSA: "Kedaluwarsa", DIBATALKAN: "Dibatalkan", "BELUM DIBAYAR": "Menunggu Pembayaran",
  };
  const judul = (s) => String(s).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const labelPesanan = (s) => STATUS_PESANAN[String(s || "").toUpperCase()] || (s ? judul(s) : "-");
  const labelBayar = (s) => STATUS_BAYAR[String(s || "BELUM DIBAYAR").toUpperCase()] || judul(s);
  function kelasStatus(label) {
    const l = String(label).toLowerCase();
    if (l.includes("menunggu")) return "menunggu";
    if (["berhasil", "selesai", "dibayar", "siap diambil"].includes(l)) return "berhasil";
    if (["gagal", "kedaluwarsa", "dibatalkan"].includes(l)) return "gagal";
    return "";
  }
  const tanggalTeks = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return isNaN(d) ? String(iso) : d.toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // ---------- Menyamakan bentuk data dari BE (OrderResource) ----------
  function normItem(it) {
    const pr = it.produk ?? it.product ?? {};
    return {
      id_produk: it.id_produk ?? pr.id_produk ?? pr.id ?? null,
      nama: pr.nama_produk ?? it.nama_produk ?? pr.nama ?? it.nama ?? "Produk",
      harga: Number(it.harga_satuan ?? it.harga ?? it.price ?? pr.harga ?? 0),
      jumlah: Number(it.jumlah ?? it.quantity ?? 0),
      foto: pr.foto_produk ?? it.foto_produk ?? it.foto ?? null,
    };
  }
  function normPesanan(o) {
    const d = o.items ?? o.detail_pesanan ?? o.detailPesanan;
    const arr = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
    let items = arr.map(normItem);
    // Daftar pesanan: BE mengirim ringkasan produk pertama di level pesanan
    if (!items.length && o.nama_produk) {
      items = [{ nama: o.nama_produk, harga: Number(o.harga_produk ?? 0), jumlah: Number(o.jumlah_produk ?? 0), foto: o.foto_produk ?? null }];
    }
    const bayar = o.pembayaran ?? o.payment ?? null;
    return {
      id: o.id_pesanan ?? o.id,
      nomor: o.nomor_pesanan ?? ("#" + (o.id_pesanan ?? o.id)),
      tanggal: o.tanggal_pesanan ?? null,
      total: Number(o.total_harga ?? o.total_pembayaran ?? o.total_price ?? 0),
      metode: o.metode_pembayaran ?? o.payment_method ?? "-",
      statusPesananRaw: String(o.status_pesanan ?? o.order_status ?? "").toUpperCase(),
      statusPesanan: labelPesanan(o.status_pesanan ?? o.order_status),
      statusBayar: labelBayar(bayar?.status_pembayaran ?? bayar?.status ?? o.status_pembayaran),
      linkBayar: bayar?.redirect_url ?? null,
      snapToken: bayar?.snap_token ?? null,
      items,
    };
  }
  const dapatDibatalkan = (p) => DAPAT_DIBATALKAN.includes(p.statusPesananRaw);

  async function bacaHasil(res) {
    if (!res) return { ok: false, pesan: null }; // 401: sudah logout
    let json = {};
    try { json = await res.json(); } catch (_) {}
    if (res.ok) return { ok: true, json };
    const err = json.errors || {};
    const pertama = Object.values(err).flat()[0];
    return { ok: false, pesan: pertama || json.message || "Terjadi kesalahan di server (HTTP " + res.status + "). Coba lagi." };
  }

  // ---------- Panggilan ke BE ----------
  async function daftar() {
    const res = await apiFetch(PATH);
    if (!res) return [];
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    const a = Array.isArray(j) ? j : Array.isArray(j.data) ? j.data : Array.isArray(j.data?.data) ? j.data.data : j.data?.items ?? j.items ?? [];
    return a.map(normPesanan);
  }
  async function detail(id) {
    const res = await apiFetch(PATH + "/" + encodeURIComponent(id));
    if (!res) return null;
    if (!res.ok) throw new Error(res.status === 404 ? "pesanan tidak ditemukan" : "HTTP " + res.status);
    const j = await res.json();
    return normPesanan(j.data ?? j);
  }
  // Kolom tanggal_pengambilan dan jam_pengambilan ikut dikirim; sampai backend menerimanya, field itu diabaikan.
  async function checkout(payload) {
    const r = await bacaHasil(await apiFetch(PATH_CHECKOUT, { method: "POST", body: JSON.stringify(payload) }));
    if (!r.ok) return r;
    const o = r.json.data ?? r.json;
    return { ok: true, id: o.id_pesanan ?? o.id ?? null, pesan: MSG.dibuat };
  }
  async function batal(id) {
    const r = await bacaHasil(await apiFetch(PATH + "/" + encodeURIComponent(id) + "/cancel", { method: "POST", body: JSON.stringify({}) }));
    return r.ok ? { ok: true, pesan: MSG.batalOk } : r;
  }

  return { MSG, daftar, detail, checkout, batal, dapatDibatalkan, kelasStatus, tanggalTeks };
})();