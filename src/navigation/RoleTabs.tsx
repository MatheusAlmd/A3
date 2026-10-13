import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ClipboardList,
  House,
  LayoutDashboard,
  Map,
  Route,
  Truck,
  UserRound,
  Users,
} from 'lucide-react-native';
import { colors as c, fonts } from '../ui/theme';
import type { Role } from '../api/types';
export function RoleTabs({ role }: { role: Role }) {
  const insets = useSafeAreaInsets();
  const items =
    role === 'Citizen'
      ? [
          { name: 'index', title: 'Início', icon: House },
          { name: 'collections', title: 'Coletas', icon: ClipboardList },
          { name: 'map', title: 'Mapa', icon: Map },
          { name: 'profile', title: 'Perfil', icon: UserRound },
        ]
      : role === 'Driver'
        ? [
            { name: 'index', title: 'Minha rota', icon: Route },
            { name: 'map', title: 'Mapa', icon: Map },
            { name: 'profile', title: 'Perfil', icon: UserRound },
          ]
        : [
            { name: 'index', title: 'Visão geral', icon: LayoutDashboard },
            { name: 'routes', title: 'Rotas', icon: Route },
            { name: 'fleet', title: 'Frota', icon: Truck },
            { name: 'team', title: 'Equipe', icon: Users },
          ];
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: c.green,
        tabBarInactiveTintColor: '#819080',
        tabBarStyle: {
          backgroundColor: c.paper,
          borderTopColor: c.border,
          height: 68 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 10, marginTop: 3 },
      }}
    >
      {items.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: item.title,
            tabBarIcon: ({ focused, color }) => (
              <View
                style={{
                  width: 46,
                  height: 28,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: focused ? '#E2ECCB' : 'transparent',
                }}
              >
                <item.icon size={21} color={color} strokeWidth={focused ? 2 : 1.7} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
