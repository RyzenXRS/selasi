<?php

namespace Tests\Feature;

use App\Models\FaseBudidaya;
use App\Models\Panen;
use App\Models\Pengelolaan;
use App\Models\Pengguna;
use Database\Seeders\FaseBudidayaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CultivationTest extends TestCase
{
    use RefreshDatabase;

    protected Pengguna $cultivator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FaseBudidayaSeeder::class);
        $this->cultivator = Pengguna::factory()->create(['role' => Pengguna::PERAN_PEMBUDIDAYA]);
    }

    public function test_cultivator_can_create_cultivation_batch(): void
    {
        $response = $this->actingAs($this->cultivator, 'sanctum')
            ->postJson('/api/v1/pengelolaan', [
                'tanggal_tanam'       => '2026-09-01',
                'jumlah_tanaman'      => 200,
                'lokasi'              => 'Greenhouse A - Rak 1',
                'kondisi_tanaman'     => 'Sangat Baik',
                'kondisi_air_nutrisi' => 'EC 1.8, pH 6.2',
                'nilai_ph'            => 6.2,
                'catatan'             => 'Varietas Romaine Super',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.jumlah_tanaman', 200);

        $this->assertDatabaseHas('pengelolaan', [
            'id_pembudidaya' => $this->cultivator->id_pengguna,
            'jumlah_tanaman' => 200,
        ]);
    }

    public function test_cultivator_can_record_phase_transition(): void
    {
        $batch = Pengelolaan::create([
            'id_pembudidaya'   => $this->cultivator->id_pengguna,
            'kode_pengelolaan' => 'BATCH-TEST-001',
            'tanggal_tanam'    => '2026-09-01',
            'jumlah_tanaman'   => 200,
            'lokasi'           => 'Meja A',
        ]);

        $fase = FaseBudidaya::first();

        $response = $this->actingAs($this->cultivator, 'sanctum')
            ->postJson("/api/v1/pengelolaan/{$batch->id_pengelolaan}/fase", [
                'id_fase'       => $fase->id_fase,
                'tanggal_mulai' => '2026-09-10',
                'catatan'       => 'Pindah ke vegetatif',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id_fase', $fase->id_fase);

        $this->assertDatabaseHas('perpindahan_fase', [
            'id_pengelolaan' => $batch->id_pengelolaan,
            'id_fase'        => $fase->id_fase,
        ]);
    }

    public function test_cultivator_can_record_harvest(): void
    {
        $batch = Pengelolaan::create([
            'id_pembudidaya'   => $this->cultivator->id_pengguna,
            'kode_pengelolaan' => 'BATCH-TEST-002',
            'tanggal_tanam'    => '2026-08-10',
            'jumlah_tanaman'   => 150,
        ]);

        $response = $this->actingAs($this->cultivator, 'sanctum')
            ->postJson("/api/v1/pengelolaan/{$batch->id_pengelolaan}/panen", [
                'tanggal_panen'  => '2026-09-20',
                'jumlah_panen'   => 145,
                'berat_total_kg' => 29.00,
                'kualitas'       => 'Sangat Baik',
                'catatan'        => 'Panen melimpah',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.jumlah_panen', 145);

        $this->assertDatabaseHas('panen', [
            'id_pengelolaan' => $batch->id_pengelolaan,
            'jumlah_panen'   => 145,
        ]);
    }
}
