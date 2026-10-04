<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()->id_pengguna;

        return [
            'name'          => ['sometimes', 'string', 'max:100'],
            'nama'          => ['sometimes', 'string', 'max:100'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'no_telepon'    => ['nullable', 'string', 'max:20'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'foto_profil'   => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'password'      => ['nullable', 'string', 'min:8'],
        ];
    }
}
