# Estante Viva — marketplace de quadrinhos, mangás e livros

Marketplace completo com três perfis (comprador, vendedor e administrador), feito em **Node + TypeScript + MySQL + React**, com testes automatizados.

> Há duas versões do mesmo sistema: a **demo** (roda no navegador, sem backend) e a **versão real** (API + MySQL). Elas compartilham as mesmas regras de negócio.

## Testar a demo

A demo (sem backend) fica em outro repositório: https://github.com/MatheusGomesRocha/quadrinhos-marketplace-demo (publicada no GitHub Pages dele). Entre com qualquer conta, senha `demo123`:

| Perfil | E-mail |
| --- | --- |
| Comprador | `comprador1@mkt.demo` |
| Vendedor | `vendedor1@mkt.demo` |
| Administrador | `admin@mkt.demo` |
| Vendedor pendente de aprovação | `vendedor5@mkt.demo` |

Tudo fica salvo no seu navegador; há um botão "Restaurar dados" no topo.

## O que o sistema faz

- **Comprador**: catálogo com filtros, carrinho limitado ao estoque, pedido, acompanhamento, histórico, conversa com o vendedor, "marcar como recebido", reclamação após o prazo, avaliação do produto e do vendedor (1 a 5 estrelas, com meia estrela).
- **Vendedor**: cadastro com aprovação do admin, painel com cards e gráficos financeiros, produtos à venda e já vendidos, cadastro/edição de produto, pedidos recebidos (comprador, endereço, valor) e envio com rastreio.
- **Admin**: financeiro geral, solicitações de vendedores, rankings de quem mais vendeu e comprou, histórico de pedidos, usuários (bloqueio), estoque, registros de login e reclamações.

## Como foi construído

```
packages/core   regras de negócio puras em TypeScript (serviços, validação, repositório em memória)
apps/api        Express + MySQL (repositório SQL, migrações, JWT)
apps/web        React + Vite + Tailwind (modo real e modo demo)
```

O ponto central: **as regras vivem em serviços independentes de banco e de HTTP**. A demo chama esses serviços no navegador; a API os expõe por HTTP e usa MySQL. Assim, as duas versões não divergem, e os mesmos testes validam as regras sobre memória e SQL. Detalhes de arquitetura e regras no [CLAUDE.md](./CLAUDE.md).

Destaques técnicos: baixa de estoque atômica (sem vender o mesmo exemplar duas vezes), transações no checkout, dinheiro em centavos, sessão invalidada ao bloquear usuário, freio contra força bruta no login e trilha de auditoria de logins.

## Rodar localmente

```bash
npm install
npm test
npm run dev:demo            # demo, sem banco

# versão real (MySQL 8)
cp apps/api/.env.example apps/api/.env
npm run migrar && npm run seed
npm run dev:api & npm run dev:web
```
