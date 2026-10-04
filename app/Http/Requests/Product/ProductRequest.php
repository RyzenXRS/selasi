<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');

        return [
            'nama_produk'   => [$isUpdate ? 'nullable' : 'required_without:name', 'string', 'max:100'],
            'name'          => [$isUpdate ? 'nullable' : 'required_without:nama_produk', 'string', 'max:100'],
            'deskripsi'     => ['nullable', 'string'],
            'description'   => ['nullable', 'string'],
            'harga'         => [$isUpdate ? 'nullable' : 'required_without:price', 'numeric', 'min:0'],
            'price'         => [$isUpdate ? 'nullable' : 'required_without:harga', 'numeric', 'min:0'],
            'foto_produk'   => ['nullable'],
            'image'         => ['nullable'],
            'status_produk' => ['nullable'],
            'status'        => ['nullable'],
            'jumlah_stok'   => ['nullable', 'numeric', 'min:0'],
            'stock'         => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
