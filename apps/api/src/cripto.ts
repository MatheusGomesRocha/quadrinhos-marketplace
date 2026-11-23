import bcrypt from 'bcryptjs';
import type { Cripto } from '@mkt/core';
import { config } from './config';

export const criptoBcrypt: Cripto = {
  hash: (senha) => bcrypt.hash(senha, config.bcryptCusto),
  compara: (senha, hash) => bcrypt.compare(senha, hash),
};
