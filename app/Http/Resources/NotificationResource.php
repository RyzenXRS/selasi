<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_notifikasi'    => $this->id_notifikasi,
            'id'               => $this->id_notifikasi,
            'id_pengguna'      => $this->id_pengguna,
            'id_pengelolaan'   => $this->id_pengelolaan,
            'jenis_notifikasi' => $this->jenis_notifikasi,
            'type'             => $this->jenis_notifikasi,
            'isi_notifikasi'   => $this->isi_notifikasi,
            'message'          => $this->isi_notifikasi,
            'status_dibaca'    => (bool) $this->status_dibaca,
            'is_read'          => (bool) $this->status_dibaca,
            'waktu_notifikasi' => $this->waktu_notifikasi?->toIso8601String(),
            'created_at'       => $this->waktu_notifikasi?->toIso8601String(),
        ];
    }
}
