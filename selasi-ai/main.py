from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import joblib
import pandas as pd
import os
import uvicorn

app = FastAPI(
    title="Selasi AI — Prediksi Panen",
    description="API prediksi sisa hari panen selada hidroponik menggunakan Gradient Boosting Regressor",
    version="1.0.0"
)

# Konfigurasi CORS lengkap
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model saat server start
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model_panen.pkl")
try:
    model = joblib.load(MODEL_PATH)
    print("✅ Model berhasil dimuat:", MODEL_PATH)
except Exception as e:
    print("❌ Gagal memuat model:", e)
    model = None

# Schema input — sesuai fitur dataset training
class InputPrediksi(BaseModel):
    umur_tanaman_hari: int = Field(..., ge=21, le=55, description="Umur tanaman saat ini (hari ke-21 s/d 55)")
    jumlah_tanaman: int = Field(..., ge=1, le=500, description="Jumlah tanaman dalam batch")
    nilai_ppm: int = Field(..., ge=200, le=1500, description="Nilai PPM nutrisi larutan")
    nilai_ph: float = Field(..., ge=4.0, le=8.0, description="Nilai pH larutan")
    suhu: float = Field(..., ge=15.0, le=40.0, description="Suhu lingkungan (°C)")
    kondisi_tanaman: str = Field(..., description="sehat | pertumbuhan_lambat | daun_menguning | layu | kutilang")
    kondisi_instalasi: str = Field(..., description="normal | terganggu | rusak")
    kondisi_cuaca: str = Field(..., description="cerah | berawan | mendung | hujan")

    @field_validator("kondisi_tanaman")
    @classmethod
    def validasi_tanaman(cls, v: str) -> str:
        valid = ["sehat", "pertumbuhan_lambat", "daun_menguning", "layu", "kutilang"]
        if v not in valid:
            raise ValueError(f"kondisi_tanaman harus salah satu dari: {valid}")
        return v

    @field_validator("kondisi_instalasi")
    @classmethod
    def validasi_instalasi(cls, v: str) -> str:
        valid = ["normal", "terganggu", "rusak"]
        if v not in valid:
            raise ValueError(f"kondisi_instalasi harus salah satu dari: {valid}")
        return v

    @field_validator("kondisi_cuaca")
    @classmethod
    def validasi_cuaca(cls, v: str) -> str:
        valid = ["cerah", "berawan", "mendung", "hujan"]
        if v not in valid:
            raise ValueError(f"kondisi_cuaca harus salah satu dari: {valid}")
        return v


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Selasi AI Prediksi Panen berjalan.",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    return {
        "model_loaded": model is not None,
        "model_path": MODEL_PATH
    }


@app.post("/predict")
def prediksi(data: InputPrediksi):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model belum dimuat. Pastikan file model_panen.pkl tersedia."
        )

    # Buat DataFrame sesuai urutan kolom saat training
    df = pd.DataFrame([{
        "umur_tanaman_hari":  data.umur_tanaman_hari,
        "jumlah_tanaman":     data.jumlah_tanaman,
        "nilai_ppm":          data.nilai_ppm,
        "nilai_ph":           data.nilai_ph,
        "suhu":               data.suhu,
        "kondisi_tanaman":    data.kondisi_tanaman,
        "kondisi_instalasi":  data.kondisi_instalasi,
        "kondisi_cuaca":      data.kondisi_cuaca,
    }])

    sisa_hari = float(model.predict(df)[0])
    sisa_hari = max(0, round(sisa_hari))
    estimasi_total = data.umur_tanaman_hari + sisa_hari

    if estimasi_total < 45:
        status = "Belum Siap"
        keterangan = f"Tanaman diperkirakan siap panen dalam {sisa_hari} hari lagi (estimasi umur total ~{estimasi_total} hari, rentang ideal 45-55 hari)."
    elif estimasi_total <= 55:
        status = "Siap Panen"
        keterangan = f"Tanaman diperkirakan siap panen dalam {sisa_hari} hari lagi (estimasi umur total ~{estimasi_total} hari — dalam rentang ideal 45-55 hari)."
    else:
        status = "Segera Panen"
        keterangan = f"Tanaman sudah melewati batas ideal. Estimasi umur total ~{estimasi_total} hari. Segera lakukan panen."

    return {
        "sisa_hari_panen":    sisa_hari,
        "estimasi_total_umur": estimasi_total,
        "rentang_panen":      "45 - 55 hari",
        "status_kesiapan":    status,
        "keterangan":         keterangan,
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
