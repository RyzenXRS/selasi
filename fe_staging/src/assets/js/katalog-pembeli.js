// Katalog Produk Pembeli (UC38) + Tambah ke Keranjang (UC39). Memakai pembeli-cart.js.

const $ = (id) => document.getElementById(id);
const K = Keranjang;
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

const IKON_DAUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-9"/><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 16c0-3-2-5-6-5 0 3 2 5 6 5z"/></svg>';
const SERVER_ERROR = "Tidak bisa terhubung ke server. Coba lagi nanti.";

// Stepper jumlah: tombol (−) dan (+), tiap tekan 1 kg. Ketik manual tetap boleh,
// validasi akhir (stok, kosong, format) tetap dilakukan K.tambah (UC39).
function buatStepper(idInput, stok, disabled) {
  const wrap = el("div", undefined, "qty");
  const kurang = el("button", "−", "qty-btn");
  kurang.type = "button"; kurang.setAttribute("aria-label", "Kurangi 1 kg");
  const tambah = el("button", "+", "qty-btn");
  tambah.type = "button"; tambah.setAttribute("aria-label", "Tambah 1 kg");
  const input = el("input");
  input.type = "number"; input.id = idInput; input.min = "1"; input.step = "1";
  input.value = "1"; input.inputMode = "numeric";
  if (stok > 0) input.max = String(stok);

  const ubah = (d) => {
    const skrg = parseFloat(String(input.value).replace(",", ".")) || 0;
    let baru = Math.round((skrg + d) * 100) / 100;
    if (baru < 1) baru = 1;
    if (stok > 0 && baru > stok) baru = stok;
    input.value = String(baru);
  };
  kurang.addEventListener("click", () => ubah(-1));
  tambah.addEventListener("click", () => ubah(1));

  if (disabled) { input.disabled = kurang.disabled = tambah.disabled = true; }
  wrap.append(kurang, input, tambah);
  return { wrap, input };
}

function kartu(p, i) {
  const habis = p.stok <= 0;
  const card = el("article", undefined, "produk" + (habis ? " habis" : ""));
  card.style.setProperty("--i", String(Math.min(i, 8)));

  // Foto Produk
  const foto = el("div", undefined, "foto");
  const pasangPlaceholder = () => {
    foto.querySelector("img")?.remove();
    const k = el("div", undefined, "kosong");
    k.innerHTML = IKON_DAUN;
    foto.prepend(k);
  };
  const url = K.fotoUrl(p.foto);
  if (url) {
    const img = el("img");
    img.src = url; img.alt = p.nama; img.loading = "lazy";
    img.addEventListener("error", pasangPlaceholder);
    foto.appendChild(img);
  } else {
    pasangPlaceholder();
  }
  if (habis) foto.appendChild(el("span", "Habis", "tag habis"));

  // Nama Produk, Harga, Deskripsi, Stok
  const isi = el("div", undefined, "isi");
  isi.appendChild(el("h3", p.nama));
  if (p.deskripsi) isi.appendChild(el("p", p.deskripsi, "desk"));
  const harga = el("div", undefined, "harga");
  harga.append(document.createTextNode(K.rupiah(p.harga) + " "), el("small", "/ kg"));
  isi.appendChild(harga);
  isi.appendChild(el("div", habis ? "Stok habis" : "Stok " + K.angka(p.stok) + " kg", "stok"));

  // UC13: bagian Rating dan Ulasan membuka halaman ulasan produk
  const rl = el("a", undefined, "rating-link");
  rl.href = "ulasan-produk-pembeli.html?id=" + encodeURIComponent(p.id) + "&nama=" + encodeURIComponent(p.nama);
  if (p.rating !== null && p.rating !== undefined && !isNaN(Number(p.rating))) {
    rl.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.6 6 20.9l1.3-6.7-5-4.7 6.8-.8z"/></svg>';
    rl.append(Number(p.rating).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (p.jumlahUlasan !== null && p.jumlahUlasan !== undefined ? " (" + p.jumlahUlasan + " ulasan)" : ""));
  } else {
    rl.textContent = "Rating dan Ulasan";
  }
  isi.appendChild(rl);

  // Jumlah Produk (kg) + tombol Tambah ke Keranjang
  const form = el("form", undefined, "beli");
  form.noValidate = true;
  const kolom = el("div", undefined, "beli-jumlah");
  const label = el("label", "Jumlah (kg)");
  const idInput = "jumlah-" + String(p.id ?? i);
  label.htmlFor = idInput;
  const { wrap, input } = buatStepper(idInput, Number(p.stok) || 0, habis);
  kolom.append(label, wrap);
  const btn = el("button", "Tambah ke Keranjang", "btn btn-beli");
  btn.type = "submit";
  btn.disabled = habis;
  form.append(kolom, btn);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    btn.disabled = true;
    try {
      const r = await K.tambah(p, input.value);
      if (r.ok) K.toast(r.pesan, "success");
      else if (r.pesan) K.toast(r.pesan, "error");
    } catch (err) {
      K.toast(SERVER_ERROR, "error");
    } finally {
      btn.disabled = false;
    }
  });
  isi.appendChild(form);

  card.append(foto, isi);
  return card;
}

(async function init() {
  const g = $("grid");
  g.replaceChildren(...Array.from({ length: 6 }, () => el("div", undefined, "skeleton")));
  try {
    const daftar = await K.produk();
    if (!daftar.length) {
      g.replaceChildren(el("p", "Belum ada produk yang tersedia.", "kosong-info"));
      return;
    }
    g.replaceChildren(...daftar.map(kartu));
  } catch (err) {
    g.replaceChildren();
    const a = $("alert");
    a.textContent = "Katalog produk belum bisa dimuat (" + err.message + "). Coba muat ulang halaman.";
    a.hidden = false;
  }
})();