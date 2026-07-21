// services/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pengingat Standby CE',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00C2FF',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
};

export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const scheduleHourlyReminders = async (
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  reportId: number,
): Promise<void> => {
  await cancelAllNotifications();

  const checkMinute = 15;
  const slots: { hour: number; minute: number }[] = [];
  let crossedMidnight = false;

  for (let i = 0; i <= 24; i++) {
    const h = (startHour + i) % 24;
    if (i > 0 && h === startHour && !crossedMidnight) break;
    if (h === 0) crossedMidnight = true;
    slots.push({ hour: h, minute: checkMinute });

    const endTotalMinutes = endHour * 60 + endMinute;
    const thisTotalMinutes = h * 60 + checkMinute;
    const normalizedThis =
      crossedMidnight && h < startHour
        ? thisTotalMinutes + 24 * 60
        : thisTotalMinutes;
    const normalizedEnd =
      endHour < startHour ? endTotalMinutes + 24 * 60 : endTotalMinutes;

    if (normalizedThis >= normalizedEnd) break;
  }

  for (const slot of slots) {
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(slot.hour, slot.minute, 0, 0);

    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    const label = `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ [REMINDER CE ${label}] Cek Network & Traffic`,
        body: `1. ⚡ Speed Test WiFi Kasir\n2. 👥 Catat Traffic Pengunjung (Meja Terisi)`,
        data: { reportId, jam: label, type: 'hourly_check' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
  }
};

export const sendTestNotification = async (): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ [REMINDER CE] Cek Network & Traffic',
      body: '1. ⚡ Speed Test WiFi Kasir\n2. 👥 Catat Traffic Pengunjung (Meja Terisi)',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      repeats: false,
    },
  });
};
