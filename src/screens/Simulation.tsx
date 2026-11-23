// Botão "Simular 1 mês" (aba Impacto do gestor) e a tela do mês simulado.
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  FileSearch,
  FlaskConical,
  Fuel,
  Route as RouteIcon,
  Trash2,
  Wallet,
  X,
} from 'lucide-react-native';
import { api } from '../api/client';
import { errorMessage } from '../api/errors';
import type { RelatorioVeracidade, TipoPedido } from '../simulador/motor';
import type { StatusSimulacao } from '../simulador/servico';
import { Button, Card, Field, IconBox, Notice, Row, Section, Txt } from '../ui/components';
import { colors as c } from '../ui/theme';

const SEMENTE_PADRAO = 20261031;
const ETAPAS = [
  'Carregando a região do Grajaú',
  'Gerando moradores e problemas',
  'Rodando os caminhões',
  'Conferindo a calibração',
  'Gravando o mês',
];
const n = (v: number, d = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const horas = (h: number) => (h >= 48 ? `${n(h / 24, 0)} dias` : `${n(h, 1)} h`);
const TIPOS: { key: TipoPedido; label: string }[] = [
  { key: 'descarte_irregular', label: 'Descarte irregular' },
  { key: 'coleta_nao_passou', label: 'Coleta não passou' },
  { key: 'volume_extra', label: 'Volume extra' },
];
const SELO_LABEL = {
  oficial: 'Oficial',
  derivado: 'Derivado',
  estimado: 'Estimado',
  hipotese: 'Hipótese',
};
const SELO_COR = { oficial: c.green, derivado: c.blue, estimado: c.amber, hipotese: c.red };

export function SimulationLauncher({ onDone }: { onDone: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(String(SEMENTE_PADRAO));
  const [status, setStatus] = useState<StatusSimulacao | null>(null);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const close = () => {
    if (status?.status === 'running') return;
    setOpen(false);
    setStatus(null);
    setError('');
  };
  const run = async () => {
    setError('');
    const semente = Number(seed);
    if (!Number.isInteger(semente) || semente < 1) {
      setError('Use um número inteiro positivo.');
      return;
    }
    try {
      const first = await api.simulate({ regiao: 'grajau', mes: '2026-10', semente });
      setStatus(first);
      timer.current = setInterval(async () => {
        try {
          const s = await api.simulation(first.id);
          setStatus(s);
          if (s.status === 'done') {
            if (timer.current) clearInterval(timer.current);
            setTimeout(() => {
              setOpen(false);
              setStatus(null);
              onDone(s.id);
            }, 500);
          }
        } catch (e) {
          if (timer.current) clearInterval(timer.current);
          setStatus(null);
          setError(errorMessage(e));
        }
      }, 350);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const step = status ? Math.min(ETAPAS.length, Math.floor(status.progresso * ETAPAS.length)) : -1;
  return (
    <>
      <Card style={{ gap: 12, borderColor: c.green, borderWidth: 1.5 }}>
        <Row style={{ gap: 12 }}>
          <IconBox icon={FlaskConical} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={15} weight="bold">
              Simular 1 mês
            </Txt>
            <Txt size={12} color={c.muted}>
              Grajaú, outubro de 2026, com dados públicos conferidos e selo em cada número.
            </Txt>
          </View>
        </Row>
        <Button title="Simular 1 mês" icon={FlaskConical} compact onPress={() => setOpen(true)} />
      </Card>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(16,32,24,0.45)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: c.paper,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              padding: 22,
              gap: 16,
              maxWidth: 560,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt size={20} weight="extra" style={{ letterSpacing: -0.5 }}>
                Simular 1 mês
              </Txt>
              {status?.status !== 'running' && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar"
                  onPress={close}
                  style={{ padding: 8 }}
                >
                  <X size={20} color={c.muted} />
                </Pressable>
              )}
            </Row>

            {!status ? (
              <>
                <View style={{ gap: 10 }}>
                  {[
                    ['Região', 'Grajaú (Capela do Socorro)'],
                    ['Mês', 'Outubro de 2026'],
                    ['Cenário', 'Único'],
                  ].map(([k, v]) => (
                    <Row key={k} style={{ justifyContent: 'space-between' }}>
                      <Txt size={13} color={c.muted}>
                        {k}
                      </Txt>
                      <Txt size={13} weight="bold">
                        {v}
                      </Txt>
                    </Row>
                  ))}
                </View>
                <Field
                  label="Semente"
                  value={seed}
                  onChangeText={setSeed}
                  keyboard="numeric"
                  error={error}
                />
                <Txt size={11} color={c.muted}>
                  A mesma semente gera sempre o mesmo mês. Assim qualquer pessoa refaz e confere.
                </Txt>
                <Button title="Rodar simulação" onPress={() => void run()} />
              </>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: c.sage }}>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: c.green,
                      width: `${Math.round(status.progresso * 100)}%`,
                    }}
                  />
                </View>
                {ETAPAS.map((e, i) => (
                  <Row key={e} style={{ gap: 10 }}>
                    {i < step ? (
                      <CheckCircle2 size={18} color={c.green} />
                    ) : (
                      <CircleDashed size={18} color={i === step ? c.green : c.border} />
                    )}
                    <Txt
                      size={13}
                      weight={i === step ? 'bold' : 'regular'}
                      color={i <= step ? c.ink : c.muted}
                    >
                      {e}
                    </Txt>
                  </Row>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

export function SimulationView({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [s, setS] = useState<StatusSimulacao | null>(null);
  const [report, setReport] = useState<RelatorioVeracidade | null>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    api
      .simulation(id)
      .then(setS)
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  const remove = async () => {
    setDeleting(true);
    try {
      await api.deleteSimulation(id);
      onDeleted();
    } catch (e) {
      setError(errorMessage(e));
      setDeleting(false);
    }
  };
  const openReport = async () => {
    try {
      setReport(await api.simulationReport(id));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (error) return <Notice tone="error">{error}</Notice>;
  const sim = s?.simulacao;
  if (!sim) return <Txt color={c.muted}>Carregando a simulação…</Txt>;
  const t = sim.resumo.totals;
  const d = sim.demanda;
  const descarte = d.horasComApp.descarte_irregular;
  return (
    <>
      <View
        style={{
          backgroundColor: c.amberBg,
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: '#EBD2A4',
        }}
      >
        <Txt size={11} weight="extra" color={c.amber} style={{ letterSpacing: 0.6 }}>
          SIMULAÇÃO · GRAJAÚ · OUT/2026 · CENÁRIO ÚNICO
        </Txt>
        <Txt size={11} color={c.amber}>
          Semente {sim.semente} · motor {sim.versaoMotor} · {n(sim.totalEventos)} eventos
        </Txt>
      </View>

      <Row style={{ gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            title="Ver relatório"
            variant="secondary"
            icon={FileSearch}
            compact
            onPress={() => void openReport()}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Apagar simulação"
            variant="danger"
            icon={Trash2}
            compact
            loading={deleting}
            onPress={() => void remove()}
          />
        </View>
      </Row>

      <Card style={{ backgroundColor: c.greenDark, borderWidth: 0, padding: 22, gap: 12 }}>
        <Row style={{ gap: 10 }}>
          <IconBox icon={Clock3} bg="#315B45" color={c.lime} />
          <Txt size={12} color="#C1D2C2" style={{ flex: 1 }}>
            Tempo até limpar um descarte irregular
          </Txt>
        </Row>
        <Txt
          size={44}
          weight="extra"
          color={c.white}
          style={{ letterSpacing: -1.6, lineHeight: 50 }}
        >
          {horas(descarte)}
        </Txt>
        <Txt size={13} color="#C1D2C2">
          Sem o app, o ponto espera o ciclo da zeladoria: cerca de{' '}
          {horas(d.horasSemApp.descarte_irregular)}. No mês, {n(d.domiciliosComApp)} domicílios
          chegaram a ter o app e fizeram {n(d.pedidos)} pedidos.
        </Txt>
      </Card>

      <View style={{ gap: 10 }}>
        <Row style={{ gap: 10 }}>
          <Stat
            icon={RouteIcon}
            label="Km evitados"
            value={n(t.avoidedKm)}
            unit={`${n(t.reductionPct, 1)}% do mês`}
          />
          <Stat icon={Fuel} label="Diesel" value={n(t.avoidedLiters)} unit="litros a menos" />
        </Row>
        <Row style={{ gap: 10 }}>
          <Stat icon={Wallet} label="Economia" value={brl(t.savedBrl)} unit="em combustível" />
          <Stat
            icon={CheckCircle2}
            label="CO₂ evitado"
            value={`${n(t.avoidedCo2Kg / 1000, 1)} t`}
            unit="no mês"
          />
        </Row>
      </View>
      {d.semJanela && (
        <Notice>
          O ganho em km depende da regra de despacho. Mandando cada pedido ao caminhão mais perto na
          hora, o descarte sai em {horas(d.semJanela.horasDescarte)}, mas o mês roda{' '}
          {n(Math.abs(d.semJanela.kmEvitados))} km a mais. Deixando o pedido esperar até{' '}
          {d.janelaHoras} h por um caminhão que já passe no setor, sobram {n(t.avoidedKm)} km
          evitados.
        </Notice>
      )}

      <Section title="Tempo até resolver" />
      <Card style={{ gap: 14 }}>
        {TIPOS.map(({ key, label }) => {
          const com = d.horasComApp[key];
          const sem = d.horasSemApp[key];
          const max = Math.max(sem, com, 1);
          return (
            <View key={key} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt size={13} weight="bold">
                  {label}
                </Txt>
                <Txt size={11} color={c.muted}>
                  {n(d.pedidosPorTipo[key])} pedidos
                </Txt>
              </Row>
              <Bar label="Com o app" value={horas(com)} pct={com / max} color={c.green} />
              <Bar label="Sem o app" value={horas(sem)} pct={sem / max} color="#C9D4BF" />
            </View>
          );
        })}
        <Txt size={11} color={c.muted}>
          Sem o app: coleta que falhou espera a próxima passagem (calculada pelo dia da coleta do
          setor); descarte e volume extra usam prazos da zeladoria e do cata-bagulho (hipóteses).
        </Txt>
      </Card>

      <Section title="Pedidos por dia e chuva" />
      <DailyChart dias={sim.dias} />

      <Section title="Calibração com o real" />
      <Card style={{ gap: 12 }}>
        {sim.relatorio.calibracao.map((k) => (
          <Row key={k.alvo} style={{ gap: 10, alignItems: 'flex-start' }}>
            <CheckCircle2 size={18} color={k.ok ? c.green : c.red} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={13} weight="semi">
                {k.alvo}
              </Txt>
              <Txt size={11} color={c.muted}>
                Simulado: {k.simulado} · Real: {k.referencia} · Faixa: {k.faixa}
              </Txt>
            </View>
          </Row>
        ))}
      </Card>

      <Section title="Operação" />
      <Card style={{ gap: 8 }}>
        {[
          ['Turnos de coleta', n(sim.operacao.turnos)],
          ['Km médio por turno', `${n(sim.operacao.kmMedioTurno, 1)} km`],
          ['Lixo coletado na rota', `${n(sim.operacao.toneladasRota)} t`],
          ['Viagens ao transbordo Santo Amaro', n(sim.operacao.viagensTransbordo)],
          ['Setores que ficaram sem coleta no dia', n(sim.operacao.setoresSemColeta)],
          ['Pedidos cancelados', n(d.cancelados)],
        ].map(([k, v]) => (
          <Row key={k} style={{ justifyContent: 'space-between', gap: 10 }}>
            <Txt size={13} color={c.muted} style={{ flex: 1 }}>
              {k}
            </Txt>
            <Txt size={13} weight="bold">
              {v}
            </Txt>
          </Row>
        ))}
      </Card>
      <Notice>
        Moradores, pedidos e operação são simulados sobre dados públicos do Grajaú. Cada número tem
        selo no relatório: oficial, derivado, estimado ou hipótese.
      </Notice>

      <ReportModal report={report} onClose={() => setReport(null)} />
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Fuel;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <Card style={{ flex: 1, padding: 16, gap: 10 }}>
      <Row style={{ gap: 7 }}>
        <Icon size={16} color={c.green} />
        <Txt size={11} color={c.muted} style={{ flex: 1 }}>
          {label}
        </Txt>
      </Row>
      <Txt size={22} weight="extra" style={{ letterSpacing: -0.6 }}>
        {value}
      </Txt>
      <Txt size={11} color={c.muted}>
        {unit}
      </Txt>
    </Card>
  );
}

function Bar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  return (
    <Row style={{ gap: 8 }}>
      <Txt size={11} color={c.muted} style={{ width: 66 }}>
        {label}
      </Txt>
      <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: c.sage }}>
        <View
          style={{
            height: 10,
            borderRadius: 5,
            width: `${Math.max(2, pct * 100)}%`,
            backgroundColor: color,
          }}
        />
      </View>
      <Txt size={11} weight="bold" style={{ width: 52, textAlign: 'right' }}>
        {value}
      </Txt>
    </Row>
  );
}

function DailyChart({ dias }: { dias: { data: string; chuvaMm: number; pedidos: number }[] }) {
  const [width, setWidth] = useState(0);
  const H = 150;
  const maxP = Math.max(...dias.map((x) => x.pedidos), 1);
  const maxC = Math.max(...dias.map((x) => x.chuvaMm), 1);
  const slot = dias.length ? width / dias.length : 0;
  const bar = Math.max(2, slot * 0.6);
  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ gap: 16 }}>
        <Row style={{ gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.green }} />
          <Txt size={11} color={c.muted}>
            Pedidos
          </Txt>
        </Row>
        <Row style={{ gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#8FB3C4' }} />
          <Txt size={11} color={c.muted}>
            Chuva (mm)
          </Txt>
        </Row>
      </Row>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: H }}>
        {width > 0 && (
          <Svg
            width={width}
            height={H}
            accessibilityLabel="Pedidos por dia e chuva em outubro de 2026"
          >
            {dias.map((x, i) => {
              const cx = i * slot + (slot - bar) / 2;
              const hc = (x.chuvaMm / maxC) * 36;
              const hp = (x.pedidos / maxP) * (H - 60);
              return (
                <React.Fragment key={x.data}>
                  <Rect x={cx} y={0} width={bar} height={hc} rx={1.5} fill="#8FB3C4" />
                  <Rect x={cx} y={H - 12 - hp} width={bar} height={hp} rx={1.5} fill={c.green} />
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt size={10} color={c.muted}>
          01/10
        </Txt>
        <Txt size={10} color={c.muted}>
          31/10
        </Txt>
      </Row>
      <Txt size={11} color={c.muted}>
        Outubro de 2026 teve 271,2 mm de chuva em Interlagos (INMET), 91% acima da média. Os pedidos
        crescem com a adoção do app e sobem depois das chuvas.
      </Txt>
    </Card>
  );
}

function ReportModal({
  report,
  onClose,
}: {
  report: RelatorioVeracidade | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!report} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(16,32,24,0.45)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: c.paper,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            maxHeight: '88%',
            maxWidth: 560,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          <Row style={{ justifyContent: 'space-between', padding: 22, paddingBottom: 8 }}>
            <Txt size={20} weight="extra" style={{ letterSpacing: -0.5 }}>
              Relatório de veracidade
            </Txt>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              style={{ padding: 8 }}
            >
              <X size={20} color={c.muted} />
            </Pressable>
          </Row>
          {report && (
            <ScrollView contentContainerStyle={{ padding: 22, paddingTop: 8, gap: 16 }}>
              <Row style={{ gap: 8, flexWrap: 'wrap' }}>
                <Pill ok={report.portaoA.ok} text="Portão A: nenhum dado sem selo" />
                <Pill ok={report.portaoB} text="Portão B: calibração na faixa" />
              </Row>
              <Section title="Selos dos números usados" />
              <Row style={{ gap: 8, flexWrap: 'wrap' }}>
                {(Object.keys(report.selos) as (keyof typeof SELO_LABEL)[]).map((k) => (
                  <View
                    key={k}
                    style={{
                      backgroundColor: c.white,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: c.border,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Txt size={18} weight="extra" color={SELO_COR[k]}>
                      {report.selos[k]}
                    </Txt>
                    <Txt size={11} color={c.muted}>
                      {SELO_LABEL[k]}
                    </Txt>
                  </View>
                ))}
              </Row>
              <Section title="Dados e selos" />
              <Card style={{ gap: 10 }}>
                {report.dados.map((dd) => (
                  <View key={dd.chave} style={{ gap: 1 }}>
                    <Row style={{ justifyContent: 'space-between', gap: 8 }}>
                      <Txt size={12} weight="semi" style={{ flex: 1 }}>
                        {dd.descricao}
                      </Txt>
                      <Txt size={12} weight="bold">
                        {dd.valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}{' '}
                        {dd.unidade}
                      </Txt>
                    </Row>
                    <Txt size={10} color={SELO_COR[dd.selo]}>
                      {SELO_LABEL[dd.selo]}
                      {dd.nota ? ` · ${dd.nota}` : ''}
                    </Txt>
                  </View>
                ))}
              </Card>
              <Section title="Divergências encontradas" />
              <Card style={{ gap: 12 }}>
                {report.divergencias.map((v) => (
                  <View key={v.id} style={{ gap: 2 }}>
                    <Txt size={12} weight="bold">
                      {v.dado}
                    </Txt>
                    <Txt size={11} color={c.muted}>
                      {v.valorA} x {v.valorB}
                    </Txt>
                    <Txt size={11} color={c.green}>
                      Decisão: {v.decisao}
                    </Txt>
                  </View>
                ))}
              </Card>
              <Section title="Ainda estimado na região" />
              <Card style={{ gap: 6 }}>
                {report.itensEstimadosDaRegiao.map((i) => (
                  <Txt key={i} size={12} color={c.amber}>
                    · {i}
                  </Txt>
                ))}
              </Card>
              <Section title="Fontes" />
              <Card style={{ gap: 10 }}>
                {report.fontes.map((f) => (
                  <Pressable
                    key={f.id}
                    accessibilityRole="link"
                    onPress={() =>
                      f.url.startsWith('http') ? void Linking.openURL(f.url) : undefined
                    }
                  >
                    <Txt size={12} weight="semi" color={c.green}>
                      {f.nome}
                    </Txt>
                    <Txt size={10} color={c.muted}>
                      {f.orgao} · acesso em {f.acessadoEm.split('-').reverse().join('/')}
                    </Txt>
                  </Pressable>
                ))}
              </Card>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Pill({ ok, text }: { ok: boolean; text: string }) {
  return (
    <Row
      style={{
        gap: 6,
        backgroundColor: ok ? c.sage : c.redBg,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 10,
      }}
    >
      <CheckCircle2 size={14} color={ok ? c.green : c.red} />
      <Txt size={11} weight="bold" color={ok ? c.green : c.red}>
        {text}
      </Txt>
    </Row>
  );
}
