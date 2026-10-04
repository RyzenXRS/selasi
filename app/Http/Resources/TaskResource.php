<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_todo'        => $this->id_todo,
            'id'             => $this->id_todo,
            'id_pembudidaya' => $this->id_pembudidaya,
            'user_id'        => $this->id_pembudidaya,
            'id_pengelolaan' => $this->id_pengelolaan,
            'batch_id'       => $this->id_pengelolaan,
            'nama_tugas'     => $this->nama_tugas,
            'title'          => $this->nama_tugas,
            'tanggal_tugas'  => $this->tanggal_tugas?->format('Y-m-d'),
            'task_date'      => $this->tanggal_tugas?->format('Y-m-d'),
            'status'         => (bool) $this->status,
            'created_at'     => $this->created_at?->toIso8601String(),
        ];
    }
}
