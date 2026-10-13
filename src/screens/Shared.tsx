import React, { useState } from 'react';
import { View } from 'react-native';
import { ArrowRight, LogOut, MapPin, Truck } from 'lucide-react-native';
import { api, DEMO_MODE } from '../api/client';
import { ApiError } from '../api/errors';
import type { Role } from '../api/types';
import { useResource } from '../hooks/useResource';
import { useSession } from '../state/session';
import {
  Brand,
  Button,
  Card,
  Chips,
  DetailLine,
  Empty,
  IconBox,
  Notice,
  ResourceState,
  Row,
  Screen,
  Section,
  Txt,
  useFeedback,
} from '../ui/components';
import CityMap from '../ui/CityMap';
import { colors as c, coordinateLabel, formatDate, roleLabels } from '../ui/theme';
export function MapScreen({ navigation, route }: any) {
  const { user } = useSession();
  const [filter, setFilter] = useState<'All' | 'Recent'>('All');
  const [selected, setSelected] = useState<string | null>(null);
  const data = useResource(
    async () => {
      if (user?.role === 'Driver') {
        const r = await api.currentRoute();
        if (!r) return [];
        try {
          return [await api.location(r.truckId)];
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) return [];
          throw e;
        }
      }
      return api.locations(user?.role === 'Manager');
    },
    `map-${user?.role}`,
    20000,
  );
  const items = (data.data || []).filter((l) => filter === 'All' || l.isOnline);
  const chosen = items.find((l) => l.truckId === selected);
  return (
    <Screen
      back={route.name === 'MapDetail'}
      navigation={navigation}
      title="A cidade em movimento."
      subtitle="Acompanhe as últimas posições dos caminhões."
      refreshing={data.refreshing}
      onRefresh={() => void data.refresh()}
    >
      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'All', label: 'Todas as posições' },
          { value: 'Recent', label: 'GPS recente' },
        ]}
      />
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {!data.loading && !data.error && (
        <>
          <CityMap locations={items} height={330} interactive onTruck={setSelected} />
          <Row style={{ gap: 16 }}>
            <Row style={{ gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.green }} />
              <Txt size={10} color={c.muted}>
                GPS recente
              </Txt>
            </Row>
            <Row style={{ gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.muted }} />
              <Txt size={10} color={c.muted}>
                Última posição
              </Txt>
            </Row>
          </Row>
          {!items.length ? (
            <Empty
              title="Ainda sem posições"
              body="As posições aparecem depois que os motoristas compartilham o GPS."
              icon={MapPin}
            />
          ) : (
            <View style={{ gap: 12 }}>
              <Section
                title={
                  chosen
                    ? 'Caminhão selecionado'
                    : `${items.length} ${items.length === 1 ? 'caminhão' : 'caminhões'} no mapa`
                }
              />
              {(chosen ? [chosen] : items).map((l) => (
                <Card key={l.truckId}>
                  <Row style={{ gap: 12 }}>
                    <IconBox icon={Truck} />
                    <View style={{ flex: 1, gap: 3 }}>
                      <Txt size={14} weight="bold">
                        Caminhão {l.truckId.slice(0, 4).toUpperCase()}
                      </Txt>
                      <Txt size={11} color={l.isOnline ? c.green : c.muted}>
                        {l.isOnline ? 'GPS recente' : 'Sem GPS recente'}
                      </Txt>
                    </View>
                  </Row>
                  <DetailLine label="Leitura no aparelho" value={formatDate(l.recordedAt)} />
                  <DetailLine label="Posição" value={coordinateLabel(l)} />
                  {user?.role === 'Manager' && (
                    <Button
                      title="Ver caminhão"
                      variant="secondary"
                      compact
                      icon={ArrowRight}
                      onPress={() => navigation.navigate('TruckDetail', { id: l.truckId })}
                    />
                  )}
                </Card>
              ))}
            </View>
          )}
          <Notice>Uma posição antiga não garante que o caminhão continue no mesmo local.</Notice>
        </>
      )}
    </Screen>
  );
}
export function ProfileScreen({ navigation, route }: any) {
  const { user, logout, enterDemo } = useSession();
  const data = useResource(api.me, 'profile');
  const { confirm } = useFeedback();
  const item = data.data || user;
  const exit = async () => {
    if (await confirm('Sair da sua conta?', 'Você poderá entrar novamente quando quiser.', 'Sair'))
      logout();
  };
  return (
    <Screen
      back={!!route.params?.stack}
      navigation={navigation}
      title="Seu perfil."
      subtitle="Você também faz parte dessa mudança."
    >
      {item && (
        <Card style={{ alignItems: 'center', paddingVertical: 30, gap: 12 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: c.sage,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={24} weight="extra" color={c.green}>
              {item.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </Txt>
          </View>
          <Txt size={23} weight="bold" style={{ textAlign: 'center' }}>
            {item.name}
          </Txt>
          <Txt color={c.muted} size={13}>
            {item.email}
          </Txt>
          <View
            style={{
              backgroundColor: c.sage,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Txt size={11} weight="bold" color={c.green}>
              {roleLabels[item.role]}
            </Txt>
          </View>
        </Card>
      )}
      {!!data.error && <Notice tone="error">{data.error}</Notice>}
      <Card>
        <DetailLine label="Conta desde" value={formatDate(item?.createdAt || null, false)} />
        <DetailLine label="Situação" value={item?.active ? 'Ativa' : 'Inativa'} />
      </Card>
      {DEMO_MODE && (
        <View style={{ gap: 12 }}>
          <Section title="Explore outro perfil" />
          <Notice>
            Modo de demonstração com dados fictícios. Alterações duram enquanto o aplicativo estiver
            aberto.
          </Notice>
          {(['Citizen', 'Driver', 'Manager'] as Role[])
            .filter((role) => role !== user?.role)
            .map((role) => (
              <Button
                key={role}
                title={`Explorar como ${roleLabels[role].toLowerCase()}`}
                variant="secondary"
                icon={ArrowRight}
                onPress={() => enterDemo(role)}
              />
            ))}
        </View>
      )}
      <Button title="Sair da conta" variant="ghost" icon={LogOut} onPress={() => void exit()} />
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 10 }}>
        <Brand small />
        <Txt size={10} color={c.muted}>
          Cuidar é coletivo. · Versão 1.0
        </Txt>
      </View>
    </Screen>
  );
}
