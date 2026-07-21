// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDb } from '../database/db';
import { requestNotificationPermission } from '../services/notifications';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  useEffect(() => {
    const setup = async () => {
      await initDb();
      await requestNotificationPermission();
    };
    setup();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.dark },
          headerTintColor: Colors.textPrimary as string,
          headerTitleStyle: { fontWeight: 'bold', color: Colors.textPrimary },
          contentStyle: { backgroundColor: Colors.dark },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="report/[id]"
          options={{
            title: 'Detail Laporan',
            headerBackTitle: 'Kembali',
          }}
        />
      </Stack>
    </>
  );
}
