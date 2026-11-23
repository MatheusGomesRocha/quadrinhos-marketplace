/** O mínimo que o RepoSql precisa de um banco. Há implementações para MySQL (produção) e SQLite (testes). */
export interface Executor {
  consultar<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  executar(sql: string, params?: unknown[]): Promise<{ idInserido: number; linhasAfetadas: number }>;
}

export interface Banco extends Executor {
  /** Roda `fn` em uma transação (commit se terminar, rollback se lançar erro). */
  transacao<R>(fn: (ex: Executor) => Promise<R>): Promise<R>;
}
