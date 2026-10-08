<?php

namespace App\Services;

use App\Models\Pengguna;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function register(array $data): array
    {
        $roleInput = strtoupper($data['role']);
        $role = ($roleInput === 'BUYER' || $roleInput === 'PEMBELI')
            ? Pengguna::PERAN_PEMBELI
            : Pengguna::PERAN_PEMBUDIDAYA;

        $pengguna = Pengguna::create([
            'nama'          => $data['nama'] ?? $data['name'] ?? 'User',
            'email'         => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'role'          => $role,
            'no_telepon'    => $data['no_telepon'] ?? $data['phone'] ?? null,
            'foto_profil'   => null,
            'created_at'    => Carbon::now(),
            'updated_at'    => Carbon::now(),
        ]);

        $token = $pengguna->createToken('auth_token')->plainTextToken;

        return [
            'user'  => $pengguna,
            'token' => $token,
        ];
    }

    public function login(array $credentials): array
    {
        $pengguna = Pengguna::where('email', $credentials['email'])->first();

        if (!$pengguna || !Hash::check($credentials['password'], $pengguna->password_hash)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial yang diberikan tidak cocok dengan catatan kami.'],
            ]);
        }

        $token = $pengguna->createToken('auth_token')->plainTextToken;

        return [
            'user'  => $pengguna,
            'token' => $token,
        ];
    }

    public function logout(Pengguna $pengguna): void
    {
        $pengguna->currentAccessToken()?->delete();
    }

    public function updateProfile(Pengguna $pengguna, array $data): Pengguna
    {
        $payload = [];

        if (isset($data['nama']) || isset($data['name'])) {
            $payload['nama'] = $data['nama'] ?? $data['name'];
        }

        if (isset($data['email'])) {
            $payload['email'] = $data['email'];
        }

        if (isset($data['no_telepon']) || isset($data['phone'])) {
            $payload['no_telepon'] = $data['no_telepon'] ?? $data['phone'];
        }

        $photo = $data['foto_profil'] ?? $data['profile_photo'] ?? null;
        if ($photo && is_object($photo) && method_exists($photo, 'store')) {
            if ($pengguna->foto_profil) {
                Storage::disk('public')->delete($pengguna->foto_profil);
            }
            $payload['foto_profil'] = $photo->store('profiles', 'public');
        }

        if (isset($data['password']) && !empty($data['password'])) {
            $payload['password_hash'] = Hash::make($data['password']);
        }

        $payload['updated_at'] = Carbon::now();

        $pengguna->update($payload);

        return $pengguna->fresh();
    }
}
