<<<<<<< HEAD
# ⚡ SPK: Hybrid AHP-SAW (Analytic Hierarchy Process & Simple Additive Weighting)

Repositori ini berisi *source code* lengkap untuk aplikasi **Sistem Pendukung Keputusan (SPK)** berbasis web dengan arsitektur modern (*decoupled*). Sistem ini mengintegrasikan metode **AHP** untuk kalibrasi bobot kriteria yang konsisten, dan **SAW** untuk evaluasi serta pemeringkatan alternatif secara efisien.

Aplikasi ini dikembangkan khusus sebagai modul praktikum mata kuliah Sistem Pendukung Keputusan untuk memfasilitasi pemahaman mahasiswa terhadap implementasi algoritma *Multi-Criteria Decision Making* (MCDM) ke dalam rekayasa perangkat lunak nyata.

## 🛠️ Teknologi yang Digunakan
* **Backend (Mesin Komputasi):** Python 3, FastAPI, SQLAlchemy, Pandas.
* **Database:** SQLite (Relasional).
* **Frontend (Antarmuka Pengguna):** React.js (Vite), Axios, Recharts (Visualisasi), KaTeX (Render Rumus Matematika).

---

## 🚀 Fitur Utama
1. **Manajemen Data & ETL (Extract, Transform, Load):** Mendukung input manual maupun unggah matriks Excel/CSV massal. Dilengkapi fitur transformasi dinamis (Mapping Teks Likert/Biner dan Binning rentang angka).
2. **Kalibrasi Bobot (AHP):** Menghitung *Eigenvector* dari perbandingan berpasangan (Skala Saaty 1-9) dan memvalidasi rasio konsistensi (*Consistency Ratio* / CR $\le$ 0.10).
3. **Evaluasi & Pemeringkatan (SAW):** Merangking alternatif menggunakan bobot AHP yang tervalidasi dengan tiga pilihan normalisasi (Linear Klasik, Min-Max, dan Sum Proporsi).
4. **Modul Akademik Interaktif:** Berisi panduan dan rumus matematis metode Hybrid AHP-SAW yang dirender menggunakan standar format LaTeX.

---

## 💻 Panduan Instalasi & Menjalankan Aplikasi

Aplikasi ini terdiri dari dua sistem yang harus dinyalakan secara bersamaan melalui dua jendela terminal yang berbeda. Pastikan perangkat Anda sudah terinstal **Python (minimal v3.8)** dan **Node.js (minimal v18)**.

### Bagian 1: Menyalakan Backend (API & Database)
1. Buka terminal dan masuk ke direktori backend:
   ```bash
   cd backend

Instal semua library Python yang dibutuhkan:

pip install -r requirements.txt
Nyalakan server komputasi FastAPI:

uvicorn main:app --reload
(Server backend akan berjalan di http://127.0.0.1:8000. Biarkan terminal ini tetap terbuka).

Bagian 2: Menyalakan Frontend (Antarmuka React)
Buka terminal baru dan masuk ke direktori frontend:

cd frontend
Unduh semua pustaka Node Modules:

npm install
Nyalakan server antarmuka:

npm run dev
Buka browser Anda dan kunjungi tautan lokal yang muncul (biasanya http://localhost:5173).

Hak Cipta © 2026 Ahmad Fauzi. Dokumentasi ini disusun sebagai artefak implementasi teknis untuk pembelajaran Sistem Pendukung Keputusan.
=======
# SPK-Beasiswa
>>>>>>> dd22b4804a10cb1c0e158c120f62c1022c822e15
