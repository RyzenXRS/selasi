<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\VerifyCodeRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
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
        $email = $request->email;

        // 1. Generate kode OTP 6 digit
        $otp = str_pad((string) mt_rand(100000, 999999), 6, '0', STR_PAD_LEFT);

        // 2. Simpan OTP ke tabel password_reset_tokens
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            [
                'email'      => $email,
                'token'      => $otp,
                'created_at' => now(),
            ]
        );

        // 3. Kirim email OTP via Google Apps Script
        $scriptUrl = env('GOOGLE_SCRIPT_URL');

        $subject = 'Kode Verifikasi OTP - ' . config('app.name');
        $body    = "Halo,\n\n"
                 . "Kami menerima permintaan pengaturan ulang kata sandi untuk akun Anda di " . config('app.name') . ".\n\n"
                 . "Berikut adalah Kode Verifikasi (OTP) Anda:\n\n"
                 . "      " . $otp . "\n\n"
                 . "Kode verifikasi ini berlaku selama 15 menit. Masukkan kode ini pada halaman verifikasi aplikasi.\n"
                 . "Jangan beritahukan kode verifikasi ini kepada siapapun demi keamanan akun Anda.\n\n"
                 . "Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini.\n\n"
                 . "Salam,\n"
                 . config('app.name');

        try {
            $response = Http::timeout(20)
                ->withOptions(['allow_redirects' => true])
                ->post($scriptUrl, [
                    'to'      => $email,
                    'subject' => $subject,
                    'body'    => $body,
                ]);

            $responseBody = $response->body();
            $responseData = $response->json();
            $isHtmlError  = str_contains($responseBody, 'Halaman Tidak Ditemukan')
                         || str_contains($responseBody, 'Cannot find')
                         || str_contains($responseBody, 'errorMessage');

            $isScriptSuccess = !isset($responseData['status']) || $responseData['status'] === 'success';

            if (($response->successful() || $response->status() === 302) && !$isHtmlError && $isScriptSuccess) {
                return $this->successResponse(
                    ['email' => $email],
                    'Kode verifikasi OTP telah dikirim ke email Anda.'
                );
            }

            Log::error('Google Script email gagal', [
                'status'   => $response->status(),
                'response' => $response->body(),
            ]);

            return $this->errorResponse('Gagal mengirim email verifikasi. Coba lagi nanti.', 500);
        } catch (\Exception $e) {
            Log::error('Google Script exception', ['error' => $e->getMessage()]);
            return $this->errorResponse('Tidak bisa terhubung ke layanan email.', 500);
        }
    }

    public function verifyCode(VerifyCodeRequest $request): JsonResponse
    {
        $email = $request->email;
        $kode  = trim($request->kode);

        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        if (!$record || $record->token !== $kode) {
            return $this->errorResponse('Kode Verifikasi tidak sesuai.', 422);
        }

        if (Carbon::parse($record->created_at)->addMinutes(15)->isPast()) {
            return $this->errorResponse('Kode verifikasi telah kedaluwarsa. Silakan minta kode baru.', 422);
        }

        // Generate token reset untuk otorisasi step 3
        $resetToken = Str::random(60);
        DB::table('password_reset_tokens')
            ->where('email', $email)
            ->update([
                'token'      => $resetToken,
                'created_at' => now(),
            ]);

        return $this->successResponse([
            'token' => $resetToken,
        ], 'Kode verifikasi valid.');
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $email = $request->email;

        $record = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        if (!$record) {
            return $this->errorResponse('Permintaan reset password tidak valid atau telah kedaluwarsa.', 422);
        }

        if (Carbon::parse($record->created_at)->addMinutes(30)->isPast()) {
            return $this->errorResponse('Sesi reset password telah kedaluwarsa. Silakan minta kode baru.', 422);
        }

        $isValid = false;
        if ($request->filled('token') && $record->token === $request->token) {
            $isValid = true;
        } elseif ($request->filled('kode') && $record->token === $request->kode) {
            $isValid = true;
        }

        if (!$isValid) {
            return $this->errorResponse('Token atau kode verifikasi tidak valid.', 422);
        }

        $pengguna = Pengguna::where('email', $email)->first();
        if (!$pengguna) {
            return $this->errorResponse('Pengguna tidak ditemukan.', 404);
        }

        $pengguna->password_hash = Hash::make($request->password);
        $pengguna->updated_at = now();
        $pengguna->save();

        // Hapus token reset setelah berhasil digunakan
        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return $this->successResponse(null, 'Password berhasil diperbarui. Silakan masuk dengan password barumu.');
    }
}
