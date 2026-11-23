import { describe } from 'vitest';
import type { Repo } from '@mkt/core';
import { criarBancoMysql } from '../db/mysql';
import { aplicarMigracoes } from '../db/migrar';
import { criarRepoSql } from '../db/repo-sql';

/**
 * Testes contra um MySQL real: só rodam com TEST_MYSQL=1 (use um banco DESCARTÁVEL, ele é limpo a cada teste!).
 * Exemplo:  TEST_MYSQL=1 DB_NAME=marketplace_teste npm test
 */
export const MYSQL_HABILITADO = process.env.TEST_MYSQL === '1';

export function descreverMysql(registrar: () => void) {
  if (MYSQL_HABILITADO) registrar();
  else describe.skip('MySQL real (defina TEST_MYSQL=1 e um banco de teste para rodar)', () => {});
}

const TABELAS = ['registros_login', 'reclamacoes', 'avaliacoes_vendedor', 'avaliacoes_produto', 'mensagens', 'conversas', 'pedido_itens', 'pedidos', 'carrinho_itens', 'produtos', 'usuarios'];

export async function fabricaMysql(): Promise<Repo> {
  const { banco } = criarBancoMysql();
  await aplicarMigracoes(banco);
  await banco.executar('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of TABELAS) await banco.executar(`TRUNCATE TABLE \`${t}\``);
  await banco.executar('SET FOREIGN_KEY_CHECKS = 1');
  return criarRepoSql(banco);
}
