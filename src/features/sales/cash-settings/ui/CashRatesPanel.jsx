import { FilterActions, FilterHeader } from '@/shared/ui/filters/FilterActions.jsx'
import { useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, CreditCard, Eye, Percent, Pencil, Plus, SlidersHorizontal } from 'lucide-react'
import { readCash } from '@/entities/sales/api/cashApi.js'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { DataTable } from '@/shared/ui/data-table/DataTable.jsx'
import { ErrorBlock, LoadingBlock, Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { fmtBRL } from '@/shared/lib/format.js'
import { FEE_FORMS } from '../model/cashFeeRules.js'
import { CashFeeModal } from './CashFeeModal.jsx'
import s from './CashRatesPanel.module.css'

function Transfer({rate}) {
 const known=typeof rate.repasseEfetivo==='boolean'
 return <div className={s.transfer}><span className={s.badge} data-tone={!known?'neutral':rate.repasseEfetivo?'client':'store'}>{known?(rate.repasseEfetivo?'Cliente paga':'Loja absorve'):'Não informado'}</span><small>{rate.repassarAoCliente==null?'Segue a política geral':'Regra própria desta taxa'}</small></div>
}
export function CashRatesPanel({canConfigure}) {
 const [forma,setForma]=useState(''),[status,setStatus]=useState(''),[size,setSize]=useState(10),[page,setPage]=useState(0),[sort,setSort]=useState({key:'forma',dir:'asc'}),[expanded,setExpanded]=useState(true),[modal,setModal]=useState(null),[saved,setSaved]=useState(false)
 const query=useQueryResource(signal=>readCash('taxas',{forma,ativo:status,pagina:page,tamanho:size,ordenarPor:sort.key,direcao:sort.dir.toUpperCase()},signal),[forma,status,page,size,sort])
 const rows=query.loading||query.error?[]:query.data?.itens||[]
 const columns=[
  {key:'forma',header:'Forma de pagamento',render:rate=><strong className={s.formName}><CreditCard size={15} aria-hidden="true"/>{FEE_FORMS[rate.forma]||rate.forma}</strong>},
  {key:'parcelas',header:'Parcelamento',render:rate=>Number(rate.parcelas)===1?'À vista · 1 parcela':rate.parcelas+' parcelas'},
  {key:'taxaPercentual',header:'Taxa (%)',align:'right',render:rate=>rate.taxaPercentual==null?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:4}).format(rate.taxaPercentual)+'%'},
  {key:'taxaFixa',header:'Taxa fixa',align:'right',sort:false,render:rate=>rate.taxaFixa==null?'—':fmtBRL(rate.taxaFixa)},
  {key:'repasseEfetivo',header:'Quem paga a taxa',sort:false,render:rate=><Transfer rate={rate}/>},
  {key:'ativo',header:'Status',sort:false,render:rate=><span className={s.badge} data-tone={rate.ativo?'active':'neutral'}>{rate.ativo?<CheckCircle2 size={13} aria-hidden="true"/>:<AlertCircle size={13} aria-hidden="true"/>}{rate.ativo?'Ativa':'Inativa'}</span>},
  ...(canConfigure?[{key:'actions',header:'Ações',sort:false,render:rate=><button type="button" className={s.edit} onClick={()=>{setSaved(false);setModal({rate})}}><Pencil size={14} aria-hidden="true"/>Editar taxa</button>}]:[]),
 ]
 function clear(){setForma('');setStatus('');setSize(10);setPage(0);setSort({key:'forma',dir:'asc'})}
 return <>
  <section className={s.panel} aria-label="Consulta de taxas e repasse">
   <header className={s.heading}><div><h2><Percent size={21} aria-hidden="true"/>Taxas cadastradas</h2><p>Confira os custos por transação e se os encargos ficam com a loja ou com o cliente.</p></div></header>
   <FilterHeader className={s.filterHeading}><button type="button" className={s.filterToggle} aria-expanded={expanded} aria-controls="cash-rates-filters" onClick={()=>setExpanded(value=>!value)}><SlidersHorizontal size={16} aria-hidden="true"/>Filtros de taxas<ChevronDown size={16} aria-hidden="true" className={expanded?s.rotated:undefined}/></button><FilterActions onClear={clear} onRefresh={query.reload} refreshing={query.loading} compact={canConfigure} clearLabel="Limpar filtros de taxas" refreshLabel="Atualizar taxas">{canConfigure&&<button type="button" className="gold" onClick={()=>{setSaved(false);setModal({rate:null})}}><Plus size={16} aria-hidden="true"/>Nova taxa</button>}</FilterActions></FilterHeader>
   {expanded&&<div className={s.filters} id="cash-rates-filters"><label>Forma de pagamento<select aria-label="Filtrar taxas por forma" value={forma} onChange={event=>{setForma(event.target.value);setPage(0)}}><option value="">Todas</option>{Object.entries(FEE_FORMS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Status<select aria-label="Status das taxas" value={status} onChange={event=>{setStatus(event.target.value);setPage(0)}}><option value="">Todas</option><option value="true">Ativas</option><option value="false">Inativas</option></select></label><label>Itens por página<select aria-label="Taxas por página" value={size} onChange={event=>{setSize(Number(event.target.value));setPage(0)}}>{[5,10,20].map(value=><option key={value} value={value}>{value}</option>)}</select></label></div>}
   <p className={s.hint}>O percentual é total para a quantidade de parcelas indicada. A taxa fixa é por transação. Apenas taxas ativas são usadas nas novas cobranças.</p>
  </section>
  {saved&&<Notice tone="info" title="Taxa salva">O cadastro foi atualizado. A lista respeita os filtros selecionados.</Notice>}
  {query.loading?<LoadingBlock label="Carregando taxas e regras de repasse…"/>:query.error?<ErrorBlock error={query.error} onRetry={query.reload}/>:<DataTable caption="Taxas de pagamento" columns={columns} rows={rows} pageSize={size} emptyText="Nenhuma taxa encontrada. Ajuste os filtros ou cadastre uma combinação de pagamento e parcelas." remote={{page,total:query.data?.totalItens||0,loading:query.loading,sort,onPage:setPage,onSort:next=>{setSort(next);setPage(0)}}}/>}
  <p className={s.footnote}><Eye size={14} aria-hidden="true"/>“Segue a política geral” acompanha a configuração do caixa. Uma regra própria da taxa prevalece. Para deixar de usá-la, edite e inative o cadastro.</p>
  {modal&&canConfigure&&<CashFeeModal rate={modal.rate} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);setSaved(true);query.reload()}}/>}
 </>
}
