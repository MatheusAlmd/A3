import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import {
  ArrowRight,
  CheckCheck,
  ChevronRight,
  Clock3,
  Leaf,
  MapPin,
  Plus,
  Truck,
} from 'lucide-react-native';
import { api, DEMO_MODE } from '../api/client';
import type { Collection, CollectionStatus } from '../api/types';
import { useResource } from '../hooks/useResource';
import { useSession } from '../state/session';
import {
  Badge,
  Brand,
  Card,
  Chips,
  Empty,
  IconBox,
  Notice,
  ResourceState,
  Row,
  Screen,
  Section,
  Txt,
} from '../ui/components';
import { TruckArt } from '../ui/illustrations';
import CityMap from '../ui/CityMap';
import { colors as c, formatDate } from '../ui/theme';

export function CollectionCard({ item, onPress }: { item: Collection; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Coleta em ${item.address || 'ponto informado'}, ${item.status}`}
      onPress={onPress}
    >
      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt color={c.muted} weight="bold" size={10}>
            COLETA #{item.id.slice(0, 6).toUpperCase()}
          </Txt>
          <Badge status={item.status} />
        </Row>
        <Row style={{ gap: 12 }}>
          <IconBox icon={item.status === 'Collected' ? CheckCheck : MapPin} size={42} />
          <View style={{ flex: 1, gap: 3 }}>
            <Txt weight="bold" size={14}>
              {item.address || 'Ponto de coleta informado'}
            </Txt>
            <Txt size={11} color={c.muted}>
              {formatDate(item.createdAt)}
            </Txt>
          </View>
          <ChevronRight size={18} color={c.muted} />
        </Row>
        {item.status === 'Assigned' && (
          <Row style={{ gap: 6, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 11 }}>
            <Truck size={14} color={c.green} />
            <Txt size={11} color={c.green}>
              Sua coleta já faz parte de uma rota.
            </Txt>
          </Row>
        )}
      </Card>
    </Pressable>
  );
}
export function CitizenHome({ navigation }: any) {
  const { width } = useWindowDimensions();
  const { user } = useSession();
  const requests = useResource(api.mine, 'home-requests', 20000);
  const positions = useResource(() => api.locations(), 'home-map', 20000);
  const items = requests.data || [];
  const active = items.filter((i) => i.status === 'Pending' || i.status === 'Assigned');
  const completed = items.filter((i) => i.status === 'Collected');
  const online = (positions.data || []).filter((p) => p.isOnline);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return (
    <Screen
      refreshing={requests.refreshing}
      onRefresh={() => {
        void requests.refresh();
        void positions.refresh();
      }}
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <Brand small />
        <Row style={{ gap: 10 }}>
          {DEMO_MODE && (
            <Txt color={c.muted} size={9} weight="bold" style={{ letterSpacing: 1 }}>
              DEMO
            </Txt>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir meu perfil"
            onPress={() => navigation.navigate('Profile')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#E4EBCF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={13} weight="extra" color={c.green}>
              {user?.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </Txt>
          </Pressable>
        </Row>
      </Row>
      <View style={{ gap: 5 }}>
        <Txt color={c.muted} size={13}>
          {greeting}, {user?.name.split(' ')[0]} <Txt color={c.green}>☀</Txt>
        </Txt>
        <Txt size={32} weight="extra" style={{ letterSpacing: -1.2, lineHeight: 40 }}>
          Cuidar da cidade começa por aqui.
        </Txt>
      </View>
      <View
        style={{
          backgroundColor: c.greenDark,
          borderRadius: 24,
          overflow: 'hidden',
          padding: 21,
          gap: 18,
        }}
      >
        <Row style={{ gap: 8 }}>
          <View style={{ flex: 1, gap: 9 }}>
            <Row style={{ gap: 6 }}>
              <Leaf size={13} color={c.lime} />
              <Txt size={10} color={c.lime} weight="bold" style={{ letterSpacing: 1.5 }}>
                FAÇA SUA PARTE
              </Txt>
            </Row>
            <Txt
              size={23}
              weight="bold"
              color={c.white}
              style={{ letterSpacing: -0.6, lineHeight: 30 }}
            >
              Menos resíduos. Mais vida.
            </Txt>
            <Txt size={11} color="#C1D2C2">
              A coleta vai até você.
            </Txt>
          </View>
          <View style={{ marginRight: -22, marginLeft: -8 }}>
            <TruckArt size={Math.min(width, 480) < 360 ? 122 : 154} />
          </View>
        </Row>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Solicitar coleta"
          onPress={() => navigation.navigate('NewCollection')}
          style={({ pressed }) => ({
            minHeight: 48,
            borderRadius: 13,
            backgroundColor: c.lime,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Row style={{ gap: 8 }}>
            <Plus size={18} color={c.greenDark} />
            <Txt size={13} weight="extra" color={c.greenDark}>
              Solicitar coleta
            </Txt>
          </Row>
          <ArrowRight size={18} color={c.greenDark} />
        </Pressable>
      </View>
      <View style={{ gap: 10 }}>
        <Section
          title="Suas coletas"
          action="Ver todas"
          onPress={() => navigation.navigate('Collections')}
        />
        <ResourceState
          loading={requests.loading}
          error={requests.error}
          retry={() => void requests.refresh()}
        />
        {!requests.loading && !requests.error && (
          <>
            <Row style={{ gap: 10 }}>
              <Card style={{ flex: 1, padding: 15, gap: 8 }}>
                <Row style={{ gap: 7 }}>
                  <Clock3 size={16} color={c.green} />
                  <Txt color={c.muted} size={11}>
                    Em aberto
                  </Txt>
                </Row>
                <Txt size={27} weight="extra" style={{ letterSpacing: -1 }}>
                  {String(active.length).padStart(2, '0')}
                </Txt>
              </Card>
              <Card style={{ flex: 1, padding: 15, gap: 8 }}>
                <Row style={{ gap: 7 }}>
                  <CheckCheck size={16} color={c.green} />
                  <Txt color={c.muted} size={11}>
                    Concluídas
                  </Txt>
                </Row>
                <Txt size={27} weight="extra" style={{ letterSpacing: -1 }}>
                  {String(completed.length).padStart(2, '0')}
                </Txt>
              </Card>
            </Row>
            {active[0] ? (
              <CollectionCard
                item={active[0]}
                onPress={() => navigation.navigate('CollectionDetail', { id: active[0].id })}
              />
            ) : (
              <Empty
                title="Vamos começar?"
                body="Sua primeira coleta pode ser solicitada em poucos toques."
                icon={Leaf}
              />
            )}
          </>
        )}
      </View>
      <View style={{ gap: 10 }}>
        <Section
          title="A cidade em movimento"
          action="Abrir mapa"
          onPress={() => navigation.navigate('Map')}
        />
        {positions.error ? (
          <Notice>{positions.error}</Notice>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver caminhões no mapa"
            onPress={() => navigation.navigate('Map')}
          >
            <CityMap locations={positions.data || []} height={165} />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                backgroundColor: c.white,
                borderRadius: 22,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Row style={{ gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.green }} />
                <Txt size={10} weight="bold">
                  {positions.loading
                    ? 'Consultando GPS…'
                    : `${online.length} ${online.length === 1 ? 'caminhão' : 'caminhões'} com GPS recente`}
                </Txt>
              </Row>
            </View>
          </Pressable>
        )}
        <Txt size={10} color={c.muted}>
          Cada solicitação ajuda a construir um entorno melhor.
        </Txt>
      </View>
    </Screen>
  );
}
export function CollectionsScreen({ navigation, all = false }: any) {
  const [filter, setFilter] = useState<CollectionStatus | 'All'>('All');
  const data = useResource(
    () => (all ? api.collections() : api.mine()),
    `collections-${all}`,
    20000,
  );
  const items = (data.data || [])
    .filter((i) => filter === 'All' || i.status === filter)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <Screen
      navigation={navigation}
      back={all}
      title={all ? 'Solicitações' : 'Suas coletas'}
      subtitle={all ? 'Acompanhe os pedidos da cidade.' : 'Cada pedido, do início à coleta.'}
      action={
        !all ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nova coleta"
            onPress={() => navigation.navigate('NewCollection')}
          >
            <IconBox icon={Plus} bg={c.green} color={c.white} />
          </Pressable>
        ) : undefined
      }
      refreshing={data.refreshing}
      onRefresh={() => void data.refresh()}
    >
      <Chips
        options={[
          { value: 'All', label: 'Todas' },
          { value: 'Pending', label: 'Aguardando' },
          { value: 'Assigned', label: 'Atribuídas' },
          { value: 'Collected', label: 'Coletadas' },
          { value: 'Cancelled', label: 'Canceladas' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {!data.loading &&
        !data.error &&
        (items.length ? (
          <View style={{ gap: 12 }}>
            {items.map((item) => (
              <CollectionCard
                key={item.id}
                item={item}
                onPress={() => navigation.navigate('CollectionDetail', { id: item.id })}
              />
            ))}
          </View>
        ) : (
          <Empty
            title="Nenhuma coleta por aqui"
            body={
              filter === 'All'
                ? 'Quando houver uma solicitação, ela aparecerá aqui.'
                : 'Não há solicitações com este status.'
            }
            action={!all ? 'Solicitar coleta' : undefined}
            onPress={() => navigation.navigate('NewCollection')}
          />
        ))}
    </Screen>
  );
}
