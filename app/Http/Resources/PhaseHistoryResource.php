<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PhaseHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_perpindahan'  => $this->id_perpindahan,
            'id'              => $this->id_perpindahan,
            'id_pengelolaan'  => $this->id_pengelolaan,
            'batch_id'        => $this->id_pengelolaan,
            'id_fase'         => $this->id_fase,
            'fase'            => $this->fase?->nama_fase,
            'tanggal_mulai'   => $this->tanggal_mulai?->format('Y-m-d'),
            'tanggal_selesai' => $this->tanggal_selesai?->format('Y-m-d'),
            'catatan'         => $this->catatan,
            'notes'           => $this->catatan,
        ];
    }
}
