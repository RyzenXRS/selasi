<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id_pengguna'   => $this->id_pengguna,
            'id'            => $this->id_pengguna,
            'nama'          => $this->nama,
            'name'          => $this->nama,
            'email'         => $this->email,
            'no_telepon'    => $this->no_telepon,
            'phone'         => $this->no_telepon,
            'role'          => $this->role,
            'foto_profil'   => $this->foto_profil ? asset('storage/' . $this->foto_profil) : null,
            'profile_photo' => $this->foto_profil ? asset('storage/' . $this->foto_profil) : null,
            'created_at'    => $this->created_at?->toIso8601String(),
            'updated_at'    => $this->updated_at?->toIso8601String(),
        ];
    }
}
