<?php

namespace Tests\Feature;

use App\Models\Pengguna;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_as_cultivator(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name'                  => 'Petani Selada',
            'email'                 => 'cultivator@lettuce.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'role'                  => 'cultivator',
            'phone'                 => '08123456789',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => ['id', 'nama', 'email', 'role'],
                    'token',
                    'token_type',
                ],
            ]);

        $this->assertDatabaseHas('pengguna', [
            'email' => 'cultivator@lettuce.com',
            'role'  => Pengguna::PERAN_PEMBUDIDAYA,
        ]);
    }

    public function test_user_can_register_as_buyer(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'nama'                  => 'Pembeli Selada',
            'email'                 => 'buyer@lettuce.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
            'role'                  => 'buyer',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', Pengguna::PERAN_PEMBELI);
    }

    public function test_user_can_login(): void
    {
        $user = Pengguna::factory()->create([
            'email'         => 'test@lettuce.com',
            'password_hash' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email'    => 'test@lettuce.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => ['user', 'token'],
            ]);
    }

    public function test_authenticated_user_can_get_profile(): void
    {
        $user = Pengguna::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/profile');

        $response->assertStatus(200)
            ->assertJsonPath('data.email', $user->email);
    }
}
