export const colors = {
  ink: '#20382C',
  green: '#214D3A',
  greenDark: '#153C2C',
  lime: '#D8ED9B',
  paper: '#F7F8F2',
  white: '#FFFFFF',
  muted: '#68776D',
  border: '#E3E8DC',
  sage: '#EBF0E4',
  amber: '#916016',
  amberBg: '#FBF1DD',
  red: '#B24D43',
  redBg: '#FBEAE5',
  blue: '#35646B',
  blueBg: '#E7F1F1',
};
export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semi: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extra: 'Manrope_800ExtraBold',
};
export const statusLabels: Record<string, string> = {
  Pending: 'Aguardando',
  Assigned: 'Atribuída',
  Collected: 'Coletada',
  Cancelled: 'Cancelada',
  Planned: 'Planejada',
  InProgress: 'Em andamento',
  Completed: 'Concluída',
  Skipped: 'Não atendida',
};
export const roleLabels = { Citizen: 'Cidadão', Driver: 'Motorista', Manager: 'Gestor' };
export const formatDate = (value: string | null, time = true) =>
  value
    ? new Date(value).toLocaleString(
        'pt-BR',
        time
          ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
          : { day: '2-digit', month: 'short' },
      )
    : 'Não informado';
export const distance = (value: number | string | null) =>
  value == null ? '—' : `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
export const coordinateLabel = (point: { latitude: number | string; longitude: number | string }) =>
  `${Number(point.latitude).toFixed(5)}, ${Number(point.longitude).toFixed(5)}`;
