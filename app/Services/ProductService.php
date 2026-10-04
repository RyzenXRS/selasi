<?php

namespace App\Services;

use App\Models\Pengguna;
use App\Models\Produk;
use App\Models\Stok;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class ProductService
{
    public function createProduct(Pengguna $pembudidaya, array $data): Produk
    {
        $foto = $data['foto_produk'] ?? $data['image'] ?? null;
        $fotoPath = null;
        if ($foto && is_object($foto) && method_exists($foto, 'store')) {
            $fotoPath = $foto->store('products', 'public');
        } elseif (is_string($foto)) {
            $fotoPath = $foto;
        }

        $produk = Produk::create([
            'id_pembudidaya' => $pembudidaya->id_pengguna,
            'nama_produk'    => $data['nama_produk'] ?? $data['name'],
            'deskripsi'      => $data['deskripsi'] ?? $data['description'] ?? null,
            'harga'          => $data['harga'] ?? $data['price'],
            'foto_produk'    => $fotoPath,
            'status_produk'  => isset($data['status_produk']) ? (bool) $data['status_produk'] : true,
        ]);

        $jumlahStok = $data['jumlah_stok'] ?? $data['stock'] ?? 0;
        Stok::create([
            'id_produk'      => $produk->id_produk,
            'jumlah_stok'    => $jumlahStok,
            'tanggal_update' => Carbon::now(),
        ]);

        return $produk->load('stok');
    }

    public function updateProduct(Produk $produk, array $data): Produk
    {
        $foto = $data['foto_produk'] ?? $data['image'] ?? null;
        if ($foto && is_object($foto) && method_exists($foto, 'store')) {
            if ($produk->foto_produk) {
                Storage::disk('public')->delete($produk->foto_produk);
            }
            $data['foto_produk'] = $foto->store('products', 'public');
        }

        $payload = [];
        if (isset($data['nama_produk']) || isset($data['name'])) {
            $payload['nama_produk'] = $data['nama_produk'] ?? $data['name'];
        }
        if (isset($data['deskripsi']) || isset($data['description'])) {
            $payload['deskripsi'] = $data['deskripsi'] ?? $data['description'];
        }
        if (isset($data['harga']) || isset($data['price'])) {
            $payload['harga'] = $data['harga'] ?? $data['price'];
        }
        if (isset($data['foto_produk'])) {
            $payload['foto_produk'] = $data['foto_produk'];
        }
        if (isset($data['status_produk'])) {
            $payload['status_produk'] = (bool) $data['status_produk'];
        }

        if (!empty($payload)) {
            $produk->update($payload);
        }

        if (isset($data['jumlah_stok']) || isset($data['stock'])) {
            $stokVal = $data['jumlah_stok'] ?? $data['stock'];
            Stok::updateOrInsert(
                ['id_produk' => $produk->id_produk],
                [
                    'jumlah_stok'    => $stokVal,
                    'tanggal_update' => Carbon::now(),
                ]
            );
        }

        return $produk->fresh()->load('stok');
    }

    public function deleteProduct(Produk $produk): void
    {
        if ($produk->foto_produk) {
            Storage::disk('public')->delete($produk->foto_produk);
        }
        $produk->stok()?->delete();
        $produk->delete();
    }
}
