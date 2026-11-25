import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye } from 'lucide-react'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { ErrorBlock, LoadingBlock, Modal, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { fmtBRL } from '@/shared/lib/format.js'
import { MoneyInput } from '@/features/catalog/product-editor/ui/MoneyInput.jsx'
import { financeApi } from '../model/financeApi.js'
import { CATEGORIAS_CONTA, CENTROS_CUSTO, STATUS_CONTA, TIPOS_CONTA, diaBR } from '../model/financePresentation.js'
import s from './FinancePage.module.css'

function Opcoes({ values, placeholder }) {
  return <>
    <option value="">{placeholder}</option>
    {Object.entries(values).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </>
}

function AccountSelect({ label, values, placeholder, ...props }) {
  const id = useId()
  return <div className={s.accountSelect}>
    <label htmlFor={id}>{label}</label>
    <select id={id} {...props}><Opcoes values={values} placeholder={placeholder} /></select>
  </div>
}

function AccountList({ onSelect, revision }) {
  const [filtros, setFiltros] = useState({ tipo: '', status: '', centroCusto: '' })
  const [pagina, setPagina] = useState(0)
  const tamanho = 10
  const consulta = useQueryResource(signal => financeApi.contas({ ...filtros, pagina, tamanho }, signal), [filtros, pagina, revision])
  const data = !consulta.loading && !consulta.error ? consulta.data : null
  const ultimaPagina = Math.max(0, (data?.totalPaginas ?? 1) - 1)
  if (data && pagina > ultimaPagina) setPagina(ultimaPagina)

  function filtrar(key, value) {
    setFiltros(current => ({ ...current, [key]: value }))
    setPagina(0)
  }

  const columns = [
    { key: 'descricao', header: 'Conta' },
    { key: 'tipo', header: 'Tipo', render: r => TIPOS_CONTA[r.tipo] },
    { key: 'vencimento', header: 'Vencimento', render: r => diaBR(r.vencimento) },
    { key: 'valor', header: 'Valor', align: 'right', render: r => fmtBRL(r.valor) },
    { key: 'status', header: 'Situação', render: r => STATUS_CONTA[r.status] },
    { key: 'acoes', header: 'Ações', align: 'center', render: conta => (
      <button type="button" aria-label={`Ver conta ${conta.descricao}`} onClick={() => onSelect(conta.id)}>
        <Eye size={16} aria-hidden="true" /> Ver mais
      </button>
    ) },
  ].map(column => ({ ...column, sort: false }))

  return <>
    <div className={s.accountFilters}>
      <AccountSelect label="Tipo" values={TIPOS_CONTA} placeholder="Todos os tipos"
        value={filtros.tipo} onChange={event => filtrar('tipo', event.target.value)} />
      <AccountSelect label="Situação" values={STATUS_CONTA} placeholder="Todas as situações"
        value={filtros.status} onChange={event => filtrar('status', event.target.value)} />
      <AccountSelect label="Centro de custo" values={CENTROS_CUSTO} placeholder="Todos os centros"
        value={filtros.centroCusto} onChange={event => filtrar('centroCusto', event.target.value)} />
    </div>
    {consulta.loading && <LoadingBlock label="Consultando contas…" />}
    {consulta.error && <ErrorBlock error={consulta.error} onRetry={consulta.reload} />}
    {data && pagina <= ultimaPagina && <DataTable columns={columns} rows={data.itens} pageSize={tamanho} caption="Contas a pagar e a receber"
      remote={{ page: pagina, total: data.totalItens, onPage: setPagina }}
      emptyText="Nenhuma conta encontrada para os filtros selecionados." />}
  </>
}

function AccountFields({ conta, tipo, formId, busy, error, onSubmit }) {
  const [valor, setValor] = useState(conta?.valor ?? '')
  return <form id={formId} onSubmit={event => {
    event.preventDefault()
    const dados = Object.fromEntries(new FormData(event.currentTarget))
    onSubmit({ ...dados, tipo, valor: Number(valor), categoria: dados.categoria || null })
  }}>
    <fieldset className={s.accountFields} disabled={busy}>
      <label className={s.accountWide}>Descrição
        <input name="descricao" required maxLength={150} defaultValue={conta?.descricao} placeholder="Ex.: Aluguel da adega" aria-invalid={!!error?.fieldErrors?.descricao} />
      </label>
      <label>Valor em reais
        <MoneyInput value={valor} onValueChange={setValor} required placeholder="0,00" aria-invalid={!!error?.fieldErrors?.valor} />
      </label>
      <label>Vencimento
        <input name="vencimento" type="date" required defaultValue={conta?.vencimento} aria-invalid={!!error?.fieldErrors?.vencimento} />
      </label>
      <AccountSelect label="Centro de custo" name="centroCusto" required defaultValue={conta?.centroCusto ?? ''}
        values={CENTROS_CUSTO} placeholder="Selecione" />
      {tipo === 'PAGAR' && <AccountSelect label="Categoria" name="categoria" required defaultValue={conta?.categoria ?? ''}
        values={CATEGORIAS_CONTA} placeholder="Selecione" />}
      <label className={s.accountWide}>Observação
        <textarea name="observacao" rows={3} maxLength={500} defaultValue={conta?.observacao ?? ''} />
      </label>
    </fieldset>
  </form>
}

function SettlementFields({ conta, referencia, formId, busy, onSubmit }) {
  const [valor, setValor] = useState(conta.valor)
  return <form id={formId} onSubmit={event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget).get('pagoEm')
    onSubmit({ pagoEm: data || null, valorPago: valor === '' ? null : Number(valor) })
  }}>
    <fieldset className={s.accountFields} disabled={busy}>
      <label>Data da baixa<input name="pagoEm" type="date" defaultValue={referencia} max={referencia} /></label>
      <label>Valor efetivo em reais<MoneyInput value={valor} onValueChange={setValor} /></label>
    </fieldset>
  </form>
}

function AccountDetail({ conta }) {
  const fields = [
    ['Tipo', TIPOS_CONTA[conta.tipo]], ['Situação', STATUS_CONTA[conta.status]],
    ['Valor', fmtBRL(conta.valor)], ['Vencimento', diaBR(conta.vencimento)],
    ['Centro de custo', CENTROS_CUSTO[conta.centroCusto]], ['Categoria', CATEGORIAS_CONTA[conta.categoria]],
    ['Data da baixa', conta.pagoEm && diaBR(conta.pagoEm)], ['Valor da baixa', conta.valorPago != null && fmtBRL(conta.valorPago)],
    ['Observação', conta.observacao],
  ]
  return <dl className={s.accountDetail}>
    {fields.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>
}

export function FinanceAccounts({ initial, canManage, referencia, onChange, onClose }) {
  const formId = useId()
  const lock = useRef(false)
  const toast = useToast()
  const [view, setView] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [uncertain, setUncertain] = useState(false)
  const [revision, setRevision] = useState(0)
  const consulta = useQueryResource(signal => view.id ? financeApi.conta(view.id, signal) : null, [view.id])
  const conta = !consulta.loading && !consulta.error && view.id ? consulta.data : null
  const canEdit = canManage && conta?.status === 'ABERTA'
  const { mode } = view
  const titles = {
    list: 'Contas a pagar e a receber', detail: conta?.descricao || 'Detalhes da conta',
    create: `Nova conta ${TIPOS_CONTA[view.tipo]?.toLowerCase()}`, edit: 'Editar conta',
    settle: conta?.tipo === 'RECEBER' ? 'Registrar recebimento' : 'Registrar pagamento', cancel: 'Cancelar conta',
  }

  function trocar(next) {
    setError(null)
    setUncertain(false)
    setView(next)
  }

  async function salvar(body) {
    if (lock.current || uncertain || !canManage || (mode !== 'create' && !canEdit)) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      const resultado = await {
        create: () => financeApi.criar(body),
        edit: () => financeApi.atualizar(view.id, body),
        settle: () => financeApi.baixar(view.id, body),
        cancel: () => financeApi.cancelar(view.id),
      }[mode]()
      onChange()
      setRevision(value => value + 1)
      trocar({ mode: 'detail', id: resultado.id })
      consulta.reload()
      const messages = { create: 'Conta cadastrada.', edit: 'Conta atualizada.', settle: 'Baixa registrada.', cancel: 'Conta cancelada.' }
      toast(messages[mode], { type: 'success' })
    } catch (err) {
      setError(err)
      if (!err.status || err.status >= 500) {
        setUncertain(true)
        onChange()
        setRevision(value => value + 1)
      }
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  const operation = ['edit', 'settle', 'cancel'].includes(mode)
  const formMode = mode === 'create' || (canEdit && ['edit', 'settle'].includes(mode))
  return createPortal(
    <Modal title={titles[mode]} subtitle={operation ? conta?.descricao : undefined} width={mode === 'list' ? 940 : 575}
      onClose={onClose} busy={busy} footer={<>
        {mode === 'detail' && initial.mode === 'list' && <button type="button" onClick={() => trocar({ mode: 'list' })}>Voltar às contas</button>}
        {mode === 'detail' && canEdit && <>
          <button type="button" onClick={() => trocar({ mode: 'edit', id: view.id })}>Editar conta</button>
          <button type="button" onClick={() => trocar({ mode: 'cancel', id: view.id })}>Cancelar conta</button>
          <button type="button" className="gold" onClick={() => trocar({ mode: 'settle', id: view.id })}>{conta.tipo === 'RECEBER' ? 'Registrar recebimento' : 'Registrar pagamento'}</button>
        </>}
        {operation && <button type="button" disabled={busy} onClick={() => { trocar({ mode: 'detail', id: view.id }); if (uncertain) consulta.reload() }}>Voltar aos detalhes</button>}
        {formMode && <button type="submit" form={formId} className="gold" disabled={busy || uncertain}>{busy ? 'Salvando…' : mode === 'settle' ? 'Confirmar baixa' : 'Salvar conta'}</button>}
        {mode === 'cancel' && canEdit && <button type="button" className="gold" disabled={busy || uncertain} onClick={() => salvar()}>{busy ? 'Cancelando…' : 'Confirmar cancelamento'}</button>}
      </>}>
      {initial.mode === 'list' && <div hidden={mode !== 'list'} className={s.accountList}>
        <AccountList revision={revision} onSelect={id => trocar({ mode: 'detail', id })} />
      </div>}
      {view.id && consulta.loading && <LoadingBlock label="Consultando a conta…" />}
      {view.id && consulta.error && <ErrorBlock error={consulta.error} onRetry={consulta.reload} />}
      {error && <Notice title="Não foi possível confirmar a operação" focus>
        {error.message}
        {Object.values(error.fieldErrors ?? {}).map(message => <p key={message}>{message}</p>)}
      </Notice>}
      {uncertain && <Notice tone="warning">Consulte a situação da conta antes de tentar novamente.</Notice>}
      {mode === 'detail' && conta && <AccountDetail conta={conta} />}
      {(mode === 'create' || (mode === 'edit' && canEdit)) && <AccountFields conta={conta} tipo={conta?.tipo ?? view.tipo}
        formId={formId} busy={busy} error={error} onSubmit={salvar} />}
      {mode === 'settle' && canEdit && <SettlementFields conta={conta} referencia={referencia} formId={formId} busy={busy} onSubmit={salvar} />}
      {mode === 'cancel' && canEdit && <Notice title="Confirme o cancelamento" tone="warning">Esta conta deixará de aparecer entre as contas em aberto.</Notice>}
    </Modal>,
    document.body,
  )
}
