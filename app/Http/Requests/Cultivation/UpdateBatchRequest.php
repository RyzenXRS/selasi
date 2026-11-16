<?php

namespace App\Http\Requests\Cultivation;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kode_pengelolaan'    => ['sometimes', 'string', 'max:50'],
            'batch_code'          => ['sometimes', 'string', 'max:50'],
            'tanggal_tanam'       => ['sometimes', 'date'],
            'seed_date'           => ['sometimes', 'date'],
            'jumlah_tanaman'      => ['sometimes', 'integer', 'min:1'],
            'plant_quantity'      => ['sometimes', 'integer', 'min:1'],
            'lokasi'              => ['nullable', 'string', 'max:100'],
            'location'            => ['nullable', 'string', 'max:100'],
            'kondisi_tanaman'     => ['nullable', 'string'],
            'plant_condition'     => ['nullable', 'string'],
            'kondisi_air_nutrisi' => ['nullable', 'string'],
            'water_condition'     => ['nullable', 'string'],
            'kondisi_instalasi'   => ['nullable', 'string'],
            'installation_condition' => ['nullable', 'string'],
            'kondisi_lingkungan'  => ['nullable', 'string'],
            'environment_condition' => ['nullable', 'string'],
            'nilai_ph'            => ['nullable', 'numeric', 'between:0,14'],
            'catatan'             => ['nullable', 'string'],
            'notes'               => ['nullable', 'string'],
        ];
    }
}
