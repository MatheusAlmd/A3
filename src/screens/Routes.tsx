import React, { useState } from 'react';
import { Linking, Pressable, Switch, View } from 'react-native';
import {
  Check,
  CheckCheck,
  ChevronRight,
  MapPin,
  Navigation2,
  Play,
  Plus,
  Route as RouteIcon,
  Truck,
  X,
} from 'lucide-react-native';
import { api, DEMO_MODE } from '../api/client';
import type { Route, RouteStatus, StopInput } from '../api/types';
import { useResource } from '../hooks/useResource';
import { useTracking } from '../hooks/useTracking';
import { useSession } from '../state/session';
import {
  Badge,
  Button,
  Card,
  Chips,
  Empty,
  Field,
  IconBox,
  Notice,
  ResourceState,
  Row,
  Screen,
  Section,
  Txt,
  useAction,
  useFeedback,
} from '../ui/components';
import CityMap from '../ui/CityMap';
import { colors as c, coordinateLabel, distance, formatDate } from '../ui/theme';
import { GeoPicker, parseCoordinates } from './CollectionFlow';

function RouteBody({
  item,
  refresh,
  navigation,
  current = false,
}: {
  item: Route;
  refresh: () => void;
  navigation: any;
  current?: boolean;
}) {
  const { user } = useSession();
  const action = useAction();
  const feedback = useFeedback();
  const tracking = useTracking(item);
  const stops = [...item.stops].sort((a, b) => Number(a.sequence) - Number(b.sequence));
  const done = stops.filter((s) => s.status === 'Completed').length;
  const next = stops.find((s) => s.status === 'Pending');
  const progress = stops.length ? done / stops.length : 0;
  const start = async () => {
    const result = await action.run(() => api.startRoute(item.id));
    if (result) {
      feedback.toast('Rota iniciada.');
      refresh();
    }
  };
  const complete = async (id: string) => {
    if (
      !(await feedback.confirm(
        'Confirmar esta coleta?',
        'Registre somente depois de recolher os resíduos neste ponto.',
        'Confirmar coleta',
        'primary',
      ))
    )
      return;
    const result = await action.run(() => api.completeStop(item.id, id));
    if (result) {
      feedback.toast(
        result.status === 'Completed'
          ? 'Todas as paradas atendidas. Rota concluída!'
          : 'Coleta confirmada. Vamos à próxima parada.',
      );
      refresh();
    }
  };
  const cancel = async () => {
    if (
      !(await feedback.confirm(
        'Cancelar esta rota?',
        'Solicitações atribuídas nesta rota voltarão para a fila de atendimento.',
        'Cancelar rota',
      ))
    )
      return;
    const result = await action.run(() => api.cancelRoute(item.id));
    if (result) {
      feedback.toast('Rota cancelada.');
      refresh();
    }
  };
  const navigate = async () => {
    if (!next) return;
    try {
      await Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${Number(next.latitude)},${Number(next.longitude)}&travelmode=driving`,
      );
    } catch {
      action.setError('Não foi possível abrir o aplicativo de mapas.');
    }
  };
  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <Badge status={item.status} />
        <Txt size={11} color={c.muted}>
          {distance(item.estimatedDistanceKm)} estimados
        </Txt>
      </Row>
      <Card style={{ backgroundColor: c.greenDark, borderWidth: 0, padding: 22, gap: 16 }}>
        <Row style={{ gap: 12 }}>
          <IconBox icon={RouteIcon} bg="#315B45" color={c.lime} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt size={19} color={c.white} weight="bold">
              {item.name}
            </Txt>
            <Txt size={11} color="#BCD0BF">
              {formatDate(item.scheduledFor)}
            </Txt>
          </View>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt color={c.lime} size={25} weight="extra">
            {done}
            <Txt size={14} color="#BCD0BF">
              {' '}
              / {stops.length} paradas
            </Txt>
          </Txt>
          <Txt size={12} color="#BCD0BF">
            {Math.round(progress * 100)}%
          </Txt>
        </Row>
        <View
          style={{ height: 5, borderRadius: 4, backgroundColor: '#446451', overflow: 'hidden' }}
        >
          <View
            style={{
              height: 5,
              borderRadius: 4,
              width: `${progress * 100}%`,
              backgroundColor: c.lime,
            }}
          />
        </View>
      </Card>
      <CityMap stops={stops} height={210} interactive />
      <Txt color={c.muted} size={10}>
        Linha esquemática da sequência de paradas. Use a navegação para o trajeto pelas ruas.
      </Txt>
      {current && user?.role === 'Driver' && item.status === 'InProgress' && (
        <Card>
          <Row style={{ gap: 12 }}>
            <IconBox icon={Truck} />
            <View style={{ flex: 1, gap: 3 }}>
              <Txt weight="bold" size={13}>
                Compartilhar GPS
              </Txt>
              <Txt size={10} color={c.muted}>
                {tracking.enabled ? 'Envios com o app em primeiro plano' : 'Ative durante sua rota'}
              </Txt>
            </View>
            <Switch
              accessibilityLabel="Compartilhar GPS durante a rota"
              value={tracking.enabled}
              disabled={tracking.requesting}
              onValueChange={() => void tracking.toggle()}
              trackColor={{ false: c.border, true: '#BCD59C' }}
              thumbColor={tracking.enabled ? c.green : c.white}
            />
          </Row>
          {tracking.enabled && (
            <Txt color={c.muted} size={10}>
              {DEMO_MODE ? 'Posições fictícias · ' : ''}
              {tracking.lastSent
                ? `Último envio: ${formatDate(tracking.lastSent)}`
                : 'Preparando a primeira leitura…'}
            </Txt>
          )}
          {!!tracking.error && <Notice tone="error">{tracking.error}</Notice>}
        </Card>
      )}
      {next && item.status === 'InProgress' && (
        <View style={{ gap: 10 }}>
          <Section title="Próxima parada" />
          <Card style={{ borderColor: '#C3D1B5', gap: 15 }}>
            <Row style={{ gap: 12 }}>
              <IconBox icon={MapPin} bg={c.sage} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt weight="bold" size={16}>
                  {next.address || `Parada ${next.sequence}`}
                </Txt>
                <Txt color={c.muted} size={11}>
                  {next.origin === 'CollectionRequest'
                    ? 'Solicitação de cidadão'
                    : 'Parada planejada'}
                </Txt>
              </View>
            </Row>
            <Button
              title="Abrir navegação"
              icon={Navigation2}
              variant="secondary"
              onPress={() => void navigate()}
            />
            <Button
              title="Confirmar coleta"
              icon={CheckCheck}
              loading={action.busy}
              onPress={() => void complete(next.id)}
            />
          </Card>
        </View>
      )}
      {item.status === 'Planned' && (
        <Button
          title="Iniciar rota"
          icon={Play}
          loading={action.busy}
          onPress={() => void start()}
        />
      )}
      <View style={{ gap: 12 }}>
        <Section title="Todas as paradas" />
        {stops.map((stop) => (
          <Card key={stop.id} style={{ padding: 15, gap: 8 }}>
            <Row style={{ gap: 12 }}>
              <View
                style={{
                  width: 31,
                  height: 31,
                  borderRadius: 16,
                  backgroundColor: stop.status === 'Completed' ? c.sage : c.green,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {stop.status === 'Completed' ? (
                  <Check size={15} color={c.green} />
                ) : (
                  <Txt size={12} weight="bold" color={c.white}>
                    {stop.sequence}
                  </Txt>
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt size={13} weight="bold" color={stop.status === 'Completed' ? c.muted : c.ink}>
                  {stop.address || coordinateLabel(stop)}
                </Txt>
                <Txt color={c.muted} size={10}>
                  {stop.status === 'Completed'
                    ? 'Coletada'
                    : stop.status === 'Skipped'
                      ? 'Não atendida'
                      : stop.origin === 'CollectionRequest'
                        ? 'Inserida por solicitação'
                        : 'Planejada'}
                </Txt>
              </View>
              {stop.status === 'Completed' && <CheckCheck size={17} color={c.green} />}
            </Row>
          </Card>
        ))}
        {!stops.length && (
          <Empty title="Sem paradas" body="Esta rota ainda não possui pontos de coleta." />
        )}
      </View>
      {!!action.error && <Notice tone="error">{action.error}</Notice>}
      {user?.role === 'Manager' && ['Planned', 'InProgress'].includes(item.status) && (
        <Button
          title="Cancelar rota"
          variant="danger"
          loading={action.busy}
          onPress={() => void cancel()}
        />
      )}
    </>
  );
}
export function CurrentRouteScreen({ navigation }: any) {
  const data = useResource(api.currentRoute, 'current-route', 15000);
  return (
    <Screen
      title="Seu caminho de hoje."
      subtitle="Uma parada de cada vez. Uma cidade melhor."
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Meu perfil"
          onPress={() => navigation.navigate('Profile')}
        >
          <IconBox icon={Truck} />
        </Pressable>
      }
      refreshing={data.refreshing}
      onRefresh={() => void data.refresh()}
    >
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {!data.loading &&
        !data.error &&
        (data.data ? (
          <RouteBody
            item={data.data}
            refresh={() => void data.refresh()}
            navigation={navigation}
            current
          />
        ) : (
          <Empty
            title="Tudo certo por aqui."
            body="Você não tem uma rota em andamento ou planejada. Assim que o gestor atribuir uma, ela aparecerá aqui."
            icon={RouteIcon}
            action="Atualizar"
            onPress={() => void data.refresh()}
          />
        ))}
    </Screen>
  );
}
export function RouteDetailScreen({ navigation, route }: any) {
  const data = useResource(() => api.route(route.params.id), route.params.id, 15000);
  return (
    <Screen
      back
      navigation={navigation}
      title="Detalhes da rota."
      refreshing={data.refreshing}
      onRefresh={() => void data.refresh()}
    >
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {data.data && (
        <RouteBody item={data.data} refresh={() => void data.refresh()} navigation={navigation} />
      )}
    </Screen>
  );
}
export function RoutesScreen({ navigation }: any) {
  const [filter, setFilter] = useState<RouteStatus | 'All'>('All');
  const data = useResource(() => api.routes(), 'routes', 15000);
  const items = (data.data || []).filter((r) => filter === 'All' || r.status === filter);
  return (
    <Screen
      title="Rotas de coleta."
      subtitle="Planeje caminhos. Conecte a cidade."
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Criar rota"
          onPress={() => navigation.navigate('RouteCreate')}
        >
          <IconBox icon={Plus} bg={c.green} color={c.white} />
        </Pressable>
      }
      refreshing={data.refreshing}
      onRefresh={() => void data.refresh()}
    >
      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'All', label: 'Todas' },
          { value: 'InProgress', label: 'Em andamento' },
          { value: 'Planned', label: 'Planejadas' },
          { value: 'Completed', label: 'Concluídas' },
          { value: 'Cancelled', label: 'Canceladas' },
        ]}
      />
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {!data.loading &&
        !data.error &&
        (items.length ? (
          <View style={{ gap: 12 }}>
            {items.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                onPress={() => navigation.navigate('RouteDetail', { id: r.id })}
              >
                <Card>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <IconBox icon={RouteIcon} />
                    <Badge status={r.status} />
                  </Row>
                  <Txt size={18} weight="bold">
                    {r.name}
                  </Txt>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt size={11} color={c.muted}>
                      {r.pendingStops} pendentes · {r.totalStops} paradas
                    </Txt>
                    <ChevronRight size={18} color={c.green} />
                  </Row>
                  <Txt size={10} color={c.muted}>
                    {formatDate(r.scheduledFor)}
                  </Txt>
                </Card>
              </Pressable>
            ))}
          </View>
        ) : (
          <Empty
            title="Sem rotas neste status"
            body="Cadastre uma rota para organizar as próximas coletas."
            icon={RouteIcon}
          />
        ))}
    </Screen>
  );
}
export function RouteCreateScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [truckId, setTruckId] = useState('');
  const [scheduled, setScheduled] = useState('');
  const [optimize, setOptimize] = useState(true);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [stops, setStops] = useState<StopInput[]>([]);
  const data = useResource(api.trucks, 'route-trucks');
  const action = useAction();
  const { toast } = useFeedback();
  const add = () => {
    try {
      setStops([
        ...stops,
        { ...parseCoordinates(latitude, longitude), address: address.trim() || null },
      ]);
      setLatitude('');
      setLongitude('');
      setAddress('');
      action.setError('');
    } catch (e) {
      action.setError((e as Error).message);
    }
  };
  const submit = async () => {
    if (!name.trim() || !truckId || !stops.length) {
      action.setError('Informe um nome, selecione o caminhão e adicione ao menos uma parada.');
      return;
    }
    let scheduledFor: string | null = null;
    if (scheduled.trim()) {
      const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(scheduled.trim());
      if (!match) {
        action.setError('Use DD/MM/AAAA HH:MM para o agendamento.');
        return;
      }
      const [, day, month, year, hour, minute] = match;
      const d = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
      );
      if (
        d.getDate() !== Number(day) ||
        d.getMonth() !== Number(month) - 1 ||
        d.getFullYear() !== Number(year) ||
        d.getHours() !== Number(hour) ||
        d.getMinutes() !== Number(minute)
      ) {
        action.setError('Confira a data e o horário informados.');
        return;
      }
      scheduledFor = d.toISOString();
    }
    const result = await action.run(() =>
      api.createRoute({ name: name.trim(), truckId, scheduledFor, start: null, stops, optimize }),
    );
    if (result) {
      toast('Rota planejada. Inicie quando estiver tudo pronto.');
      navigation.replace('RouteDetail', { id: result.id });
    }
  };
  return (
    <Screen
      back
      navigation={navigation}
      title="Um novo caminho."
      subtitle="Defina o caminhão e os pontos da coleta."
    >
      <Field
        label="Nome da rota"
        value={name}
        onChangeText={setName}
        placeholder="Ex.: Centro • manhã"
        error={action.fields.name?.[0]}
      />
      <View style={{ gap: 9 }}>
        <Txt size={12} weight="semi">
          Caminhão
        </Txt>
        <ResourceState
          loading={data.loading}
          error={data.error}
          retry={() => void data.refresh()}
        />
        {data.data
          ?.filter((t) => t.active)
          .map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityState={{ selected: truckId === t.id }}
              onPress={() => setTruckId(t.id)}
            >
              <Card
                style={{
                  padding: 14,
                  borderColor: truckId === t.id ? c.green : c.border,
                  backgroundColor: truckId === t.id ? c.sage : c.white,
                }}
              >
                <Row style={{ gap: 10 }}>
                  <Truck size={18} color={c.green} />
                  <Txt size={13} weight="bold" style={{ flex: 1 }}>
                    {t.plate}
                  </Txt>
                  {truckId === t.id && <Check size={18} color={c.green} />}
                </Row>
              </Card>
            </Pressable>
          ))}
        {data.data && !data.data.length && (
          <Empty
            title="Cadastre um caminhão"
            body="Uma rota precisa estar vinculada a um caminhão."
            action="Cadastrar caminhão"
            onPress={() => navigation.navigate('TruckCreate')}
          />
        )}
      </View>
      <Field
        label="Agendamento (opcional)"
        value={scheduled}
        onChangeText={setScheduled}
        placeholder="DD/MM/AAAA HH:MM"
      />
      <Card>
        <Row style={{ gap: 10 }}>
          <IconBox icon={RouteIcon} />
          <View style={{ flex: 1 }}>
            <Txt size={13} weight="bold">
              Otimizar percurso
            </Txt>
            <Txt size={11} color={c.muted}>
              Organizar a sequência pelo menor trajeto.
            </Txt>
          </View>
          <Switch
            value={optimize}
            onValueChange={setOptimize}
            accessibilityLabel="Otimizar percurso"
            trackColor={{ true: '#BCD59C', false: c.border }}
            thumbColor={optimize ? c.green : c.white}
          />
        </Row>
      </Card>
      <Section title={`Paradas · ${stops.length}`} />
      {stops.map((s, i) => (
        <Card key={i} style={{ padding: 13 }}>
          <Row style={{ gap: 10 }}>
            <Txt color={c.green} size={12} weight="bold">
              {i + 1}
            </Txt>
            <Txt style={{ flex: 1 }} size={12}>
              {s.address || coordinateLabel(s)}
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover parada ${i + 1}`}
              onPress={() => setStops(stops.filter((_, j) => j !== i))}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <X color={c.red} size={17} />
            </Pressable>
          </Row>
        </Card>
      ))}
      <GeoPicker
        latitude={latitude}
        longitude={longitude}
        setLatitude={setLatitude}
        setLongitude={setLongitude}
      />
      <Field
        label="Referência da parada (opcional)"
        value={address}
        onChangeText={setAddress}
        placeholder="Rua e número ou referência"
      />
      <Button title="Adicionar esta parada" icon={Plus} variant="secondary" onPress={add} />
      {DEMO_MODE && (
        <Notice>A demonstração mantém a ordem inserida e não calcula otimização real.</Notice>
      )}
      {!!action.error && <Notice tone="error">{action.error}</Notice>}
      <Button
        title="Criar rota planejada"
        icon={ArrowRightIcon}
        loading={action.busy}
        disabled={!data.data?.length}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
const ArrowRightIcon = ChevronRight;
