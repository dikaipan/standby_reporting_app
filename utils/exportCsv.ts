// utils/exportCsv.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Report, NetworkReport, TrafficReport } from '../database/db';

const escapeCSV = (val: string | number | undefined | null): string => {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const yn = (val: number): string => (val === 1 ? 'Y' : 'N');

export const generateCSV = (
  report: Report,
  networkReports: NetworkReport[],
  trafficReports: TrafficReport[],
): string => {
  const lines: string[] = [];

  // ===== HEADER =====
  const merchantName = (report.nama_merchant || 'Sanpachi').toUpperCase();
  lines.push(`LAPORAN CE - HITACHI POS ${merchantName},,,,,,`);
  lines.push(',,,,,,');
  lines.push(`Nama CE,${escapeCSV(report.nama_ce)},,,,,`);
  lines.push(`Nama Merchant,${escapeCSV(report.nama_merchant || 'Sanpachi')},,,,,`);
  lines.push(`Tanggal Standby,${escapeCSV(report.tanggal)},,,,,`);
  lines.push(`Waktu Standby,"${report.waktu_mulai} - ${report.waktu_selesai}",,,,,`);
  lines.push(',,,,,,');

  // Kasir info
  const kasir1 = report.kasir_shift1_nama
    ? `Pkl ${report.kasir_shift1_mulai} - ${report.kasir_shift1_selesai} : An ${report.kasir_shift1_nama}`
    : '-';
  const kasir2 = report.kasir_shift2_nama
    ? `Pkl ${report.kasir_shift2_mulai} - ${report.kasir_shift2_selesai} : An ${report.kasir_shift2_nama}`
    : '';
  const kasirNama1 = report.kasir_shift1_nama || '-';
  const kasirNama2 = report.kasir_shift2_nama || '-';
  lines.push(`Nama Kasir Bertugas (Shift 1),${escapeCSV(kasirNama1)},"${report.kasir_shift1_mulai} - ${report.kasir_shift1_selesai}",,,,`);
  lines.push(`Nama Kasir Bertugas (Shift 2),${escapeCSV(kasirNama2)},"${report.kasir_shift2_mulai} - ${report.kasir_shift2_selesai}",,,,`);

  const catatanKasir = report.catatan_kasir || [kasir1, kasir2].filter(Boolean).join(' , ');
  lines.push(`Catatan Detail Pembagian Shift Kasir,${escapeCSV(catatanKasir)},,,,,`);
  lines.push(',,,,,,');

  // ===== CHECKLIST OPERASIONAL =====
  lines.push('CHECKLIST OPERASIONAL & KENDALA,,,,,,');
  lines.push('Parameter Pemeriksaan,Status (Y/N),Jam Kendala (Jika Ada),Detail Kendala & Lampiran Evidence,,,');
  lines.push(`Aplikasi POS Berjalan Normal,${yn(report.pos_normal)},,,,`);
  lines.push(`Login Kasir Berhasil tanpa kendala ketika pergantian Shift,${yn(report.login_kasir_normal)},,,,`);
  lines.push(`Printer Struk Berfungsi Normal,${yn(report.printer_normal)},,,,`);
  lines.push(`Koneksi Jaringan Stabil,${yn(report.jaringan_stabil)},,,,`);

  if (report.ada_error === 1) {
    lines.push(
      `Ditemukan Eror Yang Berdampak Ketika Operasional,N,${escapeCSV(report.jam_error)},${escapeCSV(report.detail_error)},,,`,
    );
  } else {
    lines.push(`Ditemukan Eror Yang Berdampak Ketika Operasional,Y,,,,`);
  }
  lines.push(',,,,,,');

  // ===== NETWORK REPORT =====
  lines.push('REPORT NETWORK PER JAM,,,,,,');
  lines.push('Jam Check,Status Koneksi (Good/Bad),Ping (ms),Download (Mbps),Upload (Mbps),Keterangan / Kendala,');

  if (networkReports.length === 0) {
    lines.push('-,-,-,-,-,-,');
  } else {
    for (const nr of networkReports) {
      lines.push(
        `${escapeCSV(nr.jam_check)},${escapeCSV(nr.status)},${nr.ping || ''},${nr.download || ''},${nr.upload || ''},${escapeCSV(nr.keterangan)},`,
      );
    }
  }
  lines.push(',,,,,,');

  // Note network
  lines.push('Note:,,,,,,');
  lines.push('"1. Jika ditemukan Bad tolong di isi hasil test speed (ping, download, upload)",,,,,,');
  lines.push('"2. CE wajib koneksikan wifi HP/laptop ke wifi yang tersambung di tablet kasir",,,,,,');
  lines.push(',,,,,,');

  // ===== TRAFFIC REPORT =====
  lines.push('Report traffic pengunjung,,,,,,');
  lines.push('Jam,Status,Meja Terisi,Total Meja,Keterangan,,');

  if (trafficReports.length === 0) {
    lines.push('-,-,-,-,-,,');
  } else {
    for (const tr of trafficReports) {
      const detail =
        tr.status === 'Full'
          ? tr.meja_terisi && tr.total_meja
            ? `${tr.meja_terisi} Meja Terisi dari ${tr.total_meja} Meja`
            : 'Full'
          : tr.meja_terisi && tr.total_meja
          ? `${tr.meja_terisi} Meja Terisi dari ${tr.total_meja} Meja`
          : '';
      lines.push(
        `${escapeCSV(tr.jam)},${escapeCSV(tr.status)},${tr.meja_terisi || ''},${tr.total_meja || ''},${escapeCSV(tr.keterangan || detail)},,`,
      );
    }
  }
  lines.push(',,,,,,');
  lines.push('Note:,,,,,,');
  lines.push('"1. Full = 70%+ meja terisi. Dibawah 70% = Sedang. Jika Sedang/Sepi wajib isi detail meja.",,,,,,');

  return lines.join('\n');
};

export const exportReportAsCSV = async (
  report: Report,
  networkReports: NetworkReport[],
  trafficReports: TrafficReport[],
): Promise<void> => {
  try {
    const csvContent = generateCSV(report, networkReports, trafficReports);
    const safeDate = (report.tanggal || 'report').replace(/[^a-zA-Z0-9]/g, '_');
    const safeCE = (report.nama_ce || 'CE').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `LaporanCE_${safeDate}_${safeCE}.csv`;

    const baseDir =
      (FileSystem as any).documentDirectory ||
      (FileSystem as any).cacheDirectory;

    if (!baseDir) {
      throw new Error('Direktori penyimpanan FileSystem tidak ditemukan.');
    }

    const fileUri = `${baseDir}${fileName}`;

    await (FileSystem as any).writeAsStringAsync(fileUri, csvContent, {
      encoding: (FileSystem as any).EncodingType?.UTF8 || 'utf8',
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Laporan CE CSV',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      throw new Error('Fitur Berbagi File (Sharing) tidak didukung pada perangkat ini.');
    }
  } catch (err: any) {
    console.error('exportReportAsCSV error:', err);
    throw new Error(err?.message || 'Gagal membuat file CSV.');
  }
};
