<?php

namespace App\Http\Requests\Cultivation;

use Illuminate\Foundation\Http\FormRequest;

class StoreHarvestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tanggal_panen'       => ['required_without:harvest_date', 'date'],
            'harvest_date'        => ['required_without:tanggal_panen', 'date'],
            'jumlah_panen'        => ['required_without:quantity', 'integer', 'min:1'],
            'quantity'            => ['required_without:jumlah_panen', 'integer', 'min:1'],
            'berat_panen'         => ['nullable', 'numeric', 'min:0'],
            'berat_total_kg'      => ['nullable', 'numeric', 'min:0'],
            'total_weight_kg'     => ['nullable', 'numeric', 'min:0'],
            'kondisi_hasil_panen' => ['nullable', 'string', 'max:50'],
            'kualitas'            => ['nullable', 'string', 'max:50'],
            'quality'             => ['nullable', 'string', 'max:50'],
            'catatan'             => ['nullable', 'string'],
            'notes'               => ['nullable', 'string'],
        ];
    }
}
