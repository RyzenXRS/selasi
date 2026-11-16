<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'                 => ['required', 'string', 'email', 'exists:pengguna,email'],
            'token'                 => ['nullable', 'string'],
            'kode'                  => ['nullable', 'string'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string', 'min:8'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required'                 => 'Email wajib diisi.',
            'email.email'                    => 'Format email tidak valid.',
            'email.exists'                   => 'Email tidak terdaftar di sistem.',
            'password.required'              => 'Password baru wajib diisi.',
            'password.min'                   => 'Password minimal harus 8 karakter.',
            'password.confirmed'             => 'Konfirmasi password tidak cocok.',
            'password_confirmation.required' => 'Konfirmasi password wajib diisi.',
        ];
    }
}

