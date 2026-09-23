<?php

namespace Tests\Feature;

use App\Models\CultivationBatch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CultivationTest extends TestCase
{
    use RefreshDatabase;

    protected User $cultivator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cultivator = User::factory()->create(['role' => 'cultivator']);
    }

    public function test_cultivator_can_create_cultivation_batch(): void
    {
        $response = $this->actingAs($this->cultivator, 'sanctum')
            ->postJson('/api/v1/batches', [
                'seed_date' => '2026-09-01',
                'plant_quantity' => 200,
                'current_phase' => 'Semai',
                'location' => 'Greenhouse A - Rak 1',
                'notes' => 'Varietas Romaine Super',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.current_phase', 'Semai')
            ->assertJsonPath('data.plant_quantity', 200);

        $this->assertDatabaseHas('cultivation_batches', [
            'user_id' => $this->cultivator->id,
            'current_phase' => 'Semai',
        ]);
    }

    public function test_cultivator_can_add_daily_check(): void
    {
        $batch = CultivationBatch::create([
            'user_id' => $this->cultivator->id,
            'batch_code' => 'BATCH-TEST-001',
            'seed_date' => '2026-09-01',
            'plant_quantity' => 200,
            'current_phase' => 'Vegetatif',
        ]);

        $response = $this->actingAs($this->cultivator, 'sanctum')
            ->postJson("/api/v1/batches/{$batch->id}/checks", [
                'check_date' => '2026-09-10',
                'plant_condition' => 'sangat_baik',
                'water_ph' => 6.2,
                'tds_ppm' => 950,
                'temperature' => 26.5,
                'installation_condition' => 'baik',
                'notes' => 'Ph & TDS optimal',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.water_ph', 6.2)
            ->assertJsonPath('data.tds_ppm', 950);

        $this->assertDatabaseHas('cultivation_checks', [
            'batch_id' => $batch->id,
            'tds_ppm' => 950,
        ]);
    }

    public function test_cultivator_can_record_harvest(): void
    {
        $batch = CultivationBatch::create([
            'user_id' => $this->cultivator->id,
            'batch_code' => 'BATCH-TEST-002',
            'seed_date' => '2026-08-10',
            'plant_quantity' => 150,
            'current_phase' => 'Panen',
        ]);

        $response = $this->actingAs($this->cultivator, 'sanctum')
            ->postJson("/api/v1/batches/{$batch->id}/harvests", [
                'harvest_date' => '2026-09-20',
                'quantity' => 145,
                'weight' => 29000.00, // 29 kg
                'condition' => 'sangat_baik',
                'notes' => 'Panen melimpah',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.quantity', 145);

        $this->assertDatabaseHas('cultivation_batches', [
            'id' => $batch->id,
            'status' => 'harvested',
        ]);
    }
}
