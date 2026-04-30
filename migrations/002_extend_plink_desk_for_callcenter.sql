CREATE TABLE IF NOT EXISTS support_ticket_categories (
  id UUID PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  group_name VARCHAR(50) NOT NULL,
  category_name VARCHAR(200) NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_sops (
  id UUID PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_date TIMESTAMP NULL;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS channel VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS sender TEXT NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category_group VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS product VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS detail_0 TEXT NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS detail_1 TEXT NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS detail_2 TEXT NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS bank VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS detail_category_code VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS note_detail TEXT NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS handling_sop_code VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS investigation_process TEXT NOT NULL DEFAULT '';
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP NULL;

UPDATE support_tickets
SET ticket_date = COALESCE(ticket_date, created_at)
WHERE ticket_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_date ON support_tickets(ticket_date DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_detail_category_code ON support_tickets(detail_category_code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_handling_sop_code ON support_tickets(handling_sop_code);

INSERT INTO support_ticket_categories (id, code, group_name, category_name, short_description)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'R01', 'Request', 'Konfirmasi Status Transaksi', 'Customer/Bank melaporkan transaksi sukses tetapi status dashboard cancel atau pending, gagal namun dana terpotong, amount tidak sesuai, atau butuh resend callback.'),
  ('10000000-0000-0000-0000-000000000002', 'R02', 'Request', 'Konfirmasi Bukti Transaksi', 'Dana terpotong dan perlu pembuktian bahwa transaksi sukses berdasarkan proof dari sistem.'),
  ('10000000-0000-0000-0000-000000000003', 'R03', 'Request', 'Report Settelment', 'Merchant meminta report settlement, pelimpahan dana, atau penambahan kolom report settlement.'),
  ('10000000-0000-0000-0000-000000000004', 'R04', 'Request', 'Request Refund Transaksi', 'Produk tidak diterima dan customer request refund transaksi.'),
  ('10000000-0000-0000-0000-000000000005', 'R05', 'Request', 'Request LIMIT / BIN TRANSAKSI', 'Permohonan kenaikan limit kartu kredit atau pembukaan BIN untuk mendukung transaksi.'),
  ('10000000-0000-0000-0000-000000000006', 'C01', 'Case Fraud', 'Merchant Fraudelent', 'Customer mengalami indikasi penipuan.'),
  ('10000000-0000-0000-0000-000000000007', 'C02', 'Case Fraud', 'Customer Dispute', 'Customer menyatakan tidak pernah melakukan transaksi dan meminta pengembalian dana.'),
  ('10000000-0000-0000-0000-000000000008', 'C03', 'Case Fraud', 'Konfirmasi Status Transaksi', 'Dashboard update tetapi callback tidak diterima.')
ON CONFLICT (code) DO UPDATE
SET
  group_name = EXCLUDED.group_name,
  category_name = EXCLUDED.category_name,
  short_description = EXCLUDED.short_description,
  updated_at = NOW();

INSERT INTO support_ticket_sops (id, code, title, content)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'SOP #01', 'SOP #01', '1. Pastikan merchant & transaksi tersebut valid
2. Pastikan ada Surat kronologis
3. Teruskan ke pihak Merchant untuk konfirmasi
4. Terdapat 2 Opsi yang diberikan Merchant
     1. Pastikan Produk diterima Cust/Nasabah
     2. Request Prismalink untuk lakukan refund
5. Opsi-1 -> Infokan ke sender (Bank/Cust) bahwa Produk telah tersedia
6. Opsi-2 -> Infokan Finance untuk hold dana
                 -> Pastikan rekening tujuan valid
                 -> Pastikan refund berhasil dan infokan sender (Bank/Cust)'),
  ('20000000-0000-0000-0000-000000000002', 'SOP #02', 'SOP #02', '1. Konfirmasi apakah Merchant terdapat kendala dalam akses Dashboard
2. Tim Support tetap membantu pastikan, bila Merchant meminta
3. Memastikan status transaksi pada Dashboard
     IF "Transaksi GAGAL", AND "Dana TDK MASUK" (via rekon) then "Infokan GAGAL"
     IF "Transaksi SUKSES", AND "Dana MASUK" (via rekon) then "Infokan SUKSES"'),
  ('20000000-0000-0000-0000-000000000003', 'SOP #03', 'SOP #03', '1. Menggunakan Approval_Code Transaksi KartuKredit dari List BRI untuk mencari billing ID VOA
2. Mencari detil No Paspor berdasarkan Billing ID, untuk kemudian diberikan ke pihak Molina
3. Pihak Molina membantu mencarikan bukti penerbitan Visa
4. Tim Support melampirkan data "Penerbitan Visa atas WNA" berdasarkan "Transaksi CC"'),
  ('20000000-0000-0000-0000-000000000004', 'SOP #04', 'SOP #04', '1. Konfirmasi apakah Merchant terdapat kendala dalam akses Dashboard
2. Tim Support tetap membantu pastikan, bila Merchant meminta
3. Memastikan status transaksi berhasil pada Dashboard, untuk kemudian klik tombol "send notification"'),
  ('20000000-0000-0000-0000-000000000005', 'SOP #05', 'SOP #05', '1. Pastikan merchant & transaksi tersebut valid
2. Cek VA di apps.plink, bandingkan amount:
Amount sama -> Update transaksi.
Amount berbeda -> Tidak bisa diupdate, informasikan ke merchant.'),
  ('20000000-0000-0000-0000-000000000006', 'SOP #06', 'SOP #06', '1. Pastikan transaksi valid untuk merchant tersebut
2. Check RK, apakah memang terdapat double payment
3. Infokan ke merchant'),
  ('20000000-0000-0000-0000-000000000007', 'SOP #07', 'SOP #07', '1. Pastikan transaksi valid untuk merchant tersebut
2. Hit Send Notification pada transaksi yang dimaksud'),
  ('20000000-0000-0000-0000-000000000008', 'SOP #08-A', 'SOP #08', '1. Pastikan merchant valid
2. Check MBASE dan PCS
3. Memastikan status transaksi pada Dashboard
     IF "Transaksi REJECT", then "Infokan GAGAL"
     IF "Transaksi SUKSES", then "Infokan SUKSES"'),
  ('20000000-0000-0000-0000-000000000009', 'SOP #08-B', 'SOP #08 QR Check Status', '1. Pastikan merchant & transaksi tersebut valid
2. Cek QR di dashboard NOBU/BNC
3. Hit button check-status di dashboard.plink.co.id'),
  ('20000000-0000-0000-0000-000000000010', 'SOP #08-C', 'REFUND VOA', 'REFUND VOA')
ON CONFLICT (code) DO UPDATE
SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  updated_at = NOW();
