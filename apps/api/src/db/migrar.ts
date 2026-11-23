import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Executor } from './executor';

const PASTA = join(dirname(fileURLToPath(import.meta.url)), 'migracoes');

/** Separa o arquivo em comandos (um por ";" no fim de linha). */
export const comandosDe = (sql: string): string[] =>
  sql.split(/;\s*\n/).map((c) => c.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean);

/** Aplica as migrações que ainda não rodaram, em ordem, e registra cada uma. `adaptar` permite traduzir o SQL (testes em SQLite). */
export async function aplicarMigracoes(ex: Executor, adaptar: (sql: string) => string = (s) => s): Promise<string[]> {
  await ex.executar('CREATE TABLE IF NOT EXISTS _migracoes (nome VARCHAR(120) NOT NULL PRIMARY KEY, aplicada_em VARCHAR(30) NOT NULL)');
  const feitas = new Set((await ex.consultar<{ nome: string }>('SELECT nome FROM _migracoes')).map((r) => r.nome));
  const novas: string[] = [];
  for (const arquivo of readdirSync(PASTA).filter((f) => f.endsWith('.sql')).sort()) {
    if (feitas.has(arquivo)) continue;
    for (const comando of comandosDe(adaptar(readFileSync(join(PASTA, arquivo), 'utf8')))) await ex.executar(comando);
    await ex.executar('INSERT INTO _migracoes (nome, aplicada_em) VALUES (?, ?)', [arquivo, new Date().toISOString()]);
    novas.push(arquivo);
  }
  return novas;
}

// Execução direta: `npm run migrar`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { criarBancoMysql } = await import('./mysql');
  const { banco, encerrar } = criarBancoMysql();
  try {
    const novas = await aplicarMigracoes(banco);
    console.log(novas.length ? `Migrações aplicadas: ${novas.join(', ')}` : 'Banco já está atualizado.');
  } finally {
    await encerrar();
  }
}
