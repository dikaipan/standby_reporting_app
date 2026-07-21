// database/db.ts
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('stanby_report.db');
  }
  return db;
};

export const initDb = async (): Promise<void> => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const database = await getDb();

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_ce TEXT NOT NULL DEFAULT '',
        nama_merchant TEXT DEFAULT 'Merchant Sanpachi',
        tanggal TEXT NOT NULL DEFAULT '',
        waktu_mulai TEXT DEFAULT '',
        waktu_selesai TEXT DEFAULT '',
        kasir_shift1_nama TEXT DEFAULT '',
        kasir_shift1_mulai TEXT DEFAULT '',
        kasir_shift1_selesai TEXT DEFAULT '',
        kasir_shift2_nama TEXT DEFAULT '',
        kasir_shift2_mulai TEXT DEFAULT '',
        kasir_shift2_selesai TEXT DEFAULT '',
        catatan_kasir TEXT DEFAULT '',
        pos_normal INTEGER DEFAULT 1,
        login_kasir_normal INTEGER DEFAULT 1,
        printer_normal INTEGER DEFAULT 1,
        jaringan_stabil INTEGER DEFAULT 1,
        ada_error INTEGER DEFAULT 0,
        detail_error TEXT DEFAULT '',
        jam_error TEXT DEFAULT '',
        foto_evidence TEXT DEFAULT '[]',
        status TEXT DEFAULT 'draft',
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS network_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        jam_check TEXT DEFAULT '',
        status TEXT DEFAULT 'good',
        ping INTEGER DEFAULT 0,
        download REAL DEFAULT 0,
        upload REAL DEFAULT 0,
        keterangan TEXT DEFAULT '',
        is_auto_speedtest INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS traffic_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        jam TEXT DEFAULT '',
        status TEXT DEFAULT 'Full',
        meja_terisi INTEGER DEFAULT 0,
        total_meja INTEGER DEFAULT 15,
        keterangan TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT DEFAULT ''
      );
    `);

    try {
      await database.execAsync(
        `ALTER TABLE reports ADD COLUMN nama_merchant TEXT DEFAULT 'Merchant Sanpachi';`,
      );
    } catch {
      // Column already exists
    }

    try {
      await database.runAsync(
        `INSERT OR IGNORE INTO settings (key, value) VALUES ('default_ce_name', '')`,
      );
      await database.runAsync(
        `INSERT OR IGNORE INTO settings (key, value) VALUES ('default_total_meja', '15')`,
      );
      await database.runAsync(
        `INSERT OR IGNORE INTO settings (key, value) VALUES ('notif_enabled', '1')`,
      );
    } catch (e) {
      console.warn('Settings init warning:', e);
    }
  })();

  return initPromise;
};

// Helper to ensure db initialized
const ensureDb = async () => {
  await initDb();
  return await getDb();
};

// ==================== SETTINGS ====================
export const getSetting = async (key: string): Promise<string> => {
  try {
    const database = await ensureDb();
    const row = await database.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key ?? ''],
    );
    return row?.value ?? '';
  } catch (e) {
    console.error('getSetting error:', e);
    return '';
  }
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  try {
    const database = await ensureDb();
    await database.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key ?? '', value ?? ''],
    );
  } catch (e) {
    console.error('setSetting error:', e);
  }
};

// ==================== REPORTS ====================
export interface Report {
  id?: number;
  nama_ce: string;
  nama_merchant: string;
  tanggal: string;
  waktu_mulai: string;
  waktu_selesai: string;
  kasir_shift1_nama: string;
  kasir_shift1_mulai: string;
  kasir_shift1_selesai: string;
  kasir_shift2_nama: string;
  kasir_shift2_mulai: string;
  kasir_shift2_selesai: string;
  catatan_kasir: string;
  pos_normal: number;
  login_kasir_normal: number;
  printer_normal: number;
  jaringan_stabil: number;
  ada_error: number;
  detail_error: string;
  jam_error: string;
  foto_evidence: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export const createReport = async (report: Report): Promise<number> => {
  const database = await ensureDb();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `INSERT INTO reports (
      nama_ce, nama_merchant, tanggal, waktu_mulai, waktu_selesai,
      kasir_shift1_nama, kasir_shift1_mulai, kasir_shift1_selesai,
      kasir_shift2_nama, kasir_shift2_mulai, kasir_shift2_selesai,
      catatan_kasir, pos_normal, login_kasir_normal, printer_normal,
      jaringan_stabil, ada_error, detail_error, jam_error,
      foto_evidence, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.nama_ce ?? '',
      report.nama_merchant ?? 'Merchant Sanpachi',
      report.tanggal ?? '',
      report.waktu_mulai ?? '',
      report.waktu_selesai ?? '',
      report.kasir_shift1_nama ?? '',
      report.kasir_shift1_mulai ?? '',
      report.kasir_shift1_selesai ?? '',
      report.kasir_shift2_nama ?? '',
      report.kasir_shift2_mulai ?? '',
      report.kasir_shift2_selesai ?? '',
      report.catatan_kasir ?? '',
      report.pos_normal ?? 1,
      report.login_kasir_normal ?? 1,
      report.printer_normal ?? 1,
      report.jaringan_stabil ?? 1,
      report.ada_error ?? 0,
      report.detail_error ?? '',
      report.jam_error ?? '',
      report.foto_evidence ?? '[]',
      report.status ?? 'draft',
      now,
      now,
    ],
  );
  return result.lastInsertRowId;
};

export const updateReport = async (id: number, report: Partial<Report>): Promise<void> => {
  const database = await ensureDb();
  const now = new Date().toISOString();
  const keys = Object.keys(report) as (keyof Report)[];
  if (keys.length === 0) return;

  const fields = keys.map(k => `${String(k)} = ?`).join(', ');
  const values = keys.map(k => {
    const v = report[k];
    return v === undefined ? '' : v;
  });
  values.push(now, id);

  await database.runAsync(
    `UPDATE reports SET ${fields}, updated_at = ? WHERE id = ?`,
    values,
  );
};

export const getAllReports = async (): Promise<Report[]> => {
  try {
    const database = await ensureDb();
    const rows = await database.getAllAsync<Report>(
      'SELECT * FROM reports ORDER BY created_at DESC',
    );
    return rows ?? [];
  } catch (e) {
    console.error('getAllReports error:', e);
    return [];
  }
};

export const getReportById = async (id: number): Promise<Report | null> => {
  try {
    const database = await ensureDb();
    return await database.getFirstAsync<Report>(
      'SELECT * FROM reports WHERE id = ?',
      [id],
    );
  } catch (e) {
    console.error('getReportById error:', e);
    return null;
  }
};

export const getDraftReport = async (): Promise<Report | null> => {
  try {
    const database = await ensureDb();
    return await database.getFirstAsync<Report>(
      "SELECT * FROM reports WHERE status = 'draft' ORDER BY updated_at DESC LIMIT 1",
    );
  } catch (e) {
    console.error('getDraftReport error:', e);
    return null;
  }
};

export const deleteReport = async (id: number): Promise<void> => {
  const database = await ensureDb();
  await database.runAsync('DELETE FROM network_reports WHERE report_id = ?', [id]);
  await database.runAsync('DELETE FROM traffic_reports WHERE report_id = ?', [id]);
  await database.runAsync('DELETE FROM reports WHERE id = ?', [id]);
};

// ==================== NETWORK REPORTS ====================
export interface NetworkReport {
  id?: number;
  report_id: number;
  jam_check: string;
  status: 'good' | 'bad';
  ping: number;
  download: number;
  upload: number;
  keterangan: string;
  is_auto_speedtest: number;
}

export const addNetworkReport = async (nr: NetworkReport): Promise<number> => {
  const database = await ensureDb();
  const result = await database.runAsync(
    `INSERT INTO network_reports (report_id, jam_check, status, ping, download, upload, keterangan, is_auto_speedtest)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nr.report_id,
      nr.jam_check ?? '',
      nr.status ?? 'good',
      nr.ping ?? 0,
      nr.download ?? 0,
      nr.upload ?? 0,
      nr.keterangan ?? '',
      nr.is_auto_speedtest ?? 0,
    ],
  );
  return result.lastInsertRowId;
};

export const updateNetworkReport = async (id: number, nr: Partial<NetworkReport>): Promise<void> => {
  const database = await ensureDb();
  const keys = Object.keys(nr) as (keyof NetworkReport)[];
  if (keys.length === 0) return;

  const fields = keys.map(k => `${String(k)} = ?`).join(', ');
  const values = keys.map(k => {
    const v = nr[k];
    return v === undefined ? '' : v;
  });
  values.push(id);

  await database.runAsync(`UPDATE network_reports SET ${fields} WHERE id = ?`, values);
};

export const deleteNetworkReport = async (id: number): Promise<void> => {
  const database = await ensureDb();
  await database.runAsync('DELETE FROM network_reports WHERE id = ?', [id]);
};

export const getNetworkReports = async (reportId: number): Promise<NetworkReport[]> => {
  try {
    const database = await ensureDb();
    const rows = await database.getAllAsync<NetworkReport>(
      'SELECT * FROM network_reports WHERE report_id = ? ORDER BY jam_check ASC',
      [reportId],
    );
    return rows ?? [];
  } catch (e) {
    console.error('getNetworkReports error:', e);
    return [];
  }
};

// ==================== TRAFFIC REPORTS ====================
export interface TrafficReport {
  id?: number;
  report_id: number;
  jam: string;
  status: 'Full' | 'Sedang' | 'Sepi';
  meja_terisi: number;
  total_meja: number;
  keterangan: string;
}

export const addTrafficReport = async (tr: TrafficReport): Promise<number> => {
  const database = await ensureDb();
  const result = await database.runAsync(
    `INSERT INTO traffic_reports (report_id, jam, status, meja_terisi, total_meja, keterangan)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      tr.report_id,
      tr.jam ?? '',
      tr.status ?? 'Full',
      tr.meja_terisi ?? 0,
      tr.total_meja ?? 15,
      tr.keterangan ?? '',
    ],
  );
  return result.lastInsertRowId;
};

export const updateTrafficReport = async (id: number, tr: Partial<TrafficReport>): Promise<void> => {
  const database = await ensureDb();
  const keys = Object.keys(tr) as (keyof TrafficReport)[];
  if (keys.length === 0) return;

  const fields = keys.map(k => `${String(k)} = ?`).join(', ');
  const values = keys.map(k => {
    const v = tr[k];
    return v === undefined ? '' : v;
  });
  values.push(id);

  await database.runAsync(`UPDATE traffic_reports SET ${fields} WHERE id = ?`, values);
};

export const deleteTrafficReport = async (id: number): Promise<void> => {
  const database = await ensureDb();
  await database.runAsync('DELETE FROM traffic_reports WHERE id = ?', [id]);
};

export const getTrafficReports = async (reportId: number): Promise<TrafficReport[]> => {
  try {
    const database = await ensureDb();
    const rows = await database.getAllAsync<TrafficReport>(
      'SELECT * FROM traffic_reports WHERE report_id = ? ORDER BY jam ASC',
      [reportId],
    );
    return rows ?? [];
  } catch (e) {
    console.error('getTrafficReports error:', e);
    return [];
  }
};
