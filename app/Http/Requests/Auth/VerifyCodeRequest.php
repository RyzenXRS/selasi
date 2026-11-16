<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class VerifyCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'exists:pengguna,email'],
            'kode'  => ['required', 'string', 'size:6'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Email wajib diisi.',
            'email.email'    => 'Format email tidak valid.',
            'email.exists'   => 'Email tidak terdaftar di sistem.',
            'kode.required'  => 'Kode verifikasi wajib diisi.',
            'kode.size'      => 'Kode verifikasi harus 6 digit.',
        ];
    }
}

