// Pustaka bersama Pembeli: produk, keranjang, notifikasi (toast), dan angka di ikon keranjang.
// Dipakai oleh katalog-pembeli.js dan keranjang.js. Dimuat setelah config.js dan pembeli-guard.js.

const Keranjang = (function () {
  // ---------- Pengaturan ----------
  // Mode uji coba tanpa BE: buka halaman dengan ?demo=1 (?demo=0 untuk mematikan)
  const q = new URLSearchParams(location.search).get("demo");
  if (q === "1") sessionStorage.setItem("pembeli_demo", "1");
  if (q === "0") sessionStorage.removeItem("pembeli_demo");
  const MOCK = (typeof USE_MOCK !== "undefined" && USE_MOCK) || sessionStorage.getItem("pembeli_demo") === "1";

  const PATH_PRODUK = ENDPOINTS.produk || "/produk";
  // Keranjang ke backend (CartController): tambahkan  keranjang: "/keranjang"  di ENDPOINTS pada config.js.
  //   GET    /keranjang               isi keranjang  -> data.items[]
  //   POST   /keranjang               {id_produk, jumlah}
  //   PUT    /keranjang/items/{id}    {jumlah}
  //   DELETE /keranjang/items/{id}
  // Selama ENDPOINTS.keranjang belum ada, keranjang disimpan di browser (localStorage, per akun).
  const PATH = ENDPOINTS.keranjang || null;
  const LOKAL = MOCK || !PATH;

  const userId = () => {
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); return u.id_pengguna ?? u.id ?? u.email ?? "x"; } catch (_) { return "x"; }
  };
  const KEY = () => (MOCK ? "mock_keranjang_pembeli_" : "keranjang_pembeli_") + userId();

  // BE memakai jumlah bilangan bulat (validasi 'integer', min 1). Ubah ke false kalau BE sudah menerima desimal.
  const HANYA_BULAT = true;

  // Pesan sesuai skenario UC39, UC40, UC41
  const MSG = {
    tambahOk: "Produk berhasil ditambahkan ke keranjang.",
    lebih: "Jumlah produk yang ingin ditambahkan ke keranjang melebihi stok yang tersedia",
    kurang: "Jumlah produk tidak boleh kurang dari 1. Silakan gunakan ikon Hapus untuk menghapus produk dari keranjang.",
    konfirmasiHapus: "Apakah Anda yakin ingin menghapus produk ini dari keranjang?",
    hapusOk: "Produk berhasil dihapus dari keranjang.",
    bukanBulat: "Jumlah produk harus berupa bilangan bulat (kg)", // tidak ada di skenario; BE hanya menerima kg bulat
    jumlahTidakValid: "Jumlah produk harus lebih dari 0", // tidak ada di skenario; dipakai kalau kolom jumlah kosong atau bukan angka
  };

  // ---------- Format ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const angka = (n) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });
  const bulat2 = (n) => Math.round(n * 100) / 100;
  const fotoUrl = (p) => {
    if (!p) return "";
    if (/^(https?:|data:|blob:|\.\.\/|\/)/.test(p)) return p;
    return STORAGE_BASE_URL + String(p).replace(/^\/+/, "");
  };

  // ---------- Menyamakan bentuk data dari BE ----------
  function normProduk(p) {
    return {
      id: p.id_produk ?? p.id,
      nama: p.nama_produk ?? p.nama ?? p.name ?? "Produk",
      harga: Number(p.harga_produk ?? p.harga ?? p.price ?? 0),
      stok: Number(p.stok ?? p.jumlah_stok ?? p.stock ?? 0),
      foto: p.foto_produk ?? p.foto ?? p.gambar ?? null,
      deskripsi: p.deskripsi ?? p.description ?? "",
      rating: p.rating ?? p.rata_rata_rating ?? p.average_rating ?? p.avg_rating ?? null,
      jumlahUlasan: p.jumlah_ulasan ?? p.total_ulasan ?? p.reviews_count ?? p.total_reviews ?? null,
      // Jadwal pengambilan yang diisi Pembudidaya pada produk (UC22), dipakai di Checkout (UC45)
      tanggalPengambilan: String(p.tanggal_pengambilan ?? "").slice(0, 10),
      jamPengambilan: String(p.jam_pengambilan ?? "").slice(0, 5),
    };
  }
  function normItem(it) {
    const pr = it.produk ?? it.product ?? {};
    const stok = it.stok ?? pr.stok ?? pr.jumlah_stok ?? pr.stock;
    return {
      id: it.id_item_keranjang ?? it.id_item ?? it.id, // id_keranjang = id keranjang, bukan id item
      id_produk: it.id_produk ?? pr.id_produk ?? pr.id,
      nama: it.nama_produk ?? pr.nama_produk ?? pr.nama ?? pr.name ?? "Produk",
      harga: Number(it.harga_satuan ?? it.price ?? it.harga_produk ?? it.harga ?? pr.harga_produk ?? pr.harga ?? 0),
      jumlah: Number(it.jumlah ?? it.quantity ?? it.jumlah_produk ?? 0),
      stok: stok === undefined || stok === null ? null : Number(stok),
      foto: it.foto_produk ?? pr.foto_produk ?? pr.foto ?? null,
      tanggalPengambilan: String(it.tanggal_pengambilan ?? pr.tanggal_pengambilan ?? "").slice(0, 10),
      jamPengambilan: String(it.jam_pengambilan ?? pr.jam_pengambilan ?? "").slice(0, 5),
    };
  }
  const daftarDari = (json) => (Array.isArray(json) ? json : json.data?.items ?? json.data ?? json.items ?? []);

  // ---------- Data contoh (?demo=1) ----------
  function produkContoh() {
    const foto = "../assets/img/selada2.jpeg";
    return [
      { id_produk: 1, nama_produk: "Selada Hijau",    harga_produk: 15000, stok: 42, foto_produk: foto, deskripsi: "Renyah dan segar, cocok untuk salad harian." },
      { id_produk: 2, nama_produk: "Selada Keriting", harga_produk: 16000, stok: 8,  foto_produk: foto, deskripsi: "Daun keriting lebat, tahan lama di kulkas." },
      { id_produk: 3, nama_produk: "Selada Romaine",  harga_produk: 18000, stok: 25, foto_produk: null, deskripsi: "Batang tebal, pas untuk Caesar salad." },
      { id_produk: 4, nama_produk: "Selada Merah",    harga_produk: 20000, stok: 12, foto_produk: null, deskripsi: "Warna cantik untuk hidangan istimewa." },
      { id_produk: 5, nama_produk: "Butterhead",      harga_produk: 22000, stok: 0,  foto_produk: foto, deskripsi: "Lembut dan manis, sedang tidak tersedia." },
      { id_produk: 6, nama_produk: "Selada Air",      harga_produk: 14000, stok: 30, foto_produk: null, deskripsi: "Segar dengan sedikit rasa pedas." },
    ];
  }

  // ---------- Penyimpanan keranjang di browser ----------
  const bacaLokal = () => { try { const a = JSON.parse(localStorage.getItem(KEY())); if (Array.isArray(a)) return a; } catch (_) {} return []; };
  const tulisLokal = (a) => { try { localStorage.setItem(KEY(), JSON.stringify(a)); } catch (_) {} };

  // ---------- Produk (UC38) ----------
  async function produk() {
    if (MOCK) { await sleep(700); return produkContoh().map(normProduk); }
    const res = await apiFetch(PATH_PRODUK);
    if (!res) return [];
    if (!res.ok) throw new Error("HTTP " + res.status);
    return daftarDari(await res.json()).map(normProduk);
  }

  // ---------- Keranjang ----------
  async function daftar() {
    if (LOKAL) {
      const baris = bacaLokal();
      if (!baris.length) return [];
      let katalog = [];
      try { katalog = await produk(); } catch (_) { /* pakai data yang tersimpan */ }
      return baris.map((c) => {
        const p = katalog.find((x) => String(x.id) === String(c.id_produk)) || c.snap || {};
        return { id: c.id, id_produk: c.id_produk, nama: p.nama || "Produk", harga: p.harga ?? 0, jumlah: c.jumlah, stok: p.stok ?? null, foto: p.foto ?? null };
      });
    }
    const res = await apiFetch(PATH);
    if (!res) return [];
    if (!res.ok) throw new Error("HTTP " + res.status);
    return daftarDari(await res.json()).map(normItem);
  }

  const gagal = (pesan) => ({ ok: false, pesan });
  async function hasilBE(res) {
    if (!res) return gagal(null); // 401: sudah logout
    let json = {};
    try { json = await res.json(); } catch (_) {}
    if (res.ok) return { ok: true, json };
    if (res.status === 422) {
      const err = json.errors || {};
      if (err.stock) return gagal(MSG.lebih); // stok tidak cukup -> pesan sesuai UC39/UC40
      const pertama = Object.values(err).flat()[0];
      return gagal(pertama || json.message || MSG.lebih);
    }
    return gagal("Terjadi kesalahan di server (HTTP " + res.status + "). Coba lagi.");
  }

  // UC39: validasi jumlah dan stok, lalu simpan ke keranjang
  async function tambah(p, jumlah) {
    const j = Number(String(jumlah).trim().replace(",", "."));
    if (!Number.isFinite(j) || j <= 0) return gagal(MSG.jumlahTidakValid);
    if (HANYA_BULAT && !Number.isInteger(j)) return gagal(MSG.bukanBulat);
    if (p.stok <= 0) return gagal(MSG.lebih);

    let sudah = 0;
    if (LOKAL) {
      const b = bacaLokal().find((c) => String(c.id_produk) === String(p.id));
      sudah = b ? b.jumlah : 0;
    } else {
      const b = (await daftar()).find((i) => String(i.id_produk) === String(p.id));
      sudah = b ? b.jumlah : 0;
    }
    if (bulat2(j + sudah) > p.stok) return gagal(MSG.lebih);

    if (LOKAL) {
      await sleep(250);
      const isi = bacaLokal();
      const baris = isi.find((c) => String(c.id_produk) === String(p.id));
      if (baris) { baris.jumlah = bulat2(baris.jumlah + j); baris.snap = { nama: p.nama, harga: p.harga, foto: p.foto, stok: p.stok }; }
      else isi.push({ id: Date.now(), id_produk: p.id, jumlah: bulat2(j), snap: { nama: p.nama, harga: p.harga, foto: p.foto, stok: p.stok } });
      tulisLokal(isi);
    } else {
      const r = await hasilBE(await apiFetch(PATH, { method: "POST", body: JSON.stringify({ id_produk: p.id, jumlah: j }) }));
      if (!r.ok) return r;
    }
    await segarkanBadge();
    return { ok: true, pesan: MSG.tambahOk };
  }

  // UC40: ubah jumlah (tombol + dan -); jumlah baru dihitung oleh pemanggil
  async function ubah(item, baru) {
    if (!(baru >= 1)) return gagal(MSG.kurang);
    if (HANYA_BULAT && !Number.isInteger(baru)) return gagal(MSG.bukanBulat);
    if (item.stok !== null && baru > item.stok) return gagal(MSG.lebih);
    if (LOKAL) {
      await sleep(120);
      const isi = bacaLokal();
      const baris = isi.find((c) => c.id === item.id);
      if (baris) baris.jumlah = baru;
      tulisLokal(isi);
      return { ok: true };
    }
    return hasilBE(await apiFetch(PATH + "/items/" + encodeURIComponent(item.id), { method: "PUT", body: JSON.stringify({ jumlah: baru }) }));
  }

  // UC41: hapus produk dari keranjang
  async function hapus(item) {
    if (LOKAL) {
      await sleep(150);
      tulisLokal(bacaLokal().filter((c) => c.id !== item.id));
    } else {
      const r = await hasilBE(await apiFetch(PATH + "/items/" + encodeURIComponent(item.id), { method: "DELETE" }));
      if (!r.ok) return r;
    }
    await segarkanBadge();
    return { ok: true, pesan: MSG.hapusOk };
  }

  // ---------- Angka di ikon keranjang ----------
  async function segarkanBadge() {
    const el = document.getElementById("cart-count");
    if (!el) return;
    try {
      const n = LOKAL ? bacaLokal().length : (await daftar()).length;
      const lama = el.textContent;
      el.textContent = String(n);
      el.hidden = n === 0;
      if (n > 0 && lama !== String(n)) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
    } catch (_) { /* angka dibiarkan kalau gagal */ }
  }

  // ---------- Notifikasi (toast) ----------
  let toastEl, toastTimer;
  function toast(pesan, jenis) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.className = "toast " + (jenis || "success");
    toastEl.textContent = pesan;
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 4200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", segarkanBadge);
  else segarkanBadge();

  return { MOCK, LOKAL, MSG, rupiah, angka, fotoUrl, produk, daftar, tambah, ubah, hapus, toast, segarkanBadge };
})();