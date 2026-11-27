import { useId } from 'react'
import { CircleHelp } from 'lucide-react'
import ui from './PageHeader.module.css'

export function CatalogListHelp() {
  const id = useId()
  return <span className={ui.help}>
    <button type="button" className={ui.helpButton} aria-label="Sobre os tipos e indicadores de produtos e drinks" aria-describedby={id}><CircleHelp size={19} aria-hidden="true" /></button>
    <span id={id} role="tooltip" className={ui.helpText + ' ' + ui.auditLegend}>
      <strong className={ui.legendTitle}>Cores do catálogo</strong>
      {[
        ['var(--red)', 'Zerado · linha vermelha', 'Produto com estoque próprio e sem saldo em estoque. O Status Ativo ou Inativo é um controle separado do cadastro.'],
        ['var(--gold2)', 'Drink · linha amarela', 'O consumo baixa o estoque dos ingredientes. Clique em Por receita ou Na receita para consultar os ingredientes.'],
        ['#3b82f6', 'Padrão · azul', 'Produto com estoque próprio. O saldo e o mínimo aparecem na unidade de controle.'],
        ['#14b8a6', 'Dose · verde-água', 'Venda fracionada com estoque em mililitros. O número ao lado do ícone indica o volume da embalagem.'],
        ['#a855f7', 'Fardo · roxo', 'Venda em grupo de unidades. Passe o mouse sobre os ícones de dose ou fardo para ver as quantidades quando ambos aparecem juntos.'],
      ].map(([color, title, text]) => <span className={ui.legendRow} key={title}><span className={ui.legendDot} style={{ background: color }} aria-hidden="true" /><span><strong style={{ color }}>{title}</strong><span>{text}</span></span></span>)}
      <span className={ui.legendFooter}><strong>Filtros e indicadores</strong><br />Filtre por tipo, status, nome, código ou categoria. Em Exibir indicadores, Margem adiciona o percentual sobre o preço de venda. Giro adiciona o consumo dos últimos 30 dias completos e a cobertura estimada. Passe o mouse sobre os botões para ver as fórmulas e as faixas de cores.</span>
    </span>
  </span>
}
