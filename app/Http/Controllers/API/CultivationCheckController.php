<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cultivation\StoreCheckRequest;
use App\Http\Resources\CultivationCheckResource;
use App\Models\CultivationBatch;
use App\Models\CultivationCheck;
use App\Services\CultivationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CultivationCheckController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CultivationService $cultivationService
    ) {}

    public function index(Request $request, int $batchId): JsonResponse
    {
        $batch = CultivationBatch::where('user_id', $request->user()->id)->findOrFail($batchId);

        $checks = $batch->checks()
            ->orderBy('check_date', 'desc')
            ->paginate($request->get('per_page', 15));

        return $this->paginatedResponse(
            CultivationCheckResource::collection($checks),
            'Data monitoring harian berhasil diambil.'
        );
    }

    public function store(StoreCheckRequest $request, int $batchId): JsonResponse
    {
        $batch = CultivationBatch::where('user_id', $request->user()->id)->findOrFail($batchId);

        $check = $this->cultivationService->addCheck($batch, $request->validated());

        return $this->createdResponse(
            new CultivationCheckResource($check),
            'Data monitoring harian berhasil ditambahkan.'
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $check = CultivationCheck::whereHas('batch', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($id);

        return $this->successResponse(
            new CultivationCheckResource($check),
            'Detail monitoring harian berhasil diambil.'
        );
    }

    public function update(StoreCheckRequest $request, int $id): JsonResponse
    {
        $check = CultivationCheck::whereHas('batch', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($id);

        $check->update($request->validated());

        return $this->successResponse(
            new CultivationCheckResource($check->fresh()),
            'Data monitoring harian berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $check = CultivationCheck::whereHas('batch', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($id);

        $check->delete();

        return $this->noContentResponse('Data monitoring harian berhasil dihapus.');
    }
}
