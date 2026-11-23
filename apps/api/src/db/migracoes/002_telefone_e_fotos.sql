-- Telefone (usuário e entrega do pedido) e fotos nas avaliações de produto (lista de imagens em JSON).
ALTER TABLE usuarios ADD COLUMN telefone VARCHAR(11) NULL;

ALTER TABLE pedidos ADD COLUMN endereco_telefone VARCHAR(11) NULL;

ALTER TABLE avaliacoes_produto ADD COLUMN fotos MEDIUMTEXT NULL;
