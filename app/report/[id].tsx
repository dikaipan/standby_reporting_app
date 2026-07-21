// app/report/[id].tsx — Detail / Edit Laporan
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import {
  getReportById, getNetworkReports, getTrafficReports,
  Report, NetworkReport, TrafficReport, updateReport, deleteReport,
} from '../../database/db';
import { exportReportAsCSV } from '../../utils/exportCsv';

const yn = (v: number) => v === 1;
const YNBadge = ({ value }: { value: boolean }) => (
  <View style={[styles.ynBadge, { backgroundColor: value ? Colors.successLight : Colors.dangerLight }]}>
    <Text style={[styles.ynBadgeText, { color: value ? Colors.good : Colors.bad }]}>
      {value ? 'Y' : 'N'}
    </Text>
  </View>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || '-'}</Text>
  </View>
);

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [networkRows, setNetworkRows] = useState<NetworkReport[]>([]);
  const [trafficRows, setTrafficRows] = useState<TrafficReport[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const r = await getReportById(parseInt(id));
      setReport(r);
      if (r?.id) {
        const nets = await getNetworkReports(r.id);
        setNetworkRows(nets);
        const traffics = await getTrafficReports(r.id);
        setTrafficRows(traffics);
      }
    };
    load();
  }, [id]);

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportReportAsCSV(report, networkRows, trafficRows);
    } catch (e: any) {
      console.error('handleExport error:', e);
      Alert.alert('Gagal Export CSV', e?.message || 'Terjadi kesalahan saat export CSV.');
    }
    setExporting(false);
  };

  const handleDelete = () => {
    Alert.alert('Hapus Laporan?', 'Laporan ini akan dihapus permanen.', [
      { text: 'Batal' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          await deleteReport(parseInt(id!));
          router.back();
        },
      },
    ]);
  };

  const handleMarkDone = async () => {
    if (!report?.id) return;
    await updateReport(report.id, { status: 'done' });
    setReport(prev => prev ? { ...prev, status: 'done' } : null);
    Alert.alert('✅ Laporan Selesai!');
  };

  if (!report) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: Colors.textSecondary }}>Memuat laporan...</Text>
      </View>
    );
  }

  const goodCount = networkRows.filter(n => n.status === 'good').length;
  const badCount = networkRows.filter(n => n.status === 'bad').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: report.status === 'done' ? Colors.successLight : Colors.warningLight }]}>
        <Ionicons
          name={report.status === 'done' ? 'checkmark-circle' : 'time'}
          size={20}
          color={report.status === 'done' ? Colors.good : Colors.warning}
        />
        <Text style={[styles.statusText, { color: report.status === 'done' ? Colors.good : Colors.warning }]}>
          {report.status === 'done' ? 'Laporan Selesai' : 'Draft — Belum Selesai'}
        </Text>
      </View>

      {/* Section A */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Identitas CE</Text>
        <Row label="Nama CE" value={report.nama_ce} />
        <Row label="Nama Merchant" value={report.nama_merchant} />
        <Row label="Tanggal Standby" value={report.tanggal} />
        <Row label="Waktu Standby" value={`${report.waktu_mulai} – ${report.waktu_selesai}`} />
        <Row label="Kasir Shift 1" value={report.kasir_shift1_nama ? `${report.kasir_shift1_nama} (${report.kasir_shift1_mulai}–${report.kasir_shift1_selesai})` : '-'} />
        <Row label="Kasir Shift 2" value={report.kasir_shift2_nama ? `${report.kasir_shift2_nama} (${report.kasir_shift2_mulai}–${report.kasir_shift2_selesai})` : '-'} />
        <Row label="Catatan Kasir" value={report.catatan_kasir} />
      </View>

      {/* Section B */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Checklist Operasional</Text>
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Aplikasi POS Berjalan Normal</Text>
          <YNBadge value={yn(report.pos_normal)} />
        </View>
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Login Kasir Normal saat Pergantian Shift</Text>
          <YNBadge value={yn(report.login_kasir_normal)} />
        </View>
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Printer Struk Berfungsi Normal</Text>
          <YNBadge value={yn(report.printer_normal)} />
        </View>
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Koneksi Jaringan Stabil</Text>
          <YNBadge value={yn(report.jaringan_stabil)} />
        </View>
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Ada Error Berdampak Operasional</Text>
          <YNBadge value={yn(report.ada_error)} />
        </View>
        {report.ada_error === 1 && (
          <View style={styles.errorDetail}>
            <Text style={styles.errorDetailLabel}>Jam Error: {report.jam_error || '-'}</Text>
            <Text style={styles.errorDetailText}>{report.detail_error || '-'}</Text>
          </View>
        )}
      </View>

      {/* Section C - Network */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Report Network Per Jam</Text>

        <View style={styles.networkSummary}>
          <View style={[styles.netStatCard, { backgroundColor: Colors.successLight }]}>
            <Text style={[styles.netStatNum, { color: Colors.good }]}>{goodCount}</Text>
            <Text style={styles.netStatLabel}>Good</Text>
          </View>
          <View style={[styles.netStatCard, { backgroundColor: Colors.dangerLight }]}>
            <Text style={[styles.netStatNum, { color: Colors.bad }]}>{badCount}</Text>
            <Text style={styles.netStatLabel}>Bad</Text>
          </View>
        </View>

        {networkRows.length === 0 && <Text style={styles.emptyText}>Belum ada data network.</Text>}

        {networkRows.map((nr) => (
          <View key={nr.id} style={[styles.networkDetailRow, nr.status === 'bad' && styles.networkDetailRowBad]}>
            <View style={styles.networkDetailTop}>
              <Text style={styles.networkJam}>{nr.jam_check}</Text>
              <View style={[styles.networkBadge, { backgroundColor: nr.status === 'good' ? Colors.successLight : Colors.dangerLight }]}>
                <Text style={[styles.networkBadgeText, { color: nr.status === 'good' ? Colors.good : Colors.bad }]}>
                  {nr.status.toUpperCase()}
                </Text>
              </View>
              {nr.is_auto_speedtest === 1 && (
                <Text style={styles.autoTag}>Auto</Text>
              )}
            </View>
            <View style={styles.networkDetailStats}>
              <Text style={styles.networkStat}>Ping: <Text style={{ color: Colors.warning }}>{nr.ping || 0}ms</Text></Text>
              <Text style={styles.networkStat}>DL: <Text style={{ color: Colors.primary }}>{nr.download || 0}M</Text></Text>
              <Text style={styles.networkStat}>UL: <Text style={{ color: Colors.secondary }}>{nr.upload || 0}M</Text></Text>
            </View>
            {nr.keterangan ? <Text style={styles.networkKet}>{nr.keterangan}</Text> : null}
          </View>
        ))}
      </View>

      {/* Section D - Traffic */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Report Traffic Pengunjung</Text>

        {trafficRows.length === 0 && <Text style={styles.emptyText}>Belum ada data traffic.</Text>}

        {trafficRows.map((tr) => (
          <View key={tr.id} style={styles.trafficDetailRow}>
            <Text style={styles.trafficJam}>{tr.jam}</Text>
            <View style={[styles.trafficBadge,
              tr.status === 'Full' && { backgroundColor: Colors.successLight },
              tr.status === 'Sedang' && { backgroundColor: Colors.warningLight },
              tr.status === 'Sepi' && { backgroundColor: Colors.surface },
            ]}>
              <Text style={[styles.trafficBadgeText,
                tr.status === 'Full' && { color: Colors.good },
                tr.status === 'Sedang' && { color: Colors.warning },
                tr.status === 'Sepi' && { color: Colors.textSecondary },
              ]}>{tr.status}</Text>
            </View>
            <Text style={styles.trafficDetail}>
              {tr.meja_terisi} / {tr.total_meja} Meja
            </Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {report.status !== 'done' && (
          <TouchableOpacity style={styles.doneBtn} onPress={handleMarkDone}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.dark} />
            <Text style={styles.doneBtnText}>Tandai Selesai</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.exportBtnDetail, exporting && { opacity: 0.6 }]}
          onPress={handleExport} disabled={exporting}>
          <Ionicons name="download" size={18} color={Colors.white} />
          <Text style={styles.exportBtnText}>{exporting ? 'Export...' : 'Export CSV'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash" size={18} color={Colors.danger} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  content: { padding: Spacing.md, paddingBottom: 40 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md,
  },
  statusText: { fontSize: 14, fontWeight: '700' },
  card: {
    backgroundColor: Colors.darkCard, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.darkBorder, ...Shadow.sm,
  },
  cardTitle: {
    fontSize: 14, fontWeight: '800', color: Colors.textPrimary,
    marginBottom: Spacing.md, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.darkBorder,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surface,
  },
  detailLabel: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  detailValue: { fontSize: 12, color: Colors.textPrimary, flex: 1, textAlign: 'right', fontWeight: '600' },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surface,
  },
  checkLabel: { fontSize: 12, color: Colors.textPrimary, flex: 1 },
  ynBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  ynBadgeText: { fontSize: 12, fontWeight: '800' },
  errorDetail: {
    backgroundColor: Colors.dangerLight, borderRadius: 8,
    padding: 10, marginTop: 8, borderWidth: 1, borderColor: Colors.danger,
  },
  errorDetailLabel: { fontSize: 11, color: Colors.danger, fontWeight: '700', marginBottom: 4 },
  errorDetailText: { fontSize: 12, color: Colors.textPrimary },
  networkSummary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  netStatCard: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  netStatNum: { fontSize: 24, fontWeight: '900' },
  netStatLabel: { fontSize: 10, color: Colors.textSecondary },
  networkDetailRow: {
    backgroundColor: Colors.surface, borderRadius: 8, padding: 10,
    marginBottom: 6, borderWidth: 1, borderColor: Colors.darkBorder,
  },
  networkDetailRowBad: { borderColor: Colors.bad, backgroundColor: Colors.dangerLight },
  networkDetailTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  networkJam: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  networkBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  networkBadgeText: { fontSize: 10, fontWeight: '800' },
  autoTag: { fontSize: 9, color: Colors.primary, fontStyle: 'italic' },
  networkDetailStats: { flexDirection: 'row', gap: 16 },
  networkStat: { fontSize: 11, color: Colors.textSecondary },
  networkKet: { fontSize: 10, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  trafficDetailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surface,
  },
  trafficJam: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, width: 50 },
  trafficBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  trafficBadgeText: { fontSize: 11, fontWeight: '700' },
  trafficDetail: { fontSize: 11, color: Colors.textSecondary, flex: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  doneBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: BorderRadius.full,
    backgroundColor: Colors.success, ...Shadow.sm,
  },
  doneBtnText: { fontSize: 13, fontWeight: '700', color: Colors.dark },
  exportBtnDetail: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary, ...Shadow.sm,
  },
  exportBtnText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  deleteBtn: {
    width: 50, alignItems: 'center', justifyContent: 'center',
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.danger,
  },
  emptyText: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', padding: 12 },
});
