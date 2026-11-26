import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { ActionMenu } from '@/entities/access/ui'
import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import filters from '@/pages/sales/remote/SalesRemote.module.css'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Pencil, CircleCheck, Ban, SlidersHorizontal, ChevronDown, ReceiptText, CalendarClock } from 'lucide-react'
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
    <select id={id} {...props} data-empty={props.value === '' || undefined}><Opcoes values={values} placeholder={placeholder} /></select>
  </div>
}

export function AccountList({ onSelect, revision, canManage = false }) {
  const [filtros, setFiltros] = useState({ tipo: 'PAGAR', status: '', centroCusto: '', vencimentoDe: '', vencimentoAte: '' })
  const [pagina, setPagina] = useState(0)
  const [tamanho, setTamanho] = useState(10)
  const [expanded, setExpanded] = useState(true)
  const consulta = useQueryResource(signal => financeApi.contas({ ...filtros, pagina, tamanho }, signal), [filtros, pagina, tamanho, revision])
  const data = !consulta.loading && !consulta.error ? consulta.data : null
  const ultimaPagina = Math.max(0, (data?.totalPaginas ?? 1) - 1)
  if (data && pagina > ultimaPagina) setPagina(ultimaPagina)

  function filtrar(key, value) {
    setFiltros(current => ({ ...current, [key]: value }))
    setPagina(0)
  }

  const columns = [
    { key: 'descricao', header: 'Conta' },
    { key: 'vencimento', header: 'Vencimento', render: r => diaBR(r.vencimento) },
    { key: 'valor', header: 'Valor', align: 'right', render: r => fmtBRL(r.valor) },
    { key: 'status', header: 'Situação', align: 'center', render: r => <span className={s.accountStatus} data-status={r.status}>{STATUS_CONTA[r.status]}</span> },
    { key: 'acoes', header: 'Ações', align: 'center', render: conta => (
      <ActionMenu label={'Ações da conta '+conta.descricao} focusTriggerOnSelect items={[
        { label:'Ver detalhes', icon:Eye, onClick:()=>onSelect(conta.id,'detail') },
        canManage && conta.status==='ABERTA' && { label:'Editar conta', icon:Pencil, onClick:()=>onSelect(conta.id,'edit') },
        canManage && conta.status==='ABERTA' && { label:conta.tipo==='RECEBER'?'Registrar recebimento':'Registrar pagamento', icon:CircleCheck, onClick:()=>onSelect(conta.id,'settle') },
        canManage && conta.status==='ABERTA' && { label:'Cancelar conta', icon:Ban, danger:true, onClick:()=>onSelect(conta.id,'cancel') },
      ]}/>
    ) },
  ].map(column => ({ ...column, sort: false }))

  return <div className={s.accountList}>
    <section className={`${filters.panel} ${s.accountFilterPanel}`}>
      <FilterHeader className={filters.filterHeading}><h2><button type="button" className={filters.collapse} aria-expanded={expanded} aria-controls="account-filter-fields" onClick={()=>setExpanded(!expanded)}><SlidersHorizontal size={17} aria-hidden="true"/>Filtros de contas<ChevronDown size={17} className={expanded?filters.rotated:undefined} aria-hidden="true"/></button></h2>
        <FilterActions onClear={()=>{setFiltros({tipo:'PAGAR',status:'',centroCusto:'',vencimentoDe:'',vencimentoAte:''});setPagina(0)}} onRefresh={consulta.reload} refreshing={consulta.loading}/>
      </FilterHeader>
      <div id="account-filter-fields" hidden={!expanded}>
      <div className={filters.grid + ' ' + s.accountFilterGrid}>
      <AccountSelect label="Situação" values={STATUS_CONTA} placeholder="Todas as situações"
        value={filtros.status} onChange={event => filtrar('status', event.target.value)} />
      <AccountSelect label="Centro de custo" values={CENTROS_CUSTO} placeholder="Todos os centros"
        value={filtros.centroCusto} onChange={event => filtrar('centroCusto', event.target.value)} />
      <label>Vencimento de<input type="date" data-empty={!filtros.vencimentoDe || undefined} value={filtros.vencimentoDe} max={filtros.vencimentoAte||undefined} onChange={e=>filtrar('vencimentoDe',e.target.value)}/></label>
      <label>Vencimento até<input type="date" data-empty={!filtros.vencimentoAte || undefined} value={filtros.vencimentoAte} min={filtros.vencimentoDe||undefined} onChange={e=>filtrar('vencimentoAte',e.target.value)}/></label>
      <label>Itens por página<select value={tamanho} onChange={e=>{setTamanho(Number(e.target.value));setPagina(0)}}>{[10,20,50].map(n=><option key={n}>{n}</option>)}</select></label>
      </div></div>
    </section>
    {consulta.loading && <LoadingBlock label="Consultando contas…" />}
    {consulta.error && <ErrorBlock error={consulta.error} onRetry={consulta.reload} />}
    {data && pagina <= ultimaPagina && <DataTable columns={columns} rows={data.itens} pageSize={tamanho} caption="Contas a pagar"
      remote={{ page: pagina, total: data.totalItens, onPage: setPagina }}
      emptyText="Nenhuma conta encontrada para os filtros selecionados." />}
  </div>
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
        <textarea className={!conta && tipo === 'PAGAR' ? s.newPayableNotes : undefined}
          name="observacao" rows={3} maxLength={500} defaultValue={conta?.observacao ?? ''} />
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
    ['Tipo', TIPOS_CONTA[conta.tipo], s.accountClassification],
    ['Centro de custo', CENTROS_CUSTO[conta.centroCusto], s.accountClassification],
    ['Categoria', CATEGORIAS_CONTA[conta.categoria], s.accountClassification],
    ['Data da baixa', conta.pagoEm && diaBR(conta.pagoEm)], ['Valor da baixa', conta.valorPago != null && fmtBRL(conta.valorPago)],
  ]
  return <>
    <section className={s.accountSummary} aria-label="Resumo da conta">
      <div className={s.accountSummaryHead}>
        <h3>{conta.descricao}</h3>
        <span className={s.accountStatus} data-status={conta.status}>{STATUS_CONTA[conta.status]}</span>
      </div>
      <dl className={s.accountSummaryValues}>
        <div><dt>Valor da conta</dt><dd>{fmtBRL(conta.valor)}</dd></div>
        <div><dt><CalendarClock size={15} aria-hidden="true" />Vencimento</dt><dd>{diaBR(conta.vencimento)}</dd></div>
      </dl>
    </section>
    <dl className={s.accountDetail}>
      {fields.filter(([, value]) => value).map(([label, value, className]) => (
        <div key={label} className={className}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
    {conta.observacao?.trim() && <section className={s.accountNotes} aria-label="Observação">
      <h3>Observação</h3>
      <p>{conta.observacao}</p>
    </section>}
  </>
}

export function FinanceAccounts({ initial, canManage, referencia, onChange, onClose }) {
  const formId = useId()
  const lock = useRef(false)
  const finishCreate = useRef(null)
  const toast = useToast()
  const [view, setView] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [uncertain, setUncertain] = useState(false)
  const [revision, setRevision] = useState(0)
  const consulta = useQueryResource(signal => view.id ? financeApi.conta(view.id, signal) : null, [view.id])
  const conta = view.createdAccount ?? (!consulta.loading && !consulta.error && view.id ? consulta.data : null)
  const canEdit = canManage && conta?.status === 'ABERTA'
  const { mode } = view
  const created = Boolean(view.createdAccount)
  const titles = {
    list: 'Contas a pagar e a receber',
    create: `Nova conta ${TIPOS_CONTA[view.tipo]?.toLowerCase()}`, edit: 'Editar conta',
    settle: conta?.tipo === 'RECEBER' ? 'Registrar recebimento' : 'Registrar pagamento', cancel: 'Cancelar conta',
  }

  useEffect(() => {
    if (created) finishCreate.current?.focus()
  }, [created])

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
      if (mode === 'create') {
        trocar({ mode: 'detail', createdAccount: resultado })
      } else {
        trocar({ mode: 'detail', id: resultado.id })
        consulta.reload()
        const messages = { edit: 'Conta atualizada.', settle: 'Baixa registrada.', cancel: 'Conta cancelada.' }
        toast(messages[mode], { type: 'success' })
      }
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
  const accountLoadState = view.id && <>
    {consulta.loading && <LoadingBlock label="Consultando a conta…" />}
    {consulta.error && <ErrorBlock error={consulta.error} onRetry={consulta.reload} />}
  </>

  if (mode === 'detail' && !created) return createPortal(
    <Drawer title="Detalhes da conta" onClose={onClose}>
      <div className={s.accountDrawerContent}>
        <h2 className={s.accountPanelTitle}><ReceiptText size={20} aria-hidden="true" />Detalhes da conta</h2>
        {accountLoadState}
        {conta && <AccountDetail conta={conta} />}
      </div>
    </Drawer>, document.body,
  )

  const title = created
    ? <span className={s.accountPanelTitle} data-created><CircleCheck size={20} aria-hidden="true" />Conta cadastrada com sucesso</span>
    : titles[mode]
  return createPortal(
    <Modal title={title} subtitle={operation ? conta?.descricao : undefined} width={mode === 'list' ? 940 : 575}
      onClose={onClose} busy={busy} footer={<>
        {created && <button ref={finishCreate} type="button" className="gold" onClick={onClose}>Concluir</button>}
        {operation && <button type="button" disabled={busy} onClick={() => { trocar({ mode: 'detail', id: view.id }); if (uncertain) consulta.reload() }}>Voltar aos detalhes</button>}
        {formMode && <button type="submit" form={formId} className="gold" disabled={busy || uncertain}>{busy ? 'Salvando…' : mode === 'settle' ? 'Confirmar baixa' : 'Salvar conta'}</button>}
        {mode === 'cancel' && canEdit && <button type="button" className="gold" disabled={busy || uncertain} onClick={() => salvar()}>{busy ? 'Cancelando…' : 'Confirmar cancelamento'}</button>}
      </>}>
      {initial.mode === 'list' && <div hidden={mode !== 'list'}>
        <AccountList revision={revision} canManage={canManage} onSelect={(id, mode) => trocar({ mode, id })} />
      </div>}
      {accountLoadState}
      {created && <AccountDetail conta={conta} />}
      {error && <Notice title="Não foi possível confirmar a operação" focus>
        {error.message}
        {Object.values(error.fieldErrors ?? {}).map(message => <p key={message}>{message}</p>)}
      </Notice>}
      {uncertain && <Notice tone="warning">Consulte a situação da conta antes de tentar novamente.</Notice>}
      {(mode === 'create' || (mode === 'edit' && canEdit)) && <AccountFields conta={conta} tipo={conta?.tipo ?? view.tipo}
        formId={formId} busy={busy} error={error} onSubmit={salvar} />}
      {mode === 'settle' && canEdit && <SettlementFields conta={conta} referencia={referencia} formId={formId} busy={busy} onSubmit={salvar} />}
      {mode === 'cancel' && canEdit && <Notice title="Confirme o cancelamento" tone="warning">Esta conta deixará de aparecer entre as contas em aberto.</Notice>}
    </Modal>,
    document.body,
  )
}
