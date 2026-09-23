<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected AuthService $authService
    ) {}

    public function show(Request $request): JsonResponse
    {
        return $this->successResponse(
            new UserResource($request->user()),
            'Data profil berhasil diambil.'
        );
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $updatedUser = $this->authService->updateProfile(
            $request->user(),
            $request->validated()
        );

        return $this->successResponse(
            new UserResource($updatedUser),
            'Profil berhasil diperbarui.'
        );
    }
}
