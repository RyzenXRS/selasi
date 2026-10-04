<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Task\TaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\ToDo;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class TaskController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $tasks = ToDo::where('id_pembudidaya', $request->user()->id_pengguna)
            ->when($request->has('status'), fn($q) => $q->where('status', filter_var($request->get('status'), FILTER_VALIDATE_BOOLEAN)))
            ->when($request->get('date') || $request->get('tanggal_tugas'), function ($q) use ($request) {
                $q->whereDate('tanggal_tugas', $request->get('tanggal_tugas', $request->get('date')));
            })
            ->orderBy('tanggal_tugas', 'asc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse(
            TaskResource::collection($tasks),
            'Daftar tugas harian berhasil diambil.'
        );
    }

    public function store(TaskRequest $request): JsonResponse
    {
        $task = ToDo::create([
            'id_pembudidaya' => $request->user()->id_pengguna,
            'id_pengelolaan' => $request->id_pengelolaan ?? $request->batch_id,
            'nama_tugas'     => $request->nama_tugas ?? $request->title,
            'tanggal_tugas'  => $request->tanggal_tugas ?? $request->task_date,
            'status'         => (bool) ($request->status ?? false),
            'created_at'     => Carbon::now(),
        ]);

        return $this->createdResponse(
            new TaskResource($task),
            'Tugas harian berhasil ditambahkan.'
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $task = ToDo::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($id);

        return $this->successResponse(
            new TaskResource($task),
            'Detail tugas harian berhasil diambil.'
        );
    }

    public function update(TaskRequest $request, int $id): JsonResponse
    {
        $task = ToDo::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($id);
        
        $payload = [];
        if ($request->has('nama_tugas') || $request->has('title')) {
            $payload['nama_tugas'] = $request->nama_tugas ?? $request->title;
        }
        if ($request->has('tanggal_tugas') || $request->has('task_date')) {
            $payload['tanggal_tugas'] = $request->tanggal_tugas ?? $request->task_date;
        }
        if ($request->has('id_pengelolaan') || $request->has('batch_id')) {
            $payload['id_pengelolaan'] = $request->id_pengelolaan ?? $request->batch_id;
        }
        if ($request->has('status')) {
            $payload['status'] = filter_var($request->status, FILTER_VALIDATE_BOOLEAN);
        }

        $task->update($payload);

        return $this->successResponse(
            new TaskResource($task->fresh()),
            'Tugas harian berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $task = ToDo::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($id);
        $task->delete();

        return $this->noContentResponse('Tugas harian berhasil dihapus.');
    }

    public function complete(Request $request, int $id): JsonResponse
    {
        $task = ToDo::where('id_pembudidaya', $request->user()->id_pengguna)->findOrFail($id);

        $task->update([
            'status' => true,
        ]);

        return $this->successResponse(
            new TaskResource($task->fresh()),
            'Tugas harian telah diselesaikan.'
        );
    }
}
