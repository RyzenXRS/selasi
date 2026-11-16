<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\VerifyCodeRequest;
use App\Http\Resources\UserResource;
use App\Models\Pengguna;
use App\Services\AuthService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected AuthService $authService
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return $this->createdResponse([
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
            'token_type' => 'Bearer',
        ], 'Registrasi akun berhasil.');
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->validated());

        return $this->successResponse([
            'user' => new UserResource($result['user']),
            'token' => $result['token'],
            'token_type' => 'Bearer',
        ], 'Login berhasil.');
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return $this->successResponse(null, 'Logout berhasil.');
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $kode = (string) random_int(100000, 999999);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            [
                'token'      => $kode,
                'created_at' => Carbon::now(),
            ]
        );

        $scriptUrl = env('GOOGLE_SCRIPT_URL');
        if ($scriptUrl) {
            try {
                Http::timeout(10)->post($scriptUrl, [
                    'to'      => $request->email,
                    'subject' => 'Kode OTP Reset Password SelaSI',
                    'body'    => "Halo,\n\nBerikut adalah kode OTP verifikasi untuk reset password akun SelaSI Anda:\n\n{$kode}\n\nKode ini berlaku selama 15 menit. Jangan bagikan kode ini kepada siapapun.\n\nJika Anda tidak meminta reset password, abaikan email ini.\n\nSalam,\nTim SelaSI",
                ]);
            } catch (\Throwable $e) {
                Log::error('Gagal mengirim email OTP via Google Apps Script: ' . $e->getMessage());
            }
        }

        return $this->successResponse([
            'email' => $request->email,
        ], 'Kode OTP telah dikirim ke email Anda.');
    }

    public function verifyCode(VerifyCodeRequest $request): JsonResponse
    {
        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('token', $request->kode)
            ->first();

        if (!$record) {
            return $this->errorResponse('Kode Verifikasi tidak sesuai', 400);
        }

        if (Carbon::parse($record->created_at)->addMinutes(15)->isPast()) {
            return $this->errorResponse('Kode verifikasi telah kedaluwarsa. Silakan minta kode baru.', 400);
        }

        $resetToken = Str::random(60);
        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->update([
                'token'      => $resetToken,
                'created_at' => Carbon::now(),
            ]);

        return $this->successResponse([
            'token' => $resetToken,
        ], 'Kode verifikasi valid.');
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $token = $request->token ?: $request->kode;
        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('token', $token)
            ->first();

        if (!$record) {
            return $this->errorResponse('Password Baru atau Konfirmasi Password tidak sesuai', 400);
        }

        if (Carbon::parse($record->created_at)->addMinutes(30)->isPast()) {
            return $this->errorResponse('Sesi reset password telah kedaluwarsa. Silakan ulangi proses pemulihan.', 400);
        }

        Pengguna::where('email', $request->email)->update([
            'password_hash' => Hash::make($request->password),
            'updated_at'    => Carbon::now(),
        ]);

        DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->delete();

        return $this->successResponse(null, 'Password berhasil diperbarui.');
    }
}
