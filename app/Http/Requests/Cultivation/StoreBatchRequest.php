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
            'kode_pengelolaan'    => ['nullable', 'string', 'min:3', 'max:50', 'regex:/^[A-Za-z0-9_-]+$/', 'unique:pengelolaan,kode_pengelolaan'],
            'batch_code'          => ['nullable', 'string', 'min:3', 'max:50', 'regex:/^[A-Za-z0-9_-]+$/', 'unique:pengelolaan,kode_pengelolaan'],
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
            'water_ph'            => ['nullable', 'numeric', 'between:0,14'],
            'suhu'                => ['nullable', 'numeric', 'between:-10,60'],
            'temperature'         => ['nullable', 'numeric', 'between:-10,60'],
            'catatan'             => ['nullable', 'string'],
            'notes'               => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'kode_pengelolaan.regex'  => 'Format kode batch tidak sesuai. Gunakan huruf, angka, dan tanda hubung (contoh: SLD-001 atau BATCH-001).',
            'kode_pengelolaan.unique' => 'Kode batch sudah digunakan. Silakan gunakan kode lain atau buat otomatis.',
            'batch_code.regex'        => 'Format kode batch tidak sesuai. Gunakan huruf, angka, dan tanda hubung (contoh: SLD-001 atau BATCH-001).',
            'batch_code.unique'       => 'Kode batch sudah digunakan. Silakan gunakan kode lain atau buat otomatis.',
            'tanggal_tanam.required'  => 'Tanggal tanam wajib diisi.',
            'jumlah_tanaman.required' => 'Jumlah tanaman wajib diisi.',
            'jumlah_tanaman.min'      => 'Jumlah tanaman minimal 1.',
            'nilai_ph.between'        => 'Nilai pH harus berada di antara 0 sampai 14.',
            'suhu.between'            => 'Suhu harus berada dalam rentang valid (-10°C sampai 60°C).',
        ];
    }
}
