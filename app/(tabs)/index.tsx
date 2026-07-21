// app/(tabs)/index.tsx — Dashboard Screen
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Alert, Linking,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import {
  getAllReports, getDraftReport, getNetworkReports,
  getTrafficReports, Report, NetworkReport,
} from '../../database/db';

export default function DashboardScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [draftReport, setDraftReport] = useState<Report | null>(null);
  const [networkStats, setNetworkStats] = useState({ good: 0, bad: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const all = await getAllReports();
    setReports(all);
    const draft = await getDraftReport();
    setDraftReport(draft);

    if (draft?.id) {
      const nets = await getNetworkReports(draft.id);
      const good = nets.filter(n => n.status === 'good').length;
      const bad = nets.filter(n => n.status === 'bad').length;
      setNetworkStats({ good, bad });
    } else {
      setNetworkStats({ good: 0, bad: 0 });
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const totalDone = reports.filter(r => r.status === 'done').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerGlow} />
        <Text style={styles.bannerTitle}>Hitachi POS</Text>
        <Text style={styles.bannerSub}>CE Standby Report System</Text>
        <Text style={styles.bannerMerchant}>📍 {draftReport?.nama_merchant ? draftReport.nama_merchant : 'Merchant Standby'}</Text>
      </View>

      {/* Draft Alert */}
      {draftReport && (
        <TouchableOpacity
          style={styles.draftCard}
          onPress={() => router.push('/(tabs)/new-report')}
          activeOpacity={0.8}
        >
          <View style={styles.draftIcon}>
            <Ionicons name="document-text" size={22} color={Colors.warning} />
          </View>
          <View style={styles.draftText}>
            <Text style={styles.draftTitle}>Draft Laporan Aktif</Text>
            <Text style={styles.draftSub}>
              {draftReport.tanggal || 'Belum ada tanggal'} • {draftReport.nama_ce || 'Nama CE belum diisi'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.warning} />
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Aksi Cepat</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={[styles.actionCard, { borderColor: Colors.primary }]}
          onPress={() => router.push('/(tabs)/new-report')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="add-circle" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.actionLabel}>{draftReport ? 'Lanjutkan' : 'Buat'} Laporan</Text>
          <Text style={styles.actionSub}>{draftReport ? 'Draft tersedia' : 'Laporan baru'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { borderColor: Colors.secondary }]}
          onPress={() => router.push('/(tabs)/speedtest')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: Colors.secondaryLight }]}>
            <Ionicons name="speedometer" size={28} color={Colors.secondary} />
          </View>
          <Text style={styles.actionLabel}>Speed Test</Text>
          <Text style={styles.actionSub}>Cek koneksi WiFi</Text>
        </TouchableOpacity>
      </View>

      {/* Network Stats (if draft active) */}
      {draftReport && (
        <>
          <Text style={styles.sectionTitle}>Status Koneksi Malam Ini</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="wifi" size={24} color={Colors.good} />
              <Text style={[styles.statNum, { color: Colors.good }]}>{networkStats.good}</Text>
              <Text style={styles.statLabel}>Good</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: Colors.dangerLight }]}>
              <Ionicons name="wifi-outline" size={24} color={Colors.bad} />
              <Text style={[styles.statNum, { color: Colors.bad }]}>{networkStats.bad}</Text>
              <Text style={styles.statLabel}>Bad</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: Colors.primaryLight }]}>
              <Ionicons name="list" size={24} color={Colors.primary} />
              <Text style={[styles.statNum, { color: Colors.primary }]}>
                {networkStats.good + networkStats.bad}
              </Text>
              <Text style={styles.statLabel}>Total Check</Text>
            </View>
          </View>
        </>
      )}

      {/* Summary Stats */}
      <Text style={styles.sectionTitle}>Statistik</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{reports.length}</Text>
          <Text style={styles.summaryLabel}>Total Laporan</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNum, { color: Colors.success }]}>{totalDone}</Text>
          <Text style={styles.summaryLabel}>Selesai</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNum, { color: Colors.warning }]}>
            {reports.length - totalDone}
          </Text>
          <Text style={styles.summaryLabel}>Draft</Text>
        </View>
      </View>

      {/* Recent Reports */}
      {reports.length > 0 && (
        <>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Laporan Terbaru</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text style={styles.seeAll}>Lihat Semua →</Text>
            </TouchableOpacity>
          </View>
          {reports.slice(0, 3).map((r) => (
            <TouchableOpacity
              key={r.id}
              style={styles.reportCard}
              onPress={() => router.push(`/report/${r.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.reportCardLeft}>
                <View style={[styles.reportStatus, { backgroundColor: r.status === 'done' ? Colors.successLight : Colors.warningLight }]}>
                  <Ionicons
                    name={r.status === 'done' ? 'checkmark-circle' : 'time'}
                    size={16}
                    color={r.status === 'done' ? Colors.success : Colors.warning}
                  />
                </View>
                <View>
                  <Text style={styles.reportDate}>{r.tanggal || '-'}</Text>
                  <Text style={styles.reportCE}>{r.nama_ce || 'CE tidak diisi'}</Text>
                </View>
              </View>
              <View style={styles.reportCardRight}>
                <Text style={[styles.reportBadge, { color: r.status === 'done' ? Colors.success : Colors.warning }]}>
                  {r.status === 'done' ? 'Selesai' : 'Draft'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {reports.length === 0 && !draftReport && (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={60} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Belum Ada Laporan</Text>
          <Text style={styles.emptyDesc}>Buat laporan pertama Anda dengan menekan tombol di atas.</Text>
        </View>
      )}

      {/* Footer / Developer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Developed by <Text style={styles.footerAuthor}>Handika</Text></Text>
        <TouchableOpacity
          style={styles.githubBtn}
          onPress={() => Linking.openURL('https://github.com/dikaipan')}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-github" size={18} color={Colors.textPrimary} />
          <Text style={styles.githubText}>github.com/dikaipan</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  content: { padding: Spacing.md, paddingBottom: 40 },
  banner: {
    backgroundColor: Colors.darkCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    ...Shadow.card,
  },
  bannerGlow: {
    position: 'absolute', top: -40, right: -40,
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    opacity: 0.08,
  },
  bannerTitle: { fontSize: 22, fontWeight: '900', color: Colors.primary, letterSpacing: 1 },
  bannerSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  bannerMerchant: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  draftCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning,
    gap: Spacing.sm,
  },
  draftIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,179,71,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  draftText: { flex: 1 },
  draftTitle: { fontSize: 13, fontWeight: '700', color: Colors.warning },
  draftSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  actionGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  actionCard: {
    flex: 1, backgroundColor: Colors.darkCard,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, alignItems: 'center', gap: 6,
    ...Shadow.sm,
  },
  actionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  actionSub: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  statCard: {
    flex: 1, borderRadius: BorderRadius.md,
    padding: Spacing.md, alignItems: 'center', gap: 4,
  },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row', gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1, backgroundColor: Colors.darkCard,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.darkBorder,
  },
  summaryNum: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary },
  summaryLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  reportCard: {
    backgroundColor: Colors.darkCard, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  reportCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  reportStatus: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  reportDate: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  reportCE: { fontSize: 11, color: Colors.textSecondary },
  reportCardRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportBadge: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  emptyDesc: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },
  footer: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.darkBorder,
    alignItems: 'center',
    gap: 8,
  },
  footerText: { fontSize: 12, color: Colors.textSecondary },
  footerAuthor: { fontWeight: '800', color: Colors.primary },
  githubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.darkBorder,
  },
  githubText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
});
