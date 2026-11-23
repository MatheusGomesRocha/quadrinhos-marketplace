import { popularExemplo } from '@mkt/core';
import { criptoBcrypt } from './cripto';
import { criarBancoMysql } from './db/mysql';
import { criarRepoSql } from './db/repo-sql';

/** Popula o banco com os dados de exemplo (lojas, produtos, pedidos, avaliações...). Só roda em banco vazio. */
const { banco, encerrar } = criarBancoMysql();
try {
  const repo = criarRepoSql(banco);
  if ((await repo.usuarios.contar()) > 0) {
    console.error('O banco já tem usuários. Para recomeçar, recrie o banco (DROP/CREATE DATABASE), rode `npm run migrar` e depois `npm run seed`.');
    process.exitCode = 1;
  } else {
    await popularExemplo(repo, criptoBcrypt);
    console.log('Dados de exemplo criados. Logins (senha demo123): admin@mkt.demo, vendedor1@mkt.demo, comprador1@mkt.demo');
  }
} finally {
  await encerrar();
}
