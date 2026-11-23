import { RepoMemoria } from '@mkt/core';
import { contratoRepo } from '@mkt/core/testes/contrato-repo';
import { criarRepoSql } from '../db/repo-sql';
import { criarBancoSqlite } from './sqlite';
import { descreverMysql, fabricaMysql } from './mysql-teste';

contratoRepo('memória', async () => new RepoMemoria());
contratoRepo('SQL (SQLite)', async () => criarRepoSql(await criarBancoSqlite()));
descreverMysql(() => contratoRepo('SQL (MySQL)', fabricaMysql));
