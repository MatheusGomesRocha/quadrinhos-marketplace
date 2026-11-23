import { suiteRegras } from '@mkt/core/testes/suite-regras';
import { criarRepoSql } from '../db/repo-sql';
import { criarBancoSqlite } from './sqlite';
import { descreverMysql, fabricaMysql } from './mysql-teste';

// As MESMAS regras de negócio, agora rodando por cima do SQL gerado pelo RepoSql.
suiteRegras('SQL (SQLite)', async () => criarRepoSql(await criarBancoSqlite()));
descreverMysql(() => suiteRegras('SQL (MySQL)', fabricaMysql));
