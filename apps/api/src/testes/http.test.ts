import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarServicos, popularExemplo } from '@mkt/core';
import { criarApp } from '../app';
import { criarRepoSql } from '../db/repo-sql';
import { criarBancoSqlite } from './sqlite';

const cripto = { hash: async (s: string) => `h:${s}`, compara: async (s: string, h: string) => h === `h:${s}` };
let servidor: Server;
let base: string;

const rpc = async (caminho: string, corpo: unknown = {}, token?: string) => {
  const r = await fetch(`${base}/api/rpc/${caminho}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(corpo) });
  return { status: r.status, json: (await r.json()) as any };
};

beforeAll(async () => {
  const repo = criarRepoSql(await criarBancoSqlite());
  await popularExemplo(repo, cripto, new Date('2026-11-20T12:00:00Z'), 10);
  servidor = criarApp({ servicos: criarServicos({ repo, cripto, agora: () => new Date() }), jwtSegredo: 'teste' }).listen(0);
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});
afterAll(() => { servidor.close(); });

describe('API HTTP', () => {
  it('saúde e rota inexistente', async () => {
    expect((await fetch(`${base}/api/saude`)).status).toBe(200);
    expect((await rpc('nada/nada')).status).toBe(404);
    expect((await rpc('constructor/toString')).status).toBe(404);
  });
  it('catálogo é público', async () => {
    const r = await rpc('catalogo/listar', {});
    expect(r.status).toBe(200);
    expect(r.json.dados.itens.length).toBeGreaterThan(0);
  });
  it('exige login, devolve token e respeita papéis', async () => {
    expect((await rpc('carrinho/ver')).status).toBe(401);
    const ruim = await rpc('auth/login', { email: 'comprador1@mkt.demo', senha: 'errada' });
    expect(ruim.status).toBe(401);
    const ok = await rpc('auth/login', { email: 'comprador1@mkt.demo', senha: 'demo123' });
    expect(ok.status).toBe(200);
    const token = ok.json.dados.token as string;
    expect((await rpc('carrinho/ver', {}, token)).status).toBe(200);
    expect((await rpc('admin/resumo', {}, token)).status).toBe(403);
    expect((await rpc('carrinho/ver', {}, 'token.falso.aqui')).status).toBe(401);
  });
  it('admin acessa o painel e validação devolve 400 em português', async () => {
    const adm = (await rpc('auth/login', { email: 'admin@mkt.demo', senha: 'demo123' })).json.dados.token;
    expect((await rpc('admin/resumo', {}, adm)).status).toBe(200);
    const inv = await rpc('auth/cadastrarComprador', { nome: 'x', email: 'invalido', senha: '1' });
    expect(inv.status).toBe(400);
    expect(inv.json.erro.mensagem).toBeTruthy();
  });
});
