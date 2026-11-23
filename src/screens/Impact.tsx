import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { Clock3, Fuel, Leaf, MapPin, Route as RouteIcon, Wallet } from 'lucide-react-native';
import { api } from '../api/client';
import type { ImpactSummary } from '../api/impact';
import { useResource } from '../hooks/useResource';
import { SimulationLauncher, SimulationView } from './Simulation';
import {
  Card,
  Chips,
  IconBox,
  Notice,
  ResourceState,
  Row,
  Screen,
  Section,
  Txt,
} from '../ui/components';
import { colors as c } from '../ui/theme';

const n = (v: number, digits = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const tons = (kg: number) => (kg >= 1000 ? `${n(kg / 1000, 1)} t` : `${n(kg)} kg`);
const hours = (min: number) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

type Period = '7' | '30' | '90';
type DistrictKey = 'all' | '1' | '2' | '3';

let simulacaoLembrada: string | null = null;

export function ImpactScreen() {
  const [period, setPeriod] = useState<Period>('30');
  const [district, setDistrict] = useState<DistrictKey>('all');
  const [simId, setSimIdState] = useState<string | null>(simulacaoLembrada);
  const setSimId = (id: string | null) => {
    simulacaoLembrada = id;
    setSimIdState(id);
  };
  useEffect(() => {
    api
      .activeSimulation()
      .then((s) => {
        if (s?.status === 'done') setSimId(s.id);
      })
      .catch(() => undefined);
  }, []);
  const data = useResource(
    () => api.impact(Number(period), district === 'all' ? null : Number(district)),
    `impact-${period}-${district}`,
  );
  const v = data.data;
  if (simId)
    return (
      <Screen title="Impacto" subtitle="Um mês simulado no Grajaú com dados públicos">
        <SimulationView id={simId} onDeleted={() => setSimId(null)} />
      </Screen>
    );
  return (
    <Screen
      title="Impacto"
      subtitle="Quanto a coleta sob demanda economiza na rua"
      refreshing={data.refreshing}
      onRefresh={() => void data.refresh()}
    >
      <SimulationLauncher onDone={setSimId} />
      <View style={{ gap: 10 }}>
        <Chips<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { label: '7 dias', value: '7' },
            { label: '30 dias', value: '30' },
            { label: '90 dias', value: '90' },
          ]}
        />
        <Chips<DistrictKey>
          value={district}
          onChange={setDistrict}
          options={[
            { label: 'Capela do Socorro', value: 'all' },
            { label: 'Socorro', value: '1' },
            { label: 'Cidade Dutra', value: '2' },
            { label: 'Grajaú', value: '3' },
          ]}
        />
      </View>
      <ResourceState loading={data.loading} error={data.error} retry={() => void data.refresh()} />
      {v && <ImpactBody v={v} />}
    </Screen>
  );
}

function ImpactBody({ v }: { v: ImpactSummary }) {
  const t = v.totals;
  const stats = [
    { label: 'Km evitados', value: n(t.avoidedKm), unit: 'km', icon: RouteIcon },
    { label: 'Diesel economizado', value: n(t.avoidedLiters), unit: 'litros', icon: Fuel },
    { label: 'Economia', value: brl(t.savedBrl), unit: 'em combustível', icon: Wallet },
    {
      label: 'Tempo até a coleta',
      value: hours(t.avgServiceMinutes),
      unit: 'em média',
      icon: Clock3,
    },
  ];
  return (
    <>
      <Card style={{ backgroundColor: c.greenDark, borderWidth: 0, padding: 22, gap: 14 }}>
        <Row style={{ gap: 10 }}>
          <IconBox icon={Leaf} bg="#315B45" color={c.lime} />
          <Txt size={12} color="#C1D2C2" style={{ flex: 1 }}>
            CO₂ que deixou de ir para o ar · {v.period.days} dias
          </Txt>
        </Row>
        <Txt
          size={44}
          weight="extra"
          color={c.white}
          style={{ letterSpacing: -1.6, lineHeight: 50 }}
        >
          {tons(t.avoidedCo2Kg)}
        </Txt>
        <Txt size={13} color="#C1D2C2">
          Os caminhões rodaram {n(t.reductionPct, 1)}% menos que a rota fixa ({n(t.actualKm)} km em
          vez de {n(t.baselineKm)} km), em {n(t.routes)} turnos.
        </Txt>
      </Card>

      <View style={{ gap: 10 }}>
        {[stats.slice(0, 2), stats.slice(2)].map((pair, i) => (
          <Row key={i} style={{ gap: 10 }}>
            {pair.map((s) => (
              <Card key={s.label} style={{ flex: 1, padding: 16, gap: 10 }}>
                <Row style={{ gap: 7 }}>
                  <s.icon size={16} color={c.green} />
                  <Txt size={11} color={c.muted} style={{ flex: 1 }}>
                    {s.label}
                  </Txt>
                </Row>
                <Txt size={22} weight="extra" style={{ letterSpacing: -0.6 }}>
                  {s.value}
                </Txt>
                <Txt size={11} color={c.muted}>
                  {s.unit}
                </Txt>
              </Card>
            ))}
          </Row>
        ))}
      </View>

      <Section title="Rota fixa x Coleta" />
      <WeeklyChart weekly={v.weekly} />

      {v.districts.length > 1 && (
        <>
          <Section title="Por distrito" />
          <Card style={{ gap: 16 }}>
            {v.districts.map((d) => {
              const max = Math.max(...v.districts.map((x) => x.avoidedCo2Kg), 1);
              return (
                <View key={d.id} style={{ gap: 7 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt weight="bold" size={14}>
                      {d.name}
                    </Txt>
                    <Txt size={13} weight="semi">
                      {tons(d.avoidedCo2Kg)} · {brl(d.savedBrl)}
                    </Txt>
                  </Row>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: c.sage }}>
                    <View
                      style={{
                        height: 8,
                        borderRadius: 4,
                        width: `${(d.avoidedCo2Kg / max) * 100}%`,
                        backgroundColor: c.green,
                      }}
                    />
                  </View>
                  <Txt size={11} color={c.muted}>
                    {n(d.avoidedKm)} km evitados · coleta em {hours(d.avgServiceMinutes)}
                  </Txt>
                </View>
              );
            })}
          </Card>
        </>
      )}

      <Section title="Pontos críticos" />
      <Card style={{ gap: 2, paddingVertical: 8 }}>
        {v.hotspots.slice(0, 5).map((h, i) => (
          <Row
            key={h.id}
            style={{
              gap: 12,
              paddingVertical: 11,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: c.border,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: i === 0 ? c.amberBg : c.sage,
              }}
            >
              <Txt size={12} weight="extra" color={i === 0 ? c.amber : c.green}>
                {i + 1}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={13} weight="semi">
                {h.label}
              </Txt>
              <Txt size={11} color={c.muted}>
                {h.district}
              </Txt>
            </View>
            <Row style={{ gap: 4 }}>
              <MapPin size={13} color={c.muted} />
              <Txt size={13} weight="bold">
                {h.requests}
              </Txt>
            </Row>
          </Row>
        ))}
      </Card>
      <Txt size={11} color={c.muted} style={{ marginTop: -12 }}>
        Pedidos repetidos no mesmo lugar mostram onde o lixo acumula. A prefeitura pode agir antes.
      </Txt>

      <Card style={{ backgroundColor: c.lime, borderWidth: 0, gap: 8 }}>
        <Txt size={12} weight="bold" color={c.greenDark}>
          EM UM ANO, NESTE RITMO
        </Txt>
        <Txt size={26} weight="extra" color={c.greenDark} style={{ letterSpacing: -0.8 }}>
          {n(v.projection.avoidedCo2Kg / 1000)} t de CO₂ · {brl(v.projection.savedBrl)}
        </Txt>
        <Txt size={12} color={c.greenDark}>
          {n(v.projection.avoidedLiters)} litros de diesel a menos. A Lei 16.802/2018 exige que a
          frota de coleta da cidade corte pela metade o CO₂ até 2028.
        </Txt>
      </Card>

      <Section title="Como calculamos" />
      <Card style={{ gap: 12 }}>
        <Txt size={12} color={c.muted}>
          km evitados = km da rota fixa − km realizados{'\n'}
          litros = km evitados ÷ consumo{'\n'}
          CO₂ = litros × fator do diesel · R$ = litros × preço
        </Txt>
        {v.parameters.map((p) => (
          <View key={p.key} style={{ gap: 2 }}>
            <Row style={{ justifyContent: 'space-between', gap: 10 }}>
              <Txt size={13} weight="semi" style={{ flex: 1 }}>
                {p.label}
              </Txt>
              <Txt size={13} weight="bold">
                {p.value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {p.unit}
              </Txt>
            </Row>
            <Txt size={11} color={p.official ? c.green : c.amber}>
              {p.official ? 'Fonte oficial' : 'Estimativa'} · {p.source}
            </Txt>
          </View>
        ))}
      </Card>
      <Notice>
        Simulação com {n(v.subprefecture.population)} habitantes (Censo {v.subprefecture.censusYear}
        ) e parâmetros reais. As rotas e pedidos são simulados até o app operar com a
        concessionária.
      </Notice>
    </>
  );
}

function WeeklyChart({ weekly }: { weekly: ImpactSummary['weekly'] }) {
  const [width, setWidth] = useState(0);
  const H = 170;
  const top = 10;
  const bottom = 26;
  const max = Math.max(...weekly.map((w) => w.baselineKm), 1);
  const scale = (km: number) => ((H - top - bottom) * km) / max;
  const slot = weekly.length ? width / weekly.length : 0;
  const bar = Math.min(18, slot * 0.32);
  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ gap: 16 }}>
        <Row style={{ gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#C9D4BF' }} />
          <Txt size={11} color={c.muted}>
            Rota fixa
          </Txt>
        </Row>
        <Row style={{ gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.green }} />
          <Txt size={11} color={c.muted}>
            Com o Coleta
          </Txt>
        </Row>
      </Row>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: H }}>
        {width > 0 && (
          <Svg
            width={width}
            height={H}
            accessibilityLabel="Km por semana: rota fixa e com o Coleta"
          >
            <Line x1={0} x2={width} y1={H - bottom} y2={H - bottom} stroke={c.border} />
            {weekly.map((w, i) => {
              const x = i * slot + slot / 2;
              const step = Math.ceil(weekly.length / 6);
              return (
                <React.Fragment key={w.weekStart}>
                  <Rect
                    x={x - bar - 1}
                    y={H - bottom - scale(w.baselineKm)}
                    width={bar}
                    height={scale(w.baselineKm)}
                    rx={3}
                    fill="#C9D4BF"
                  />
                  <Rect
                    x={x + 1}
                    y={H - bottom - scale(w.actualKm)}
                    width={bar}
                    height={scale(w.actualKm)}
                    rx={3}
                    fill={c.green}
                  />
                  {i % step === 0 && (
                    <SvgText x={x} y={H - 8} fontSize={10} fill={c.muted} textAnchor="middle">
                      {shortDate(w.weekStart)}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </View>
      <Txt size={11} color={c.muted}>
        Km rodados por semana. A diferença entre as barras é o que deixou de ser rodado.
      </Txt>
    </Card>
  );
}

// Cartão curto para o cidadão: o efeito do app no bairro.
export function ImpactTeaser() {
  const data = useResource(() => api.publicImpact(), 'impact-public');
  const v = data.data;
  if (!v) return null;
  return (
    <Card style={{ backgroundColor: c.lime, borderWidth: 0, gap: 6 }}>
      <Row style={{ gap: 8 }}>
        <Leaf size={16} color={c.greenDark} />
        <Txt size={11} weight="bold" color={c.greenDark}>
          SEU BAIRRO · ÚLTIMOS 30 DIAS
        </Txt>
      </Row>
      <Txt size={20} weight="extra" color={c.greenDark} style={{ letterSpacing: -0.5 }}>
        {tons(v.totals.avoidedCo2Kg)} de CO₂ a menos em {v.subprefecture.name}
      </Txt>
      <Txt size={12} color={c.greenDark}>
        Cada pedido ajuda o caminhão a rodar só onde precisa: {n(v.totals.avoidedKm)} km evitados.
      </Txt>
    </Card>
  );
}
