<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FaseBudidayaSeeder extends Seeder
{
    /**
     * Seed data master fase budidaya selada hidroponik.
     * Urutan fase: Semai → Vegetatif → Pendewasaan → Panen
     */
    public function run(): void
    {
        $fases = [
            ['nama_fase' => 'Semai',       'urutan_fase' => 1],
            ['nama_fase' => 'Vegetatif',   'urutan_fase' => 2],
            ['nama_fase' => 'Pendewasaan', 'urutan_fase' => 3],
            ['nama_fase' => 'Panen',       'urutan_fase' => 4],
        ];

        foreach ($fases as $fase) {
            DB::table('fase_budidaya')->updateOrInsert(
                ['nama_fase' => $fase['nama_fase']],
                $fase
            );
        }
    }
}
