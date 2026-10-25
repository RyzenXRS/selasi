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
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
            'token'                 => ['nullable', 'string'],
            'kode'                  => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required'     => 'Email wajib diisi.',
            'email.exists'       => 'Email tidak terdaftar.',
            'password.required'  => 'Password baru wajib diisi.',
            'password.min'       => 'Password minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
        ];
    }
}
