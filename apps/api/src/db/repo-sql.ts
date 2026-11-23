import type { OpcoesListagem, Repo, Tabela, TabelaProdutos, Where } from '@mkt/core';
import type { Produto } from '@mkt/core';
import type { Banco, Executor } from './executor';

const paraSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const paraCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
/** Convenção: campos terminados em "Em" (criadoEm, pagoEm...) são DATETIME(3), guardados em UTC. */
const ehData = (campo: string) => campo.endsWith('Em');
const ehOperador = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const isoParaBanco = (iso: string) => iso.replace('T', ' ').replace('Z', '');
export const bancoParaIso = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString();
  return `${String(v).replace(' ', 'T')}${String(v).endsWith('Z') ? '' : 'Z'}`;
};

const paraBanco = (campo: string, v: unknown) => {
  if (v === undefined) return null;
  return ehData(campo) && typeof v === 'string' ? isoParaBanco(v) : v;
};

function linhaParaObjeto<T>(linha: Record<string, unknown>): T {
  const o: Record<string, unknown> = {};
  for (const [coluna, valor] of Object.entries(linha)) {
    const campo = paraCamel(coluna);
    o[campo] = ehData(campo) && valor !== null && valor !== undefined ? bancoParaIso(valor) : valor;
  }
  return o as T;
}

/** Converte o objeto Where em SQL parametrizado (nunca concatena valores). */
export function construirWhere(where: Record<string, unknown> | undefined, params: unknown[]): string {
  const partes: string[] = [];
  for (const [campo, v] of Object.entries(where ?? {})) {
    if (v === undefined) continue;
    if (campo === '$ou') {
      const grupos = (v as Record<string, unknown>[]).map((w) => `(${construirWhere(w, params)})`);
      partes.push(grupos.length ? `(${grupos.join(' OR ')})` : '1=0');
      continue;
    }
    const col = `\`${paraSnake(campo)}\``;
    if (v === null) { partes.push(`${col} IS NULL`); continue; }
    if (!ehOperador(v)) { partes.push(`${col} = ?`); params.push(paraBanco(campo, v)); continue; }
    const op = v as Record<string, any>;
    if (op.in !== undefined) {
      if (!op.in.length) partes.push('1=0');
      else { partes.push(`${col} IN (${op.in.map(() => '?').join(',')})`); params.push(...op.in.map((x: unknown) => paraBanco(campo, x))); }
    }
    if (op.like !== undefined) { partes.push(`${col} LIKE ?`); params.push(op.like); }
    for (const [nome, sinal] of [['gt', '>'], ['gte', '>='], ['lt', '<'], ['lte', '<=']] as const) {
      if (op[nome] !== undefined) { partes.push(`${col} ${sinal} ?`); params.push(paraBanco(campo, op[nome])); }
    }
    if (op.ne !== undefined) {
      if (op.ne === null) partes.push(`${col} IS NOT NULL`);
      else { partes.push(`(${col} <> ? OR ${col} IS NULL)`); params.push(paraBanco(campo, op.ne)); }
    }
  }
  return partes.length ? partes.join(' AND ') : '1=1';
}

class TabelaSql<T extends { id: number }> implements Tabela<T> {
  constructor(protected ex: Executor, protected tabela: string) {}

  async inserir(dados: Omit<T, 'id'>): Promise<T> {
    const campos = Object.keys(dados);
    const sql = `INSERT INTO \`${this.tabela}\` (${campos.map((c) => `\`${paraSnake(c)}\``).join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`;
    const r = await this.ex.executar(sql, campos.map((c) => paraBanco(c, (dados as Record<string, unknown>)[c])));
    return (await this.obter(r.idInserido))!;
  }

  async obter(id: number): Promise<T | null> {
    const linhas = await this.ex.consultar<Record<string, unknown>>(`SELECT * FROM \`${this.tabela}\` WHERE id = ? LIMIT 1`, [id]);
    return linhas[0] ? linhaParaObjeto<T>(linhas[0]) : null;
  }

  async listar(where?: Where<T>, opcoes: OpcoesListagem<T> = {}): Promise<T[]> {
    const params: unknown[] = [];
    let sql = `SELECT * FROM \`${this.tabela}\` WHERE ${construirWhere(where as Record<string, unknown>, params)}`;
    const ordem = opcoes.ordem ?? [['id' as keyof T, 'asc']];
    sql += ` ORDER BY ${ordem.map(([c, d]) => `\`${paraSnake(String(c))}\` ${d === 'desc' ? 'DESC' : 'ASC'}`).join(', ')}`;
    // Inteiros validados e escritos direto: evita problema de LIMIT com parâmetro em alguns drivers.
    if (opcoes.limite !== undefined) sql += ` LIMIT ${Math.trunc(Number(opcoes.limite))} OFFSET ${Math.trunc(Number(opcoes.deslocamento ?? 0))}`;
    else if (opcoes.deslocamento) sql += ` LIMIT 9223372036854775807 OFFSET ${Math.trunc(Number(opcoes.deslocamento))}`;
    return (await this.ex.consultar<Record<string, unknown>>(sql, params)).map((l) => linhaParaObjeto<T>(l));
  }

  async contar(where?: Where<T>): Promise<number> {
    const params: unknown[] = [];
    const r = await this.ex.consultar<{ n: number | string }>(`SELECT COUNT(*) AS n FROM \`${this.tabela}\` WHERE ${construirWhere(where as Record<string, unknown>, params)}`, params);
    return Number(r[0]?.n ?? 0);
  }

  async atualizar(id: number, parcial: Partial<Omit<T, 'id'>>): Promise<T> {
    const campos = Object.keys(parcial);
    if (campos.length) {
      const sql = `UPDATE \`${this.tabela}\` SET ${campos.map((c) => `\`${paraSnake(c)}\` = ?`).join(', ')} WHERE id = ?`;
      await this.ex.executar(sql, [...campos.map((c) => paraBanco(c, (parcial as Record<string, unknown>)[c])), id]);
    }
    const linha = await this.obter(id);
    if (!linha) throw new Error(`Registro ${id} não encontrado em ${this.tabela}`);
    return linha;
  }

  async remover(id: number): Promise<void> {
    await this.ex.executar(`DELETE FROM \`${this.tabela}\` WHERE id = ?`, [id]);
  }
}

class TabelaProdutosSql extends TabelaSql<Produto> implements TabelaProdutos {
  /** Uma única instrução: só baixa se ainda houver estoque. Duas compras simultâneas do último exemplar: só uma passa. */
  async baixarEstoque(id: number, quantidade: number): Promise<boolean> {
    const r = await this.ex.executar(
      'UPDATE `produtos` SET `estoque` = `estoque` - ?, `vendidos` = `vendidos` + ? WHERE `id` = ? AND `estoque` >= ?',
      [quantidade, quantidade, id, quantidade],
    );
    return r.linhasAfetadas === 1;
  }

  async devolverEstoque(id: number, quantidade: number): Promise<void> {
    await this.ex.executar(
      'UPDATE `produtos` SET `estoque` = `estoque` + ?, `vendidos` = CASE WHEN `vendidos` >= ? THEN `vendidos` - ? ELSE 0 END WHERE `id` = ?',
      [quantidade, quantidade, quantidade, id],
    );
  }
}

function montar(ex: Executor, transacao: Repo['transacao']): Repo {
  return {
    usuarios: new TabelaSql(ex, 'usuarios'),
    produtos: new TabelaProdutosSql(ex, 'produtos'),
    carrinhoItens: new TabelaSql(ex, 'carrinho_itens'),
    pedidos: new TabelaSql(ex, 'pedidos'),
    pedidoItens: new TabelaSql(ex, 'pedido_itens'),
    conversas: new TabelaSql(ex, 'conversas'),
    mensagens: new TabelaSql(ex, 'mensagens'),
    avaliacoesProduto: new TabelaSql(ex, 'avaliacoes_produto'),
    avaliacoesVendedor: new TabelaSql(ex, 'avaliacoes_vendedor'),
    reclamacoes: new TabelaSql(ex, 'reclamacoes'),
    registrosLogin: new TabelaSql(ex, 'registros_login'),
    transacao,
  };
}

export function criarRepoSql(banco: Banco): Repo {
  return montar(banco, (fn) =>
    banco.transacao((ex) => {
      // Dentro da transação, um novo `transacao` apenas participa da mesma (sem aninhar).
      const dentro: Repo = montar(ex, (f) => f(dentro));
      return fn(dentro);
    }),
  );
}
