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
            'tanggal_tugas'  => [$isUpdate ? 'nullable' : 'required_without:task_date', 'date'],
            'task_date'      => [$isUpdate ? 'nullable' : 'required_without:tanggal_tugas', 'date'],
            'status'         => ['nullable'],
        ];
    }
}
