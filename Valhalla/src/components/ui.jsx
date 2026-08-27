const info = {
  dashboard: ['VISÃO GERAL', 'Dashboard', 'Estoque, vendas e caixa do salão em um só lugar.'],
  produtos: ['ESTOQUE', 'Produtos', 'Gerencie o catálogo de itens do salão.'],
  categorias: ['ESTOQUE', 'Categorias', 'Organização do catálogo por família de produto.'],
  fornecedores: ['ESTOQUE', 'Fornecedores', 'Parceiros que abastecem o salão.'],
  movimentacoes: ['ESTOQUE', 'Movimentações', 'Histórico completo de entradas, saídas e ajustes.'],
  estocagem: ['ESTOQUE', 'Tipos de Estocagem', 'Locais e condições de armazenamento.'],
  inventario: ['ESTOQUE', 'Inventário Físico', 'Contagem “Setembro/2026” · Depósito Central.'],
  caixa: ['VENDAS', 'Caixa', 'Registre vendas de balcão rapidamente.'],
  pedido: ['VENDAS', 'Novo Pedido', 'Monte um pedido para retirada ou entrega.'],
  orcamento: ['VENDAS', 'Orçamentos', 'Propostas comerciais enviadas a clientes.'],
  notafiscal: ['VENDAS', 'Notas Fiscais', 'NF-e emitidas para vendas e pedidos.'],
  financeiro: ['GESTÃO', 'Financeiro', 'Fluxo de caixa, contas a pagar e receber.'],
  relatorios: ['GESTÃO', 'Relatórios', 'Exporte visões consolidadas do salão.'],
  novo: ['ESTOQUE', 'Novo Produto', 'Cadastre um item no catálogo.'],
  usuarios: ['CONFIGURAÇÕES', 'Usuários', 'Contas, permissões e autenticação em duas etapas.'],
  novousuario: ['CONFIGURAÇÕES', 'Novo Usuário', 'Crie uma conta e defina permissões de acesso.'],
  seguranca: ['CONFIGURAÇÕES', 'Segurança & 2FA', 'Autenticação de dois fatores, senhas e sessões ativas.'],
  notificacoes: ['CONFIGURAÇÕES', 'Notificações', 'Preferências de alertas por e-mail e push.'],
  geral: ['CONFIGURAÇÕES', 'Configurações Gerais', 'Dados do salão, aparência e preferências regionais.'],
}

export function Head({ page, children }) {
  const x = info[page]
  return (
    <header className="head">
      <div>
        <p>{x[0]}</p>
        <h1>{x[1]}</h1>
        <span>{x[2]}</span>
      </div>
      {children}
    </header>
  )
}

export const Stat = ({ a, b, c }) => (
  <article className="stat">
    <p>{a}</p>
    <b>{b}</b>
    <span>{c}</span>
  </article>
)
