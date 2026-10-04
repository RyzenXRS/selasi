<?php

namespace Database\Seeders;

use App\Models\DetailPesanan;
use App\Models\FaseBudidaya;
use App\Models\Notifikasi;
use App\Models\Panen;
use App\Models\Pembayaran;
use App\Models\Pengelolaan;
use App\Models\Pengguna;
use App\Models\PerpindahanFase;
use App\Models\Pesanan;
use App\Models\PrediksiPanen;
use App\Models\PrediksiPermintaan;
use App\Models\Produk;
use App\Models\Stok;
use App\Models\ToDo;
use App\Models\Ulasan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with realistic Smart Lettuce data (Bahasa Indonesia).
     */
    public function run(): void
    {
        // 1. Seed master data fase budidaya
        $this->call([
            FaseBudidayaSeeder::class,
        ]);

        $faseSemai       = FaseBudidaya::where('nama_fase', 'Semai')->first();
        $faseVegetatif   = FaseBudidaya::where('nama_fase', 'Vegetatif')->first();
        $fasePendewasaan = FaseBudidaya::where('nama_fase', 'Pendewasaan')->first();
        $fasePanen       = FaseBudidaya::where('nama_fase', 'Panen')->first();

        // 2. Akun Pembudidaya (Demo)
        $pembudidaya = Pengguna::firstOrCreate(
            ['email' => 'petani@lettuce.com'],
            [
                'nama'          => 'Budi Santoso (GreenHydro Farm)',
                'password_hash' => Hash::make('password123'),
                'role'          => Pengguna::PERAN_PEMBUDIDAYA,
                'no_telepon'    => '081298765432',
                'foto_profil'   => null,
                'created_at'    => Carbon::now()->subMonths(6),
                'updated_at'    => Carbon::now(),
            ]
        );

        // 3. Akun Pembeli (Demo)
        $pembeli = Pengguna::firstOrCreate(
            ['email' => 'pembeli@lettuce.com'],
            [
                'nama'          => 'Siti Rahmawati',
                'password_hash' => Hash::make('password123'),
                'role'          => Pengguna::PERAN_PEMBELI,
                'no_telepon'    => '085712345678',
                'foto_profil'   => null,
                'created_at'    => Carbon::now()->subMonths(3),
                'updated_at'    => Carbon::now(),
            ]
        );

        // 4. Batch Pengelolaan Budidaya Selada
        $pengelolaan1 = Pengelolaan::firstOrCreate(
            ['kode_pengelolaan' => 'BATCH-2026-001'],
            [
                'id_pembudidaya'      => $pembudidaya->id_pengguna,
                'tanggal_tanam'       => Carbon::now()->subDays(28)->toDateString(),
                'jumlah_tanaman'      => 250,
                'lokasi'              => 'Modul NFT 01 - Meja A',
                'kondisi_tanaman'     => 'Sangat Baik (Klorofil pekat, tajuk lebar)',
                'kondisi_air_nutrisi' => 'Nutrisi stabil EC 1.8 mS/cm, Suhu 23.5°C',
                'kondisi_instalasi'   => 'Aliran NFT lancar 2 L/menit tanpa endapan',
                'kondisi_lingkungan'  => 'Suhu 24-26°C, Kelembaban 65%, DLI cukup',
                'nilai_ph'            => 6.25,
                'catatan'             => 'Varietas Romaine Green Towers. Pertumbuhan sangat prima mendekati panen.',
                'created_at'          => Carbon::now()->subDays(28),
                'updated_at'          => Carbon::now(),
            ]
        );

        $pengelolaan2 = Pengelolaan::firstOrCreate(
            ['kode_pengelolaan' => 'BATCH-2026-002'],
            [
                'id_pembudidaya'      => $pembudidaya->id_pengguna,
                'tanggal_tanam'       => Carbon::now()->subDays(14)->toDateString(),
                'jumlah_tanaman'      => 300,
                'lokasi'              => 'Modul DFT 02 - Meja B',
                'kondisi_tanaman'     => 'Baik (Daun sejati 6-8 helai)',
                'kondisi_air_nutrisi' => 'EC 1.5 mS/cm, Nutrisi AB Mix Selada',
                'kondisi_instalasi'   => 'Aerasi gelembung aktif, pompa berjalan 24 jam',
                'kondisi_lingkungan'  => 'Suhu siang 28°C, malam 20°C',
                'nilai_ph'            => 6.40,
                'catatan'             => 'Varietas Butterhead Rex. Baru dipindah dari persemaian.',
                'created_at'          => Carbon::now()->subDays(14),
                'updated_at'          => Carbon::now(),
            ]
        );

        $pengelolaan3 = Pengelolaan::firstOrCreate(
            ['kode_pengelolaan' => 'BATCH-2026-003'],
            [
                'id_pembudidaya'      => $pembudidaya->id_pengguna,
                'tanggal_tanam'       => Carbon::now()->subDays(4)->toDateString(),
                'jumlah_tanaman'      => 400,
                'lokasi'              => 'Rak Semai Rockwool - Meja C',
                'kondisi_tanaman'     => 'Kecambah tumbuh serempak 98%',
                'kondisi_air_nutrisi' => 'Air baku PPM 80, kelembaban rockwool terjaga',
                'kondisi_instalasi'   => 'Baki semai bersih dengan pencahayaan growlight 14 jam',
                'kondisi_lingkungan'  => 'Suhu ruangan semai 22-24°C',
                'nilai_ph'            => 6.00,
                'catatan'             => 'Campuran Lollo Bionda & Red Batavia.',
                'created_at'          => Carbon::now()->subDays(4),
                'updated_at'          => Carbon::now(),
            ]
        );

        // 5. Riwayat Perpindahan Fase
        if ($pengelolaan1->perpindahanFase()->count() === 0 && $faseSemai && $faseVegetatif && $fasePendewasaan) {
            PerpindahanFase::create([
                'id_pengelolaan'  => $pengelolaan1->id_pengelolaan,
                'id_fase'         => $faseSemai->id_fase,
                'tanggal_mulai'   => Carbon::now()->subDays(28)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(18)->toDateString(),
                'catatan'         => 'Penyemaian bibit Romaine Green Towers',
            ]);

            PerpindahanFase::create([
                'id_pengelolaan'  => $pengelolaan1->id_pengelolaan,
                'id_fase'         => $faseVegetatif->id_fase,
                'tanggal_mulai'   => Carbon::now()->subDays(18)->toDateString(),
                'tanggal_selesai' => Carbon::now()->subDays(7)->toDateString(),
                'catatan'         => 'Pindah tanam fase vegetatif awal, 4 helai daun sejati',
            ]);

            PerpindahanFase::create([
                'id_pengelolaan'  => $pengelolaan1->id_pengelolaan,
                'id_fase'         => $fasePendewasaan->id_fase,
                'tanggal_mulai'   => Carbon::now()->subDays(7)->toDateString(),
                'tanggal_selesai' => null,
                'catatan'         => 'Masuk fase pembesaran/pendewasaan akhir sebelum panen',
            ]);
        }

        // 6. To-Do List Harian Pembudidaya
        if (ToDo::where('id_pembudidaya', $pembudidaya->id_pengguna)->count() === 0) {
            ToDo::create([
                'id_pembudidaya' => $pembudidaya->id_pengguna,
                'id_pengelolaan' => $pengelolaan1->id_pengelolaan,
                'nama_tugas'     => 'Cek & Kalibrasi pH / EC Tandon Utama NFT 01 (Target pH 6.0-6.5, TDS 1050-1150 ppm)',
                'tanggal_tugas'  => Carbon::now()->toDateString(),
                'status'         => false,
                'created_at'     => Carbon::now(),
            ]);

            ToDo::create([
                'id_pembudidaya' => $pembudidaya->id_pengguna,
                'id_pengelolaan' => $pengelolaan2->id_pengelolaan,
                'nama_tugas'     => 'Pembersihan Filter Spons & Pompa Modul DFT 02 Meja B',
                'tanggal_tugas'  => Carbon::now()->toDateString(),
                'status'         => true,
                'created_at'     => Carbon::now(),
            ]);

            ToDo::create([
                'id_pembudidaya' => $pembudidaya->id_pengguna,
                'id_pengelolaan' => $pengelolaan3->id_pengelolaan,
                'nama_tugas'     => 'Pemberian Sinar Matahari Pagi 4 Jam untuk Bibit Semai',
                'tanggal_tugas'  => Carbon::now()->addDay()->toDateString(),
                'status'         => false,
                'created_at'     => Carbon::now(),
            ]);
        }

        // 7. Prediksi Panen AI
        if (PrediksiPanen::where('id_pengelolaan', $pengelolaan1->id_pengelolaan)->count() === 0) {
            PrediksiPanen::create([
                'id_pengelolaan'            => $pengelolaan1->id_pengelolaan,
                'status_kesiapan'           => PrediksiPanen::STATUS_MENDEKATI_SIAP,
                'perkiraan_tanggal_mulai'   => Carbon::now()->addDays(5)->toDateString(),
                'perkiraan_tanggal_selesai' => Carbon::now()->addDays(8)->toDateString(),
                'nilai_prediksi'            => 48.50,
                'created_at'                => Carbon::now(),
            ]);
        }

        // 8. Prediksi Permintaan AI
        if (PrediksiPermintaan::where('id_pembudidaya', $pembudidaya->id_pengguna)->count() === 0) {
            PrediksiPermintaan::create([
                'id_pembudidaya'   => $pembudidaya->id_pengguna,
                'periode_mulai'    => Carbon::now()->startOfMonth()->toDateString(),
                'periode_selesai'  => Carbon::now()->endOfMonth()->toDateString(),
                'tanggal_prediksi' => Carbon::now()->toDateString(),
                'hasil_prediksi'   => 350.00,
                'satuan'           => 'ikat',
                'created_at'       => Carbon::now(),
            ]);
        }

        // 9. Produk & Stok Marketplace
        $produkList = [
            [
                'nama_produk' => 'Selada Romaine Hydroponic Super',
                'deskripsi'   => 'Selada Romaine segar renyah dengan tekstur juicy, kaya serat dan bebas pestisida kimia. Dipanen langsung dari modul NFT.',
                'harga'       => 16000,
                'stok'        => 45,
            ],
            [
                'nama_produk' => 'Selada Butterhead Rex Organik',
                'deskripsi'   => 'Selada Butterhead lembut manis dengan daun bertekstur mentega. Sangat cocok untuk salad bowl, burger premium, dan wrap sehat.',
                'harga'       => 18500,
                'stok'        => 30,
            ],
            [
                'nama_produk' => 'Selada Iceberg Crisp Hydro',
                'deskripsi'   => 'Selada Iceberg dengan kerapatan krop padat, sensasi krenyes segar menyegarkan. Sempurna untuk lalapan segar dan garnish makanan.',
                'harga'       => 20000,
                'stok'        => 25,
            ],
            [
                'nama_produk' => 'Red Lollo Bionda Mix',
                'deskripsi'   => 'Selada keriting eksotis berwarna hijau-merah marun kaya antioksidan antosianin. Menambah kecantikan sajian salad hotel & resto.',
                'harga'       => 17000,
                'stok'        => 35,
            ],
        ];

        $createdProduk = [];
        foreach ($produkList as $item) {
            $prod = Produk::firstOrCreate(
                ['nama_produk' => $item['nama_produk'], 'id_pembudidaya' => $pembudidaya->id_pengguna],
                [
                    'deskripsi'     => $item['deskripsi'],
                    'harga'         => $item['harga'],
                    'foto_produk'   => null,
                    'status_produk' => true,
                ]
            );

            Stok::updateOrInsert(
                ['id_produk' => $prod->id_produk],
                [
                    'jumlah_stok'    => $item['stok'],
                    'tanggal_update' => Carbon::now(),
                ]
            );

            $createdProduk[] = $prod;
        }

        // 10. Sample Pesanan, Detail Pesanan, Pembayaran Midtrans, & Ulasan
        if (Pesanan::where('id_pembeli', $pembeli->id_pengguna)->count() === 0 && count($createdProduk) >= 2) {
            $p1 = $createdProduk[0];
            $p2 = $createdProduk[1];

            $totalHarga = (2 * $p1->harga) + (1 * $p2->harga); // 32000 + 18500 = 50500

            $pesanan = Pesanan::create([
                'id_pembeli'        => $pembeli->id_pengguna,
                'tanggal_pesanan'   => Carbon::now()->subDays(2),
                'total_harga'       => $totalHarga,
                'metode_pembayaran' => Pesanan::METODE_QRIS,
                'status_pesanan'    => Pesanan::STATUS_SELESAI,
            ]);

            // Detail pesanan
            DetailPesanan::create([
                'id_pesanan'   => $pesanan->id_pesanan,
                'id_produk'    => $p1->id_produk,
                'jumlah'       => 2,
                'harga_satuan' => $p1->harga,
                'subtotal'     => 2 * $p1->harga,
            ]);

            DetailPesanan::create([
                'id_pesanan'   => $pesanan->id_pesanan,
                'id_produk'    => $p2->id_produk,
                'jumlah'       => 1,
                'harga_satuan' => $p2->harga,
                'subtotal'     => 1 * $p2->harga,
            ]);

            // Pembayaran Midtrans
            Pembayaran::create([
                'id_pesanan'           => $pesanan->id_pesanan,
                'id_pembudidaya'       => $pembudidaya->id_pengguna,
                'metode_pembayaran'    => 'QRIS',
                'status_pembayaran'    => Pembayaran::STATUS_LUNAS,
                'jumlah_bayar'         => $totalHarga,
                'order_id_gateway'     => 'ORDER-DEMO-' . $pesanan->id_pesanan,
                'id_transaksi_gateway' => 'TRX-MIDTRANS-' . rand(100000, 999999),
                'qr_string'            => '00020101021226580016ID.GO.MIDTRANS.WWW0118936009110000000000520458125802ID5914GreenHydro Farm6007Bandung61054013562070703A016304',
                'waktu_kadaluarsa'     => Carbon::now()->subDays(2)->addHours(24),
                'waktu_pembayaran'     => Carbon::now()->subDays(2)->addMinutes(15),
            ]);

            // Ulasan Produk
            Ulasan::create([
                'id_produk'      => $p1->id_produk,
                'id_pembeli'     => $pembeli->id_pengguna,
                'id_pesanan'     => $pesanan->id_pesanan,
                'rating'         => 5,
                'komentar'       => 'Seladanya luar biasa segar dan bersih! Masih ada sedikit akar hidroponiknya jadi awet di kulkas seminggu.',
                'tanggal_ulasan' => Carbon::now()->subDay(),
            ]);

            Ulasan::create([
                'id_produk'      => $p2->id_produk,
                'id_pembeli'     => $pembeli->id_pengguna,
                'id_pesanan'     => $pesanan->id_pesanan,
                'rating'         => 5,
                'komentar'       => 'Butterhead terenak yang pernah saya beli di Bandung. Renyah manis tanpa rasa pahit sama sekali.',
                'tanggal_ulasan' => Carbon::now()->subDay(),
            ]);
        }

        // 11. Notifikasi Demo
        if (Notifikasi::where('id_pengguna', $pembudidaya->id_pengguna)->count() === 0) {
            Notifikasi::create([
                'id_pengguna'      => $pembudidaya->id_pengguna,
                'id_pengelolaan'   => $pengelolaan1->id_pengelolaan,
                'jenis_notifikasi' => Notifikasi::JENIS_PREDIKSI_PANEN,
                'isi_notifikasi'   => 'Batch BATCH-2026-001 (Romaine) diperkirakan siap panen dalam 7 hari kedepan.',
                'status_dibaca'    => false,
                'waktu_notifikasi' => Carbon::now(),
            ]);

            Notifikasi::create([
                'id_pengguna'      => $pembudidaya->id_pengguna,
                'id_pengelolaan'   => $pengelolaan2->id_pengelolaan,
                'jenis_notifikasi' => Notifikasi::JENIS_PENGINGAT_FASE,
                'isi_notifikasi'   => 'Pengingat: Batch BATCH-2026-002 telah berada di Fase Vegetatif selama 14 hari. Periksa kesiapan pindah ke modul pembesaran.',
                'status_dibaca'    => true,
                'waktu_notifikasi' => Carbon::now()->subDays(1),
            ]);
        }
    }
}
