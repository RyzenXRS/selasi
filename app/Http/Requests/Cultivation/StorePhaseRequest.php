<?php

namespace App\Http\Requests\Cultivation;

use Illuminate\Foundation\Http\FormRequest;

class StorePhaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_fase'         => ['required', 'integer', 'exists:fase_budidaya,id_fase'],
            'tanggal_mulai'   => ['required', 'date'],
            'tanggal_selesai' => ['nullable', 'date'],
            'catatan'         => ['nullable', 'string'],
            'notes'           => ['nullable', 'string'],
        ];
    }
}
