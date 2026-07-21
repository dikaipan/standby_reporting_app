// app/(tabs)/new-report.tsx — Form Laporan Screen (Full)
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, Switch, Modal, FlatList, Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import {
  getDraftReport, createReport, updateReport,
  addNetworkReport, addTrafficReport,
  getNetworkReports, getTrafficReports,
  deleteNetworkReport, deleteTrafficReport,
  updateNetworkReport, updateTrafficReport,
  Report, NetworkReport, TrafficReport, getSetting,
} from '../../database/db';
import { scheduleHourlyReminders, sendTestNotification } from '../../services/notifications';
import { exportReportAsCSV } from '../../utils/exportCsv';
import { getCurrentTimeFormatted } from '../../services/speedtest';

// ==================== HELPERS ====================
const currentDate = () => {
  const d = new Date();
  return `${d.getDate()} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][d.getMonth()]} ${d.getFullYear()}`;
};

const SectionHeader = ({ icon, title }: { icon?: string; title: string }) => (
  <View style={styles.sectionHeader}>
    {icon ? <Text style={styles.sectionIcon}>{icon}</Text> : null}
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const InputField = ({
  label, value, onChangeText, placeholder, multiline, keyboardType, required,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: any; required?: boolean;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}{required && <Text style={styles.required}> *</Text>}</Text>
    <TextInput
      style={[styles.input, multiline && styles.inputMulti]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || label}
      placeholderTextColor={Colors.textMuted}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      keyboardType={keyboardType || 'default'}
    />
  </View>
);

const YNToggle = ({
  label, value, onChange,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) => (
  <View style={styles.ynRow}>
    <Text style={styles.ynLabel}>{label}</Text>
    <View style={styles.ynButtons}>
      <TouchableOpacity
        style={[styles.ynBtn, value && styles.ynBtnActive]}
        onPress={() => onChange(true)}
      >
        <Text style={[styles.ynBtnText, value && styles.ynBtnTextActive]}>Y</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.ynBtn, !value && styles.ynBtnDanger]}
        onPress={() => onChange(false)}
      >
        <Text style={[styles.ynBtnText, !value && styles.ynBtnTextDanger]}>N</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const currentLocalTime = (): string => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const futureLocalTime = (addHours: number): string => {
  const d = new Date();
  d.setHours(d.getHours() + addHours);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export default function NewReportScreen() {
  const router = useRouter();
  const [reportId, setReportId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Section A - Identitas
  const [namaCE, setNamaCE] = useState('');
  const [namaMerchant, setNamaMerchant] = useState('Sanpachi');
  const [tanggal, setTanggal] = useState(currentDate());
  const [waktuMulai, setWaktuMulai] = useState(currentLocalTime());
  const [waktuSelesai, setWaktuSelesai] = useState(futureLocalTime(8));
  const [kasir1Nama, setKasir1Nama] = useState('');
  const [kasir1Mulai, setKasir1Mulai] = useState(currentLocalTime());
  const [kasir1Selesai, setKasir1Selesai] = useState(futureLocalTime(8));
  const [kasir2Nama, setKasir2Nama] = useState('');
  const [kasir2Mulai, setKasir2Mulai] = useState('');
  const [kasir2Selesai, setKasir2Selesai] = useState('');
  const [catatanKasir, setCatatanKasir] = useState('');

  // Section B - Checklist
  const [posNormal, setPosNormal] = useState(true);
  const [loginNormal, setLoginNormal] = useState(true);
  const [printerNormal, setPrinterNormal] = useState(true);
  const [jaringanStabil, setJaringanStabil] = useState(true);
  const [adaError, setAdaError] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [jamError, setJamError] = useState('');
  const [fotoEvidence, setFotoEvidence] = useState<string[]>([]);

  // Section C - Network
  const [networkRows, setNetworkRows] = useState<NetworkReport[]>([]);

  // Section D - Traffic
  const [trafficRows, setTrafficRows] = useState<TrafficReport[]>([]);

  // Notification scheduling
  const [notifScheduled, setNotifScheduled] = useState(false);

  const loadOrCreateDraft = async () => {
    setLoading(true);
    try {
      const defaultCE = await getSetting('default_ce_name');
      let draft = await getDraftReport();

      if (draft) {
        setReportId(draft.id!);
        setNamaCE(draft.nama_ce || '');
        setNamaMerchant(draft.nama_merchant || 'Sanpachi');
        setTanggal(draft.tanggal || currentDate());
        setWaktuMulai(draft.waktu_mulai || '23:00');
        setWaktuSelesai(draft.waktu_selesai || '05:30');
        setKasir1Nama(draft.kasir_shift1_nama || '');
        setKasir1Mulai(draft.kasir_shift1_mulai || '23:00');
        setKasir1Selesai(draft.kasir_shift1_selesai || '05:30');
        setKasir2Nama(draft.kasir_shift2_nama || '');
        setKasir2Mulai(draft.kasir_shift2_mulai || '');
        setKasir2Selesai(draft.kasir_shift2_selesai || '');
        setCatatanKasir(draft.catatan_kasir || '');
        setPosNormal(draft.pos_normal === 1);
        setLoginNormal(draft.login_kasir_normal === 1);
        setPrinterNormal(draft.printer_normal === 1);
        setJaringanStabil(draft.jaringan_stabil === 1);
        setAdaError(draft.ada_error === 1);
        setDetailError(draft.detail_error || '');
        setJamError(draft.jam_error || '');
        try { setFotoEvidence(JSON.parse(draft.foto_evidence || '[]')); } catch { }

        const nets = await getNetworkReports(draft.id!);
        setNetworkRows(nets);
        const traffics = await getTrafficReports(draft.id!);
        setTrafficRows(traffics);
      } else {
        if (defaultCE) setNamaCE(defaultCE);
        setReportId(null);
      }
    } catch (e) {
      console.error('loadOrCreateDraft error:', e);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadOrCreateDraft(); }, []));

  const buildReportData = (): Report => ({
    nama_ce: namaCE,
    nama_merchant: namaMerchant,
    tanggal,
    waktu_mulai: waktuMulai,
    waktu_selesai: waktuSelesai,
    kasir_shift1_nama: kasir1Nama,
    kasir_shift1_mulai: kasir1Mulai,
    kasir_shift1_selesai: kasir1Selesai,
    kasir_shift2_nama: kasir2Nama,
    kasir_shift2_mulai: kasir2Mulai,
    kasir_shift2_selesai: kasir2Selesai,
    catatan_kasir: catatanKasir,
    pos_normal: posNormal ? 1 : 0,
    login_kasir_normal: loginNormal ? 1 : 0,
    printer_normal: printerNormal ? 1 : 0,
    jaringan_stabil: jaringanStabil ? 1 : 0,
    ada_error: adaError ? 1 : 0,
    detail_error: detailError,
    jam_error: jamError,
    foto_evidence: JSON.stringify(fotoEvidence),
    status: 'draft',
  });

  const saveAsDraft = async (): Promise<number> => {
    const data = buildReportData();
    if (reportId) {
      await updateReport(reportId, data);
      return reportId;
    } else {
      const newId = await createReport(data);
      setReportId(newId);
      return newId;
    }
  };

  const handleAutoSave = async () => {
    if (!namaCE && !tanggal) return;
    await saveAsDraft();
  };

  const handleScheduleNotif = async () => {
    if (!namaCE) {
      Alert.alert('Isi Nama CE dulu', 'Harap isi nama CE sebelum mengaktifkan notifikasi.');
      return;
    }
    await saveAsDraft();
    const startH = parseInt(waktuMulai.split(':')[0]);
    const startM = parseInt(waktuMulai.split(':')[1] || '0');
    const endH = parseInt(waktuSelesai.split(':')[0]);
    const endM = parseInt(waktuSelesai.split(':')[1] || '0');
    await scheduleHourlyReminders(startH, startM, endH, endM, reportId!);
    await sendTestNotification();
    setNotifScheduled(true);
    Alert.alert('✅ Notifikasi Dijadwalkan!', `Pengingat cek network akan muncul setiap jam sesuai jadwal standby ${waktuMulai}–${waktuSelesai}.`);
  };

  const handleFinish = async () => {
    if (!namaCE) {
      Alert.alert('Error', 'Nama CE wajib diisi!');
      return;
    }
    setSaving(true);
    const data = { ...buildReportData(), status: 'done' };
    if (reportId) {
      await updateReport(reportId, data);
    } else {
      const newId = await createReport({ ...data, status: 'done' });
      setReportId(newId);
    }
    setSaving(false);
    Alert.alert('✅ Laporan Selesai!', 'Laporan berhasil disimpan. Anda dapat melihatnya di tab History atau export CSV.', [
      { text: 'Export CSV', onPress: handleExport },
      { text: 'OK' },
    ]);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const id = await saveAsDraft();
      const nets = await getNetworkReports(id);
      const traffics = await getTrafficReports(id);
      const data = buildReportData();
      data.id = id;
      await exportReportAsCSV(data, nets, traffics);
    } catch (e: any) {
      console.error('handleExport error:', e);
      Alert.alert('Gagal Export CSV', e?.message || 'Terjadi kesalahan saat export CSV.');
    }
    setExporting(false);
  };

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setFotoEvidence(prev => [...prev, result.assets[0].uri]);
    }
  };

  // Network row handlers
  const addNetworkRow = async () => {
    const id = await saveAsDraft();
    const jam = getCurrentTimeFormatted();
    const newRow: NetworkReport = {
      report_id: id,
      jam_check: jam,
      status: 'good',
      ping: 0,
      download: 0,
      upload: 0,
      keterangan: '',
      is_auto_speedtest: 0,
    };
    const newId = await addNetworkReport(newRow);
    const nets = await getNetworkReports(id);
    setNetworkRows(nets);
  };

  const removeNetworkRow = async (rowId: number) => {
    await deleteNetworkReport(rowId);
    const nets = await getNetworkReports(reportId!);
    setNetworkRows(nets);
  };

  const updateNetworkField = async (rowId: number, field: keyof NetworkReport, value: any) => {
    await updateNetworkReport(rowId, { [field]: value });
    setNetworkRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
  };

  // Traffic row handlers
  const addTrafficRow = async () => {
    const id = await saveAsDraft();
    const now = new Date();
    const jam = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const defaultMeja = await getSetting('default_total_meja');
    const newRow: TrafficReport = {
      report_id: id,
      jam,
      status: 'Full',
      meja_terisi: 0,
      total_meja: parseInt(defaultMeja || '15'),
      keterangan: '',
    };
    await addTrafficReport(newRow);
    const traffics = await getTrafficReports(id);
    setTrafficRows(traffics);
  };

  const removeTrafficRow = async (rowId: number) => {
    await deleteTrafficReport(rowId);
    const traffics = await getTrafficReports(reportId!);
    setTrafficRows(traffics);
  };

  const updateTrafficField = async (rowId: number, field: keyof TrafficReport, value: any) => {
    await updateTrafficReport(rowId, { [field]: value });
    setTrafficRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
  };

  const handleNewReport = () => {
    Alert.alert('Buat Laporan Baru?', 'Draft laporan saat ini akan tetap tersimpan di History.', [
      { text: 'Batal' },
      {
        text: 'Buat Baru',
        onPress: async () => {
          if (reportId) {
            await updateReport(reportId, { status: 'done' });
          }
          setReportId(null);
          setNamaCE(''); setNamaMerchant('Sanpachi'); setTanggal(currentDate());
          setWaktuMulai(currentLocalTime()); setWaktuSelesai(futureLocalTime(8));
          setKasir1Nama(''); setKasir2Nama('');
          setKasir1Mulai(currentLocalTime()); setKasir1Selesai(futureLocalTime(8));
          setKasir2Mulai(''); setKasir2Selesai('');
          setCatatanKasir('');
          setPosNormal(true); setLoginNormal(true);
          setPrinterNormal(true); setJaringanStabil(true);
          setAdaError(false); setDetailError(''); setJamError('');
          setFotoEvidence([]);
          setNetworkRows([]);
          setTrafficRows([]);
          setNotifScheduled(false);
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: Colors.textSecondary }}>Memuat...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Top Actions */}
      <View style={styles.topActions}>
        <TouchableOpacity style={styles.newBtn} onPress={handleNewReport}>
          <Ionicons name="add" size={16} color={Colors.textPrimary} />
          <Text style={styles.newBtnText}>Laporan Baru</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.notifBtn} onPress={handleScheduleNotif}>
          <Ionicons name={notifScheduled ? 'notifications' : 'notifications-outline'} size={16} color={notifScheduled ? Colors.warning : Colors.textSecondary} />
          <Text style={[styles.newBtnText, { color: notifScheduled ? Colors.warning : Colors.textSecondary }]}>
            {notifScheduled ? 'Notif Aktif' : 'Atur Notif'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.notifBtn} onPress={async () => {
          await sendTestNotification();
          Alert.alert('🧪 Notifikasi Terkirim', 'Notifikasi uji coba akan muncul dalam 3 detik.');
        }}>
          <Ionicons name="flask-outline" size={16} color={Colors.primary} />
          <Text style={[styles.newBtnText, { color: Colors.primary }]}>Tes Notif</Text>
        </TouchableOpacity>
      </View>

      {reportId && (
        <View style={styles.draftBanner}>
          <Ionicons name="sync" size={14} color={Colors.primary} />
          <Text style={styles.draftBannerText}>Draft tersimpan otomatis • ID: {reportId}</Text>
        </View>
      )}

      {/* ===== SECTION A: IDENTITAS ===== */}
      <View style={styles.card}>
        <SectionHeader title="A. Identitas CE" />

        <InputField label="Nama CE" value={namaCE} onChangeText={setNamaCE} required
          placeholder="Nama CE yang bertugas" />
        <InputField label="Nama Merchant" value={namaMerchant} onChangeText={setNamaMerchant} required
          placeholder="Nama merchant (contoh: Sanpachi, dll.)" />
        <InputField label="Tanggal Standby" value={tanggal} onChangeText={setTanggal}
          placeholder="19 Juli 2026" />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <InputField label="Waktu Mulai" value={waktuMulai} onChangeText={setWaktuMulai} placeholder="23:00" />
          </View>
          <Text style={styles.dash}>–</Text>
          <View style={{ flex: 1 }}>
            <InputField label="Waktu Selesai" value={waktuSelesai} onChangeText={setWaktuSelesai} placeholder="05:30" />
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={styles.subLabel}>Kasir Shift 1</Text>
        <InputField label="Nama Kasir" value={kasir1Nama} onChangeText={setKasir1Nama} placeholder="Nama kasir shift 1" />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <InputField label="Jam Mulai" value={kasir1Mulai} onChangeText={setKasir1Mulai} placeholder="23:00" />
          </View>
          <Text style={styles.dash}>–</Text>
          <View style={{ flex: 1 }}>
            <InputField label="Jam Selesai" value={kasir1Selesai} onChangeText={setKasir1Selesai} placeholder="05:30" />
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={styles.subLabel}>Kasir Shift 2 (Opsional)</Text>
        <InputField label="Nama Kasir" value={kasir2Nama} onChangeText={setKasir2Nama} placeholder="Nama kasir shift 2 (jika ada)" />
        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <InputField label="Jam Mulai" value={kasir2Mulai} onChangeText={setKasir2Mulai} placeholder="00:30" />
          </View>
          <Text style={styles.dash}>–</Text>
          <View style={{ flex: 1 }}>
            <InputField label="Jam Selesai" value={kasir2Selesai} onChangeText={setKasir2Selesai} placeholder="05:30" />
          </View>
        </View>

        <InputField label="Catatan Pembagian Shift" value={catatanKasir}
          onChangeText={setCatatanKasir} multiline
          placeholder="Pkl 23:00-07:00 : An Kasir A, 00:30-05:00 : An Kasir B" />
      </View>

      {/* ===== SECTION B: CHECKLIST ===== */}
      <View style={styles.card}>
        <SectionHeader title="B. Checklist Operasional" />

        <YNToggle label="Aplikasi POS Berjalan Normal" value={posNormal} onChange={setPosNormal} />
        <YNToggle label="Login Kasir Berhasil saat Pergantian Shift" value={loginNormal} onChange={setLoginNormal} />
        <YNToggle label="Printer Struk Berfungsi Normal" value={printerNormal} onChange={setPrinterNormal} />
        <YNToggle label="Koneksi Jaringan Stabil" value={jaringanStabil} onChange={setJaringanStabil} />

        <View style={styles.divider} />
        <YNToggle
          label="Ditemukan Error Berdampak Operasional"
          value={adaError}
          onChange={setAdaError}
        />

        {adaError && (
          <View style={styles.errorSection}>
            <InputField label="Jam Error Terjadi" value={jamError} onChangeText={setJamError} placeholder="Contoh: 04.07 - 04.30" />
            <InputField label="Detail Error" value={detailError} onChangeText={setDetailError}
              multiline placeholder="Jelaskan error yang terjadi secara detail..." />

            <Text style={styles.inputLabel}>Foto Evidence</Text>
            <View style={styles.photoRow}>
              {fotoEvidence.map((uri, i) => (
                <TouchableOpacity key={i} style={styles.photoThumb}
                  onPress={() => setFotoEvidence(prev => prev.filter((_, idx) => idx !== i))}>
                  <Ionicons name="image" size={24} color={Colors.primary} />
                  <Text style={styles.photoRemove}>✕</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.photoAdd} onPress={handleAddPhoto}>
                <Ionicons name="camera" size={24} color={Colors.textSecondary} />
                <Text style={styles.photoAddText}>Foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ===== SECTION C: NETWORK REPORT ===== */}
      <View style={styles.card}>
        <SectionHeader title="C. Report Network Per Jam" />
        <Text style={styles.sectionHint}>Tap "Speed Test" untuk mengisi otomatis</Text>

        {networkRows.length === 0 && (
          <Text style={styles.emptyRow}>Belum ada data. Tambah baris atau jalankan Speed Test.</Text>
        )}

        {networkRows.map((row) => (
          <View key={row.id} style={[styles.networkRow, row.status === 'bad' && styles.networkRowBad]}>
            <View style={styles.networkRowTop}>
              <TextInput
                style={styles.networkInput}
                value={row.jam_check}
                onChangeText={(v) => updateNetworkField(row.id!, 'jam_check', v)}
                placeholder="00.15"
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.networkStatusBtns}>
                <TouchableOpacity
                  style={[styles.networkStatusBtn, row.status === 'good' && styles.networkStatusGood]}
                  onPress={() => updateNetworkField(row.id!, 'status', 'good')}
                >
                  <Text style={[styles.networkStatusText, row.status === 'good' && { color: Colors.good }]}>Good</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.networkStatusBtn, row.status === 'bad' && styles.networkStatusBad]}
                  onPress={() => updateNetworkField(row.id!, 'status', 'bad')}
                >
                  <Text style={[styles.networkStatusText, row.status === 'bad' && { color: Colors.bad }]}>Bad</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => removeNetworkRow(row.id!)}>
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {row.status === 'bad' && (
              <View style={styles.networkRowDetail}>
                <View style={styles.networkMiniInput}>
                  <Text style={styles.networkMiniLabel}>Ping (ms)</Text>
                  <TextInput
                    style={styles.networkMiniField}
                    value={String(row.ping || '')}
                    onChangeText={(v) => updateNetworkField(row.id!, 'ping', parseInt(v) || 0)}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                    placeholder="0"
                  />
                </View>
                <View style={styles.networkMiniInput}>
                  <Text style={styles.networkMiniLabel}>DL (Mbps)</Text>
                  <TextInput
                    style={styles.networkMiniField}
                    value={String(row.download || '')}
                    onChangeText={(v) => updateNetworkField(row.id!, 'download', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textMuted}
                    placeholder="0.0"
                  />
                </View>
                <View style={styles.networkMiniInput}>
                  <Text style={styles.networkMiniLabel}>UL (Mbps)</Text>
                  <TextInput
                    style={styles.networkMiniField}
                    value={String(row.upload || '')}
                    onChangeText={(v) => updateNetworkField(row.id!, 'upload', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textMuted}
                    placeholder="0.0"
                  />
                </View>
              </View>
            )}

            {row.status === 'good' && (
              <View style={styles.networkRowDetail}>
                <View style={styles.networkMiniInput}>
                  <Text style={styles.networkMiniLabel}>Ping (ms)</Text>
                  <TextInput
                    style={styles.networkMiniField}
                    value={String(row.ping || '')}
                    onChangeText={(v) => updateNetworkField(row.id!, 'ping', parseInt(v) || 0)}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                    placeholder="opsional"
                  />
                </View>
                <View style={styles.networkMiniInput}>
                  <Text style={styles.networkMiniLabel}>DL (Mbps)</Text>
                  <TextInput
                    style={styles.networkMiniField}
                    value={String(row.download || '')}
                    onChangeText={(v) => updateNetworkField(row.id!, 'download', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textMuted}
                    placeholder="opsional"
                  />
                </View>
                <View style={styles.networkMiniInput}>
                  <Text style={styles.networkMiniLabel}>UL (Mbps)</Text>
                  <TextInput
                    style={styles.networkMiniField}
                    value={String(row.upload || '')}
                    onChangeText={(v) => updateNetworkField(row.id!, 'upload', parseFloat(v) || 0)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textMuted}
                    placeholder="opsional"
                  />
                </View>
              </View>
            )}

            <TextInput
              style={[styles.input, { marginTop: 6 }]}
              value={row.keterangan}
              onChangeText={(v) => updateNetworkField(row.id!, 'keterangan', v)}
              placeholder="Keterangan / kendala (opsional)"
              placeholderTextColor={Colors.textMuted}
            />
            {row.is_auto_speedtest === 1 && (
              <Text style={styles.autoTag}>Dari Speed Test Otomatis</Text>
            )}
          </View>
        ))}

        <View style={styles.addRowBtns}>
          <TouchableOpacity style={styles.addRowBtn} onPress={addNetworkRow}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addRowText}>Tambah Baris Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addRowBtn, styles.speedTestBtn]}
            onPress={() => router.push('/(tabs)/speedtest')}
          >
            <Ionicons name="speedometer" size={18} color={Colors.secondary} />
            <Text style={[styles.addRowText, { color: Colors.secondary }]}>Speed Test</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== SECTION D: TRAFFIC REPORT ===== */}
      <View style={styles.card}>
        <SectionHeader title="D. Report Traffic Pengunjung" />
        <Text style={styles.sectionHint}>Ketuk "Tambah Sekarang" untuk isi jam otomatis</Text>

        {trafficRows.length === 0 && (
          <Text style={styles.emptyRow}>Belum ada data. Tambah baris pertama.</Text>
        )}

        {trafficRows.map((row) => (
          <View key={row.id} style={styles.trafficRow}>
            <View style={styles.trafficRowTop}>
              <TextInput
                style={[styles.networkInput, { flex: 1 }]}
                value={row.jam}
                onChangeText={(v) => updateTrafficField(row.id!, 'jam', v)}
                placeholder="00:15"
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.trafficStatusBtns}>
                {(['Full', 'Sedang', 'Sepi'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.trafficStatusBtn,
                      row.status === s && s === 'Full' && styles.trafficFull,
                      row.status === s && s === 'Sedang' && styles.trafficSedang,
                      row.status === s && s === 'Sepi' && styles.trafficSepi,
                    ]}
                    onPress={() => updateTrafficField(row.id!, 'status', s)}
                  >
                    <Text style={[styles.trafficStatusText,
                      row.status === s && s === 'Full' && { color: Colors.success },
                      row.status === s && s === 'Sedang' && { color: Colors.warning },
                      row.status === s && s === 'Sepi' && { color: Colors.textSecondary },
                    ]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => removeTrafficRow(row.id!)}>
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {(row.status === 'Sedang' || row.status === 'Sepi' || row.status === 'Full') && (
              <View style={styles.networkRowDetail}>
                <View style={styles.networkMiniInput}>
                  <Text style={styles.networkMiniLabel}>Meja Terisi</Text>
                  <TextInput
                    style={styles.networkMiniField}
                    value={String(row.meja_terisi || '')}
                    onChangeText={(v) => updateTrafficField(row.id!, 'meja_terisi', parseInt(v) || 0)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <Text style={styles.dash}>dari</Text>
                <View style={styles.networkMiniInput}>
                  <Text style={styles.networkMiniLabel}>Total Meja</Text>
                  <TextInput
                    style={styles.networkMiniField}
                    value={String(row.total_meja || '')}
                    onChangeText={(v) => updateTrafficField(row.id!, 'total_meja', parseInt(v) || 0)}
                    keyboardType="numeric"
                    placeholder="15"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.networkMiniInput}>
                  <Text style={styles.networkMiniLabel}>Keterangan</Text>
                  <TextInput
                    style={styles.networkMiniField}
                    value={row.keterangan}
                    onChangeText={(v) => updateTrafficField(row.id!, 'keterangan', v)}
                    placeholder="catatan"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addRowBtn} onPress={addTrafficRow}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.success} />
          <Text style={[styles.addRowText, { color: Colors.success }]}>Tambah Sekarang</Text>
        </TouchableOpacity>
      </View>

      {/* ===== BOTTOM ACTIONS ===== */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.saveDraftBtn}
          onPress={async () => { await saveAsDraft(); Alert.alert('Draft Tersimpan'); }}
        >
          <Ionicons name="save-outline" size={18} color={Colors.primary} />
          <Text style={styles.saveDraftText}>Simpan Draft</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportBtn, exporting && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          <Ionicons name="download-outline" size={18} color={Colors.secondary} />
          <Text style={styles.exportText}>{exporting ? 'Export...' : 'Export CSV'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.finishBtn, saving && { opacity: 0.6 }]}
        onPress={handleFinish}
        disabled={saving}
      >
        <Ionicons name="checkmark-circle" size={22} color={Colors.dark} />
        <Text style={styles.finishText}>{saving ? 'Menyimpan...' : 'Tandai Laporan Selesai'}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  content: { padding: Spacing.md, paddingBottom: 60 },
  topActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.darkCard, borderRadius: BorderRadius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  notifBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.darkCard, borderRadius: BorderRadius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  newBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  draftBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.sm,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: Spacing.sm,
  },
  draftBannerText: { fontSize: 11, color: Colors.primary },
  card: {
    backgroundColor: Colors.darkCard, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.darkBorder, ...Shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md,
    paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.darkBorder,
  },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  sectionHint: { fontSize: 11, color: Colors.textMuted, marginBottom: Spacing.sm, marginTop: -8 },
  inputGroup: { marginBottom: Spacing.sm },
  inputLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  required: { color: Colors.danger },
  input: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.sm,
    paddingHorizontal: 12, paddingVertical: 10,
    color: Colors.textPrimary, fontSize: 13,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  dash: { fontSize: 14, color: Colors.textMuted, paddingBottom: 12 },
  divider: { height: 1, backgroundColor: Colors.darkBorder, marginVertical: Spacing.sm },
  subLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 6 },
  ynRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surface,
  },
  ynLabel: { fontSize: 12, color: Colors.textPrimary, flex: 1, paddingRight: 8, lineHeight: 18 },
  ynButtons: { flexDirection: 'row', gap: 4 },
  ynBtn: {
    width: 40, height: 32, borderRadius: 8,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  ynBtnActive: { backgroundColor: Colors.successLight, borderColor: Colors.good },
  ynBtnDanger: { backgroundColor: Colors.dangerLight, borderColor: Colors.bad },
  ynBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  ynBtnTextActive: { color: Colors.good },
  ynBtnTextDanger: { color: Colors.bad },
  errorSection: {
    backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.md,
    padding: Spacing.sm, marginTop: 8,
    borderWidth: 1, borderColor: Colors.danger,
  },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  photoThumb: {
    width: 60, height: 60, borderRadius: 8,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.darkBorder, position: 'relative',
  },
  photoRemove: {
    position: 'absolute', top: 2, right: 4,
    fontSize: 10, color: Colors.danger, fontWeight: '700',
  },
  photoAdd: {
    width: 60, height: 60, borderRadius: 8,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.darkBorder, borderStyle: 'dashed', gap: 2,
  },
  photoAddText: { fontSize: 9, color: Colors.textMuted },
  networkRow: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.sm, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  networkRowBad: { borderColor: Colors.bad, backgroundColor: Colors.dangerLight },
  networkRowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  networkInput: {
    backgroundColor: Colors.darkCard, borderRadius: BorderRadius.sm,
    paddingHorizontal: 10, paddingVertical: 6,
    color: Colors.textPrimary, fontSize: 13, width: 60,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  networkStatusBtns: { flexDirection: 'row', flex: 1, gap: 4 },
  networkStatusBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 6,
    backgroundColor: Colors.darkCard, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  networkStatusGood: { backgroundColor: Colors.successLight, borderColor: Colors.good },
  networkStatusBad: { backgroundColor: Colors.dangerLight, borderColor: Colors.bad },
  networkStatusText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  networkRowDetail: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  networkMiniInput: { flex: 1 },
  networkMiniLabel: { fontSize: 9, color: Colors.textMuted, marginBottom: 2 },
  networkMiniField: {
    backgroundColor: Colors.darkCard, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 6,
    color: Colors.textPrimary, fontSize: 12,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  autoTag: { fontSize: 9, color: Colors.primary, marginTop: 4, fontStyle: 'italic' },
  addRowBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  addRowBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary,
  },
  speedTestBtn: {
    backgroundColor: Colors.secondaryLight, borderColor: Colors.secondary,
  },
  addRowText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  trafficRow: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.sm, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  trafficRowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  trafficStatusBtns: { flexDirection: 'row', flex: 1, gap: 4 },
  trafficStatusBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 6,
    backgroundColor: Colors.darkCard, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.darkBorder,
  },
  trafficFull: { backgroundColor: Colors.successLight, borderColor: Colors.good },
  trafficSedang: { backgroundColor: Colors.warningLight, borderColor: Colors.warning },
  trafficSepi: { backgroundColor: Colors.surface, borderColor: Colors.textMuted },
  trafficStatusText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  bottomActions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  saveDraftBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.primaryLight,
  },
  saveDraftText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.secondary, backgroundColor: Colors.secondaryLight,
  },
  exportText: { fontSize: 14, fontWeight: '700', color: Colors.secondary },
  finishBtn: {
    backgroundColor: Colors.success, borderRadius: BorderRadius.full,
    paddingVertical: 15, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, ...Shadow.card,
  },
  finishText: { fontSize: 16, fontWeight: '800', color: Colors.dark },
  emptyRow: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
});
