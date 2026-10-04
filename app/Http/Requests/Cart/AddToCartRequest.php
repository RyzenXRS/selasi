<?php

namespace App\Http\Requests\Cart;

use Illuminate\Foundation\Http\FormRequest;

class AddToCartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_produk'  => ['required_without:product_id', 'integer', 'exists:produk,id_produk'],
            'product_id' => ['required_without:id_produk', 'integer', 'exists:produk,id_produk'],
            'jumlah'     => ['required_without:quantity', 'integer', 'min:1'],
            'quantity'   => ['required_without:jumlah', 'integer', 'min:1'],
        ];
    }
}
