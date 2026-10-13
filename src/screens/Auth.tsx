import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { ArrowRight, Leaf, Truck, LayoutDashboard, UserRound } from 'lucide-react-native';
import { api, DEMO_MODE } from '../api/client';
import { useSession } from '../state/session';
import {
  Brand,
  Button,
  Card,
  Field,
  IconBox,
  Notice,
  Row,
  Screen,
  Txt,
  useAction,
  useFeedback,
} from '../ui/components';
import { TruckArt } from '../ui/illustrations';
import { colors as c } from '../ui/theme';
import type { Role } from '../api/types';

export function WelcomeScreen({ navigation }: any) {
  const { enterDemo } = useSession();
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Brand />
        <Txt
          size={10}
          weight="bold"
          color={c.muted}
          style={{ letterSpacing: 2, flexShrink: 1, textAlign: 'right', maxWidth: 145 }}
        >
          CIDADE EM MOVIMENTO
        </Txt>
      </Row>
      <View style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
        <View
          style={{
            backgroundColor: c.greenDark,
            borderRadius: 30,
            height: 245,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TruckArt size={290} />
          <View
            style={{
              position: 'absolute',
              bottom: 18,
              right: 20,
              backgroundColor: c.lime,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: 20,
            }}
          >
            <Txt size={10} weight="bold" color={c.greenDark}>
              Pequenas ações. Grandes mudanças.
            </Txt>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Txt color={c.green} size={11} weight="extra" style={{ letterSpacing: 2 }}>
            CUIDAR É COLETIVO
          </Txt>
          <Txt size={37} weight="extra" style={{ letterSpacing: -1.7, lineHeight: 46 }}>
            Uma cidade limpa começa com você.
          </Txt>
          <Txt color={c.muted} size={14}>
            Peça uma coleta, acompanhe o caminho e ajude a transformar o seu entorno.
          </Txt>
        </View>
        <View style={{ gap: 10 }}>
          <Button
            title="Entrar na minha conta"
            icon={ArrowRight}
            onPress={() => navigation.navigate('Login')}
          />
          <Button
            title="Criar conta de cidadão"
            variant="secondary"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
        {DEMO_MODE && (
          <View style={{ gap: 10 }}>
            <Row style={{ gap: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
              <Txt size={10} weight="bold" color={c.muted}>
                EXPLORE A DEMONSTRAÇÃO
              </Txt>
              <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            </Row>
            <Row style={{ gap: 8 }}>
              {(
                [
                  { role: 'Citizen', label: 'Cidadão', icon: UserRound },
                  { role: 'Driver', label: 'Motorista', icon: Truck },
                  { role: 'Manager', label: 'Gestor', icon: LayoutDashboard },
                ] as { role: Role; label: string; icon: typeof Leaf }[]
              ).map((p) => (
                <Pressable
                  key={p.role}
                  accessibilityRole="button"
                  accessibilityLabel={`Explorar como ${p.label}`}
                  onPress={() => enterDemo(p.role)}
                  style={{
                    flex: 1,
                    backgroundColor: c.white,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 16,
                    paddingVertical: 13,
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <p.icon size={20} color={c.green} />
                  <Txt size={11} weight="bold">
                    {p.label}
                  </Txt>
                </Pressable>
              ))}
            </Row>
            <Txt size={10} color={c.muted} style={{ textAlign: 'center' }}>
              Dados fictícios. Nenhuma coleta real será criada.
            </Txt>
          </View>
        )}
      </View>
    </Screen>
  );
}
export function LoginScreen({ navigation, route }: any) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState('');
  const { login, expired } = useSession();
  const action = useAction();
  const submit = () => {
    if (!email.trim() || !password) {
      action.setError('Preencha seu e-mail e sua senha.');
      return;
    }
    void action.run(() => login(email.trim(), password));
  };
  return (
    <Screen
      back
      navigation={navigation}
      title="Bom ter você aqui."
      subtitle="Entre para cuidar da cidade com a gente."
    >
      <View style={{ gap: 16, marginTop: 14 }}>
        {expired && <Notice>Sua sessão terminou. Entre novamente.</Notice>}
        {DEMO_MODE && (
          <Notice>
            Este é o modo de demonstração. Os atalhos da tela inicial permitem explorar os três
            perfis.
          </Notice>
        )}
        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboard="email-address"
          placeholder="voce@exemplo.com"
          error={action.fields.email?.[0]}
        />
        <Field
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="Sua senha"
          secure
          error={action.fields.password?.[0]}
        />
        {!!action.error && <Notice tone="error">{action.error}</Notice>}
        <Button title="Entrar" icon={ArrowRight} loading={action.busy} onPress={submit} />
        <Button
          title="Ainda não tenho conta"
          variant="ghost"
          onPress={() => navigation.navigate('Register')}
        />
      </View>
    </Screen>
  );
}
export function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAction();
  const { toast } = useFeedback();
  const submit = async () => {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()) || !password) {
      action.setError('Informe seu nome, um e-mail válido e uma senha.');
      return;
    }
    const result = await action.run(() =>
      api.register({ name: name.trim(), email: email.trim(), password }),
    );
    if (result) {
      toast('Conta criada. Entre com seu e-mail e senha.');
      navigation.replace('Login', { email: email.trim() });
    }
  };
  return (
    <Screen
      back
      navigation={navigation}
      title="Vamos fazer parte."
      subtitle="Crie sua conta de cidadão em poucos passos."
    >
      <Card style={{ backgroundColor: c.sage, borderWidth: 0 }}>
        <Row style={{ gap: 12 }}>
          <IconBox icon={Leaf} bg={c.white} />
          <Txt size={12} color={c.green} style={{ flex: 1 }}>
            Sua próxima atitude pode deixar o bairro mais limpo.
          </Txt>
        </Row>
      </Card>
      <View style={{ gap: 16 }}>
        <Field
          label="Nome completo"
          value={name}
          onChangeText={setName}
          placeholder="Como podemos chamar você?"
          error={action.fields.name?.[0]}
        />
        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboard="email-address"
          placeholder="voce@exemplo.com"
          error={action.fields.email?.[0]}
        />
        <Field
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secure
          placeholder="Crie sua senha"
          error={action.fields.password?.[0]}
        />
        {!!action.error && <Notice tone="error">{action.error}</Notice>}
        <Button
          title="Criar minha conta"
          loading={action.busy}
          onPress={submit}
          icon={ArrowRight}
        />
        <Txt color={c.muted} size={11} style={{ textAlign: 'center' }}>
          Esta conta permite solicitar e acompanhar suas coletas.
        </Txt>
      </View>
    </Screen>
  );
}
