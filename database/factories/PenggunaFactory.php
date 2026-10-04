<?php

namespace Database\Factories;

use App\Models\Pengguna;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Pengguna>
 */
class PenggunaFactory extends Factory
{
    protected $model = Pengguna::class;
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'nama'          => fake()->name(),
            'email'         => fake()->unique()->safeEmail(),
            'password_hash' => static::$password ??= Hash::make('password123'),
            'role'          => Pengguna::PERAN_PEMBUDIDAYA,
            'no_telepon'    => fake()->phoneNumber(),
            'foto_profil'   => null,
            'created_at'    => Carbon::now(),
            'updated_at'    => Carbon::now(),
        ];
    }
}
