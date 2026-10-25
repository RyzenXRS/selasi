<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pengelolaan', function (Blueprint $table) {
            $table->decimal('suhu', 4, 1)->nullable()->after('nilai_ph');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pengelolaan', function (Blueprint $table) {
            $table->dropColumn('suhu');
        });
    }
};
