# 📊 Hitachi POS — CE Standby Reporting App

Aplikasi offline-first berbasis React Native & Expo untuk Customer Engineer (CE) yang melakukan kegiatan *standby* di merchant (Hitachi POS System).

## 🚀 Fitur Utama

- 📝 **Laporan CE Standby (Form 4 Section)**
  - Identitas CE, Nama Merchant, Tanggal & Jam Shift, Kasir Shift 1 & 2
  - Checklist Operasional (POS Normal, Login Kasir, Printer Struk, Jaringan Stabil, Detail & Evidence Error)
  - Network Check per jam (Good / Bad + Ping / Download / Upload)
  - Traffic Pengunjung per jam (Full / Sedang / Sepi + Meja Terisi)

- ⚡ **Built-in Speed Test (WiFi Kasir)**
  - Mengukur Ping, Download, dan Upload secara akurat di perangkat HP CE
  - Tombol simpan otomatis ke laporan standby aktif

- 🔔 **Pengingat Notifikasi Per Jam (Offline Reminders)**
  - Notifikasi otomatis per jam sesuai shift standby CE
  - Mengingatkan CE untuk Speed Test dan catat Traffic Pengunjung

- 📄 **Export Laporan ke CSV / Excel**
  - Mengikuti struktur template resmi Excel Hitachi POS CE Standby Report
  - Fitur Berbagi (Share) ke WhatsApp, Google Drive, Email, dll.

- 💾 **100% Offline-First (SQLite Local DB)**
  - Semua data tersimpan aman di HP tanpa membutuhkan server eksternal

---

## 💻 Tech Stack

- **Framework**: React Native (Expo SDK 54)
- **Navigation**: Expo Router (File-based Routing)
- **Database**: Expo SQLite (`stanby_report.db`)
- **Notifications**: Expo Notifications
- **Sharing & FileSystem**: Expo FileSystem & Expo Sharing
- **UI & Iconography**: Ionicons (@expo/vector-icons)

---

## 🧑‍💻 Developer

**Developed with ❤️ by Handika**  
- **GitHub**: [@dikaipan](https://github.com/dikaipan)  
- **Repository**: [standby_reporting_app](https://github.com/dikaipan/standby_reporting_app.git)
