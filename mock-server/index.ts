// Inicia o mock da API: npm run mock (porta 5073 por padrão, ou MOCK_PORT).
import { SEED_ACCOUNTS, SEED_PASSWORD, startMockServer } from './server';

const port = Number(process.env.MOCK_PORT || 5073);
const simulate = process.env.MOCK_SIMULATE !== 'false';

startMockServer(port, '0.0.0.0', { simulate, log: process.env.MOCK_LOG !== 'false' })
  .then(({ url, close }) => {
    const labels = { Manager: 'Gestor', Driver: 'Motorista', Citizen: 'Cidadão' };
    console.log(`\nMock da API Coleta rodando em ${url}`);
    console.log(`Contrato: ${url}/openapi/v1.json · Dados em memória (reiniciam ao parar)\n`);
    console.log(`Contas de teste (senha: ${SEED_PASSWORD})`);
    for (const a of SEED_ACCOUNTS) console.log(`  ${labels[a.role].padEnd(10)} ${a.email}`);
    console.log('');
    const stop = () => void close().then(() => process.exit(0));
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  })
  .catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE')
      console.error(
        `A porta ${port} já está em uso. Feche o outro servidor ou use MOCK_PORT=outra-porta.`,
      );
    else console.error(error);
    process.exit(1);
  });
