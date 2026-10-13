import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Location from 'expo-location';
import {
  ArrowRight,
  Check,
  Clock3,
  LocateFixed,
  MapPin,
  RefreshCw,
  Truck,
} from 'lucide-react-native';
import { api, DEMO_MODE } from '../api/client';
import { DEMO_POINT } from '../api/demo';
import type { DispatchPreview } from '../api/types';
import { useResource } from '../hooks/useResource';
import {
  Badge,
  Button,
  Card,
  DetailLine,
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

export function parseCoordinates(latitude: string, longitude: string) {
  const lat = Number(latitude.replace(',', '.'));
  const lng = Number(longitude.replace(',', '.'));
  if (
    !latitude.trim() ||
    !longitude.trim() ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  )
    throw new Error('Escolha um ponto válido no mapa, use o GPS ou confira as coordenadas.');
  return { latitude: lat, longitude: lng };
}
export function GeoPicker({
  latitude,
  longitude,
  setLatitude,
  setLongitude,
}: {
  latitude: string;
  longitude: string;
  setLatitude: (v: string) => void;
  setLongitude: (v: string) => void;
}) {
  const [manual, setManual] = useState(false);
  const action = useAction();
  const { toast } = useFeedback();
  let point: { latitude: number; longitude: number } | null = null;
  try {
    point = parseCoordinates(latitude, longitude);
  } catch {}
  const pick = (p: { latitude: number; longitude: number }) => {
    setLatitude(p.latitude.toFixed(6));
    setLongitude(p.longitude.toFixed(6));
  };
  const gps = async () => {
    const result = await action.run(async () => {
      if (DEMO_MODE) return DEMO_POINT;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted')
        throw new Error(
          'O GPS não foi autorizado. Escolha um ponto no mapa ou informe as coordenadas.',
        );
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return fix.coords;
    });
    if (result) {
      pick(result);
      if (DEMO_MODE) toast('Ponto fictício selecionado para a demonstração.');
    }
  };
  return (
    <View style={{ gap: 12 }}>
      <CityMap height={200} point={point} onPoint={pick} interactive />
      <Button
        title={DEMO_MODE ? 'Usar localização de exemplo' : 'Usar minha localização'}
        variant="secondary"
        icon={LocateFixed}
        loading={action.busy}
        onPress={() => void gps()}
      />
      {point && (
        <Row style={{ gap: 7 }}>
          <MapPin size={14} color={c.green} />
          <Txt size={11} color={c.muted} style={{ flex: 1 }}>
            Ponto selecionado · {coordinateLabel(point)}
          </Txt>
        </Row>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => setManual(!manual)}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <Txt size={12} weight="bold" color={c.green}>
          {manual ? 'Ocultar coordenadas' : 'Inserir coordenadas manualmente'}
        </Txt>
      </Pressable>
      {manual && (
        <Row style={{ gap: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Latitude"
              value={latitude}
              onChangeText={setLatitude}
              keyboard="decimal-pad"
              placeholder="-23.5554"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Longitude"
              value={longitude}
              onChangeText={setLongitude}
              keyboard="decimal-pad"
              placeholder="-46.6576"
            />
          </View>
        </Row>
      )}
      {!!action.error && <Notice tone="error">{action.error}</Notice>}
    </View>
  );
}
export function NewCollectionScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<DispatchPreview | null>(null);
  const action = useAction();
  const { toast } = useFeedback();
  const next = async () => {
    const result = await action.run(async () => {
      const point = parseCoordinates(latitude, longitude);
      return api.preview(point.latitude, point.longitude);
    });
    if (result) {
      setPreview(result);
      setStep(2);
    }
  };
  const submit = async () => {
    const result = await action.run(() =>
      api.createCollection({
        ...parseCoordinates(latitude, longitude),
        address: address.trim() || null,
        description: description.trim() || null,
      }),
    );
    if (result) {
      toast(
        result.status === 'Assigned'
          ? 'Coleta solicitada e atribuída a uma rota.'
          : 'Solicitação registrada na fila de atendimento.',
      );
      navigation.replace('CollectionDetail', { id: result.id });
    }
  };
  return (
    <Screen
      back
      navigation={navigation}
      title="Uma nova coleta."
      subtitle={
        step === 1
          ? 'Primeiro, conte onde vamos encontrar os resíduos.'
          : 'Confira o ponto e confirme sua solicitação.'
      }
    >
      <Row style={{ gap: 8 }}>
        {[1, 2].map((n) => (
          <Row key={n} style={{ flex: 1, gap: 8 }}>
            <View
              style={{
                width: 27,
                height: 27,
                borderRadius: 14,
                backgroundColor: step >= n ? c.green : c.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt size={11} weight="bold" color={step >= n ? c.white : c.muted}>
                {n}
              </Txt>
            </View>
            <Txt size={11} weight="bold" color={step >= n ? c.green : c.muted}>
              {n === 1 ? 'Ponto de coleta' : 'Confirmação'}
            </Txt>
          </Row>
        ))}
      </Row>
      {step === 1 ? (
        <>
          <GeoPicker
            latitude={latitude}
            longitude={longitude}
            setLatitude={setLatitude}
            setLongitude={setLongitude}
          />
          <Field
            label="Endereço ou referência (opcional)"
            value={address}
            onChangeText={setAddress}
            placeholder="Rua, número ou ponto de referência"
            error={action.fields.address?.[0]}
          />
          <Field
            label="Observações (opcional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Ex.: resíduos separados ao lado do portão."
            multiline
            error={action.fields.description?.[0]}
          />
          {!!action.error && <Notice tone="error">{action.error}</Notice>}
          <Button
            title="Consultar disponibilidade"
            icon={ArrowRight}
            loading={action.busy}
            onPress={() => void next()}
          />
        </>
      ) : (
        <>
          <Card>
            <Row style={{ gap: 12 }}>
              <IconBox icon={MapPin} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt size={16} weight="bold">
                  {address || 'Ponto escolhido no mapa'}
                </Txt>
                <Txt size={11} color={c.muted}>
                  {coordinateLabel(parseCoordinates(latitude, longitude))}
                </Txt>
              </View>
            </Row>
            {!!description && (
              <Txt size={13} color={c.muted}>
                {description}
              </Txt>
            )}
          </Card>
          <View
            style={{
              backgroundColor: preview?.hasCandidate ? c.sage : c.amberBg,
              borderRadius: 22,
              padding: 22,
              gap: 14,
            }}
          >
            <IconBox
              icon={preview?.hasCandidate ? Truck : Clock3}
              bg={c.white}
              color={preview?.hasCandidate ? c.green : c.amber}
            />
            <Txt size={23} weight="bold" style={{ letterSpacing: -0.6 }}>
              {preview?.hasCandidate ? 'Tem uma rota por perto.' : 'Vamos encontrar uma rota.'}
            </Txt>
            <Txt color={c.muted} size={13}>
              {preview?.hasCandidate
                ? 'Encontramos um caminhão elegível para este ponto. A atribuição será confirmada ao enviar o pedido.'
                : 'Nenhum caminhão está elegível agora. Você pode solicitar mesmo assim: o pedido ficará na fila e será reavaliado automaticamente.'}
            </Txt>
            {preview?.hasCandidate && (
              <DetailLine
                label="Distância do caminhão ao ponto"
                value={distance(preview.distanceFromTruckKm)}
              />
            )}
          </View>
          <Notice>
            A disponibilidade pode mudar. O status final aparece depois da confirmação.
          </Notice>
          {!!action.error && <Notice tone="error">{action.error}</Notice>}
          <Button
            title="Confirmar solicitação"
            icon={Check}
            loading={action.busy}
            onPress={() => void submit()}
          />
          <Button
            title="Editar ponto e observações"
            variant="ghost"
            disabled={action.busy}
            onPress={() => {
              setStep(1);
              action.setError('');
            }}
          />
        </>
      )}
    </Screen>
  );
}
export function CollectionDetailScreen({ navigation, route }: any) {
  const data = useResource(() => api.collection(route.params.id), route.params.id, 15000);
  const item = data.data;
  const location = useResource(
    () => (item?.truckId ? api.location(item.truckId) : Promise.resolve(null)),
    item?.truckId || 'none',
    20000,
  );
  const action = useAction();
  const { confirm, toast } = useFeedback();
  const cancel = async () => {
    if (
      !(await confirm(
        'Cancelar esta coleta?',
        'O ponto será removido da rota, caso já tenha sido atribuído.',
        'Cancelar coleta',
      ))
    )
      return;
    const result = await action.run(() => api.cancelCollection(route.params.id));
    if (result) {
      toast('Coleta cancelada.');
      void data.refresh();
    }
  };
  const retry = async () => {
    const result = await action.run(() => api.retryCollection(route.params.id));
    if (result) {
      toast(
        result.status === 'Assigned'
          ? 'Encontramos uma rota para sua coleta.'
          : 'Ainda aguardando uma rota. Seu pedido continua na fila.',
      );
      void data.refresh();
    }
  };
  const assigned = item?.assignedAt;
  const done = item?.status === 'Collected';
  return (
    <Screen
      back
      navigation={navigation}
      title="Acompanhe sua coleta."
      subtitle={item ? `SOLICITAÇÃO #${item.id.slice(0, 6).toUpperCase()}` : undefined}
      refreshing={data.refreshing}
      onRefresh={() => {
        void data.refresh();
        void location.refresh();
      }}
    >
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {item && (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge status={item.status} />
            <Txt color={c.muted} size={11}>
              {formatDate(item.createdAt, false)}
            </Txt>
          </Row>
          <CityMap
            point={item}
            locations={location.data ? [location.data] : []}
            height={220}
            interactive
          />
          <Card>
            <Row style={{ gap: 12 }}>
              <IconBox icon={MapPin} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt weight="bold" size={16}>
                  {item.address || 'Ponto de coleta informado'}
                </Txt>
                <Txt color={c.muted} size={11}>
                  {coordinateLabel(item)}
                </Txt>
              </View>
            </Row>
            {!!item.description && (
              <Txt color={c.muted} size={13}>
                {item.description}
              </Txt>
            )}
          </Card>
          <View style={{ gap: 13 }}>
            <Section title="O caminho do seu pedido" />
            {[
              {
                title: 'Solicitação recebida',
                body: 'Seu ponto foi registrado.',
                date: item.createdAt,
                active: true,
              },
              {
                title:
                  item.status === 'Cancelled' ? 'Solicitação cancelada' : 'Atribuída a uma rota',
                body:
                  item.status === 'Cancelled'
                    ? 'Você pode criar um novo pedido quando precisar.'
                    : assigned
                      ? 'Um caminhão foi vinculado à sua coleta.'
                      : 'Aguardando um caminhão elegível.',
                date: item.status === 'Cancelled' ? item.cancelledAt : assigned,
                active: !!assigned || item.status === 'Cancelled',
              },
              ...(item.status === 'Cancelled'
                ? []
                : [
                    {
                      title: 'Coleta realizada',
                      body: done
                        ? 'Obrigado por cuidar do seu entorno.'
                        : 'A confirmação será feita pelo motorista.',
                      date: item.collectedAt,
                      active: done,
                    },
                  ]),
            ].map((event, i) => (
              <Row key={i} style={{ gap: 14, alignItems: 'flex-start' }}>
                <View style={{ alignItems: 'center', width: 30 }}>
                  <View
                    style={{
                      width: 27,
                      height: 27,
                      borderRadius: 14,
                      backgroundColor: event.active ? c.green : c.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {event.active ? (
                      <Check size={14} color={c.white} />
                    ) : (
                      <View
                        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.muted }}
                      />
                    )}
                  </View>
                  {i < 2 && item.status !== 'Cancelled' && (
                    <View
                      style={{ width: 1, height: 38, backgroundColor: c.border, marginTop: 5 }}
                    />
                  )}
                </View>
                <View style={{ flex: 1, gap: 3, paddingBottom: 10 }}>
                  <Txt size={14} weight="bold" color={event.active ? c.ink : c.muted}>
                    {event.title}
                  </Txt>
                  <Txt size={12} color={c.muted}>
                    {event.body}
                  </Txt>
                  {!!event.date && (
                    <Txt size={10} color={c.muted}>
                      {formatDate(event.date)}
                    </Txt>
                  )}
                </View>
              </Row>
            ))}
          </View>
          {item.status === 'Assigned' && (
            <Notice>
              {location.data
                ? location.data.isOnline
                  ? `GPS recente. Última leitura: ${formatDate(location.data.recordedAt)}.`
                  : `Sem GPS recente. A posição exibida é de ${formatDate(location.data.recordedAt)}.`
                : location.error || 'Aguardando uma posição do caminhão.'}{' '}
              Ainda não há previsão de chegada.
            </Notice>
          )}
          {item.status === 'Pending' && (
            <Notice>O sistema reavalia automaticamente as solicitações em espera.</Notice>
          )}
          {!!action.error && <Notice tone="error">{action.error}</Notice>}
          {item.status === 'Pending' && (
            <Button
              title="Tentar encontrar uma rota"
              variant="secondary"
              icon={RefreshCw}
              loading={action.busy}
              onPress={() => void retry()}
            />
          )}
          {['Pending', 'Assigned'].includes(item.status) && (
            <Button
              title="Cancelar solicitação"
              variant="danger"
              loading={action.busy}
              onPress={() => void cancel()}
            />
          )}
        </>
      )}
    </Screen>
  );
}
