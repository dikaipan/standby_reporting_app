// app/(tabs)/speedtest.tsx — Speed Test Screen
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import {
  runFullSpeedTest, getNetworkStatus, getCurrentTimeFormatted, SpeedTestResult,
} from '../../services/speedtest';
import { getDraftReport, addNetworkReport, updateReport } from '../../database/db';
import { useRouter } from 'expo-router';

type Phase = 'idle' | 'ping' | 'download' | 'upload' | 'done' | 'error';

interface HistoryItem extends SpeedTestResult {
  label: string;
}

export default function SpeedTestScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [ping, setPing] = useState<number | null>(null);
  const [download, setDownload] = useState<number | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [liveDownload, setLiveDownload] = useState(0);
  const [liveUpload, setLiveUpload] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saving, setSaving] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    pulseRef.current.start();
  };

  const stopPulse = () => {
    pulseRef.current?.stop();
    pulseAnim.setValue(1);
  };

  const startTest = async () => {
    setPing(null); setDownload(null); setUpload(null);
    setLiveDownload(0); setLiveUpload(0);
    setPhase('ping');
    startPulse();

    try {
      const result = await runFullSpeedTest(
        (p) => { setPing(p); setPhase('download'); },
        (dl) => setLiveDownload(dl),
        (dl) => { setDownload(dl); setPhase('upload'); },
        (ul) => setLiveUpload(ul),
        (ul) => { setUpload(ul); },
      );
      setPhase('done');
      stopPulse();

      const label = getCurrentTimeFormatted();
      setHistory(prev => [{ ...result, label }, ...prev].slice(0, 10));
    } catch (e) {
      setPhase('error');
      stopPulse();
    }
  };

  const saveToReport = async () => {
    if (ping === null || download === null || upload === null) return;
    setSaving(true);
    try {
      const draft = await getDraftReport();
      if (!draft?.id) {
        Alert.alert(
          'Tidak Ada Laporan Aktif',
          'Silakan buat laporan baru terlebih dahulu di tab Laporan.',
          [{ text: 'Buka Laporan', onPress: () => router.push('/(tabs)/new-report') }, { text: 'Batal' }],
        );
        setSaving(false);
        return;
      }

      const netStatus = getNetworkStatus(ping, download);
      const jam = getCurrentTimeFormatted();

      await addNetworkReport({
        report_id: draft.id,
        jam_check: jam,
        status: netStatus,
        ping: Math.round(ping),
        download: Math.round(download * 10) / 10,
        upload: Math.round(upload * 10) / 10,
        keterangan: netStatus === 'bad' ? `Auto speed test pada jam ${jam}` : '',
        is_auto_speedtest: 1,
      });

      Alert.alert('Tersimpan!', `Hasil speed test jam ${jam} berhasil ditambahkan ke laporan aktif.`);
    } catch (e) {
      Alert.alert('Error', 'Gagal menyimpan hasil. Silakan coba lagi.');
    }
    setSaving(false);
  };

  const getPhaseLabel = (): string => {
    switch (phase) {
      case 'ping': return 'Mengukur Ping...';
      case 'download': return 'Mengukur Download...';
      case 'upload': return 'Mengukur Upload...';
      case 'done': return 'Selesai!';
      case 'error': return 'Gagal. Cek koneksi WiFi.';
      default: return 'Siap';
    }
  };

  const getStatusColor = (s: string) => s === 'good' ? Colors.good : Colors.bad;

  const netStatus = ping !== null && download !== null
    ? getNetworkStatus(ping, download)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Main Gauge */}
      <View style={styles.gaugeCard}>
        <View style={styles.gaugeGlow} />
        <Text style={styles.gaugeTitle}>Speed Test</Text>
        <Text style={styles.gaugeHint}>Pastikan HP terhubung ke WiFi kasir</Text>

        <Animated.View style={[styles.gaugeCircle, { transform: [{ scale: pulseAnim }] },
          phase !== 'idle' && phase !== 'done' && phase !== 'error' && styles.gaugeActive,
          phase === 'done' && { borderColor: netStatus === 'good' ? Colors.good : Colors.bad },
        ]}>
          {phase === 'idle' && (
            <Ionicons name="wifi" size={48} color={Colors.primary} />
          )}
          {(phase === 'ping' || phase === 'download' || phase === 'upload') && (
            <Ionicons name="radio" size={48} color={Colors.primary} />
          )}
          {phase === 'done' && netStatus && (
            <Ionicons
              name={netStatus === 'good' ? 'checkmark-circle' : 'close-circle'}
              size={48}
              color={netStatus === 'good' ? Colors.good : Colors.bad}
            />
          )}
          {phase === 'error' && (
            <Ionicons name="alert-circle" size={48} color={Colors.danger} />
          )}
        </Animated.View>

        <Text style={styles.phaseLabel}>{getPhaseLabel()}</Text>

        {/* Results */}
        <View style={styles.resultsRow}>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>PING</Text>
            <Text style={[styles.resultValue, { color: Colors.warning }]}>
              {ping !== null ? `${ping}` : phase === 'ping' ? '...' : '-'}
            </Text>
            <Text style={styles.resultUnit}>ms</Text>
          </View>
          <View style={styles.resultDivider} />
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>DOWNLOAD</Text>
            <Text style={[styles.resultValue, { color: Colors.primary }]}>
              {download !== null ? `${download}` : phase === 'download' ? liveDownload.toFixed(1) : '-'}
            </Text>
            <Text style={styles.resultUnit}>Mbps</Text>
          </View>
          <View style={styles.resultDivider} />
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>UPLOAD</Text>
            <Text style={[styles.resultValue, { color: Colors.secondary }]}>
              {upload !== null ? `${upload}` : phase === 'upload' ? liveUpload.toFixed(1) : '-'}
            </Text>
            <Text style={styles.resultUnit}>Mbps</Text>
          </View>
        </View>

        {/* Network Status Badge */}
        {netStatus && phase === 'done' && (
          <View style={[styles.statusBadge, { backgroundColor: netStatus === 'good' ? Colors.successLight : Colors.dangerLight }]}>
            <Ionicons name={netStatus === 'good' ? 'wifi' : 'wifi-outline'} size={16} color={getStatusColor(netStatus)} />
            <Text style={[styles.statusText, { color: getStatusColor(netStatus) }]}>
              Koneksi {netStatus === 'good' ? 'GOOD' : 'BAD'}
            </Text>
          </View>
        )}
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={[styles.startBtn, (phase === 'ping' || phase === 'download' || phase === 'upload') && styles.startBtnDisabled]}
        onPress={startTest}
        disabled={phase === 'ping' || phase === 'download' || phase === 'upload'}
        activeOpacity={0.85}
      >
        <Ionicons name="play-circle" size={22} color={Colors.white} />
        <Text style={styles.startBtnText}>
          {phase === 'done' || phase === 'error' ? 'Ulangi Test' : 'Mulai Speed Test'}
        </Text>
      </TouchableOpacity>

      {phase === 'done' && (
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={saveToReport}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Ionicons name="save" size={20} color={Colors.dark} />
          <Text style={styles.saveBtnText}>
            {saving ? 'Menyimpan...' : 'Simpan ke Laporan Aktif'}
          </Text>
        </TouchableOpacity>
      )}

      {/* History */}
      {history.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Riwayat Speed Test Shift Ini</Text>
          {history.map((item, i) => {
            const s = getNetworkStatus(item.ping, item.download);
            return (
              <View key={i} style={styles.historyRow}>
                <View style={[styles.historyStatus, { backgroundColor: s === 'good' ? Colors.successLight : Colors.dangerLight }]}>
                  <Text style={[styles.historyStatusText, { color: getStatusColor(s) }]}>
                    {s.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.historyJam}>{item.label}</Text>
                <Text style={styles.historyVal}>{item.ping}ms</Text>
                <Text style={styles.historyVal}>↓{item.download}M</Text>
                <Text style={styles.historyVal}>↑{item.upload}M</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Info */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={18} color={Colors.primary} />
        <Text style={styles.infoText}>
          Sambungkan HP ke WiFi yang sama dengan tablet kasir, lalu tekan "Mulai Speed Test". Hasil akan otomatis tersimpan ke laporan aktif.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  content: { padding: Spacing.md, paddingBottom: 40 },
  gaugeCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.darkBorder,
    ...Shadow.card,
  },
  gaugeGlow: {
    position: 'absolute', top: -60, width: 200, height: 200,
    borderRadius: 100, backgroundColor: Colors.primary, opacity: 0.05,
  },
  gaugeTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 1 },
  gaugeHint: { fontSize: 11, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.lg },
  gaugeCircle: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3, borderColor: Colors.darkBorder,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  gaugeActive: { borderColor: Colors.primary, borderWidth: 3 },
  phaseLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.lg, fontWeight: '600' },
  resultsRow: {
    flexDirection: 'row', width: '100%',
    justifyContent: 'space-around', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resultItem: { alignItems: 'center', flex: 1 },
  resultLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  resultValue: { fontSize: 28, fontWeight: '900', marginVertical: 2 },
  resultUnit: { fontSize: 10, color: Colors.textSecondary },
  resultDivider: { width: 1, height: 50, backgroundColor: Colors.darkBorder },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: Spacing.sm, ...Shadow.card,
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { fontSize: 16, fontWeight: '800', color: Colors.white },
  saveBtn: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.full, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: Spacing.md, ...Shadow.card,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: Colors.dark },
  historyCard: {
    backgroundColor: Colors.darkCard, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  historyTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.darkBorder,
  },
  historyStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  historyStatusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  historyJam: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  historyVal: { fontSize: 11, color: Colors.textPrimary, fontWeight: '600', minWidth: 50, textAlign: 'right' },
  infoCard: {
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md,
    padding: Spacing.md, flexDirection: 'row', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primary,
  },
  infoText: { flex: 1, fontSize: 11, color: Colors.textPrimary, lineHeight: 18 },
});
