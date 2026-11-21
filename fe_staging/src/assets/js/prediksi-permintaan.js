// Melihat Data Prediksi Permintaan Pasar (UC19).
// GET ENDPOINTS.prediksiPermintaan (/prediksi-permintaan) -> PrediksiController@permintaan.
// Backend mengirim daftar prediksi: periode_mulai, periode_selesai, hasil_prediksi, satuan (terbaru dulu).
// Data aktual penjualan (Bulan Penjualan, Jumlah Penjualan Aktual) belum dikirim oleh endpoint itu; kalau backend
// menambahkannya (kunci "aktual"), tabel terisi otomatis.

const $ = (id) => document.getElementById(id);
const NS = "http://www.w3.org/2000/svg";
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const kg = (n) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " kg";

// ---------- Membaca respons backend ----------
const ambil = (o, kunci) => { for (const k of kunci) if (o && o[k] !== undefined && o[k] !== null) return o[k]; return undefined; };
function labelBulan(v) {
  if (v === undefined || v === null) return "-";
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})/);
  return m ? BULAN[Number(m[2]) - 1] + " " + m[1] : s;
}
function barisBulan(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((x) => ({
      bulan: labelBulan(ambil(x, ["periode_mulai", "bulan_prediksi", "bulan_penjualan", "bulan", "periode", "month"])), // Bulan Prediksi / Bulan Penjualan
      jumlah: Number(ambil(x, ["hasil_prediksi", "jumlah_prediksi_permintaan", "jumlah_penjualan_aktual", "jumlah", "nilai", "value"])), // Jumlah
    }))
    .filter((r) => Number.isFinite(r.jumlah));
}
// Daftar dari backend terbaru dulu. Satu bulan hanya dipakai sekali (yang terbaru), diambil tiga bulan, lalu diurutkan dari yang paling awal.
function tigaBulan(arr) {
  const sudah = new Set(), hasil = [];
  for (const r of barisBulan(arr)) { if (sudah.has(r.bulan)) continue; sudah.add(r.bulan); hasil.push(r); if (hasil.length === 3) break; }
  return hasil.reverse();
}
function baca(json) {
  const d = json.data ?? json;
  if (Array.isArray(d)) return { prediksi: tigaBulan(d), aktual: [] };
  return {
    prediksi: tigaBulan(ambil(d, ["prediksi", "prediction", "predictions", "forecast", "hasil_prediksi"])),
    aktual: barisBulan(ambil(d, ["aktual", "actual", "data_aktual", "penjualan_aktual", "historis"])),
  };
}

// ---------- Grafik prediksi (SVG) ----------
function el(nama, attr, teks) {
  const e = document.createElementNS(NS, nama);
  for (const k in attr) e.setAttribute(k, attr[k]);
  if (teks !== undefined) e.textContent = teks;
  return e;
}
function skalaMaks(maks) {
  const langkah = maks <= 50 ? 10 : maks <= 125 ? 25 : maks <= 250 ? 50 : Math.pow(10, Math.floor(Math.log10(maks))) / 2;
  const atas = Math.max(langkah, Math.ceil((maks * 1.1) / langkah) * langkah);
  return { atas, langkah };
}
function gambarGrafik(data) {
  const W = 760, H = 300, ml = 64, mr = 24, mt = 40, mb = 46;
  const pw = W - ml - mr, ph = H - mt - mb;
  const { atas, langkah } = skalaMaks(Math.max(...data.map((d) => d.jumlah), 1));
  const y = (v) => mt + ph - (v / atas) * ph;
  const x = (i) => ml + ((i + 0.5) * pw) / data.length;

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Grafik prediksi penjualan: " + data.map((d) => d.bulan + " " + kg(d.jumlah)).join(", ") });
  const defs = el("defs");
  const g = el("linearGradient", { id: "gArea", x1: "0", y1: "0", x2: "0", y2: "1" });
  g.append(el("stop", { offset: "0%", "stop-color": "#4F772D", "stop-opacity": ".28" }), el("stop", { offset: "100%", "stop-color": "#4F772D", "stop-opacity": ".02" }));
  defs.appendChild(g); svg.appendChild(defs);

  for (let v = 0; v <= atas; v += langkah) {
    svg.append(el("line", { class: v === 0 ? "ch-axis" : "ch-grid", x1: ml, x2: W - mr, y1: y(v), y2: y(v) }),
               el("text", { class: "ch-text", x: ml - 10, y: y(v) + 4, "text-anchor": "end" }, String(v)));
  }
  svg.appendChild(el("text", { class: "ch-text ch-judul", transform: `translate(16 ${mt + ph / 2}) rotate(-90)`, "text-anchor": "middle" }, "Penjualan (kg)"));
  data.forEach((d, i) => svg.appendChild(el("text", { class: "ch-text", x: x(i), y: H - 16, "text-anchor": "middle" }, d.bulan)));

  const pts = data.map((d, i) => [x(i), y(d.jumlah)]);
  const garis = pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
  svg.appendChild(el("path", { class: "ch-area", d: garis + ` L${pts[pts.length - 1][0]} ${y(0)} L${pts[0][0]} ${y(0)} Z`, fill: "url(#gArea)" }));
  const line = el("path", { class: "ch-line", d: garis });
  svg.appendChild(line);

  data.forEach((d, i) => {
    const [px, py] = pts[i];
    const t = kg(d.jumlah), lebar = t.length * 7.2 + 18;
    const b = el("g", { class: "ch-bubble", style: `animation-delay:${0.9 + i * 0.18}s` });
    b.append(el("rect", { x: px - lebar / 2, y: py - 40, width: lebar, height: 24, rx: 8 }), el("text", { x: px, y: py - 24, "text-anchor": "middle" }, t));
    svg.appendChild(b);
    const c = el("circle", { class: "ch-dot", cx: px, cy: py, r: 5.5, style: `animation-delay:${0.7 + i * 0.18}s` });
    c.appendChild(el("title", {}, d.bulan + ": " + t));
    svg.appendChild(c);
  });
  $("grafik").replaceChildren(svg);
  // Panjang garis dipakai animasi menggambar
  try { line.style.setProperty("--len", Math.ceil(line.getTotalLength()) + 2); } catch (_) { line.style.setProperty("--len", 1200); }
}

// ---------- Tabel data aktual ----------
function isiTabel(data) {
  $("tbody").replaceChildren(...data.map((d, i) => {
    const tr = document.createElement("tr");
    tr.style.setProperty("--i", String(Math.min(i, 10)));
    const a = document.createElement("td"); a.textContent = d.bulan;
    const b = document.createElement("td"); b.textContent = kg(d.jumlah);
    tr.append(a, b);
    return tr;
  }));
}

// ---------- Mulai ----------
// Ada batas waktu 20 detik supaya halaman tidak menggantung kalau backend atau layanan AI (port 8001) tidak merespons.
// Placeholder disembunyikan dengan style (tidak bergantung CSS), dan ada keterangan kalau datanya kosong.
(async function init() {
  const alertEl = $("alert");
  const sembunyikanSkel = () => { $("sk-grafik").style.display = "none"; $("sk-tabel").style.display = "none"; };
  const catatan = (idSetelah, teks) => {
    const p = document.createElement("p");
    p.textContent = teks;
    p.style.cssText = "margin:0;padding:18px;text-align:center;color:#5d7549";
    $(idSetelah).after(p);
  };

  const kontrol = new AbortController();
  const timer = setTimeout(() => kontrol.abort(), 20000);

  try {
    const res = await apiFetch(ENDPOINTS.prediksiPermintaan, { signal: kontrol.signal });
    clearTimeout(timer);
    if (!res) return; // 401: sudah logout
    if (!res.ok) throw new Error("HTTP " + res.status);

    const { prediksi, aktual } = baca(await res.json());
    sembunyikanSkel();

    if (prediksi.length) gambarGrafik(prediksi);
    else catatan("sk-grafik", "Belum ada data prediksi penjualan.");

    if (aktual.length) { isiTabel(aktual); $("tabel-wrap").hidden = false; }
    else catatan("sk-tabel", "Belum ada data aktual penjualan.");
  } catch (err) {
    clearTimeout(timer);
    console.error("[PREDIKSI PERMINTAAN]", err);
    sembunyikanSkel();
    alertEl.textContent = err.name === "AbortError"
      ? "Server terlalu lama merespons (lebih dari 20 detik). Pastikan backend dan layanan AI (port 8001) sudah berjalan."
      : "Prediksi permintaan pasar gagal dimuat (" + err.message + ").";
    alertEl.hidden = false;
  }
})();