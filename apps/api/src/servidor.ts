import { criarServicos } from '@mkt/core';
import { criarApp } from './app';
import { config } from './config';
import { criptoBcrypt } from './cripto';
import { criarBancoMysql } from './db/mysql';
import { criarRepoSql } from './db/repo-sql';

const { banco, encerrar } = criarBancoMysql();
const servicos = criarServicos({ repo: criarRepoSql(banco), cripto: criptoBcrypt, agora: () => new Date() });
const app = criarApp({ servicos });

const servidor = app.listen(config.porta, () => console.log(`API no ar em http://localhost:${config.porta}  (MySQL: ${config.db.host}/${config.db.nome})`));

const parar = () => servidor.close(() => void encerrar().then(() => process.exit(0)));
process.on('SIGINT', parar);
process.on('SIGTERM', parar);
