# Product Requirements Document — Decision Maker Discovery

| Metadata | Nilai |
|---|---|
| Versi | **0.1 — draf awal untuk diskusi** |
| Tanggal | **9 Oktober 2026** |
| Track | Sales — Decision Maker Discovery |
| Organisasi studi kasus | PT KasirNusa Teknologi (fiktif) |
| Snapshot dataset | 1 Oktober 2026 |
| Status keputusan teknis | Jev akan diintegrasikan; database graph, framework UI, penyedia LLM, dan deployment masih terbuka |

PRD ini adalah acuan produk yang dapat direvisi bersama. Label **Wajib brief** berarti ketentuan dari [studi kasus peserta](/Users/hans/Downloads/Studi%20Kasus%20Hackathon_PESERTA.pdf); label **Rancangan tim** berarti pilihan desain yang kita buat untuk memenuhi ketentuan itu. Struktur file dan kolom ada di [README dataset](/Users/hans/Downloads/README.md) dan [kamus data](KAMUS_DATASET.md). Arsitektur logisnya ada di [layer diagram](LAYER_DIAGRAM_SISTEM.md).

## 1. Ringkasan produk

**Decision Maker Discovery** adalah sistem yang menjawab siapa yang memutuskan pembelian pada suatu prospek, mengapa orang itu diidentifikasi, siapa lagi yang memengaruhi proses, dan siapa yang perlu didekati Sales. Jawaban ditopang jalur node–relasi di *context graph* yang dapat dibuka sampai file, kolom, baris, dan tanggal sumber. Sistem memisahkan fakta langsung, identifikasi lintas sumber, kandidat, dan informasi yang belum diketahui.

Fokus demo track adalah **P01 Grup Ritel Mandala** dan **P03 Klinik Pratama Medika**. Prototipe tetap memuat dataset penuh dan menerima pertanyaan baru juri pada akun/deal lain. Jev membantu menilai teks dan kandidat dalam bentuk keputusan terstruktur; aturan aplikasi menetapkan status bukti; LLM menyampaikan penjelasan bahasa alami berdasarkan bukti yang sudah dipilih.

## 2. Masalah dan peluang

Informasi KasirNusa tersebar pada CRM, email/meeting, usage produk, support, kontrak/billing, dan log keputusan. CRM menyimpan status akhir deal tetapi alasan keputusan serta hubungan antarkontak tidak lengkap. Riwayat jabatan berubah, keputusan komersial dapat tidak konsisten, dan konteks Sales–Customer Success terputus. Situasi ini menyulitkan Sales menemukan pengambil keputusan sebenarnya dan mengambil langkah berikutnya berdasarkan bukti. **Wajib brief.**

Contoh dalam data menunjukkan mengapa satu tabel tidak cukup:

- **P01:** [email Fajar `I0343`](/Users/hans/Downloads/interactions.jsonl:343) menyatakan GM Operations yang baru bergabung memutuskan pengadaan; [profil Rina](/Users/hans/Downloads/crm_contacts.csv:18) dan [riwayat jabatan bertanggal](/Users/hans/Downloads/contact_employment_history.csv:24) mengidentifikasi Rina Hapsari sebagai pemegang peran itu. Ia **teridentifikasi lintas sumber sebagai decision maker pengadaan**. Deal bernilai [Rp252.000.000/tahun](/Users/hans/Downloads/crm_deals.csv:2).
- **P03:** [meeting `I0334`](/Users/hans/Downloads/interactions.jsonl:334) membuktikan Ratna meminta referensi pelanggan apotek. [Hanif](/Users/hans/Downloads/crm_contacts.csv:115) tercatat sebagai Direktur Klinik, tetapi sumber yang ada belum menyatakan siapa memutuskan pembelian. Decision maker **belum teridentifikasi**. Deal bernilai [Rp37.800.000/tahun](/Users/hans/Downloads/crm_deals.csv:4).

## 3. Tujuan dan ukuran keberhasilan

| Tujuan | Ukuran keberhasilan yang diuji pada prototipe |
|---|---|
| Menemukan pengambil keputusan dan stakeholder secara dapat dijelaskan | P01 menampilkan Rina sebagai decision maker melalui jalur lintas sumber; P03 tidak memaksa nama tanpa bukti. |
| Mengubah temuan menjadi tindakan Sales | Setiap akun fokus menampilkan orang yang perlu didekati, pertanyaan verifikasi, dan nilai peluang. |
| Menyatukan konteks | Minimal tiga kelompok sumber benar-benar terhubung di graph; target rancangan adalah seluruh enam kelompok dan 15 file. |
| Memakai preseden keputusan | Rekomendasi yang terkait diskon, pengecualian, atau janji fitur menunjuk log keputusan; penyimpangan dari preseden dijelaskan. |
| Siap untuk pertanyaan langsung | Pertanyaan baru dapat dijalankan pada dataset penuh, bukan hasil yang ditulis khusus untuk P01/P03. |
| Mendukung demo yang singkat | Jawaban utama, visual graph, dan sumber dapat dilihat dalam satu alur tanpa membuka CSV secara manual. |

Sesuai brief, bobot penilaian adalah kualitas graph **25%**, dampak bisnis **25%**, penalaran/explainability **20%**, eksekusi teknis **20%**, serta UX/demo **10%**; temuan lintas track dapat memperoleh bonus hingga **+5**. **Wajib brief.**

## 4. Pengguna dan pekerjaan utama

| Pengguna | Pekerjaan yang dibantu |
|---|---|
| Sales Executive | Mencari decision maker, membedakan champion/evaluator/approver, mengetahui siapa yang harus diajak bicara, dan mencatat hasil discovery baru. |
| VP Sales / pimpinan tim | Memeriksa alasan rekomendasi, potensi pendapatan, preseden keputusan, serta kasus yang perlu eskalasi. |
| Juri hackathon | Mengajukan pertanyaan baru dan memeriksa apakah jawaban serta rekomendasi memiliki jalur bukti pada graph. |
| Account Manager / Customer Success | Memberi konteks historis lintas akun, seperti hubungan Rina–C01 dan status janji yang masih terbuka. |

## 5. Definisi produk

- **Decision maker pengadaan:** pihak yang menurut bukti memiliki kewenangan memilih/memutuskan sistem untuk deal tersebut. Ini tidak otomatis sama dengan pemegang anggaran atau penandatangan kontrak.
- **Champion:** orang di organisasi prospek yang secara nyata mendukung atau mendorong solusi dalam proses internal. Kontak yang menghadiri meeting atau meminta referensi belum otomatis champion.
- **Evaluator:** orang yang menilai aspek teknis atau operasional solusi. Satu orang dapat memegang lebih dari satu peran bila ada bukti untuk masing-masing.
- **Jalur bukti:** rangkaian node dan relasi yang menghubungkan kesimpulan ke record sumber, dengan tanggal dan tipe asal (`record`, `join`, `text_claim`, `cross_source_match`).
- **Status bukti:** `teridentifikasi_langsung`, `teridentifikasi_lintas_sumber`, `kandidat`, atau `belum_teridentifikasi`. Status ini berbeda dari probabilitas atau `confidence` Jev.
- **As-of date:** tanggal acuan analisis. Jawaban default memakai snapshot 1 Oktober 2026; pertanyaan historis memakai tanggal yang diminta.

## 6. Lingkup rilis awal

### Harus ada pada prototipe

1. Memuat seluruh 15 file tanpa mengubah sumber mentah, mencatat versi/snapshot, dan mendeteksi referensi ID yang rusak.
2. Membangun graph dari minimal tiga kelompok sumber; rancangan ingest mencakup keenam kelompok agar pertanyaan lintas sumber dapat dijawab.
3. Memodelkan entitas dan relasi minimal dalam brief, termasuk hubungan kerja bertanggal dan node Keputusan.
4. Menjawab pertanyaan decision maker, champion/evaluator, jalur bukti, celah informasi, dan siapa yang perlu didekati untuk P01/P03 serta akun lain.
5. Menampilkan peta stakeholder dan graph interaktif yang memungkinkan pengguna membuka sumber per node/edge.
6. Memproses pertanyaan baru terhadap dataset penuh saat demo.
7. Memakai Jev untuk penilaian terstruktur atas teks yang relevan, dengan status bukti ditentukan oleh aturan aplikasi.
8. Menampilkan penjelasan bahasa Indonesia dari bukti graph; LLM dapat dipakai untuk pertanyaan bebas, dengan pemeriksaan nama/status/sitasi setelah generasi.
9. Menampilkan nilai peluang dalam rupiah dan konteks preseden yang relevan dari log keputusan.

### Pengembangan lanjutan yang direncanakan

- Form untuk mencatat hasil discovery Sales, memilih atau menambah kontak, dan memperbarui graph/jawaban tanpa impor ulang seluruh dataset. Ini penting untuk menutup celah P03.
- Pencarian hubungan lintas track yang lebih luas, seperti risiko pelanggan lama yang dapat memengaruhi prospek baru.
- Perbandingan beberapa jalur perkenalan dan pengukuran kualitas rekomendasi dari umpan balik Sales.

## 7. Persyaratan fungsional

| ID | Prioritas | Persyaratan | Kriteria penerimaan |
|---|---|---|---|
| **FR-01** | Wajib brief | Ingest keenam kelompok sumber dari 15 CSV/JSONL. | Seluruh file terparse; akun, kontak, deal, interaksi, usage, support, billing, dan log keputusan dapat dicari pada dataset penuh. |
| **FR-02** | Wajib brief | Graph mendukung node minimal Akun, Outlet, Kontak, Karyawan, Deal, Kontrak, Interaksi, Tiket, Bug/Rilis, Fitur, Keputusan, Kompetitor. | Skema dan UI graph mengenali semua tipe; node nyata hanya dibuat saat ada record sumber. |
| **FR-03** | Wajib brief | Graph mendukung relasi minimal `BEKERJA_DI` (dengan tanggal mulai/selesai), `PERNAH_BEKERJA_DI`, `CHAMPION_DARI`, `DIPEGANG_OLEH`, `MEMBUKA_TIKET`, `DISEBABKAN_OLEH`, `MENYETUJUI`, `DIDASARKAN_PADA`, `MENJANJIKAN`, `MENYEBUT`, `SALING_KENAL`. | Relasi yang punya bukti dapat ditelusuri; sistem tidak mengisi edge hanya karena tipenya wajib dalam skema. |
| **FR-04** | Wajib brief + rancangan tim | Setiap kesimpulan/rekomendasi menyertakan jalur node–relasi dan provenance file, kolom, baris, tanggal. | Semua klaim di kartu jawaban dapat dibuka ke record pendukung; edge hasil inferensi diberi label berbeda. |
| **FR-05** | Rancangan tim | Rekonsiliasi identitas berdasarkan ID, email historis, jabatan, akun, dan masa kerja. | Perpindahan Rina dari C01 ke P01 terbaca benar pada tanggal yang ditanya; champion C01 yang tertinggal di CRM tidak diperlakukan sebagai keadaan kini. |
| **FR-06** | Wajib brief | Identifikasi decision maker dan peta stakeholder P01/P03. | P01: Rina sebagai `teridentifikasi_lintas_sumber`; P03: `belum_teridentifikasi`, Ratna sebagai kontak discovery, Hanif sebagai kandidat yang belum terbukti. |
| **FR-07** | Wajib brief | Saran orang yang perlu didekati dengan alasan dan langkah verifikasi. | P01 mengarah ke Rina melalui Fajar; P03 mengarah ke Ratna untuk menemukan jalur persetujuan. Saran menyebut bukti pendukung. |
| **FR-08** | Wajib brief | Gunakan log keputusan sebagai preseden, termasuk alasan dan status janji. | Hubungan Rina–C01–janji FEAT-07 terlihat dengan batasan bahwa dampaknya pada P01 belum terbukti; rekomendasi yang menyimpang dari preseden diberi alasan. |
| **FR-09** | Rancangan tim | Jev menjawab pertanyaan atomik pada teks/subgraph relevan dan mengembalikan `Noul`, `Choice`, atau `Score`. | Hasil penilaian tersimpan bersama versi pertanyaan/model dan record sumber; angka Jev tidak otomatis mengubah kandidat menjadi fakta. |
| **FR-10** | Rancangan tim | Aturan bukti menggabungkan graph dan penilaian Jev. | Status teridentifikasi lintas sumber mensyaratkan klaim kewenangan, kecocokan peran–akun–waktu yang unik, dan tidak ada kontradiksi; nama tanpa jalur bukti menjadi kandidat/unknown. |
| **FR-11** | Rancangan tim | LLM menjelaskan jawaban dari paket bukti yang dipilih. | Penjelasan tidak menaikkan status bukti, tidak menambah orang/fakta baru, dan seluruh sitasi/ID diverifikasi terhadap graph. Jawaban dasar tersedia bila panggilan LLM gagal. |
| **FR-12** | Wajib brief | UI menerima pertanyaan baru pada dataset penuh dan menampilkan graph. | Juri dapat memilih akun lain atau menulis variasi pertanyaan yang didukung; sistem membangun jawaban saat itu, bukan menampilkan halaman statis P01/P03. |
| **FR-13** | Rancangan tim | Pisahkan status decision maker, champion, evaluator, dan approver. | Ratna tidak berubah menjadi champion atau decision maker hanya karena meminta referensi; Fajar dapat ditunjukkan sebagai evaluator teknis. |
| **FR-14** | Rancangan tim | Simpan celah informasi dan pertanyaan lanjutan. | P03 menampilkan siapa yang belum diketahui dan pertanyaan “siapa menyetujui anggaran/menandatangani pengadaan?” |
| **FR-15** | Pengembangan lanjutan | Tambah catatan Sales lalu proses ulang bagian graph terkait. | Catatan baru yang eksplisit tentang P03 mengubah jawaban dengan jalur bukti baru; riwayat hasil sebelumnya tetap dapat diaudit. |

## 8. Alur pengguna utama

1. Pengguna mencari `P01` atau bertanya, “Siapa yang memutuskan pembelian di Grup Ritel Mandala?”
2. Sistem mengambil subgraph, interaksi, riwayat jabatan, deal, dan preseden relevan dari graph penuh.
3. Jev menilai klaim di teks yang relevan; aturan aplikasi menentukan status dan jalur bukti.
4. Kartu jawaban muncul dengan **nama/status**, alasan singkat, nilai peluang, rekomendasi pendekatan, dan pertanyaan yang masih terbuka.
5. Pengguna mengeklik jalur graph atau klaim untuk melihat file, kolom, baris, tanggal, dan teks sumber.
6. Pengguna dapat bertanya lanjut dengan tanggal atau akun lain. Pada versi lanjutan, Sales menambahkan catatan discovery dan melihat jawaban berubah.

### Pertanyaan yang harus dapat dilayani

- “Siapa decision maker dan champion P01/P03? Apa bedanya bukti masing-masing?”
- “Mengapa Fajar bukan pemutus pengadaan P01?”
- “Bagaimana sistem menemukan Rina bila namanya tidak ada di email Fajar?”
- “Siapa yang perlu ditemui Doni untuk mengetahui pemutus P03?”
- “Apa preseden atau janji lama yang terkait seseorang dalam deal ini?”
- “Siapa bekerja di akun tersebut pada tanggal tertentu?”
- “Apa yang tidak dapat disimpulkan dari dataset saat ini?”
- Pertanyaan serupa untuk akun/deal lain pada dataset penuh, termasuk variasi lintas track yang dapat dijawab dari bukti graph.

## 9. Kontrak jawaban dan aturan bukti

Keluaran internal sebelum LLM:

```text
question; account_id; as_of_date; role_requested;
answer_status; person_id_or_null; role_claim;
evidence_path[] {node_id, edge_type, source_file, record_id, column, row_number, date, origin};
model_assessments[] {question_version, model_version, answer, probabilities};
alternatives[]; unknowns[]; recommended_action; annual_value_rp; precedent_refs[]
```

Aturan keputusan:

1. **Teridentifikasi langsung:** sumber menyebut nama orang dan kewenangannya untuk pembelian/deal yang relevan.
2. **Teridentifikasi lintas sumber:** sumber menyebut peran pemutus; profil dan riwayat bertanggal menunjuk satu orang di akun tersebut tanpa kontradiksi. P01 memenuhi aturan ini.
3. **Kandidat:** jabatan atau perilaku relevan, tetapi hubungan ke kewenangan pembelian belum ada. Hanif pada P03 berada di kategori ini.
4. **Belum teridentifikasi:** bukti tidak cukup untuk memilih orang. P03 berada di kategori ini pada snapshot dataset.
5. **Champion diputuskan terpisah:** harus ada tindakan dukungan nyata; jabatan tinggi, hadir di meeting, atau meminta referensi saja tidak cukup.
6. **Ketidakpastian model terpisah:** probabilitas/confidence Jev membantu prioritas pemeriksaan tetapi tidak menggantikan jalur bukti.

## 10. Pengalaman antarmuka

**Tampilan utama:** pencarian akun dan kotak pertanyaan, kartu kesimpulan, nilai peluang, daftar stakeholder, visual graph fokus, panel bukti, serta panel “Belum diketahui / Langkah berikutnya”.

**Perilaku graph:** node yang mendukung jawaban ditonjolkan; klik edge membuka jenis relasi, tanggal berlaku, sumber, dan alasan pencocokan. Fakta langsung, klaim teks, dan pencocokan lintas sumber memakai penanda visual yang berbeda. Pengguna dapat kembali ke record mentah tanpa menebak file atau baris.

**Perilaku jawaban:** bahasa Indonesia yang ringkas, memuat status bukti di awal. Saat sumber tidak cukup, sistem memberi jawaban terbatas dan pertanyaan discovery yang konkret. Riwayat/snapshot jawaban ditampilkan agar perubahan setelah catatan baru dapat dijelaskan.

## 11. Integrasi Jev dan LLM

**Jev** menerima state kecil berupa interaksi atau subgraph kandidat dengan ID sumber yang sudah diketahui. Pertanyaan atomik menilai klaim kewenangan, sinyal evaluator/champion, kekuatan bukti, dan pilihan pertanyaan lanjutan. Jev tidak dipakai untuk menghitung angka pasti, menghubungkan ID yang eksplisit, atau mengarang kontak baru. [Dokumentasi TypeSafe](https://docs.typesafe.ai/introduction).

**LLM penjelas** menerima kesimpulan aplikasi, jalur bukti, potongan teks asli, status model, dan daftar hal yang belum diketahui. Ia menulis penjelasan untuk pengguna. Pemeriksa pascagenerasi memastikan semua nama dan sitasi merujuk graph serta kesimpulan tidak berubah. Satu pertanyaan pengguna menggunakan paling banyak satu panggilan LLM penjelas dalam alur biasa; hasil yang sama dapat di-cache menurut versi graph dan pertanyaan.

## 12. Persyaratan nonfungsional dan pengukuran

| Aspek | Persyaratan / cara ukur |
|---|---|
| Ketertelusuran | Setiap jawaban yang menyebut orang, keputusan, atau rekomendasi memiliki sumber dan jalur graph yang dapat dibuka. |
| Kebenaran temporal | Hubungan pekerjaan dievaluasi pada tanggal peristiwa; data saat snapshot tidak diterapkan mundur tanpa dasar. |
| Keandalan demo | Graph dan jawaban dasar tetap dapat ditampilkan dari data/penilaian yang tersimpan ketika layanan AI penjelas tidak merespons. |
| Kinerja | Ukur median dan p95 waktu dari pertanyaan sampai kartu jawaban serta sampai penjelasan lengkap; target angka ditetapkan setelah pengukuran awal pada perangkat/jaringan demo. |
| Biaya | Catat input token Jev dan LLM, output token LLM, jumlah panggilan, serta biaya per pertanyaan. Klasifikasi record yang tidak berubah di-cache. |
| Konsistensi | Simpan versi dataset, aturan, pertanyaan Jev, dan model agar hasil dapat direproduksi atau dijelaskan saat berubah. |
| Pengendalian kesalahan | Ukur salah sebut decision maker, kegagalan menemukan P01, kegagalan abstain pada P03, dan sitasi yang tidak cocok. |

## 13. Uji penerimaan demo

| Kasus | Hasil yang diharapkan |
|---|---|
| **AT-01 P01** | Sistem menjawab **Rina Hapsari** sebagai decision maker pengadaan, status `teridentifikasi_lintas_sumber`, dengan I0343 + profil + riwayat tanggal sebagai jalur bukti. |
| **AT-02 Fajar** | Sistem menjelaskan Fajar adalah evaluator teknis menurut I0343 dan bahwa ia meneruskan proposal. |
| **AT-03 P03** | Sistem menjawab decision maker **belum teridentifikasi**; Ratna tidak otomatis diberi label champion/decision maker, Hanif hanya kandidat. |
| **AT-04 Temporal** | Pada C01 sebelum 15 Agustus 2026, Rina tercatat bekerja di C01; pada P01 sejak 1 September 2026, ia tercatat bekerja di P01. |
| **AT-05 Preseden** | Janji FEAT-07 pada C01 dan status belum ditepati dapat ditelusuri tanpa menyatakan bahwa hal itu sudah memengaruhi P01. |
| **AT-06 Dataset penuh** | Pertanyaan baru pada akun/deal lain menghasilkan jawaban dinamis beserta sumber atau pernyataan jelas bahwa bukti tidak cukup. |
| **AT-07 Sitasi** | Seluruh tautan file/baris pada jawaban membuka record yang benar; LLM tidak menambah nama atau mengubah status bukti. |
| **AT-08 Perubahan bukti** | Bila fitur catatan Sales diaktifkan, catatan baru yang eksplisit dapat mengubah jawaban P03 dan sistem menunjukkan sumber perubahan. |

## 14. Ketergantungan dan keputusan yang masih terbuka

| Topik | Keputusan yang perlu dibuat saat perencanaan implementasi |
|---|---|
| Akses Jev | Ketersediaan akun/API dan batas pemakaian untuk tim hackathon. |
| LLM penjelas | Penyedia/model, batas panjang jawaban, dan anggaran token per pertanyaan. |
| Penyimpanan graph | Pilihan engine atau struktur graph yang paling cepat dibangun dan cukup untuk query dinamis pada dataset ini. |
| Antarmuka dan deployment | Bentuk aplikasi demo, lingkungan menjalankan sistem, serta cara juri mengaksesnya. |
| Catatan Sales baru | Apakah input catatan baru masuk rilis awal atau tahap berikut; format dan siapa yang berhak mengubahnya. |
| Ambang Jev | Rubrik, contoh berlabel, serta ambang penilaian untuk setiap pertanyaan atomik; ditetapkan dari hasil uji, bukan angka pemasaran. |
| Batas pertanyaan juri | Daftar intent yang didukung secara eksplisit dan cara sistem menjawab pertanyaan di luar cakupan dengan bukti yang tersedia. |

## 15. Riwayat revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1 | 9 Oktober 2026 | Draf awal dari brief, audit dataset, analisis P01/P03, layer diagram, serta rencana Jev + LLM. |

## Referensi kerja

- [Studi kasus peserta](/Users/hans/Downloads/Studi%20Kasus%20Hackathon_PESERTA.pdf)
- [README dataset](/Users/hans/Downloads/README.md)
- [Kamus dataset](KAMUS_DATASET.md)
- [Kronologi P01/P03](KRONOLOGI_P01_P03.md)
- [Peta stakeholder P01/P03](PETA_STAKEHOLDER_P01_P03.md)
- [Layer diagram](LAYER_DIAGRAM_SISTEM.md)
- [Spesifikasi perilaku awal](DRAF_SPESIFIKASI_SISTEM.md)
