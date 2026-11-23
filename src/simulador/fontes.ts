// Fase 1 do simulador: manifesto de fontes, dados com selo e divergências.
// Cada número usado pelo simulador está aqui, com a fonte e o selo. Nada entra sem selo (Portão A).
// Os valores oficiais foram conferidos página por página em 23/11/2026. O coletor
// (scripts/coletar-fontes.ts) baixa os arquivos brutos quando roda numa máquina com acesso
// aos sites da Prefeitura, do IBGE e do INMET.

export type Selo = 'oficial' | 'derivado' | 'estimado' | 'hipotese';

export interface Fonte {
  id: string;
  nome: string;
  orgao: string;
  url: string;
  acessadoEm: string;
  observacao?: string;
}

export interface DadoRegional {
  chave: string;
  descricao: string;
  valor: number;
  unidade: string;
  selo: Selo;
  fonteId: string | null;
  nota: string;
}

export interface Divergencia {
  id: number;
  dado: string;
  valorA: string;
  fonteA: string;
  valorB: string;
  fonteB: string;
  decisao: string;
}

const ACESSO = '2026-11-23';

export const FONTES: Fonte[] = [
  {
    id: 'smdu-domicilios',
    nome: 'Domicílios, população e densidade domiciliar (1991 a 2022)',
    orgao: 'Prefeitura de SP, SMDU/Deinfo, com dados do IBGE',
    url: 'https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/chamadas/7_domicilios_populacao_e_densidade_domicil_1991_2022_1711048299.htm',
    acessadoEm: ACESSO,
  },
  {
    id: 'coletanea',
    nome: 'Coletânea de indicadores das subprefeituras (jul/2025)',
    orgao: 'Prefeitura de SP, SMUL',
    url: 'https://gestaourbana.prefeitura.sp.gov.br/wp-content/uploads/2025/07/Coletanea-de-indicadores-das-subprefeituras-versao-1.2.pdf',
    acessadoEm: ACESSO,
  },
  {
    id: 'pas-capela',
    nome: 'Plano de Ação da Subprefeitura Capela do Socorro 2026-2029 (dez/2025)',
    orgao: 'Prefeitura de SP, SMUL/PLANURB',
    url: 'https://gestaourbana.prefeitura.sp.gov.br/wp-content/uploads/2026/01/PAS_SUL2_CAPELADOSOCORRO_CADERNO_REV02.pdf',
    acessadoEm: ACESSO,
  },
  {
    id: 'ibge-setores',
    nome: 'Censo 2022: população e domicílios por setor censitário',
    orgao: 'IBGE',
    url: 'https://agenciadenoticias.ibge.gov.br/en/agencia-news/39539-2022-census-information-on-population-and-housing-units-by-enumeration-areas-helps-public-management.html?lang=en-GB',
    acessadoEm: ACESSO,
    observacao: 'Arquivo por setor ainda não baixado: o coletor faz isso quando tiver acesso.',
  },
  {
    id: 'geosampa',
    nome: 'GeoSampa aberto (mais de 390 camadas)',
    orgao: 'Prefeitura de SP, SMUL/Geoinfo',
    url: 'https://gestaourbana.prefeitura.sp.gov.br/wp-content/uploads/2023/11/61_IU_GEOSAMPA-ABERTO.pdf',
    acessadoEm: ACESSO,
  },
  {
    id: 'osm',
    nome: 'OpenStreetMap: extratos regionais e Overpass',
    orgao: 'OpenStreetMap',
    url: 'https://wiki.openstreetmap.org/wiki/Download',
    acessadoEm: ACESSO,
  },
  {
    id: 'spregula-cep',
    nome: 'Consulta de dias e horários da coleta por CEP',
    orgao: 'SP Regula',
    url: 'https://prefeitura.sp.gov.br/web/spregula/w/consultar-coleta',
    acessadoEm: ACESSO,
    observacao: 'Sem download aberto: consulta CEP a CEP.',
  },
  {
    id: 'spregula-domiciliar',
    nome: 'Coleta domiciliar: 842 veículos e 12 mil t/dia',
    orgao: 'SP Regula',
    url: 'https://prefeitura.sp.gov.br/web/spregula/w/residuos_solidos/residuos_solidos/domiciliar/4636',
    acessadoEm: ACESSO,
  },
  {
    id: 'smul-origem-2025',
    nome: 'Coleta de lixo segundo origem, 2025',
    orgao: 'Prefeitura de SP, SMUL (dados SELIMP/SP Regula)',
    url: 'https://prefeitura.sp.gov.br/documents/d/licenciamento/coleta-de-lixo-segundo-origem_2025_rev_2026_08_26',
    acessadoEm: ACESSO,
  },
  {
    id: 'spregula-transbordos',
    nome: 'Aterros e estações de transbordo',
    orgao: 'SP Regula',
    url: 'https://prefeitura.sp.gov.br/web/spregula/w/residuos_solidos/aterros_e_transbordos/4633',
    acessadoEm: ACESSO,
  },
  {
    id: 'usimeca',
    nome: 'Coletor compactador Brutus 19 (19 m³)',
    orgao: 'Hyva/Usimeca (fabricante)',
    url: 'https://hyva.com/de-de/waste-management/usimeca-refuse-collection/Brutus/brutus-19',
    acessadoEm: ACESSO,
  },
  {
    id: 'modulo-impacto',
    nome: 'Parâmetros do módulo de impacto (ANP, UnB 2018, Inventário Nacional)',
    orgao: 'Projeto Coleta, docs/banco-impacto',
    url: 'docs/banco-impacto/README.md',
    acessadoEm: ACESSO,
  },
  {
    id: 'sp156',
    nome: 'SP156: solicitações (dados abertos)',
    orgao: 'Prefeitura de SP, SMIT',
    url: 'http://dados.prefeitura.sp.gov.br/dataset/dados-do-sp156',
    acessadoEm: ACESSO,
    observacao: 'Pedidos de 01/01/2012 a 31/07/2023; última extração em 15/10/2023.',
  },
  {
    id: 'geosampa-sp156',
    nome: 'Camadas do SP156 no GeoSampa (tema Lixo e limpeza)',
    orgao: 'Prefeitura de SP, SMIT/CASP e SMUL/Geoinfo',
    url: 'https://metadados.geosampa.prefeitura.sp.gov.br/geonetwork/srv/api/records/5f1c93bc-cbd6-44a5-9527-b1fc95b71f44',
    acessadoEm: ACESSO,
  },
  {
    id: 'subpref-sac',
    nome: 'Por que tanto descarte irregular? (gráfico de chamados, jun/2025 a mar/2026)',
    orgao: 'Subprefeitura Capela do Socorro',
    url: 'https://prefeitura.sp.gov.br/web/capela_do_socorro/w/por-que-tanto-descarte-irregular-',
    acessadoEm: ACESSO,
  },
  {
    id: 'tic-c16a',
    nome: 'TIC Domicílios 2025, tabela C16A',
    orgao: 'Cetic.br',
    url: 'https://cetic.br/en/tics/domicilios/2025/individuos/C16A/',
    acessadoEm: ACESSO,
  },
  {
    id: 'passando-a-limpo',
    nome: 'Passando a Limpo: contratos de coleta e limpeza (jan/2022)',
    orgao: 'Rede Nossa São Paulo',
    url: 'https://passandoalimpo.nossasaopaulo.org.br/files/Passando_a_Limpo_-_Relatorio_final.pdf',
    acessadoEm: ACESSO,
  },
  {
    id: 'sesana-feiras',
    nome: 'Feiras livres de São Paulo (lista e painel)',
    orgao: 'Prefeitura de SP, SESANA',
    url: 'https://prefeitura.sp.gov.br/web/sesana/feiras_livres',
    acessadoEm: ACESSO,
    observacao: 'A planilha com endereços ainda não foi baixada.',
  },
  {
    id: 'ecopontos-2024',
    nome: 'Conheça os ecopontos da cidade (mai/2024)',
    orgao: 'Prefeitura de SP',
    url: 'https://prefeitura.sp.gov.br/w/conhe%C3%A7a-os-ecopontos-da-cidade-de-s%C3%A3o-paulo',
    acessadoEm: ACESSO,
  },
  {
    id: 'inmet',
    nome: 'Dados históricos das estações automáticas (2026 até 31/10)',
    orgao: 'INMET',
    url: 'https://portal.inmet.gov.br/dadoshistoricos',
    acessadoEm: ACESSO,
    observacao: 'Arquivo de 2026 ainda não baixado: a chuva diária é estimada a partir do total.',
  },
  {
    id: 'chuva-outubro',
    nome: 'Chuvas em outubro superam a média histórica em SP (dados do INMET, Interlagos)',
    orgao: 'Correio da Manhã',
    url: 'https://www.correiodamanha.com.br/nacional/sao-paulo/2026/11/332770-chuvas-em-outubro-superam-media-historica-em-sp.html',
    acessadoEm: ACESSO,
  },
  {
    id: 'tre-sp',
    nome: 'Eleições 2026: datas do 1º e do 2º turnos',
    orgao: 'TRE-SP',
    url: 'https://www.tre-sp.jus.br/comunicacao/noticias/2026/Maio/eleicoes-2026-outubro-tem-datas-do-1o-e-do-2o-turnos-definidas-pela-constituicao',
    acessadoEm: ACESSO,
  },
];

// Valores de base. Derivados mostram a conta na nota.
const POP_GRAJAU = 384873;
const DOM_GRAJAU = 154205;
const DOM_DISTRITOS_CAPELA = 154205 + 72013 + 16549; // 242.767, soma da tabela SMDU/Deinfo
const DOM_PERMANENTES_CAPELA = 212747;
const POP_CAPELA = 605383;
const PARTE_CAPELA_NA_CIDADE = 0.0529;
const LIXO_2025_T = 3549352;
const POP_CIDADE = Math.round(POP_CAPELA / PARTE_CAPELA_NA_CIDADE);
const LIXO_PESSOA_DIA = Math.round(((LIXO_2025_T * 1000) / 365 / POP_CIDADE) * 1000) / 1000;
const DOM_OCUPADOS_GRAJAU = Math.round(
  DOM_PERMANENTES_CAPELA * (DOM_GRAJAU / DOM_DISTRITOS_CAPELA),
);

export const DADOS: DadoRegional[] = [
  // Território
  {
    chave: 'populacao',
    descricao: 'Moradores do Grajaú (Censo 2022)',
    valor: POP_GRAJAU,
    unidade: 'pessoas',
    selo: 'oficial',
    fonteId: 'smdu-domicilios',
    nota: '',
  },
  {
    chave: 'domicilios_total',
    descricao: 'Domicílios do Grajaú (Censo 2022)',
    valor: DOM_GRAJAU,
    unidade: 'domicílios',
    selo: 'oficial',
    fonteId: 'smdu-domicilios',
    nota: 'Conta todos os domicílios recenseados.',
  },
  {
    chave: 'moradores_por_domicilio',
    descricao: 'Moradores por domicílio',
    valor: 2.5,
    unidade: 'pessoas',
    selo: 'oficial',
    fonteId: 'smdu-domicilios',
    nota: '',
  },
  {
    chave: 'densidade',
    descricao: 'Densidade do Grajaú',
    valor: 41.7,
    unidade: 'hab/ha',
    selo: 'oficial',
    fonteId: 'pas-capela',
    nota: '',
  },
  {
    chave: 'area',
    descricao: 'Área do Grajaú',
    valor: Math.round((POP_GRAJAU / 41.7 / 100) * 10) / 10,
    unidade: 'km²',
    selo: 'derivado',
    fonteId: 'pas-capela',
    nota: 'Moradores ÷ densidade.',
  },
  {
    chave: 'domicilios_ocupados',
    descricao: 'Domicílios permanentes do Grajaú',
    valor: DOM_OCUPADOS_GRAJAU,
    unidade: 'domicílios',
    selo: 'derivado',
    fonteId: 'coletanea',
    nota: '212.747 permanentes da subprefeitura × parte do Grajaú nos domicílios (154.205 ÷ 242.767).',
  },
  {
    chave: 'populacao_cidade',
    descricao: 'Moradores da cidade',
    valor: POP_CIDADE,
    unidade: 'pessoas',
    selo: 'derivado',
    fonteId: 'coletanea',
    nota: '605.383 ÷ 5,29% (parte da Capela do Socorro na cidade).',
  },
  // Lixo
  {
    chave: 'lixo_domiciliar_2025',
    descricao: 'Lixo domiciliar coletado na cidade em 2025',
    valor: LIXO_2025_T,
    unidade: 't',
    selo: 'oficial',
    fonteId: 'smul-origem-2025',
    nota: '',
  },
  {
    chave: 'lixo_por_pessoa',
    descricao: 'Lixo domiciliar por pessoa por dia',
    valor: LIXO_PESSOA_DIA,
    unidade: 'kg/dia',
    selo: 'derivado',
    fonteId: 'smul-origem-2025',
    nota: 'Toneladas de 2025 ÷ 365 ÷ moradores da cidade.',
  },
  {
    chave: 'lixo_por_pessoa_min',
    descricao: 'Menor geração por pessoa entre distritos',
    valor: 0.63,
    unidade: 'kg/dia',
    selo: 'oficial',
    fonteId: 'passando-a-limpo',
    nota: 'PGIRS, citado no relatório (Cidade Tiradentes).',
  },
  {
    chave: 'lixo_por_pessoa_max',
    descricao: 'Maior geração por pessoa entre distritos',
    valor: 1.73,
    unidade: 'kg/dia',
    selo: 'oficial',
    fonteId: 'passando-a-limpo',
    nota: 'PGIRS, citado no relatório (Pinheiros).',
  },
  // Operação
  {
    chave: 'caminhoes',
    descricao: 'Caminhões da coleta no Grajaú',
    valor: 22,
    unidade: 'caminhões',
    selo: 'estimado',
    fonteId: 'modulo-impacto',
    nota: '842 da cidade × parte da população, repartido entre os distritos no módulo de impacto.',
  },
  {
    chave: 'cacamba',
    descricao: 'Volume da caçamba',
    valor: 19,
    unidade: 'm³',
    selo: 'oficial',
    fonteId: 'usimeca',
    nota: 'Modelo de fabricante; a frota real não é publicada.',
  },
  {
    chave: 'carga_maxima',
    descricao: 'Carga por viagem ao transbordo',
    valor: 9,
    unidade: 't',
    selo: 'estimado',
    fonteId: 'usimeca',
    nota: '19 m³ × cerca de 0,47 t/m³ de lixo compactado; conferir com a ficha técnica do chassi.',
  },
  {
    chave: 'transbordo_capacidade_min',
    descricao: 'Capacidade do transbordo Santo Amaro',
    valor: 2500,
    unidade: 't/dia',
    selo: 'oficial',
    fonteId: 'spregula-transbordos',
    nota: '2.500 a 3.000 t/dia; atende 8 subprefeituras.',
  },
  {
    chave: 'fator_ruas',
    descricao: 'Distância pelas ruas ÷ distância em linha reta',
    valor: 1.35,
    unidade: '×',
    selo: 'estimado',
    fonteId: 'osm',
    nota: 'Trocar pela distância real quando o mapa do OpenStreetMap for baixado.',
  },
  {
    chave: 'velocidade',
    descricao: 'Velocidade média do caminhão',
    valor: 18,
    unidade: 'km/h',
    selo: 'estimado',
    fonteId: null,
    nota: 'Trânsito urbano com paradas.',
  },
  {
    chave: 'velocidade_chuva',
    descricao: 'Velocidade com chuva forte (20 mm ou mais)',
    valor: 14,
    unidade: 'km/h',
    selo: 'estimado',
    fonteId: null,
    nota: '',
  },
  // Clima e calendário
  {
    chave: 'chuva_total',
    descricao: 'Chuva em outubro de 2026, estação Interlagos',
    valor: 271.2,
    unidade: 'mm',
    selo: 'oficial',
    fonteId: 'chuva-outubro',
    nota: 'INMET, citado pelo jornal.',
  },
  {
    chave: 'dias_chuva',
    descricao: 'Dias com mais de 1 mm em outubro de 2026',
    valor: 19,
    unidade: 'dias',
    selo: 'oficial',
    fonteId: 'chuva-outubro',
    nota: '',
  },
  {
    chave: 'chuva_media',
    descricao: 'Média histórica de outubro (1991-2020)',
    valor: 141.8,
    unidade: 'mm',
    selo: 'oficial',
    fonteId: 'chuva-outubro',
    nota: '',
  },
  // Demanda
  {
    chave: 'chamados_descarte_capela',
    descricao: 'Chamados de descarte irregular na subprefeitura, out/2025',
    valor: 767,
    unidade: 'chamados/mês',
    selo: 'oficial',
    fonteId: 'subpref-sac',
    nota: 'Lido no gráfico da subprefeitura.',
  },
  {
    chave: 'parte_grajau',
    descricao: 'Parte do Grajaú nos moradores da subprefeitura',
    valor: 0.636,
    unidade: 'fração',
    selo: 'oficial',
    fonteId: 'pas-capela',
    nota: '',
  },
  {
    chave: 'celular_classe_de',
    descricao: 'Usuários de internet da classe DE que acessam só pelo celular',
    valor: 0.87,
    unidade: 'fração',
    selo: 'oficial',
    fonteId: 'tic-c16a',
    nota: 'Dado do Brasil, não do distrito.',
  },
  {
    chave: 'feiras_cidade',
    descricao: 'Feiras livres na cidade',
    valor: 975,
    unidade: 'feiras',
    selo: 'oficial',
    fonteId: 'sesana-feiras',
    nota: '',
  },
  {
    chave: 'feiras_grajau',
    descricao: 'Feiras livres no Grajaú',
    valor: Math.round((975 * POP_GRAJAU) / POP_CIDADE),
    unidade: 'feiras',
    selo: 'derivado',
    fonteId: 'sesana-feiras',
    nota: 'Proporcional à população até a planilha da SESANA ser lida.',
  },
  // Hipóteses do cenário único (sem dado público)
  {
    chave: 'adocao_final',
    descricao: 'Domicílios com o app no fim do mês',
    valor: 0.03,
    unidade: 'fração',
    selo: 'hipotese',
    fonteId: null,
    nota: 'Começa em 0,5% e cresce até 3%.',
  },
  {
    chave: 'adocao_inicial',
    descricao: 'Domicílios com o app no 1º dia',
    valor: 0.005,
    unidade: 'fração',
    selo: 'hipotese',
    fonteId: null,
    nota: '',
  },
  {
    chave: 'atencao',
    descricao: 'Chance de quem tem o app avisar um problema que viu',
    valor: 0.5,
    unidade: 'fração',
    selo: 'hipotese',
    fonteId: null,
    nota: '',
  },
  {
    chave: 'vizinhos_que_veem',
    descricao: 'Domicílios que passam por um ponto de descarte',
    valor: 40,
    unidade: 'domicílios',
    selo: 'hipotese',
    fonteId: null,
    nota: '',
  },
  {
    chave: 'taxa_chamado_sac',
    descricao: 'Parte dos descartes que vira chamado na Prefeitura',
    valor: 0.35,
    unidade: 'fração',
    selo: 'hipotese',
    fonteId: 'sp156',
    nota: 'O SP156 avisa que mostra pedidos, não problemas.',
  },
  {
    chave: 'falha_coleta',
    descricao: 'Chance de um setor ficar sem coleta no dia',
    valor: 0.03,
    unidade: 'fração',
    selo: 'hipotese',
    fonteId: 'passando-a-limpo',
    nota: 'O relatório diz que a coleta universal não acontece na prática na periferia.',
  },
  {
    chave: 'falha_coleta_chuva',
    descricao: 'Chance extra de falha com 20 mm de chuva ou mais',
    valor: 0.03,
    unidade: 'fração',
    selo: 'hipotese',
    fonteId: null,
    nota: '',
  },
  {
    chave: 'volume_extra',
    descricao: 'Pedidos de volume extra por domicílio com app por dia',
    valor: 0.002,
    unidade: 'pedidos',
    selo: 'hipotese',
    fonteId: null,
    nota: '',
  },
  {
    chave: 'janela_agrupamento',
    descricao: 'Quanto um pedido não urgente pode esperar um caminhão que passe no setor',
    valor: 12,
    unidade: 'horas',
    selo: 'hipotese',
    fonteId: null,
    nota: 'Coleta não passou é urgente e não espera.',
  },
  {
    chave: 'km_sem_app_por_ponto',
    descricao: 'Km por ponto atendido sem o app (zeladoria em lote)',
    valor: 4,
    unidade: 'km',
    selo: 'hipotese',
    fonteId: null,
    nota: 'Viagem de equipe que junta vários pontos.',
  },
  {
    chave: 'prazo_sem_app_descarte',
    descricao: 'Tempo até limpar um descarte sem o app',
    valor: 72,
    unidade: 'horas',
    selo: 'hipotese',
    fonteId: null,
    nota: 'Ciclo da zeladoria.',
  },
  {
    chave: 'prazo_sem_app_volume',
    descricao: 'Tempo até retirar volume extra sem o app',
    valor: 168,
    unidade: 'horas',
    selo: 'hipotese',
    fonteId: null,
    nota: 'Cata-bagulho agendado.',
  },
];

export const dado = (chave: string) => {
  const d = DADOS.find((x) => x.chave === chave);
  if (!d) throw new Error(`Dado sem cadastro: ${chave}`);
  return d.valor;
};

export const DIVERGENCIAS: Divergencia[] = [
  {
    id: 1,
    dado: 'Domicílios da Capela do Socorro (Censo 2022)',
    valorA: '242.767 (soma dos três distritos)',
    fonteA: 'smdu-domicilios',
    valorB: '212.747 domicílios permanentes',
    fonteB: 'coletanea',
    decisao:
      'Usar os permanentes, repartidos pela parte do Grajaú; só domicílio ocupado gera lixo.',
  },
  {
    id: 2,
    dado: 'Lixo domiciliar por dia na cidade',
    valorA: '12 mil t/dia',
    fonteA: 'spregula-domiciliar',
    valorB: '3.549.352 t em 2025 (cerca de 9,7 mil t/dia)',
    fonteB: 'smul-origem-2025',
    decisao: 'Usar a série anual da SMUL, que é revisada a cada atualização.',
  },
  {
    id: 3,
    dado: 'Atualização dos dados abertos do SP156',
    valorA: 'Diz atualizar a cada três meses',
    fonteA: 'sp156',
    valorB: 'Pedidos param em 31/07/2023',
    fonteB: 'sp156',
    decisao: 'Não calibrar outubro de 2026 com o SP156; usar o gráfico da subprefeitura.',
  },
  {
    id: 4,
    dado: 'Pedido x problema',
    valorA: 'Base do SP156 mostra pedidos feitos',
    fonteA: 'sp156',
    valorB: 'Não mostra o número real de problemas',
    fonteB: 'sp156',
    decisao: 'O motor gera os problemas primeiro; só uma parte vira pedido.',
  },
  {
    id: 5,
    dado: 'Ecopontos na Capela do Socorro',
    valorA: '1 (maio/2024)',
    fonteA: 'ecopontos-2024',
    valorB: '2 (dez/2025)',
    fonteB: 'pas-capela',
    decisao: 'Usar a lista mais recente e guardar a data.',
  },
];

// Portão A: todo dado tem selo válido e, se oficial ou derivado, uma fonte cadastrada.
export function portaoA() {
  const ids = new Set(FONTES.map((f) => f.id));
  const problemas = DADOS.filter(
    (d) =>
      !['oficial', 'derivado', 'estimado', 'hipotese'].includes(d.selo) ||
      ((d.selo === 'oficial' || d.selo === 'derivado') && (!d.fonteId || !ids.has(d.fonteId))) ||
      (d.fonteId !== null && !ids.has(d.fonteId)),
  ).map((d) => d.chave);
  return { ok: problemas.length === 0, problemas };
}
