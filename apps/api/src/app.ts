import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { ErroNegocio, type Ator, type Servicos } from '@mkt/core';
import { config } from './config';

interface Opcoes {
  servicos: Servicos;
  jwtSegredo?: string;
  jwtExpira?: string;
  origensCors?: string[];
  confiarProxy?: boolean;
}

/**
 * HTTP fino: toda a regra de negócio mora no @mkt/core. A API só faz três coisas:
 *  1. descobre QUEM está chamando (token JWT);
 *  2. chama `servicos.<servico>.<metodo>(ator, corpo)`;
 *  3. devolve o resultado ou o erro de negócio com o status certo.
 * Rota única e explícita: POST /api/rpc/<servico>/<metodo>.
 */
export function criarApp({ servicos, jwtSegredo = config.jwtSegredo, jwtExpira = config.jwtExpira, origensCors = config.origensCors, confiarProxy = config.confiarProxy }: Opcoes) {
  const app = express();
  if (confiarProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(cors({ origin: origensCors }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/saude', (_req, res) => res.json({ ok: true }));

  const atorDoToken = (req: Request): Ator | null => {
    const h = req.header('authorization');
    if (!h?.startsWith('Bearer ')) return null;
    try {
      const p = jwt.verify(h.slice(7), jwtSegredo) as { sub: string; papel: Ator['papel'] };
      return { id: Number(p.sub), papel: p.papel };
    } catch {
      return null; // token vencido ou inválido: tratado como visitante (os serviços respondem 401 quando exigem login)
    }
  };

  const rpc = async (req: Request, res: Response) => {
    const { servico, metodo } = req.params as { servico: string; metodo: string };
    const grupo = Object.prototype.hasOwnProperty.call(servicos, servico) ? (servicos as Record<string, Record<string, unknown>>)[servico] : undefined;
    const fn = grupo && Object.prototype.hasOwnProperty.call(grupo, metodo) ? grupo[metodo] : undefined;
    if (typeof fn !== 'function') {
      res.status(404).json({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Operação inexistente.' } });
      return;
    }
    const ehLogin = servico === 'auth' && metodo === 'login';
    const entrada = ehLogin ? { ...(req.body ?? {}), ip: req.ip } : req.body ?? {};
    const resultado = await (fn as (a: Ator | null, e: unknown) => Promise<unknown>)(atorDoToken(req), entrada);
    if (ehLogin) {
      const { usuario } = resultado as { usuario: { id: number; papel: string } };
      const token = jwt.sign({ papel: usuario.papel }, jwtSegredo, { subject: String(usuario.id), expiresIn: jwtExpira } as jwt.SignOptions);
      res.json({ dados: { ...(resultado as object), token } });
      return;
    }
    res.json({ dados: resultado ?? null });
  };
  app.post('/api/rpc/:servico/:metodo', (req, res, next) => { rpc(req, res).catch(next); });

  // Express 4 não captura promessas rejeitadas sozinho: o tratamento de erros fica aqui.
  app.use((req: Request, res: Response) => res.status(404).json({ erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Rota inexistente.' } }));
  app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (erro instanceof ErroNegocio) {
      res.status(erro.status).json({ erro: { codigo: erro.codigo, mensagem: erro.message, detalhes: erro.detalhes } });
      return;
    }
    if ((erro as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({ erro: { codigo: 'JSON_INVALIDO', mensagem: 'Corpo da requisição inválido.' } });
      return;
    }
    console.error(erro);
    res.status(500).json({ erro: { codigo: 'ERRO_INTERNO', mensagem: 'Algo deu errado. Tente novamente.' } });
  });

  return app;
}
