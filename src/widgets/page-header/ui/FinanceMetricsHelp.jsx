import { useId } from 'react'
import { CircleHelp } from 'lucide-react'
import { LIMITE_FALTA_RECORRENTE, METAS, PRIORIDADES_ABC, TONE_COLOR } from '@/entities/reports'
import ui from './PageHeader.module.css'

const corPorTom = { ok: 'verde', warn: 'amarelo', bad: 'vermelho' }
const desempenho = [
  { tone: 'ok', label: 'Bom', description: 'O indicador atingiu a meta.' },
  { tone: 'warn', label: 'Médio', description: 'O indicador está na faixa de atenção.' },
  { tone: 'bad', label: 'Ruim', description: 'O indicador ficou fora do limite aceito.' },
]

function metaMinima({ ok, warn }, unidade = '%') {
  return `Bom a partir de ${ok}${unidade}. Médio de ${warn}${unidade} a menos de ${ok}${unidade}. Ruim abaixo de ${warn}${unidade}.`
}

function metaMaxima({ ok, warn }, referencia) {
  return `Bom até ${ok}% ${referencia}. Médio acima de ${ok}% até ${warn}%. Ruim acima de ${warn}%.`
}

const margensECustos = [
  ['Margem bruta', metaMinima(METAS.margemBruta)],
  ['Custo das mercadorias vendidas (CMV)', metaMaxima(METAS.cmv, 'da receita')],
]
const faixasFinanceiro = [
  ['Saldo em caixa em relação às contas a pagar em 30 dias', metaMinima(METAS.coberturaPagar, '×')],
  ['Contas a pagar', 'Bom quando tudo está em dia e nada vence nos próximos 7 dias. Médio quando há contas a vencer em até 7 dias. Ruim quando há conta vencida.'],
  ['Crescimento do faturamento em relação ao mês anterior', metaMinima(METAS.crescimento)],
  ['Participação nas vendas por categoria', metaMinima(METAS.participacaoCategoria)],
  ['Margem líquida', metaMinima(METAS.margemLiquida)],
  ...margensECustos,
]
const faixasRelatorios = {
  margem: margensECustos,
  ruptura: [['Falta de estoque', `Verde para 0 dias registrados. Amarelo quando faltou em até ${LIMITE_FALTA_RECORRENTE}% dos dias. Vermelho quando faltou em mais de ${LIMITE_FALTA_RECORRENTE}% dos dias.`]],
  perdas: [['Perdas no período', metaMaxima(METAS.perdasFaturamento, 'do faturamento')]],
}

const reportHelp = {
  margem: ['Margem por categoria', 'A margem bruta é a receita menos o custo das mercadorias vendidas. A margem percentual compara esse resultado à receita da categoria.'],
  ruptura: ['Falta de estoque', 'A venda perdida é uma estimativa baseada no histórico de vendas dos produtos.'],
  horarios: ['Horários de venda', 'Selecione uma célula do mapa com vendas para ver os produtos vendidos naquele dia da semana e horário.'],
  perdas: ['Perdas por motivo', 'O valor mostra o custo registrado nas movimentações de perda do período, agrupado por motivo.'],
}

function Legenda({ tone, label, description }) {
  const color = TONE_COLOR[tone]
  return (
    <span className={ui.legendRow}>
      <span className={ui.legendDot} style={{ background: color }} aria-hidden="true" />
      <span>
        <strong style={{ color }}>{label} · {corPorTom[tone]}</strong>
        {description && <span>{description}</span>}
      </span>
    </span>
  )
}

function ChannelHelpContent() {
  return <>
    <strong className={ui.legendTitle}>Canais de venda</strong>
    <span className={ui.metricsHelpRule}>O relatório considera os pedidos concluídos no período selecionado.</span>
    <span className={ui.metricsHelpRule}>
      <strong>Cores dos canais</strong>
      <span>Balcão em dourado, Mesa em verde, Retirada em azul e Delivery em roxo. As cores identificam os canais nos indicadores e na tabela.</span>
    </span>
    <span className={ui.metricsHelpSection}>
      <strong className={ui.legendTitle}>Como ler os indicadores</strong>
      <span className={ui.metricsHelpRule}><strong>Faturamento e participação</strong><span>Em R$, o valor é a soma das vendas do canal. Em %, é a parcela do faturamento total. Os indicadores aparecem mesmo com zero vendas.</span></span>
      <span className={ui.metricsHelpRule}><strong>Valor médio por venda</strong><span>Faturamento do canal dividido pelo número de vendas. O indicador com a maior média do período recebe o destaque.</span></span>
      <span className={ui.metricsHelpRule}><strong>Itens por venda</strong><span>Quantidade total de itens vendidos no canal dividida pelo número de vendas.</span></span>
    </span>
  </>
}

export function FinanceMetricsHelp({ reports, reportTab }) {
  const id = useId()
  const channelReport = reports && reportTab === 'canais'
  const section = reports ? reportHelp[reportTab] : null
  const rules = faixasRelatorios[reportTab] ?? []
  const label = section ? `Sobre ${section[0]}` : channelReport ? 'Sobre os indicadores de canais de venda'
    : reports ? 'Sobre as classes ABC e os indicadores dos relatórios' : 'Sobre os indicadores financeiros'
  return (
    <span className={ui.help + ' ' + ui.metricsHelpAnchor}>
      <button type="button" className={ui.helpButton} aria-describedby={id} aria-label={label}>
        <CircleHelp size={19} aria-hidden="true" />
      </button>
      <span id={id} role="tooltip" className={ui.helpText + ' ' + ui.metricsHelp}>
        {channelReport ? <ChannelHelpContent /> : section ? <>
          <strong className={ui.legendTitle}>{section[0]}</strong>
          <span className={ui.metricsHelpRule}>{section[1]}</span>
          {rules.map(([name, description]) => <span className={ui.metricsHelpRule} key={name}><strong>{name}</strong><span>{description}</span></span>)}
        </> : <>
          {reports && (
            <>
              <strong className={ui.legendTitle}>Prioridade na Curva ABC</strong>
              <span className={ui.legendIntro}>Os produtos são ordenados por faturamento, com faixas de 80% e 95% do total acumulado.</span>
              {Object.entries(PRIORIDADES_ABC).map(([classe, { tone, label }]) => (
                <Legenda key={classe} tone={tone} label={`Classe ${classe} · ${label}`} />
              ))}
            </>
          )}
          <strong className={ui.legendTitle + (reports ? ' ' + ui.metricsHelpSection : '')}>Desempenho dos indicadores</strong>
          {desempenho.map(item => <Legenda key={item.tone} {...item} />)}
          <span className={ui.metricsHelpSection}>
            <strong className={ui.legendTitle}>Faixas de referência</strong>
            {faixasFinanceiro.map(([label, description]) => (
              <span className={ui.metricsHelpRule} key={label}>
                <strong>{label}</strong>
                <span>{description}</span>
              </span>
            ))}
          </span>
        </>}
      </span>
    </span>
  )
}
