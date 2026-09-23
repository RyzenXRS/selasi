<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cultivation\StorePhaseRequest;
use App\Http\Resources\PhaseHistoryResource;
use App\Models\CultivationBatch;
use App\Models\PhaseHistory;
use App\Services\CultivationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PhaseHistoryController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CultivationService $cultivationService
    ) {}

    public function index(Request $request, int $batchId): JsonResponse
    {
        $batch = CultivationBatch::where('user_id', $request->user()->id)->findOrFail($batchId);

        $phases = $batch->phaseHistories()
            ->orderBy('moved_date', 'desc')
            ->get();

        return $this->successResponse(
            PhaseHistoryResource::collection($phases),
            'Riwayat perpindahan fase berhasil diambil.'
        );
    }

    public function store(StorePhaseRequest $request, int $batchId): JsonResponse
    {
        $batch = CultivationBatch::where('user_id', $request->user()->id)->findOrFail($batchId);

        $phase = $this->cultivationService->changePhase($batch, $request->validated());

        return $this->createdResponse(
            new PhaseHistoryResource($phase),
            'Perpindahan fase tanaman berhasil dicatat.'
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $phase = PhaseHistory::whereHas('batch', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($id);

        return $this->successResponse(
            new PhaseHistoryResource($phase),
            'Detail riwayat fase berhasil diambil.'
        );
    }

    public function update(StorePhaseRequest $request, int $id): JsonResponse
    {
        $phase = PhaseHistory::whereHas('batch', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($id);

        $phase->update($request->validated());

        return $this->successResponse(
            new PhaseHistoryResource($phase->fresh()),
            'Data perpindahan fase berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $phase = PhaseHistory::whereHas('batch', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($id);

        $phase->delete();

        return $this->noContentResponse('Riwayat perpindahan fase berhasil dihapus.');
    }
}
