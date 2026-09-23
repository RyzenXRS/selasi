<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected DashboardService $dashboardService
    ) {}

    public function cultivator(Request $request): JsonResponse
    {
        $data = $this->dashboardService->getCultivatorDashboard($request->user());

        return $this->successResponse($data, 'Dashboard pembudidaya berhasil diambil.');
    }

    public function buyer(Request $request): JsonResponse
    {
        $data = $this->dashboardService->getBuyerDashboard($request->user());

        return $this->successResponse($data, 'Dashboard pembeli berhasil diambil.');
    }
}
