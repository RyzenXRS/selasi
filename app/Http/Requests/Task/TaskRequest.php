<?php

namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;

class TaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('put') || $this->isMethod('patch');
        return [
            'id_pengelolaan' => ['nullable', 'exists:pengelolaan,id_pengelolaan'],
            'batch_id'       => ['nullable', 'exists:pengelolaan,id_pengelolaan'],
            'nama_tugas'     => [$isUpdate ? 'nullable' : 'required_without:title', 'string', 'max:150'],
            'title'          => [$isUpdate ? 'nullable' : 'required_without:nama_tugas', 'string', 'max:150'],
            'tanggal_tugas'  => ['nullable', 'date'],
            'task_date'      => ['nullable', 'date'],
            'status'         => ['nullable'],
        ];
    }

    public function messages(): array
    {
        return [
            'nama_tugas.required_without' => 'Nama kegiatan wajib diisi.',
            'title.required_without'      => 'Nama kegiatan wajib diisi.',
            'nama_tugas.max'              => 'Nama kegiatan maksimal 150 karakter.',
            'id_pengelolaan.exists'       => 'Batch pengelolaan yang dipilih tidak ditemukan.',
        ];
    }
}
