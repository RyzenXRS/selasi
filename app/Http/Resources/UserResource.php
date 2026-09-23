<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'role' => $this->role,
            'profile_photo' => $this->profile_photo ? asset('storage/' . $this->profile_photo) : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
