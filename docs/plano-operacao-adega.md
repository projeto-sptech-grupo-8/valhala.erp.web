# Plano — Operação da adega (front)

Escopo: **entrada por XML da NF-e**, **lotes e validade (FEFO)**, **inventário cego**, **controle de desconto e cancelamento**, **relatórios de gestão** e **impressão**.
Tudo no front, sobre a store local + mock. Cada ação da store vira uma chamada de API quando o backend existir.

---

## 0. Fundação de dados (pré-requisito de todos)

| Mudança | Detalhe |
|---|---|
| **Lotes no produto** | `produto.lotes: [{ id, lote, validade (AAAA-MM-DD ou null), qty, custo, entradaEm, nf }]`. `produto.qty` continua sendo o total (soma dos lotes), mantido pela store. |
| **EAN no produto** | `produto.ean`: usado para vincular itens da NF e para o código de barras da etiqueta. |
| **De-para por fornecedor** | `vinculos: { 'CNPJ|cProd': { produtoId, fator } }`: o sistema "aprende" o vínculo na primeira nota. |
| **Configurações do caixa** | `config: { limiteDescontoPct: 10, pinGerente (mock), imprimirCupomAutomatico }` |
| **Auditoria** | `auditoria: [{ id, tipo, em, operador, autorizadoPor, pedido, valor, motivo, detalhe }]` |
| **Inventários** | `inventarios: [{ id, setor, status, snapshot, contagem, criadoEm, concluidoEm, resultado }]` |
| **Canal no pedido** | `pedido.canal: 'Balcão' | 'Mesa' | 'Delivery'` (base do ticket por canal) |
| **Migração** | Store `v1 → v2`: produtos antigos ganham um lote inicial com o saldo atual; nada do que o usuário já registrou se perde. |
| **Histórico de vendas** | 90 dias **sintéticos e determinísticos** (semente fixa), coerentes com o giro de cada produto, dia da semana e horário. Necessários para os relatórios terem dados. Vendas reais da sessão entram por cima. |

---

## 1. Lotes e validade — FEFO

**Regras de negócio**
1. **Toda saída consome primeiro o lote que vence antes** (FEFO). Isso vale para venda, dose, saída manual e ajuste negativo. A movimentação registra quais lotes saíram.
2. **Lote vencido não é vendável** (CDC art. 18 §6º: produto vencido é impróprio para consumo).
   - O PDV só oferece o saldo **dentro da validade**.
   - Se só restar saldo vencido, a venda é bloqueada com a mensagem *"Saldo restante vencido — registre a perda"*.
3. Entrada sem lote informado cria o lote `SEM-LOTE`, sem validade.

**Tela: Estoque › Validades e lotes**
- **KPIs:** lotes vencidos, vencem em 7 dias, vencem em 30 dias e valor em risco (a custo).
- **Tabela de lotes:** produto, lote, validade, dias restantes, quantidade, valor e situação (selo).
- **Sugestão de promoção para escoar:**
  - ≤ 7 dias: −30% · ≤ 15 dias: −20% · ≤ 30 dias: −10%.
  - O preço nunca fica abaixo do custo + 5%.
  - Mostra o preço sugerido e a margem resultante.
- **"Registrar perda"** em lote vencido: saída com motivo *Vencimento*, daquele lote específico (não FEFO).
- O drawer do produto ganha a seção **Lotes**.

---

## 2. Entrada de mercadoria por XML da NF-e

**Fluxo:** enviar XML → conferência → confirmar.

1. **Upload:** arrastar ou selecionar o `.xml`. Há também um botão "Usar XML de exemplo" para demonstração.
2. **Leitura:** número/série, emitente (nome e CNPJ), emissão, chave e valor total. Por item: `cProd`, `cEAN`, `xProd`, `NCM`, `uCom`, `qCom`, `vUnCom` e lote/validade (`<rastro>`).
3. **Bloqueios:**
   - XML inválido ou que não é NF-e;
   - **nota já importada** (mesma chave).
4. **Vínculo automático de cada item, nesta ordem:** de-para salvo para aquele fornecedor → EAN → sem vínculo (o usuário escolhe o produto).
5. **Fator de conversão:** a nota vem em `CX` com 12, o estoque é em `un`. O sistema sugere o fator pelo de-para ou pela unidade (`CX12`, `FD6`) e o usuário confirma.
6. **Conferência por item:**
   - quantidade em estoque = `qCom × fator`;
   - custo unitário = `vUnCom ÷ fator`;
   - **variação de custo** frente ao custo atual (selo de atenção acima de 15%);
   - lote e validade editáveis;
   - opção "ignorar item".
7. **Confirmar** só fica disponível quando todos os itens estão vinculados ou ignorados. Ao confirmar:
   - gera as entradas com NF e fornecedor;
   - cria os lotes;
   - atualiza o **custo médio ponderado** `(qtd × custo + qtdEntrada × custoEntrada) ÷ (qtd + qtdEntrada)`;
   - grava o de-para;
   - registra a chave como importada.

> **Limitação conhecida:** a conferência contra o **pedido de compra** depende de existir o módulo de pedidos de compra, que ainda não existe. A conferência é feita contra o custo atual e o vínculo do fornecedor. Fica como próximo passo.

---

## 3. Inventário cego por setor

**Fluxo:** abrir → contar → revisar → aprovar.

1. **Abrir:** escolher o setor (localização física: Câmara Fria A, Depósito Seco…). O sistema **congela o saldo do sistema** (snapshot) daquele momento.
2. **Contar (cego):** a lista de produtos do setor **não mostra o saldo do sistema**, para não induzir a contagem. Tem busca, progresso "x de y contados" e salva o rascunho automaticamente.
3. **Revisar:** sistema × contado, diferença em unidades e em R$ (a custo), **acurácia** (% de itens sem divergência) e valor líquido da divergência.
4. **Aprovar:** gera ajustes com motivo *"Diferença de inventário"*. Exige **autorização do gerente** (mesmo mecanismo do caixa), a menos que quem aprova já seja gerente.
5. É possível cancelar um inventário em andamento.

---

## 4. Controle de desconto e cancelamento (antifraude)

| Ação no caixa | Regra |
|---|---|
| Desconto até o limite (padrão 10%) | Livre, mas **registrado** na auditoria |
| Desconto **acima do limite** | Exige autorização do gerente **antes do pagamento** + motivo |
| **Cancelar pedido com itens** | Exige autorização do gerente + motivo |
| Remover item ou diminuir quantidade | Livre, mas **registrado** (item, qtd, valor) |

- **Autorização:** um gerente presente informa o **PIN de gerente** (no mock fica em Configurações gerais; no backend vira um endpoint de aprovação). Se o próprio operador logado for Gerente/Administrador, basta informar o motivo, e o registro mostra que ele mesmo autorizou.
- **Tela: Vendas › Auditoria do caixa**
  - KPIs: total em descontos, % de vendas com desconto, cancelamentos e itens removidos.
  - Tabela filtrável (tipo, operador, período) e exportação CSV.
- **Configurações gerais › Regras do caixa:** limite de desconto sem autorização, PIN do gerente (mock) e imprimir cupom automaticamente.

---

## 5. Relatórios de gestão (Financeiro › Relatórios)

Uma linha de filtros no topo, com o período (7 / 30 / 90 dias), vale para todas as abas. Cada gráfico tem **tabela equivalente** e exportação CSV. As formas seguem a skill de dataviz.

| Aba | Pergunta do dono | Forma |
|---|---|---|
| **Curva ABC** | Quais produtos fazem 80% do faturamento? | KPIs A/B/C. **Um eixo só:** linha do % acumulado com marcas em 80% e 95% (sem eixo duplo). Tabela com classe. |
| **Margem por categoria** | Onde eu ganho dinheiro? | Barras horizontais de margem %, uma cor, com linha de meta (35%). Tabela com receita, CMV e margem. |
| **Ruptura** | O que faltou e quanto deixei de vender? | Barras dos 10 maiores em dias zerados. Tabela com ocorrências e **venda perdida estimada**. |
| **Vendas por horário** | Quando escalar mais gente? | **Mapa de calor** dia × hora, sequencial de uma cor, com legenda de escala. Destaca o pico. |
| **Canais** | Balcão, mesa ou delivery rende mais? | **Cartões de KPI** por canal (vendas, faturamento, ticket médio). Não é gráfico: são 3 números. |
| **Perdas por motivo** | Quanto perco com quebra, vencimento e diferença de inventário? | Barras empilhadas por mês, paleta categórica **validada pelo script** (≤ 5 motivos), com legenda e tabela. |

Cores: as séries usam tokens de tema próprios para gráfico, validados com `validate_palette.js` nos dois temas, sobre a superfície real do card. O texto nunca usa a cor da série.

---

## 6. Impressão

| Documento | Onde | Formato |
|---|---|---|
| **Cupom não fiscal** | Ao finalizar a venda (automático se configurado) e "Reimprimir" no histórico | Bobina 80 mm. Traz "NÃO É DOCUMENTO FISCAL" até existir NFC-e. |
| **Comanda do bar** | Botão no pedido: "Enviar drinks ao bar" | 80 mm, letras grandes. Imprime **só os drinks ainda não enviados** e marca como enviados (sem duplicar). |
| **Etiqueta de gôndola** | Produtos: ação em lote "Imprimir etiquetas" | A4 com 3×8 etiquetas: nome, preço em destaque, **preço por litro/unidade**, código e **código de barras EAN-13**. |

Implementação: uma área de impressão única controlada por `@media print`, com `@page` definido por tipo de documento (80 mm × A4), e `window.print()`. O conteúdo é testável com a emulação de mídia `print` do Chrome.

---

## 7. Navegação (domínios de negócio)

| Domínio | Novas opções |
|---|---|
| Estoque | *Operação:* Movimentações, **Entrada por XML**, **Inventário** · *Controle:* Reposição, **Validades e lotes** |
| Vendas | *Atendimento:* Caixa · *Documentos:* Orçamentos, Notas fiscais · *Controle:* **Auditoria do caixa** |
| Financeiro | Financeiro, **Relatórios** |

RBAC: Estoquista acessa Entrada por XML, Inventário e Validades. Auditoria do caixa fica com Gerente/Administrador. Financeiro acessa Relatórios.

---

## 8. Ordem de implementação

1. Fundação de dados (lotes, EAN, config, auditoria, migração, histórico)
2. FEFO na store + tela de Validades
3. Entrada por XML
4. Inventário cego
5. Desconto/cancelamento + auditoria + regras do caixa
6. Canal no PDV + relatórios
7. Impressão
8. Navegação/RBAC, lint, build e **testes no Chrome por módulo**

## 9. Testes (roteiro no Chrome via DevTools Protocol)

- **FEFO:** vender consome o lote mais antigo; lote vencido não aparece como disponível; perda de lote vencido.
- **XML:** importar o exemplo, vínculo por EAN, item sem vínculo, fator de caixa, custo médio recalculado, bloqueio de nota duplicada, XML inválido.
- **Inventário:** contagem cega (o saldo não aparece), divergência e acurácia, aprovação com PIN gerando ajustes.
- **Caixa:** desconto acima do limite pede PIN (PIN errado bloqueia); cancelamento pede PIN; remoção de item registrada; tudo aparece na auditoria.
- **Relatórios:** cada aba renderiza, os totais batem com a tabela, e o filtro de período altera os números.
- **Impressão:** conteúdo do cupom, da comanda (sem duplicar) e das etiquetas (EAN válido) em mídia `print`.
- **Regressão:** contraste AA nos dois temas e testes anteriores do menu.
