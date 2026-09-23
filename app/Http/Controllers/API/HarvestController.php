<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cultivation\StoreHarvestRequest;
use App\Http\Resources\HarvestResource;
use App\Models\CultivationBatch;
use App\Models\Harvest;
use App\Services\CultivationService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HarvestController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CultivationService $cultivationService
    ) {}

    public function index(Request $request, int $batchId): JsonResponse
    {
        $batch = CultivationBatch::where('user_id', $request->user()->id)->findOrFail($batchId);

        $harvests = $batch->harvests()
            ->orderBy('harvest_date', 'desc')
            ->get();

        return $this->successResponse(
            HarvestResource::collection($harvests),
            'Data panen berhasil diambil.'
        );
    }

    public function store(StoreHarvestRequest $request, int $batchId): JsonResponse
    {
        $batch = CultivationBatch::where('user_id', $request->user()->id)->findOrFail($batchId);

        $harvest = $this->cultivationService->recordHarvest($batch, $request->validated());

        return $this->createdResponse(
            new HarvestResource($harvest),
            'Data panen berhasil dicatat.'
        );
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $harvest = Harvest::whereHas('batch', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($id);

        return $this->successResponse(
            new HarvestResource($harvest),
            'Detail panen berhasil diambil.'
        );
    }

    public function update(StoreHarvestRequest $request, int $id): JsonResponse
    {
        $harvest = Harvest::whereHas('batch', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($id);

        $harvest->update($request->validated());

        return $this->successResponse(
            new HarvestResource($harvest->fresh()),
            'Data panen berhasil diperbarui.'
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $harvest = Harvest::whereHas('batch', function ($q) use ($request) {
            $q->where('user_id', $request->user()->id);
        })->findOrFail($id);

        $harvest->delete();

        return $this->noContentResponse('Data panen berhasil dihapus.');
    }
}
