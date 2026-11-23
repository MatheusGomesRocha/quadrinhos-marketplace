import { createRequire } from 'node:module';
import type { DatabaseSync as BancoSqlite } from 'node:sqlite';
import type { Banco, Executor } from '../db/executor';
import { aplicarMigracoes } from '../db/migrar';

// O Vite não reconhece `node:sqlite` como módulo nativo; carregá-lo por createRequire contorna isso.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

/** Traduz o DDL do MySQL (subconjunto comum) para SQLite. Só existe para os testes. */
export const paraSqlite = (sql: string) =>
  sql
    .replace(/INT NOT NULL AUTO_INCREMENT PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/\) ENGINE=[^;]*;/g, ');');

/**
 * Banco SQLite em memória (node:sqlite, sem dependências nativas) que implementa a MESMA interface do MySQL.
 * Assim o RepoSql (o SQL gerado e as regras de negócio por cima dele) é testado de verdade, sem precisar de um servidor MySQL.
 */
export async function criarBancoSqlite(): Promise<Banco> {
  const db: BancoSqlite = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  let fila: Promise<unknown> = Promise.resolve();

  const ex: Executor = {
    async consultar<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params.map((p) => (p === undefined ? null : p)) as never[])) as T[];
    },
    async executar(sql: string, params: unknown[] = []) {
      const r = db.prepare(sql).run(...(params.map((p) => (p === undefined ? null : p)) as never[]));
      return { idInserido: Number(r.lastInsertRowid), linhasAfetadas: Number(r.changes) };
    },
  };
  const banco: Banco = {
    ...ex,
    // Uma conexão só: serializa as transações para que duas simultâneas não se misturem.
    transacao<R>(fn: (e: Executor) => Promise<R>): Promise<R> {
      const rodar = async () => {
        db.exec('BEGIN');
        try {
          const r = await fn(ex);
          db.exec('COMMIT');
          return r;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      };
      const p = fila.then(rodar, rodar);
      fila = p.catch(() => undefined);
      return p;
    },
  };
  await aplicarMigracoes(banco, paraSqlite);
  return banco;
}
