import { Stack } from 'expo-router';
import { useSession } from '../../state/session';
export default function AppLayout() {
  const { user } = useSession();
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Protected guard={user?.role === 'Citizen'}>
        <Stack.Screen name="citizen" />
        <Stack.Screen name="new-collection" options={{ title: 'Nova coleta' }} />
      </Stack.Protected>
      <Stack.Protected guard={user?.role === 'Driver'}>
        <Stack.Screen name="driver" />
      </Stack.Protected>
      <Stack.Protected guard={user?.role === 'Manager'}>
        <Stack.Screen name="manager" />
        <Stack.Screen name="route-create" options={{ title: 'Criar rota' }} />
        <Stack.Screen name="truck-create" options={{ title: 'Cadastrar caminhão' }} />
        <Stack.Screen name="truck/[id]" options={{ title: 'Caminhão' }} />
        <Stack.Screen name="user-create" options={{ title: 'Cadastrar pessoa' }} />
        <Stack.Screen name="user/[id]" options={{ title: 'Pessoa' }} />
        <Stack.Screen name="collections-all" options={{ title: 'Solicitações' }} />
      </Stack.Protected>
      <Stack.Protected guard={user?.role === 'Citizen' || user?.role === 'Manager'}>
        <Stack.Screen name="collection/[id]" options={{ title: 'Acompanhar coleta' }} />
      </Stack.Protected>
      <Stack.Protected guard={user?.role === 'Driver' || user?.role === 'Manager'}>
        <Stack.Screen name="route/[id]" options={{ title: 'Detalhes da rota' }} />
      </Stack.Protected>
      <Stack.Screen name="map-detail" options={{ title: 'Mapa' }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
    </Stack>
  );
}
