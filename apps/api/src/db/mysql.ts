import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import { config } from '../config';
import type { Banco, Executor } from './executor';

const DEADLOCK = 1213;

function executorDe(alvo: Pool | PoolConnection): Executor {
  return {
    async consultar<T>(sql: string, params: unknown[] = []) {
      const [linhas] = await alvo.query(sql, params);
      return linhas as T[];
    },
    async executar(sql: string, params: unknown[] = []) {
      const [r] = await alvo.query(sql, params);
      const h = r as { insertId?: number; affectedRows?: number };
      return { idInserido: Number(h.insertId ?? 0), linhasAfetadas: Number(h.affectedRows ?? 0) };
    },
  };
}

/**
 * Pool MySQL. Detalhes que importam:
 *  - `query` (e não `execute`) para aceitar LIMIT/OFFSET sem dor de cabeça; os valores continuam parametrizados;
 *  - `dateStrings` + timezone 'Z': datas voltam como texto UTC, sem conversão de fuso do driver;
 *  - `decimalNumbers`: DECIMAL (as notas) volta como número, não como texto.
 */
export function criarBancoMysql(): { banco: Banco; pool: Pool; encerrar: () => Promise<void> } {
  const pool = mysql.createPool({
    host: config.db.host, port: config.db.port, user: config.db.usuario, password: config.db.senha, database: config.db.nome,
    waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4', timezone: 'Z', dateStrings: true, decimalNumbers: true,
  });
  const base = executorDe(pool);
  const banco: Banco = {
    ...base,
    async transacao<R>(fn: (ex: Executor) => Promise<R>): Promise<R> {
      for (let tentativa = 1; ; tentativa++) {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          const r = await fn(executorDe(conn));
          await conn.commit();
          return r;
        } catch (e) {
          await conn.rollback().catch(() => undefined);
          // Duas compras tocando os mesmos produtos em ordens diferentes podem gerar deadlock: o MySQL derruba uma, e repetimos.
          if ((e as { errno?: number }).errno === DEADLOCK && tentativa < 3) continue;
          throw e;
        } finally {
          conn.release();
        }
      }
    },
  };
  return { banco, pool, encerrar: () => pool.end() };
}
