import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  MapPin,
  Plus,
  Route as RouteIcon,
  Truck,
  UserRound,
  Users,
} from 'lucide-react-native';
import { api } from '../api/client';
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
import { colors as c, formatDate, roleLabels } from '../ui/theme';

export function OverviewScreen({ navigation }: any) {
  const { user } = useSession();
  const data = useResource(
    async () => {
      const [collections, routes, locations, trucks] = await Promise.all([
        api.collections(),
        api.routes(),
        api.locations(true),
        api.trucks(),
      ]);
      return { collections, routes, locations, trucks };
    },
    'overview',
    20000,
  );
  const value = data.data;
  const pending = value?.collections.filter((i) => i.status === 'Pending') || [];
  const active = value?.routes.filter((r) => r.status === 'InProgress') || [];
  return (
    <Screen refreshing={data.refreshing} onRefresh={() => void data.refresh()}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Brand small />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Meu perfil"
          onPress={() => navigation.navigate('Profile')}
        >
          <IconBox icon={UserRound} />
        </Pressable>
      </Row>
      <View style={{ gap: 6 }}>
        <Txt color={c.muted} size={13}>
          Olá, {user?.name.split(' ')[0]} · Gestão
        </Txt>
        <Txt size={31} weight="extra" style={{ letterSpacing: -1.1, lineHeight: 39 }}>
          A cidade sob um novo olhar.
        </Txt>
      </View>
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {value && (
        <>
          <View style={{ gap: 10 }}>
            <Row style={{ gap: 10 }}>
              {[
                { label: 'Rotas ativas', value: active.length, icon: RouteIcon },
                { label: 'Na fila', value: pending.length, icon: Clock3 },
              ].map((stat) => (
                <Card key={stat.label} style={{ flex: 1, padding: 16, gap: 12 }}>
                  <Row style={{ gap: 7 }}>
                    <stat.icon size={16} color={c.green} />
                    <Txt size={11} color={c.muted}>
                      {stat.label}
                    </Txt>
                  </Row>
                  <Txt size={30} weight="extra">
                    {String(stat.value).padStart(2, '0')}
                  </Txt>
                </Card>
              ))}
            </Row>
            <Row style={{ gap: 10 }}>
              {[
                {
                  label: 'GPS recente',
                  value: value.locations.filter((l) => l.isOnline).length,
                  icon: MapPin,
                },
                { label: 'Caminhões', value: value.trucks.length, icon: Truck },
              ].map((stat) => (
                <Card key={stat.label} style={{ flex: 1, padding: 16, gap: 12 }}>
                  <Row style={{ gap: 7 }}>
                    <stat.icon size={16} color={c.green} />
                    <Txt size={11} color={c.muted}>
                      {stat.label}
                    </Txt>
                  </Row>
                  <Txt size={30} weight="extra">
                    {String(stat.value).padStart(2, '0')}
                  </Txt>
                </Card>
              ))}
            </Row>
          </View>
          <Card style={{ backgroundColor: c.greenDark, borderWidth: 0, padding: 22, gap: 15 }}>
            <Row style={{ gap: 12 }}>
              <IconBox icon={ClipboardList} bg="#315B45" color={c.lime} />
              <View style={{ flex: 1, gap: 5 }}>
                <Txt size={18} weight="bold" color={c.white}>
                  {pending.length ? 'A fila precisa de você.' : 'Tudo sob controle.'}
                </Txt>
                <Txt size={12} color="#C1D2C2">
                  {pending.length
                    ? `${pending.length} solicitaç${pending.length === 1 ? 'ão aguarda' : 'ões aguardam'} uma rota elegível.`
                    : 'Acompanhe o andamento das solicitações da cidade.'}
                </Txt>
              </View>
            </Row>
            <Button
              title="Ver solicitações"
              variant="secondary"
              icon={ArrowRight}
              onPress={() => navigation.navigate('CollectionsAll')}
            />
          </Card>
          <View style={{ gap: 12 }}>
            <Section
              title="Frota em movimento"
              action="Abrir mapa"
              onPress={() => navigation.navigate('MapDetail')}
            />
            <CityMap
              locations={value.locations}
              height={190}
              onTruck={(id) => navigation.navigate('TruckDetail', { id })}
              interactive
            />
          </View>
          <View style={{ gap: 12 }}>
            <Section
              title="Rotas em andamento"
              action="Ver todas"
              onPress={() => navigation.navigate('Routes')}
            />
            {active.length ? (
              active.map((r) => (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('RouteDetail', { id: r.id })}
                >
                  <Card>
                    <Row style={{ gap: 12 }}>
                      <IconBox icon={RouteIcon} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Txt size={14} weight="bold">
                          {r.name}
                        </Txt>
                        <Txt size={11} color={c.muted}>
                          {r.pendingStops} paradas pendentes
                        </Txt>
                      </View>
                      <ChevronRight color={c.green} size={18} />
                    </Row>
                  </Card>
                </Pressable>
              ))
            ) : (
              <Empty
                title="Nenhuma rota em andamento"
                body="Crie e inicie uma rota para atender as solicitações."
                icon={RouteIcon}
              />
            )}
          </View>
          <Button
            title="Planejar nova rota"
            onPress={() => navigation.navigate('RouteCreate')}
            icon={Plus}
          />
        </>
      )}
    </Screen>
  );
}
export function FleetScreen({ navigation }: any) {
  const data = useResource(
    async () => {
      const [trucks, users, locations] = await Promise.all([
        api.trucks(),
        api.users('Driver'),
        api.locations(true),
      ]);
      return { trucks, users, locations };
    },
    'fleet',
    20000,
  );
  return (
    <Screen
      title="Sua frota."
      subtitle="Cada caminhão, um caminho de cuidado."
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cadastrar caminhão"
          onPress={() => navigation.navigate('TruckCreate')}
        >
          <IconBox icon={Plus} bg={c.green} color={c.white} />
        </Pressable>
      }
      refreshing={data.refreshing}
      onRefresh={() => void data.refresh()}
    >
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {data.data?.trucks.map((t) => {
        const driver = data.data!.users.find((u) => u.id === t.driverId);
        const location = data.data!.locations.find((l) => l.truckId === t.id);
        return (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            onPress={() => navigation.navigate('TruckDetail', { id: t.id })}
          >
            <Card style={{ gap: 16 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <IconBox icon={Truck} size={48} />
                <Row
                  style={{
                    gap: 5,
                    backgroundColor: location?.isOnline ? c.sage : '#F1F1ED',
                    borderRadius: 20,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                  }}
                >
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: location?.isOnline ? c.green : c.muted,
                    }}
                  />
                  <Txt size={10} weight="bold" color={location?.isOnline ? c.green : c.muted}>
                    {location?.isOnline ? 'GPS recente' : 'Sem GPS recente'}
                  </Txt>
                </Row>
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ gap: 4, flex: 1 }}>
                  <Txt size={23} weight="extra" style={{ letterSpacing: -0.7 }}>
                    {t.plate}
                  </Txt>
                  <Txt size={12} color={c.muted}>
                    {t.description || 'Caminhão de coleta'}
                  </Txt>
                </View>
                <ChevronRight color={c.green} size={19} />
              </Row>
              <Row style={{ gap: 7, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 }}>
                <UserRound size={14} color={c.muted} />
                <Txt color={c.muted} size={11}>
                  {driver?.name || 'Sem motorista vinculado'}
                </Txt>
              </Row>
            </Card>
          </Pressable>
        );
      })}
      {data.data && !data.data.trucks.length && (
        <Empty
          title="Sua frota começa aqui"
          body="Cadastre o primeiro caminhão para planejar as rotas."
          icon={Truck}
          action="Cadastrar caminhão"
          onPress={() => navigation.navigate('TruckCreate')}
        />
      )}
    </Screen>
  );
}
export function TruckCreateScreen({ navigation }: any) {
  const [plate, setPlate] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [driverId, setDriverId] = useState<string | null>(null);
  const drivers = useResource(() => api.users('Driver'), 'new-truck-drivers');
  const action = useAction();
  const { toast } = useFeedback();
  const submit = async () => {
    if (!plate.trim()) {
      action.setError('Informe a placa do caminhão.');
      return;
    }
    const capacityKg = capacity.trim() ? Number(capacity.replace(',', '.')) : null;
    if (capacityKg !== null && (!Number.isFinite(capacityKg) || capacityKg <= 0)) {
      action.setError('A capacidade deve ser um número maior que zero.');
      return;
    }
    const result = await action.run(() =>
      api.createTruck({
        plate: plate.trim().toUpperCase(),
        description: description.trim() || null,
        capacityKg,
        driverId,
      }),
    );
    if (result) {
      toast('Caminhão cadastrado.');
      navigation.replace('TruckDetail', { id: result.id });
    }
  };
  return (
    <Screen
      back
      navigation={navigation}
      title="Mais um na frota."
      subtitle="Cadastre o caminhão para começar a operar."
    >
      <Field
        label="Placa"
        value={plate}
        onChangeText={setPlate}
        placeholder="Ex.: ABC-1D23"
        error={action.fields.plate?.[0]}
      />
      <Field
        label="Descrição (opcional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Ex.: Compactador • Centro"
      />
      <Field
        label="Capacidade em kg (opcional)"
        value={capacity}
        onChangeText={setCapacity}
        keyboard="decimal-pad"
        placeholder="Ex.: 8000"
      />
      <Section title="Motorista (opcional)" />
      <ResourceState
        loading={drivers.loading}
        error={drivers.error}
        retry={() => void drivers.refresh()}
      />
      <DriverChoices drivers={drivers.data || []} value={driverId} onChange={setDriverId} />
      {!!action.error && <Notice tone="error">{action.error}</Notice>}
      <Button
        title="Cadastrar caminhão"
        icon={Check}
        loading={action.busy}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
function DriverChoices({
  drivers,
  value,
  onChange,
}: {
  drivers: { id: string; name: string; active: boolean }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {[{ id: null, name: 'Sem motorista', active: true }, ...drivers.filter((u) => u.active)].map(
        (d) => (
          <Pressable
            key={d.id || 'none'}
            accessibilityRole="button"
            accessibilityState={{ selected: value === d.id }}
            onPress={() => onChange(d.id)}
          >
            <Card
              style={{
                padding: 13,
                backgroundColor: value === d.id ? c.sage : c.white,
                borderColor: value === d.id ? c.green : c.border,
              }}
            >
              <Row style={{ gap: 10 }}>
                <UserRound size={17} color={c.green} />
                <Txt size={13} weight="semi" style={{ flex: 1 }}>
                  {d.name}
                </Txt>
                {value === d.id && <Check size={17} color={c.green} />}
              </Row>
            </Card>
          </Pressable>
        ),
      )}
    </View>
  );
}
export function TruckDetailScreen({ navigation, route }: any) {
  const data = useResource(async () => {
    const [truck, drivers] = await Promise.all([api.truck(route.params.id), api.users('Driver')]);
    return { truck, drivers };
  }, route.params.id);
  const position = useResource(
    () => api.location(route.params.id, true),
    `position-${route.params.id}`,
    20000,
  );
  const [selection, setSelection] = useState<string | null | undefined>(undefined);
  const action = useAction();
  const { toast } = useFeedback();
  const value = selection === undefined ? data.data?.truck.driverId || null : selection;
  const save = async () => {
    const result = await action.run(() => api.assignDriver(route.params.id, value));
    if (result) {
      toast(value ? 'Motorista vinculado.' : 'Motorista desvinculado.');
      setSelection(undefined);
      void data.refresh();
    }
  };
  return (
    <Screen
      back
      navigation={navigation}
      title={data.data?.truck.plate || 'Caminhão'}
      subtitle={data.data?.truck.description || 'Detalhes do veículo'}
      refreshing={data.refreshing}
      onRefresh={() => {
        void data.refresh();
        void position.refresh();
      }}
    >
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {data.data && (
        <>
          <CityMap locations={position.data ? [position.data] : []} height={210} interactive />
          {position.error ? (
            <Notice>{position.error}</Notice>
          ) : (
            position.data && (
              <Notice>
                {position.data.isOnline ? 'GPS atualizado.' : 'Sem GPS recente.'} Última leitura:{' '}
                {formatDate(position.data.recordedAt)}.
              </Notice>
            )
          )}
          <Card>
            <DetailLine
              label="Capacidade"
              value={
                data.data.truck.capacityKg === null
                  ? 'Não informada'
                  : `${Number(data.data.truck.capacityKg).toLocaleString('pt-BR')} kg`
              }
            />
            <DetailLine label="Situação" value={data.data.truck.active ? 'Ativo' : 'Inativo'} />
            <DetailLine
              label="Cadastrado em"
              value={formatDate(data.data.truck.createdAt, false)}
            />
          </Card>
          <Section title="Vincular motorista" />
          <DriverChoices drivers={data.data.drivers} value={value} onChange={setSelection} />
          {!!action.error && <Notice tone="error">{action.error}</Notice>}
          <Button
            title="Salvar vínculo"
            icon={Check}
            loading={action.busy}
            disabled={value === data.data.truck.driverId}
            onPress={() => void save()}
          />
        </>
      )}
    </Screen>
  );
}
export function TeamScreen({ navigation }: any) {
  const [filter, setFilter] = useState<Role | 'All'>('All');
  const [search, setSearch] = useState('');
  const data = useResource(() => api.users(), 'team');
  const items = (data.data || []).filter(
    (u) =>
      (filter === 'All' || u.role === filter) &&
      `${u.name} ${u.email}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <Screen
      title="Pessoas que cuidam."
      subtitle="Organize os acessos da sua equipe."
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cadastrar usuário"
          onPress={() => navigation.navigate('UserCreate')}
        >
          <IconBox icon={Plus} bg={c.green} color={c.white} />
        </Pressable>
      }
      refreshing={data.refreshing}
      onRefresh={() => void data.refresh()}
    >
      <Field
        label="Buscar por nome ou e-mail"
        value={search}
        onChangeText={setSearch}
        placeholder="Encontre alguém"
      />
      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'All', label: 'Todos' },
          { value: 'Driver', label: 'Motoristas' },
          { value: 'Manager', label: 'Gestores' },
          { value: 'Citizen', label: 'Cidadãos' },
        ]}
      />
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {!data.loading &&
        !data.error &&
        (items.length ? (
          items.map((u) => (
            <Pressable
              key={u.id}
              accessibilityRole="button"
              onPress={() => navigation.navigate('UserDetail', { id: u.id })}
            >
              <Card style={{ padding: 16 }}>
                <Row style={{ gap: 12 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 15,
                      backgroundColor: c.sage,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Txt size={13} weight="bold" color={c.green}>
                      {u.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </Txt>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt size={14} weight="bold">
                      {u.name}
                    </Txt>
                    <Txt size={11} color={c.muted}>
                      {roleLabels[u.role]} · {u.active ? 'Ativo' : 'Inativo'}
                    </Txt>
                  </View>
                  <ChevronRight size={17} color={c.green} />
                </Row>
              </Card>
            </Pressable>
          ))
        ) : (
          <Empty
            title="Ninguém encontrado"
            body="Tente outro nome ou ajuste o filtro."
            icon={Users}
          />
        ))}
    </Screen>
  );
}
export function UserCreateScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Driver');
  const action = useAction();
  const { toast } = useFeedback();
  const submit = async () => {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()) || !password) {
      action.setError('Preencha o nome, um e-mail válido e a senha de acesso.');
      return;
    }
    const result = await action.run(() =>
      api.createUser({ name: name.trim(), email: email.trim(), password, role }),
    );
    if (result) {
      toast('Usuário cadastrado.');
      navigation.replace('UserDetail', { id: result.id });
    }
  };
  return (
    <Screen
      back
      navigation={navigation}
      title="Uma nova pessoa."
      subtitle="Defina o perfil e os dados de acesso."
    >
      <Txt size={12} weight="semi">
        Perfil de acesso
      </Txt>
      <Chips
        value={role}
        onChange={setRole}
        options={[
          { value: 'Driver', label: 'Motorista' },
          { value: 'Manager', label: 'Gestor' },
          { value: 'Citizen', label: 'Cidadão' },
        ]}
      />
      <Field
        label="Nome completo"
        value={name}
        onChangeText={setName}
        placeholder="Nome da pessoa"
        error={action.fields.name?.[0]}
      />
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboard="email-address"
        placeholder="pessoa@exemplo.com"
        error={action.fields.email?.[0]}
      />
      <Field
        label="Senha inicial"
        value={password}
        onChangeText={setPassword}
        secure
        placeholder="Senha de acesso"
        error={action.fields.password?.[0]}
      />
      {!!action.error && <Notice tone="error">{action.error}</Notice>}
      <Button
        title="Cadastrar usuário"
        loading={action.busy}
        icon={Check}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
export function UserDetailScreen({ navigation, route }: any) {
  const data = useResource(() => api.user(route.params.id), route.params.id);
  const { user } = useSession();
  const action = useAction();
  const { confirm, toast } = useFeedback();
  const item = data.data;
  const toggle = async () => {
    if (!item) return;
    if (
      !(await confirm(
        item.active ? 'Desativar este acesso?' : 'Reativar este acesso?',
        item.active
          ? 'Esta pessoa deixará de ter acesso ao aplicativo.'
          : 'Esta pessoa poderá acessar o aplicativo novamente.',
        item.active ? 'Desativar' : 'Reativar',
      ))
    )
      return;
    const result = await action.run(() => api.setActive(item.id, !item.active));
    if (result) {
      toast(result.active ? 'Acesso reativado.' : 'Acesso desativado.');
      void data.refresh();
    }
  };
  return (
    <Screen back navigation={navigation} title="Dados da pessoa.">
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {item && (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
            <IconBox icon={UserRound} size={64} />
            <Txt size={23} weight="bold" style={{ textAlign: 'center' }}>
              {item.name}
            </Txt>
            <Txt color={c.muted} size={13}>
              {item.email}
            </Txt>
            <Txt size={12} color={c.green} weight="bold">
              {roleLabels[item.role]} · {item.active ? 'Ativo' : 'Inativo'}
            </Txt>
          </Card>
          <Card>
            <DetailLine label="Cadastrado em" value={formatDate(item.createdAt, false)} />
            <DetailLine label="Perfil" value={roleLabels[item.role]} />
          </Card>
          {!!action.error && <Notice tone="error">{action.error}</Notice>}
          {item.id === user?.id ? (
            <Notice>Esta é sua conta atual. Gerencie outros acessos na aba Equipe.</Notice>
          ) : (
            <Button
              title={item.active ? 'Desativar acesso' : 'Reativar acesso'}
              variant={item.active ? 'danger' : 'secondary'}
              loading={action.busy}
              onPress={() => void toggle()}
            />
          )}
        </>
      )}
    </Screen>
  );
}
