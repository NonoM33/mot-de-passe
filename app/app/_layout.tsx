import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SocketProvider } from '@/contexts/SocketContext';
import { Colors } from '@/constants/config';

export default function RootLayout() {
  return (
    <SocketProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      />
    </SocketProvider>
  );
}
