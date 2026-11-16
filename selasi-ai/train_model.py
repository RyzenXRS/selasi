import os
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(CURRENT_DIR, "dataset_panen.csv")
MODEL_PATH = os.path.join(CURRENT_DIR, "model_panen.pkl")

print(f"Membaca dataset dari: {DATA_PATH}...")
df = pd.read_csv(DATA_PATH)

target_col = "sisa_hari_panen"
X = df.drop(columns=[target_col])
y = df[target_col]

numeric_features = ["umur_tanaman_hari", "jumlah_tanaman", "nilai_ppm", "nilai_ph", "suhu"]
categorical_features = ["kondisi_tanaman", "kondisi_instalasi", "kondisi_cuaca"]

preprocessor = ColumnTransformer(
    transformers=[
        ("num", "passthrough", numeric_features),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
    ]
)

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("regressor", GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.08,
        max_depth=4,
        random_state=42
    )),
])

print("Melatih model Gradient Boosting Regressor...")
pipeline.fit(X, y)

print(f"Menyimpan model ke {MODEL_PATH}...")
joblib.dump(pipeline, MODEL_PATH)

print("✅ SUKSES! Model model_panen.pkl berhasil dibuat langsung dengan Python lokal Anda.")