<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\FaseBudidaya;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class FaseBudidayaController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $fases = FaseBudidaya::orderBy('urutan_fase', 'asc')->get();

        return $this->successResponse(
            $fases,
            'Daftar master fase budidaya berhasil diambil.'
        );
    }
}
