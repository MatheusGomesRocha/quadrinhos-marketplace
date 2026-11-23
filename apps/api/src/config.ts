import 'dotenv/config';

const producao = process.env.NODE_ENV === 'production';

if (producao && !process.env.JWT_SECRET) throw new Error('Defina JWT_SECRET no ambiente de produção.');

export const config = {
  porta: Number(process.env.PORT ?? 3333),
  jwtSegredo: process.env.JWT_SECRET ?? 'segredo-somente-para-desenvolvimento',
  jwtExpira: process.env.JWT_EXPIRA ?? '8h',
  origensCors: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim()),
  confiarProxy: process.env.TRUST_PROXY === '1',
  bcryptCusto: 10,
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    usuario: process.env.DB_USER ?? 'root',
    senha: process.env.DB_PASSWORD ?? '',
    nome: process.env.DB_NAME ?? 'marketplace_quadrinhos',
  },
};
