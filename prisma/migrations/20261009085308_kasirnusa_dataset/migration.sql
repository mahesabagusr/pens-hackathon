-- CreateTable
CREATE TABLE "Employee" (
    "employee_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("employee_id")
);

-- CreateTable
CREATE TABLE "Release" (
    "versi" TEXT NOT NULL,
    "tanggal_rilis" DATE NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("versi")
);

-- CreateTable
CREATE TABLE "Feature" (
    "feature_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "target_awal" TEXT,
    "target_terkini" TEXT,
    "catatan" TEXT,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("feature_id")
);

-- CreateTable
CREATE TABLE "Account" (
    "account_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "industri" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "paket" TEXT,
    "jumlah_outlet" INTEGER NOT NULL,
    "account_owner_id" TEXT NOT NULL,
    "champion_contact_id" TEXT,
    "nps_terakhir" INTEGER,
    "health_score_dashboard" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "contact_id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "account_id_saat_ini" TEXT NOT NULL,
    "jabatan_saat_ini" TEXT NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("contact_id")
);

-- CreateTable
CREATE TABLE "EmploymentHistory" (
    "id" SERIAL NOT NULL,
    "contact_id" TEXT NOT NULL,
    "account_id" TEXT,
    "organisasi" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "mulai" DATE NOT NULL,
    "selesai" DATE,

    CONSTRAINT "EmploymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "deal_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "stage_sejak" DATE NOT NULL,
    "dibuat" DATE NOT NULL,
    "owner_id" TEXT NOT NULL,
    "outlet" INTEGER NOT NULL,
    "nilai_tahunan" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "alasan_kalah" TEXT,
    "kompetitor" TEXT,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("deal_id")
);

-- CreateTable
CREATE TABLE "Outlet" (
    "outlet_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "kota" TEXT NOT NULL,
    "mode_offline_aktif" BOOLEAN NOT NULL,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("outlet_id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "interaction_id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "tipe" TEXT NOT NULL,
    "account_id" TEXT,
    "dari" TEXT NOT NULL,
    "ke" TEXT,
    "peserta" TEXT[],
    "subjek" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "membalas_id" TEXT,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("interaction_id")
);

-- CreateTable
CREATE TABLE "Bug" (
    "bug_id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "versi_terdampak" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dibuat" DATE NOT NULL,
    "selesai" DATE,
    "fitur_terkait" TEXT NOT NULL,

    CONSTRAINT "Bug_pkey" PRIMARY KEY ("bug_id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "ticket_id" TEXT NOT NULL,
    "dibuat" DATE NOT NULL,
    "account_id" TEXT NOT NULL,
    "outlet_id" TEXT,
    "pelapor_contact_id" TEXT,
    "kategori" TEXT NOT NULL,
    "prioritas" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "versi_aplikasi" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "bug_id" TEXT,
    "diselesaikan" DATE,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("ticket_id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "decision_id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "tipe" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "deal_id" TEXT,
    "diminta_oleh" TEXT NOT NULL,
    "diputuskan_oleh" TEXT NOT NULL,
    "keputusan" TEXT NOT NULL,
    "nilai" TEXT,
    "alasan" TEXT NOT NULL,
    "bukti_interaction_id" TEXT,
    "fitur_dijanjikan" TEXT,
    "status_janji" TEXT,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("decision_id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "contract_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "paket" TEXT NOT NULL,
    "outlet_kontrak" INTEGER NOT NULL,
    "batas_outlet_paket" INTEGER,
    "mulai" DATE NOT NULL,
    "tanggal_renewal" DATE NOT NULL,
    "harga_per_outlet_bulan" INTEGER NOT NULL,
    "diskon_pct" INTEGER NOT NULL,
    "nilai_tahunan" INTEGER NOT NULL,
    "keterlambatan_bayar_12bln" INTEGER NOT NULL,
    "decision_id" TEXT,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("contract_id")
);

-- CreateTable
CREATE TABLE "FeatureUsageMonthly" (
    "bulan" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "pengguna_aktif" INTEGER NOT NULL,

    CONSTRAINT "FeatureUsageMonthly_pkey" PRIMARY KEY ("bulan","account_id","feature_id")
);

-- CreateTable
CREATE TABLE "ProductUsageDaily" (
    "tanggal" DATE NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "versi_aplikasi" TEXT NOT NULL,
    "jumlah_transaksi" INTEGER NOT NULL,
    "transaksi_offline_tersinkron" INTEGER,

    CONSTRAINT "ProductUsageDaily_pkey" PRIMARY KEY ("tanggal","outlet_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "EmploymentHistory_contact_id_idx" ON "EmploymentHistory"("contact_id");

-- CreateIndex
CREATE INDEX "EmploymentHistory_account_id_idx" ON "EmploymentHistory"("account_id");

-- CreateIndex
CREATE INDEX "Outlet_account_id_idx" ON "Outlet"("account_id");

-- CreateIndex
CREATE INDEX "Interaction_account_id_idx" ON "Interaction"("account_id");

-- CreateIndex
CREATE INDEX "SupportTicket_account_id_idx" ON "SupportTicket"("account_id");

-- CreateIndex
CREATE INDEX "SupportTicket_bug_id_idx" ON "SupportTicket"("bug_id");

-- CreateIndex
CREATE INDEX "ProductUsageDaily_account_id_idx" ON "ProductUsageDaily"("account_id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_account_owner_id_fkey" FOREIGN KEY ("account_owner_id") REFERENCES "Employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_account_id_saat_ini_fkey" FOREIGN KEY ("account_id_saat_ini") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact"("contact_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_membalas_id_fkey" FOREIGN KEY ("membalas_id") REFERENCES "Interaction"("interaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_versi_terdampak_fkey" FOREIGN KEY ("versi_terdampak") REFERENCES "Release"("versi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_fitur_terkait_fkey" FOREIGN KEY ("fitur_terkait") REFERENCES "Feature"("feature_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "Outlet"("outlet_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_pelapor_contact_id_fkey" FOREIGN KEY ("pelapor_contact_id") REFERENCES "Contact"("contact_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_bug_id_fkey" FOREIGN KEY ("bug_id") REFERENCES "Bug"("bug_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_versi_aplikasi_fkey" FOREIGN KEY ("versi_aplikasi") REFERENCES "Release"("versi") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "Deal"("deal_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_diminta_oleh_fkey" FOREIGN KEY ("diminta_oleh") REFERENCES "Employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_diputuskan_oleh_fkey" FOREIGN KEY ("diputuskan_oleh") REFERENCES "Employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_bukti_interaction_id_fkey" FOREIGN KEY ("bukti_interaction_id") REFERENCES "Interaction"("interaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_fitur_dijanjikan_fkey" FOREIGN KEY ("fitur_dijanjikan") REFERENCES "Feature"("feature_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_decision_id_fkey" FOREIGN KEY ("decision_id") REFERENCES "Decision"("decision_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureUsageMonthly" ADD CONSTRAINT "FeatureUsageMonthly_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureUsageMonthly" ADD CONSTRAINT "FeatureUsageMonthly_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "Feature"("feature_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUsageDaily" ADD CONSTRAINT "ProductUsageDaily_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "Outlet"("outlet_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUsageDaily" ADD CONSTRAINT "ProductUsageDaily_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("account_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUsageDaily" ADD CONSTRAINT "ProductUsageDaily_versi_aplikasi_fkey" FOREIGN KEY ("versi_aplikasi") REFERENCES "Release"("versi") ON DELETE RESTRICT ON UPDATE CASCADE;
