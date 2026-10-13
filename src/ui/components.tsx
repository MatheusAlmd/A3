import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Leaf,
  MapPin,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ApiError, errorMessage } from '../api/errors';
import { colors as c, fonts, statusLabels } from './theme';

export function Txt({
  children,
  size = 14,
  weight = 'regular',
  color = c.ink,
  style,
  ...props
}: {
  children?: React.ReactNode;
  size?: number;
  weight?: keyof typeof fonts;
  color?: string;
  style?: TextStyle | TextStyle[];
  [key: string]: any;
}) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: fonts[weight], fontSize: size, color, lineHeight: size * 1.48 }, style]}
    >
      {children}
    </Text>
  );
}
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.row, style]}>{children}</View>;
}
export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View {...props} style={[s.card, style]}>
      {children}
    </View>
  );
}
export function IconBox({
  icon: Icon,
  color = c.green,
  bg = c.sage,
  size = 44,
}: {
  icon: LucideIcon;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon color={color} size={size * 0.46} strokeWidth={1.8} />
    </View>
  );
}
export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  loading,
  disabled,
  compact,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const foreground = variant === 'primary' ? c.white : variant === 'danger' ? c.red : c.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor:
            variant === 'primary'
              ? c.green
              : variant === 'danger'
                ? c.redBg
                : variant === 'secondary'
                  ? c.sage
                  : 'transparent',
          minHeight: compact ? 44 : 54,
          opacity: disabled || loading ? 0.55 : pressed ? 0.82 : 1,
          paddingHorizontal: compact ? 14 : 20,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          <Txt size={compact ? 13 : 15} weight="bold" color={foreground}>
            {title}
          </Txt>
          {Icon && <Icon size={18} color={foreground} strokeWidth={2} />}
        </>
      )}
    </Pressable>
  );
}
export function IconButton({
  icon: Icon,
  onPress,
  label,
}: {
  icon: LucideIcon;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.iconButton, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon size={21} color={c.ink} strokeWidth={1.7} />
    </Pressable>
  );
}
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Row style={{ gap: 7 }}>
      <View
        style={{
          backgroundColor: c.green,
          width: small ? 28 : 34,
          height: small ? 28 : 34,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Leaf color={c.lime} size={small ? 17 : 21} strokeWidth={1.8} />
      </View>
      <Txt weight="extra" size={small ? 21 : 26} style={{ letterSpacing: -1 }}>
        coleta
        <Txt size={small ? 21 : 26} color={c.green}>
          .
        </Txt>
      </Txt>
    </Row>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Row style={{ justifyContent: 'space-between', gap: 8 }}>
      <Txt size={18} weight="bold" style={{ flex: 1, letterSpacing: -0.45 }}>
        {title}
      </Txt>
      {!!action && onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 3 }}
        >
          <Txt color={c.green} size={12} weight="bold">
            {action}
          </Txt>
          <ChevronRight color={c.green} size={15} />
        </Pressable>
      )}
    </Row>
  );
}
export function Badge({ status }: { status: string }) {
  const palette = ['Pending', 'Planned'].includes(status)
    ? [c.amberBg, c.amber]
    : status === 'Cancelled'
      ? [c.redBg, c.red]
      : status === 'Assigned'
        ? [c.blueBg, c.blue]
        : [c.sage, c.green];
  return (
    <Row
      style={{
        backgroundColor: palette[0],
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 10,
        gap: 5,
        alignSelf: 'flex-start',
      }}
    >
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: palette[1] }} />
      <Txt color={palette[1]} size={10} weight="bold">
        {statusLabels[status] || status}
      </Txt>
    </Row>
  );
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: React.ReactNode;
  tone?: 'info' | 'error';
}) {
  return (
    <Row
      style={{
        gap: 10,
        backgroundColor: tone === 'error' ? c.redBg : c.sage,
        borderRadius: 15,
        padding: 14,
        alignItems: 'flex-start',
      }}
    >
      <CircleAlert color={tone === 'error' ? c.red : c.green} size={18} style={{ marginTop: 2 }} />
      <Txt color={tone === 'error' ? c.red : c.muted} size={12} style={{ flex: 1 }}>
        {children}
      </Txt>
    </Row>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure = false,
  multiline,
  keyboard = 'default',
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  multiline?: boolean;
  keyboard?: 'default' | 'email-address' | 'decimal-pad' | 'numeric';
  error?: string;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Txt weight="semi" size={12}>
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#879087"
        secureTextEntry={secure}
        multiline={multiline}
        autoCapitalize={keyboard === 'email-address' || secure ? 'none' : 'sentences'}
        autoCorrect={!(secure || keyboard === 'email-address')}
        keyboardType={keyboard}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[s.input, { minHeight: multiline ? 96 : 54, borderColor: error ? c.red : c.border }]}
      />
      {!!error && (
        <Txt color={c.red} size={11}>
          {error}
        </Txt>
      )}
    </View>
  );
}
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {options.map((o) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.value }}
          key={o.value}
          onPress={() => onChange(o.value)}
          style={{
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: 16,
            borderRadius: 24,
            backgroundColor: value === o.value ? c.green : c.white,
            borderWidth: 1,
            borderColor: value === o.value ? c.green : c.border,
          }}
        >
          <Txt size={12} weight="semi" color={value === o.value ? c.white : c.muted}>
            {o.label}
          </Txt>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function Empty({
  title,
  body,
  icon: Icon = MapPin,
  action,
  onPress,
}: {
  title: string;
  body: string;
  icon?: LucideIcon;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Card style={{ paddingVertical: 35, alignItems: 'center', gap: 12 }}>
      <IconBox icon={Icon} size={56} />
      <Txt weight="bold" size={18} style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      <Txt color={c.muted} size={13} style={{ textAlign: 'center', maxWidth: 270 }}>
        {body}
      </Txt>
      {!!action && onPress && (
        <Button title={action} onPress={onPress} compact variant="secondary" icon={ArrowRight} />
      )}
    </Card>
  );
}
export function ResourceState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error?: string;
  retry: () => void;
}) {
  if (loading)
    return (
      <View accessibilityLabel="Carregando" style={{ padding: 35, gap: 12, alignItems: 'center' }}>
        <ActivityIndicator color={c.green} />
        <Txt color={c.muted} size={12}>
          Só um instante…
        </Txt>
      </View>
    );
  if (error)
    return (
      <View style={{ gap: 10 }}>
        <Notice tone="error">{error}</Notice>
        <Button title="Tentar novamente" onPress={retry} variant="secondary" compact />
      </View>
    );
  return null;
}
export function Screen({
  children,
  title,
  subtitle,
  navigation,
  back,
  action,
  refreshing = false,
  onRefresh,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  navigation?: any;
  back?: boolean;
  action?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.paper }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.green}
              colors={[c.green]}
            />
          ) : undefined
        }
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: insets.top + 20,
          paddingBottom: Math.max(30, insets.bottom),
          gap: 22,
          flexGrow: 1,
        }}
      >
        {back && (
          <Row style={{ justifyContent: 'space-between' }}>
            <IconButton icon={ArrowLeft} onPress={() => navigation.goBack()} label="Voltar" />
            <Brand small />
          </Row>
        )}
        {!!title && (
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt size={30} weight="extra" style={{ letterSpacing: -1.1, lineHeight: 38 }}>
                {title}
              </Txt>
              {!!subtitle && (
                <Txt color={c.muted} size={13}>
                  {subtitle}
                </Txt>
              )}
            </View>
            {action}
          </Row>
        )}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface Feedback {
  toast: (text: string) => void;
  confirm: (
    title: string,
    description: string,
    action?: string,
    tone?: 'primary' | 'danger',
  ) => Promise<boolean>;
}
const FeedbackContext = createContext<Feedback>(null!);
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState('');
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    action: string;
    tone: 'primary' | 'danger';
    resolve: (yes: boolean) => void;
  } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const close = (yes: boolean) => {
    confirmation?.resolve(yes);
    setConfirmation(null);
  };
  return (
    <FeedbackContext.Provider
      value={{
        toast: (text) => {
          setToast(text);
          if (Platform.OS !== 'web')
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
              () => {},
            );
        },
        confirm: (title, description, action = 'Confirmar', tone = 'danger') =>
          new Promise((resolve) => setConfirmation({ title, description, action, tone, resolve })),
      }}
    >
      {children}
      {!!toast && (
        <Pressable
          onPress={() => setToast('')}
          accessibilityRole="alert"
          style={{
            position: 'absolute',
            bottom: 92,
            left: 20,
            right: 20,
            backgroundColor: c.greenDark,
            padding: 16,
            borderRadius: 15,
            flexDirection: 'row',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <Check size={20} color={c.lime} />
          <Txt color={c.white} size={12} style={{ flex: 1 }}>
            {toast}
          </Txt>
        </Pressable>
      )}
      <Modal
        transparent
        visible={!!confirmation}
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#122A2470',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Card
            role="dialog"
            aria-modal={true}
            accessibilityViewIsModal
            accessibilityLabel={confirmation?.title}
            style={{ width: '100%', maxWidth: 380, padding: 24, gap: 16 }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <IconBox
                icon={CircleAlert}
                color={confirmation?.tone === 'primary' ? c.green : c.red}
                bg={confirmation?.tone === 'primary' ? c.sage : c.redBg}
              />
              <IconButton icon={X} onPress={() => close(false)} label="Fechar confirmação" />
            </Row>
            <Txt size={23} weight="bold">
              {confirmation?.title}
            </Txt>
            <Txt color={c.muted}>{confirmation?.description}</Txt>
            <Button
              title={confirmation?.action || 'Confirmar'}
              variant={confirmation?.tone || 'danger'}
              onPress={() => close(true)}
            />
            <Button title="Voltar" variant="ghost" onPress={() => close(false)} />
          </Card>
        </View>
      </Modal>
    </FeedbackContext.Provider>
  );
}
export const useFeedback = () => useContext(FeedbackContext);
export function useAction() {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string[]>>({});
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setFields({});
    try {
      return await fn();
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError)
        setFields(
          Object.fromEntries(
            Object.entries(e.fields).map(([key, messages]) => [
              key
                .split('.')
                .pop()!
                .replace(/^./, (letter) => letter.toLowerCase()),
              messages,
            ]),
          ),
        );
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }
  return { busy, error, fields, run, setError };
}
export function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <Txt color={c.muted} size={12}>
        {label}
      </Txt>
      <Txt weight="semi" size={12} style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </Row>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  card: {
    backgroundColor: c.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: 18,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: c.ink,
  },
});
