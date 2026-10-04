<?php

namespace App\Services;

use App\Models\Pengelolaan;
use App\Models\Pengguna;
use App\Models\Pesanan;
use App\Models\PrediksiPanen;
use App\Models\PrediksiPermintaan;
use App\Models\Produk;
use App\Models\Stok;
use App\Models\ToDo;
use Illuminate\Support\Carbon;

class DashboardService
{
    public function getCultivatorDashboard(Pengguna $pembudidaya): array
    {
        $userId = $pembudidaya->id_pengguna;

        $pengelolaanList = Pengelolaan::where('id_pembudidaya', $userId)
            ->with(['perpindahanFase.fase', 'prediksiPanen'])
            ->get();

        $totalTanaman = $pengelolaanList->sum('jumlah_tanaman');

        // Prediksi Panen AI
        $prediksiPanen = PrediksiPanen::whereHas('pengelolaan', fn($q) => $q->where('id_pembudidaya', $userId))
            ->with('pengelolaan')
            ->orderBy('id_prediksi_panen', 'desc')
            ->take(5)
            ->get();

        // Prediksi Permintaan AI
        $prediksiPermintaan = PrediksiPermintaan::where('id_pembudidaya', $userId)
            ->orderBy('id_prediksi_permintaan', 'desc')
            ->first();

        // Tasks / To-Do
        $pendingTasksCount = ToDo::where('id_pembudidaya', $userId)
            ->where('status', false)
            ->count();

        // Produk & Stok
        $productsCount = Produk::where('id_pembudidaya', $userId)->count();
        $totalStock = Stok::whereHas('produk', fn($q) => $q->where('id_pembudidaya', $userId))->sum('jumlah_stok');

        // Pesanan masuk
        $incomingOrdersCount = Pesanan::whereHas('detailPesanan.produk', fn($q) => $q->where('id_pembudidaya', $userId))
            ->whereIn('status_pesanan', [Pesanan::STATUS_MENUNGGU_PEMBAYARAN, Pesanan::STATUS_DIBAYAR, Pesanan::STATUS_DIPROSES, Pesanan::STATUS_SIAP_DIAMBIL])
            ->count();

        $totalRevenue = Pesanan::whereHas('detailPesanan.produk', fn($q) => $q->where('id_pembudidaya', $userId))
            ->where('status_pesanan', Pesanan::STATUS_SELESAI)
            ->sum('total_harga');

        return [
            'ringkasan' => [
                'total_batch_pengelolaan' => $pengelolaanList->count(),
                'total_tanaman'           => $totalTanaman,
                'tugas_belum_selesai'     => $pendingTasksCount,
                'total_produk'            => $productsCount,
                'total_stok_tersedia'     => (float) $totalStock,
                'pesanan_masuk_aktif'     => $incomingOrdersCount,
                'total_pendapatan'        => (float) $totalRevenue,
            ],
            'summary' => [
                'active_batches_count'  => $pengelolaanList->count(),
                'total_active_plants'   => $totalTanaman,
                'pending_tasks_count'   => $pendingTasksCount,
                'products_count'        => $productsCount,
                'total_stock'           => (float) $totalStock,
                'incoming_orders_count' => $incomingOrdersCount,
                'total_revenue'         => (float) $totalRevenue,
            ],
            'prediksi_panen'      => $prediksiPanen,
            'prediksi_permintaan' => $prediksiPermintaan,
        ];
    }

    public function getBuyerDashboard(Pengguna $pembeli): array
    {
        $orders = Pesanan::where('id_pembeli', $pembeli->id_pengguna)
            ->with(['detailPesanan.produk', 'pembayaran'])
            ->get();

        $activeOrdersCount = $orders->whereIn('status_pesanan', [
            Pesanan::STATUS_MENUNGGU_PEMBAYARAN,
            Pesanan::STATUS_DIBAYAR,
            Pesanan::STATUS_DIPROSES,
            Pesanan::STATUS_SIAP_DIAMBIL,
        ])->count();

        $completedOrdersCount = $orders->where('status_pesanan', Pesanan::STATUS_SELESAI)->count();
        $totalSpent = $orders->where('status_pesanan', Pesanan::STATUS_SELESAI)->sum('total_harga');

        return [
            'ringkasan' => [
                'total_pesanan'    => $orders->count(),
                'pesanan_aktif'    => $activeOrdersCount,
                'pesanan_selesai'  => $completedOrdersCount,
                'total_pengeluaran'=> (float) $totalSpent,
            ],
            'summary' => [
                'total_orders'     => $orders->count(),
                'active_orders'    => $activeOrdersCount,
                'completed_orders' => $completedOrdersCount,
                'total_spent'      => (float) $totalSpent,
            ],
            'pesanan_terbaru' => $orders->sortByDesc('id_pesanan')->take(5)->values(),
        ];
    }
}
