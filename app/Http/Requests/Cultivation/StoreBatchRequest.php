<?php

namespace App\Http\Requests\Cultivation;

use Illuminate\Foundation\Http\FormRequest;

class StoreBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kode_pengelolaan'    => ['nullable', 'string', 'max:50', 'unique:pengelolaan,kode_pengelolaan'],
            'batch_code'          => ['nullable', 'string', 'max:50', 'unique:pengelolaan,kode_pengelolaan'],
            'tanggal_tanam'       => ['required_without:seed_date', 'date'],
            'seed_date'           => ['required_without:tanggal_tanam', 'date'],
            'jumlah_tanaman'      => ['required_without:plant_quantity', 'integer', 'min:1'],
            'plant_quantity'      => ['required_without:jumlah_tanaman', 'integer', 'min:1'],
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
