import { useId } from 'react'
import { CircleHelp } from 'lucide-react'
import ui from './PageHeader.module.css'

export function CatalogListHelp() {
  const id = useId()
  return <span className={ui.help}>
    <button type="button" className={ui.helpButton} aria-label="Sobre os tipos e indicadores de produtos e drinks" aria-describedby={id}><CircleHelp size={19} aria-hidden="true" /></button>
    <span id={id} role="tooltip" className={ui.helpText + ' ' + ui.auditLegend}>
      <strong className={ui.legendTitle}>Tipos de produto e cores</strong>
      {[
        ['var(--gold2)', 'Drink · amarelo', 'Preparo por receita. A linha amarela destaca o drink; ela não indica estoque baixo nem confirma que a receita está completa.'],
        ['#3b82f6', 'Padrão · azul', 'Produto com estoque próprio, fracionado ou não. Corresponde ao tipo PADRAO do servidor.'],
        ['#14b8a6', 'Dose · verde-água', 'Identifica o produto fracionado, com estoque em mililitros. Quando aparece sozinha, Dose mostra o volume da embalagem em ml ao lado do ícone. Não é uma medida fixa de cada dose. Se houver fardo, os ícones ficam lado a lado.'],
        ['#a855f7', 'Fardo · roxo', 'Forma de venda complementar abaixo da tag principal. Quando aparece sozinha, mostra Fardo e as unidades ao lado do ícone. Com dose e fardo juntos, mostra apenas os dois ícones; passe o mouse para consultar as quantidades. Acompanha o tipo Padrão; não é um segundo tipo de produto.'],
      ].map(([color, title, text]) => <span className={ui.legendRow} key={title}><span className={ui.legendDot} style={{ background: color }} aria-hidden="true" /><span><strong style={{ color }}>{title}</strong><span>{text}</span></span></span>)}
      <span className={ui.legendFooter}><strong>Indicadores opcionais</strong><br />Margem bruta = (preço − custo) ÷ preço × 100. Não inclui impostos, taxas ou despesas.<br />Cobertura = saldo ÷ consumo médio diário dos últimos 30 dias completos. É uma estimativa para produtos com estoque próprio.<br />Passe o mouse em Margem e Giro para consultar as faixas de cores e as limitações de cada cálculo. As cores das tags identificam o tipo de produto; não representam essas métricas.</span>
    </span>
  </span>
}
