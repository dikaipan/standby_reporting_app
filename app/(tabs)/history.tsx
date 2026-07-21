// app/(tabs)/history.tsx — History Screen
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import {
  getAllReports, deleteReport, getNetworkReports,
  getTrafficReports, Report,
} from '../../database/db';
import { exportReportAsCSV } from '../../utils/exportCsv';

export default function HistoryScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<number | null>(null);

  const loadReports = async () => {
    const all = await getAllReports();
    setReports(all);
  };

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleDelete = (id: number, tanggal: string) => {
    Alert.alert(
      'Hapus Laporan?',
      `Laporan tanggal ${tanggal} akan dihapus permanen.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive',
          onPress: async () => {
            await deleteReport(id);
            await loadReports();
          },
        },
      ],
    );
  };

  const handleExport = async (report: Report) => {
    if (!report.id) return;
    setExporting(report.id);
    try {
      const networks = await getNetworkReports(report.id);
      const traffics = await getTrafficReports(report.id);
      await exportReportAsCSV(report, networks, traffics);
    } catch (e: any) {
      console.error('handleExport error:', e);
      Alert.alert('Gagal Export CSV', e?.message || 'Terjadi kesalahan saat export CSV.');
    }
    setExporting(null);
  };

  const renderItem = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/report/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <View style={[styles.statusDot, { backgroundColor: item.status === 'done' ? Colors.good : Colors.warning }]} />
          <View>
            <Text style={styles.cardDate}>{item.tanggal || 'Tanggal tidak diisi'}</Text>
            <Text style={styles.cardCE}>{item.nama_ce || 'Nama CE tidak diisi'}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: item.status === 'done' ? Colors.successLight : Colors.warningLight }]}>
          <Text style={[styles.badgeText, { color: item.status === 'done' ? Colors.good : Colors.warning }]}>
            {item.status === 'done' ? '✓ Selesai' : '⏳ Draft'}
          </Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={Colors.textMuted} /> {item.waktu_mulai || '-'} – {item.waktu_selesai || '-'}
        </Text>
        <Text style={styles.metaItem}>
          <Ionicons name="person-outline" size={12} color={Colors.textMuted} /> {item.kasir_shift1_nama || '-'}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/report/${item.id}`)}
        >
          <Ionicons name="eye-outline" size={16} color={Colors.primary} />
          <Text style={[styles.actionText, { color: Colors.primary }]}>Detail</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleExport(item)}
          disabled={exporting === item.id}
        >
          <Ionicons name="download-outline" size={16} color={Colors.success} />
          <Text style={[styles.actionText, { color: Colors.success }]}>
            {exporting === item.id ? 'Exporting...' : 'Export CSV'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleDelete(item.id!, item.tanggal)}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          <Text style={[styles.actionText, { color: Colors.danger }]}>Hapus</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {reports.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
          <Text style={styles.emptySub}>Laporan yang sudah dibuat akan muncul di sini.</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  list: { padding: Spacing.md, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.darkCard,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.darkBorder,
    ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardDate: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cardCE: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', gap: 16, marginBottom: 10, paddingLeft: 20 },
  metaItem: { fontSize: 11, color: Colors.textMuted },
  cardActions: {
    flexDirection: 'row', gap: 4,
    borderTopWidth: 1, borderTopColor: Colors.darkBorder, paddingTop: 10,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 4,
    paddingVertical: 6, borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  actionText: { fontSize: 11, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },
});
