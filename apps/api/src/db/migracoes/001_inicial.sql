-- Esquema inicial. Escrito no subconjunto de SQL comum a MySQL 8 e SQLite (os testes rodam as mesmas tabelas no SQLite).
-- Dinheiro: INT em centavos. Datas: DATETIME(3) em UTC. Notas: DECIMAL(2,1) (1.0 a 5.0, de 0.5 em 0.5).

CREATE TABLE usuarios (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  senha_hash VARCHAR(100) NOT NULL,
  papel VARCHAR(12) NOT NULL,
  status VARCHAR(12) NOT NULL,
  nome_loja VARCHAR(120) NULL,
  documento VARCHAR(30) NULL,
  descricao_loja TEXT NULL,
  motivo_rejeicao VARCHAR(255) NULL,
  criado_em DATETIME(3) NOT NULL,
  UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_usuarios_papel_status ON usuarios (papel, status);

CREATE TABLE produtos (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  descricao TEXT NOT NULL,
  tipo VARCHAR(12) NOT NULL,
  autor VARCHAR(120) NOT NULL,
  editora VARCHAR(120) NOT NULL,
  estado VARCHAR(10) NOT NULL,
  preco_centavos INT NOT NULL,
  estoque INT NOT NULL,
  vendidos INT NOT NULL DEFAULT 0,
  cor VARCHAR(7) NOT NULL,
  status VARCHAR(10) NOT NULL,
  criado_em DATETIME(3) NOT NULL,
  FOREIGN KEY (vendedor_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_produtos_vendedor ON produtos (vendedor_id);
CREATE INDEX idx_produtos_vitrine ON produtos (status, tipo, preco_centavos);

CREATE TABLE carrinho_itens (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  comprador_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL,
  criado_em DATETIME(3) NOT NULL,
  UNIQUE (comprador_id, produto_id),
  FOREIGN KEY (comprador_id) REFERENCES usuarios (id),
  FOREIGN KEY (produto_id) REFERENCES produtos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE pedidos (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL,
  comprador_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  status VARCHAR(12) NOT NULL,
  subtotal_centavos INT NOT NULL,
  frete_centavos INT NOT NULL,
  total_centavos INT NOT NULL,
  comissao_centavos INT NOT NULL,
  liquido_vendedor_centavos INT NOT NULL,
  metodo_pagamento VARCHAR(10) NOT NULL,
  endereco_nome VARCHAR(120) NOT NULL,
  endereco_cep VARCHAR(9) NOT NULL,
  endereco_rua VARCHAR(160) NOT NULL,
  endereco_numero VARCHAR(12) NOT NULL,
  endereco_complemento VARCHAR(80) NULL,
  endereco_bairro VARCHAR(80) NOT NULL,
  endereco_cidade VARCHAR(80) NOT NULL,
  endereco_uf VARCHAR(2) NOT NULL,
  codigo_rastreio VARCHAR(60) NULL,
  criado_em DATETIME(3) NOT NULL,
  pago_em DATETIME(3) NULL,
  enviado_em DATETIME(3) NULL,
  prazo_entrega_em DATETIME(3) NULL,
  entregue_em DATETIME(3) NULL,
  FOREIGN KEY (comprador_id) REFERENCES usuarios (id),
  FOREIGN KEY (vendedor_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_pedidos_comprador ON pedidos (comprador_id, status);
CREATE INDEX idx_pedidos_vendedor ON pedidos (vendedor_id, status);
CREATE INDEX idx_pedidos_codigo ON pedidos (codigo);

CREATE TABLE pedido_itens (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  preco_unitario_centavos INT NOT NULL,
  quantidade INT NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
  FOREIGN KEY (produto_id) REFERENCES produtos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_pedido_itens_pedido ON pedido_itens (pedido_id);
CREATE INDEX idx_pedido_itens_produto ON pedido_itens (produto_id);

CREATE TABLE conversas (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  comprador_id INT NOT NULL,
  vendedor_id INT NOT NULL,
  produto_id INT NULL,
  criado_em DATETIME(3) NOT NULL,
  atualizado_em DATETIME(3) NOT NULL,
  UNIQUE (comprador_id, vendedor_id),
  FOREIGN KEY (comprador_id) REFERENCES usuarios (id),
  FOREIGN KEY (vendedor_id) REFERENCES usuarios (id),
  FOREIGN KEY (produto_id) REFERENCES produtos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE mensagens (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  conversa_id INT NOT NULL,
  autor_id INT NOT NULL,
  texto TEXT NOT NULL,
  lida TINYINT NOT NULL DEFAULT 0,
  criado_em DATETIME(3) NOT NULL,
  FOREIGN KEY (conversa_id) REFERENCES conversas (id),
  FOREIGN KEY (autor_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_mensagens_conversa ON mensagens (conversa_id, lida);

CREATE TABLE avaliacoes_produto (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  produto_id INT NOT NULL,
  pedido_id INT NOT NULL,
  comprador_id INT NOT NULL,
  nota DECIMAL(2,1) NOT NULL,
  comentario TEXT NULL,
  criado_em DATETIME(3) NOT NULL,
  UNIQUE (pedido_id, produto_id),
  FOREIGN KEY (produto_id) REFERENCES produtos (id),
  FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
  FOREIGN KEY (comprador_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE avaliacoes_vendedor (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vendedor_id INT NOT NULL,
  pedido_id INT NOT NULL,
  comprador_id INT NOT NULL,
  nota DECIMAL(2,1) NOT NULL,
  comentario TEXT NULL,
  criado_em DATETIME(3) NOT NULL,
  UNIQUE (pedido_id),
  FOREIGN KEY (vendedor_id) REFERENCES usuarios (id),
  FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
  FOREIGN KEY (comprador_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE reclamacoes (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  comprador_id INT NOT NULL,
  motivo TEXT NOT NULL,
  status VARCHAR(12) NOT NULL,
  resposta_admin TEXT NULL,
  criado_em DATETIME(3) NOT NULL,
  resolvida_em DATETIME(3) NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos (id),
  FOREIGN KEY (comprador_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_reclamacoes_status ON reclamacoes (status);

CREATE TABLE registros_login (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  email VARCHAR(190) NOT NULL,
  sucesso TINYINT NOT NULL,
  motivo VARCHAR(60) NULL,
  ip VARCHAR(60) NULL,
  criado_em DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_registros_login_email ON registros_login (email, sucesso, criado_em);
