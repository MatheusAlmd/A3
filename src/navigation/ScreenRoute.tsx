import React from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSession } from '../state/session';
import type { Role } from '../api/types';

export function roleHome(role?: Role): string {
  return role === 'Manager' ? '/manager' : role === 'Driver' ? '/driver' : '/citizen';
}
function destination(name: string, role?: Role): string {
  const base = roleHome(role);
  const paths: Record<string, string> = {
    Welcome: '/',
    Login: '/login',
    Register: '/register',
    Main: base,
    Home: '/citizen',
    Collections: '/citizen/collections',
    Current: '/driver',
    Overview: '/manager',
    Routes: '/manager/routes',
    Fleet: '/manager/fleet',
    Team: '/manager/team',
    Map: `${base}/map`,
    Profile: role === 'Manager' ? '/profile' : `${base}/profile`,
    NewCollection: '/new-collection',
    CollectionDetail: '/collection/[id]',
    RouteDetail: '/route/[id]',
    RouteCreate: '/route-create',
    TruckCreate: '/truck-create',
    TruckDetail: '/truck/[id]',
    UserCreate: '/user-create',
    UserDetail: '/user/[id]',
    CollectionsAll: '/collections-all',
    MapDetail: '/map-detail',
  };
  if (!paths[name]) throw new Error(`Unknown screen: ${name}`);
  return paths[name];
}
// Screen components remain independent of URL structure. Every navigation uses Expo Router.
export function ScreenRoute({
  component: Component,
  name,
  stack = false,
  ...extra
}: {
  component: React.ComponentType<any>;
  name: string;
  stack?: boolean;
  [key: string]: unknown;
}) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useSession();
  const href = (screen: string, args?: Record<string, string>) =>
    ({ pathname: destination(screen, user?.role), params: args || {} }) as Href;
  const navigation = {
    navigate: (screen: string, args?: Record<string, string>) =>
      router.navigate(href(screen, args)),
    replace: (screen: string, args?: Record<string, string>) => router.replace(href(screen, args)),
    goBack: () =>
      router.canGoBack() ? router.back() : router.replace(roleHome(user?.role) as Href),
  };
  return (
    <Component navigation={navigation} route={{ name, params: { ...params, stack } }} {...extra} />
  );
}
