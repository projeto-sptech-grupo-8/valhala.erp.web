import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { useStore } from '@/entities/store'
import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import { loadProduct, recipeSummary } from './catalogModel.js'
import { Package, Wine, Pencil, ArrowDownToLine, History, Info, CalendarClock } from 'lucide-react'
import s from './ProductDetail.module.css'

export function ProductDetail({ id, onClose, navigate }) {
  const { can } = useStore()
  const query = useQueryResource(signal => loadProduct(id, signal), [id])
  const p = query.data?.product
  const summary = p?.tipo === 'drink' ? recipeSummary(p.receita, query.data.ingredients) : null
  const saldo = p?.quantidadeEstoqueBase ?? p?.qty
  const minimo = p?.estoqueMinimoBase ?? p?.min
  const unit = p?.fracionado ? 'ml' : p?.unit
  const stockLabel = saldo <= 0 ? 'Estoque zerado' : minimo > 0 && saldo < minimo ? 'Abaixo do mínimo' : minimo > 0 ? 'Acima ou no mínimo' : 'Mínimo não definido'
  function go(page, params) { onClose(); navigate(page, params) }
  return <Drawer title={p ? `Detalhes de ${p.name}` : 'Detalhes do produto'} onClose={onClose}>
    {query.loading ? <LoadingBlock /> : query.error ? <ErrorBlock error={query.error} onRetry={query.reload} /> : p && <>
      <header className={s.header}>
        <div className={s.tags}><span className={s.type}>{p.tipo === 'drink' ? <Wine size={15} aria-hidden="true" /> : <Package size={15} aria-hidden="true" />}{p.tipo === 'drink' ? 'Drink' : 'Produto padrão'}</span><span className={s.status} data-active={p.ativo}>{p.ativo ? 'Ativo' : 'Inativo'}</span></div>
        <h2>{p.name}</h2><p>{p.cat || 'Categoria não informada'}</p><small>Código: {p.sku || 'Não informado'}</small>
      </header>
      <section className={s.price} aria-label="Preço de venda"><span>Preço de venda por {p.unit}</span><strong>{fmtBRL(p.price)}</strong></section>
      {p.tipo === 'padrao' ? <>
        <section className={s.section}><div className={s.sectionTitle}><h3>Estoque</h3><span className={s.stockState} data-alert={saldo <= 0 || (minimo > 0 && saldo < minimo)}>{stockLabel}</span></div>
          <dl className={s.stats}><div><dt>Saldo físico</dt><dd>{fmtNum(saldo)} <small>{unit}</small></dd></div><div><dt>Estoque mínimo</dt><dd>{minimo > 0 ? <>{fmtNum(minimo)} <small>{unit}</small></> : 'Não definido'}</dd></div></dl>
          <p className={s.hint}>Saldo físico não desconta reservas nem lotes vencidos. A quantidade liberada para saída é validada pelo servidor.</p>
          {p.fracionado && <p className={s.hint}>Equivale a aproximadamente {fmtNum(p.qty)} {p.unit}(s). O saldo é controlado em mililitros.</p>}
        </section>
        <section className={s.section}><h3>Preço e unidade</h3><dl className={s.metadata}><div><dt>Custo por {p.unit}</dt><dd>{fmtBRL(p.cost)}</dd></div><div><dt>Unidade de venda</dt><dd>{p.unit}</dd></div><div><dt>Venda por fardo</dt><dd>{p.vendaFardo ? p.unidadesFardo + ' unidades por fardo' : 'Não'}</dd></div><div><dt>Fracionamento</dt><dd>{p.fracionado ? 'Sim, consumo em ml' : 'Não, consumo por unidade'}</dd></div>{p.volumeEmbalagem > 0 && <div><dt>Volume da embalagem</dt><dd>{fmtNum(p.volumeEmbalagem)} ml</dd></div>}</dl></section>
      </> : <>
        <section className={s.section}><h3>Preparo e disponibilidade</h3><dl className={s.stats}><div><dt>Custo estimado por {p.unit}</dt><dd>{summary.cost === null ? '—' : fmtBRL(summary.cost)}</dd></div><div><dt>Rendimento teórico</dt><dd>{summary.yield === null ? '—' : <>{summary.yield} <small>{p.unit}(s)</small></>}</dd></div></dl><p className={s.hint}>Estimativa pelo saldo físico dos ingredientes, sem descontar reservas ou lotes vencidos. O servidor confirma a disponibilidade ao registrar a saída.</p></section>
        <section className={s.section}><h3>Receita por {p.unit}</h3><p className={s.hint}>Quantidade de cada ingrediente para preparar uma unidade.</p>
          {!p.receita.length && <p className={s.notice}>Adicione os ingredientes para permitir a saída deste drink.</p>}
          <ul className={s.recipe}>{p.receita.map(r => <li key={r.produtoId}><span>{r.produtoNome}</span><strong>{fmtNum(r.quantidade)} <small>{r.unidadeConsumo.toLowerCase()}</small></strong></li>)}</ul>
          {summary.invalid && p.receita.length > 0 && <p className={s.notice}>Estimativa indisponível. Confira as quantidades e se todos os ingredientes estão ativos.</p>}
        </section>
      </>}
      {!p.ativo && <p className={s.notice}><Info size={16} aria-hidden="true" />Este item está inativo. Ative-o no cadastro antes de registrar novas movimentações.</p>}
      <div className={s.actions}>
        {p.tipo === 'padrao' && <button onClick={() => go('validades', { produtoId: p.id, situacao: 'todos' })}><CalendarClock size={15} aria-hidden="true" />Ver lotes e validades</button>}
        {p.tipo === 'padrao' && <button onClick={() => go('movimentacoes', { produtoId: p.id })}><History size={15} aria-hidden="true" />Ver histórico completo</button>}
        {can('GERENCIAR_ESTOQUE') && <button onClick={() => go('editar', { id: p.id })}><Pencil size={15} aria-hidden="true" />Editar {p.tipo === 'drink' ? 'receita' : 'produto'}</button>}
        {p.tipo === 'padrao' && p.ativo && can('MOVIMENTAR_ESTOQUE') && <button className="gold" onClick={() => go('novamovimentacao', { produto: p.id })}><ArrowDownToLine size={15} aria-hidden="true" />Registrar entrada</button>}
      </div>
    </>}
  </Drawer>
}
