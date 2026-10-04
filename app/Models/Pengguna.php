<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Pengguna extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'pengguna';
    protected $primaryKey = 'id_pengguna';
    public $timestamps = false; // kolom managed manual (created_at/updated_at datetime biasa)

    public const PERAN_PEMBUDIDAYA = 'PEMBUDIDAYA';
    public const PERAN_PEMBELI = 'PEMBELI';

    protected $fillable = [
        'nama',
        'email',
        'password_hash',
        'no_telepon',
        'role',
        'foto_profil',
        'created_at',
        'updated_at',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    /**
     * Override kolom password default Laravel Sanctum
     */
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function adalahPembudidaya(): bool
    {
        return $this->role === self::PERAN_PEMBUDIDAYA;
    }

    public function adalahPembeli(): bool
    {
        return $this->role === self::PERAN_PEMBELI;
    }

    // ==================== Relasi ====================

    public function pengelolaan(): HasMany
    {
        return $this->hasMany(Pengelolaan::class, 'id_pembudidaya', 'id_pengguna');
    }

    public function todoList(): HasMany
    {
        return $this->hasMany(ToDo::class, 'id_pembudidaya', 'id_pengguna');
    }

    public function produk(): HasMany
    {
        return $this->hasMany(Produk::class, 'id_pembudidaya', 'id_pengguna');
    }

    public function keranjang(): HasOne
    {
        return $this->hasOne(Keranjang::class, 'id_pembeli', 'id_pengguna');
    }

    public function pesananSebagaiPembeli(): HasMany
    {
        return $this->hasMany(Pesanan::class, 'id_pembeli', 'id_pengguna');
    }

    public function ulasan(): HasMany
    {
        return $this->hasMany(Ulasan::class, 'id_pembeli', 'id_pengguna');
    }

    public function notifikasi(): HasMany
    {
        return $this->hasMany(Notifikasi::class, 'id_pengguna', 'id_pengguna');
    }

    public function prediksiPermintaan(): HasMany
    {
        return $this->hasMany(PrediksiPermintaan::class, 'id_pembudidaya', 'id_pengguna');
    }
}
