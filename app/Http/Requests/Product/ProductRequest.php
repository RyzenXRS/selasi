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
            'name' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:255'],
            'lettuce_type' => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'price' => [$isUpdate ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'price_unit' => ['nullable', 'string', 'max:50'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'stock' => [$isUpdate ? 'sometimes' : 'required', 'integer', 'min:0'],
            'status' => ['nullable', 'string', 'in:active,inactive,out_of_stock'],
        ];
    }
}
