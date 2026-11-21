// Pustaka Ulasan Pembeli: beri ulasan dan rating (UC51, UC52), lihat ulasan produk (UC13).
// Dimuat setelah pembeli-cart.js dan pembeli-pesanan.js.
//
// Endpoint backend (routes/api.php):  GET dan POST  /produk/{id}/ulasan
// Nama field isi ulasan belum terbaca dari ReviewController, jadi badan permintaan ada di satu tempat: kirim() di bawah.

const Ulasan = (function () {
  const PATH_PRODUK = ENDPOINTS.produk || "/produk";
  const jalur = (id) => PATH_PRODUK + "/" + encodeURIComponent(id) + "/ulasan";

  const MSG = {
    terkirim: "Ulasan berhasil dikirim.",          // UC51 dan UC52
    lengkapi: "Data perlu dilengkapi",             // pesan dokumen untuk data yang belum diisi
    belumSelesai: "Ulasan hanya bisa diberikan untuk pesanan yang berstatus Selesai.",
    server: "Tidak bisa terhubung ke server. Coba lagi nanti.",
  };

  // ---------- Penanda "Sudah Diulas" ----------
  // Backend tidak mengirim penanda apakah sebuah pesanan sudah diulas, jadi dicatat di browser (per akun).
  const userId = () => {
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); return u.id_pengguna ?? u.id ?? u.email ?? "x"; } catch (_) { return "x"; }
  };
  const KEY = () => "ulasan_pembeli_" + userId();
  const baca = () => { try { const a = JSON.parse(localStorage.getItem(KEY())); if (Array.isArray(a)) return a; } catch (_) {} return []; };
  const kunci = (pesanan, item) => String(pesanan.id) + ":" + String(item.id_produk ?? item.nama);
  const sudahDiulas = (pesanan, item) => baca().includes(kunci(pesanan, item));
  const semuaDiulas = (pesanan) => pesanan.items.length > 0 && pesanan.items.every((it) => sudahDiulas(pesanan, it));
  function tandai(pesanan, item) {
    const a = baca();
    const k = kunci(pesanan, item);
    if (!a.includes(k)) a.push(k);
    try { localStorage.setItem(KEY(), JSON.stringify(a)); } catch (_) {}
  }

  // ---------- Bentuk data ----------
  const rata1 = (n) => Number(n).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function normUlasan(r) {
    return {
      nama: r.nama_pembeli ?? r.pembeli?.nama ?? r.pembeli?.name ?? r.user?.nama ?? r.user?.name ?? r.buyer?.nama ?? "Pembeli",
      rating: Number(r.rating ?? r.bintang ?? 0),
      teks: r.ulasan ?? r.komentar ?? r.review ?? r.comment ?? "",
      tanggal: r.tanggal_ulasan ?? r.created_at ?? r.tanggal ?? null,
    };
  }
  const tanggalTeks = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? String(iso) : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  };

  async function bacaHasil(res) {
    if (!res) return { ok: false, pesan: null };
    let json = {};
    try { json = await res.json(); } catch (_) {}
    if (res.ok) return { ok: true, json };
    const err = json.errors || {};
    const pertama = Object.values(err).flat()[0];
    return { ok: false, pesan: pertama || json.message || "Terjadi kesalahan di server (HTTP " + res.status + "). Coba lagi." };
  }

  // ---------- UC13: daftar ulasan satu produk ----------
  async function daftar(idProduk) {
    const res = await apiFetch(jalur(idProduk));
    if (!res) return { ulasan: [], rata: null, jumlah: 0 };
    if (!res.ok) throw new Error("HTTP " + res.status);
    const j = await res.json();
    const d = j.data ?? j;
    const arr = Array.isArray(d) ? d : d.reviews ?? d.ulasan ?? (Array.isArray(d.data) ? d.data : null) ?? d.items ?? [];
    const ulasan = arr.map(normUlasan);
    const ratingBer = ulasan.filter((u) => u.rating > 0);
    const hitung = ratingBer.length ? ratingBer.reduce((s, u) => s + u.rating, 0) / ratingBer.length : null;
    const rata = (!Array.isArray(d) && (d.rata_rata_rating ?? d.average_rating ?? d.avg_rating)) || hitung;
    const jumlah = (!Array.isArray(d) && (d.jumlah_ulasan ?? d.total_reviews ?? d.total_ulasan)) || ulasan.length;
    return { ulasan, rata: rata === null ? null : Number(rata), jumlah: Number(jumlah) };
  }

  // ---------- UC51 dan UC52: kirim rating dan ulasan ----------
  async function kirim(pesanan, item, rating, teks) {
    if (!(rating >= 1 && rating <= 5) || !String(teks).trim()) return { ok: false, pesan: MSG.lengkapi };
    const badan = { rating, ulasan: teks.trim(), komentar: teks.trim(), id_pesanan: pesanan.id };
    const r = await bacaHasil(await apiFetch(jalur(item.id_produk), { method: "POST", body: JSON.stringify(badan) }));
    if (!r.ok) return r;
    tandai(pesanan, item);
    return { ok: true, pesan: MSG.terkirim };
  }

  return { MSG, daftar, kirim, sudahDiulas, semuaDiulas, rata1, tanggalTeks };
})();