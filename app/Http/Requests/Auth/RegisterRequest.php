<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'        => ['nullable', 'string', 'max:100'],
            'nama'        => ['nullable', 'string', 'max:100'],
            'email'       => ['required', 'string', 'email', 'max:100', 'unique:pengguna,email'],
            'password'    => ['required', 'string', 'min:8'],
            'role'        => ['required', 'string', 'in:cultivator,buyer,PEMBUDIDAYA,PEMBELI,pembudidaya,pembeli'],
            'phone'       => ['nullable', 'string', 'max:20'],
            'no_telepon'  => ['nullable', 'string', 'max:20'],
        ];
    }
}
