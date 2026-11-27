import { CategoriaModal } from '@/features/catalog/category-editor/ui/CategoriaModal.jsx'
import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { MoneyInput } from './MoneyInput.jsx'
import { RequiredMark } from '@/shared/ui/forms/RequiredMark.jsx'
import { CategoryAutocomplete, RecordAutocomplete } from './CategoryAutocomplete.jsx'
import { useEffect, useId, useRef, useState } from 'react'
import { CircleHelp, Package, Wine, ArrowRight, Boxes, ListChecks, GlassWater, FlaskConical, Tag, Coins, Plus } from 'lucide-react'
import layout from './ProductFormLayout.module.css'
import choice from './ProductTypeChoice.module.css'
import { useQueryResource } from '@/shared/lib/hooks/usePagedQuery.js'
import { useStore } from '@/entities/store'
import { useToast } from '@/shared/ui/notifications/useToast.js'
import { ErrorBlock, LoadingBlock, ConfirmModal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { loadProduct, recipeSummary, saveCatalogProduct } from '@/features/catalog/remote/catalogModel.js'
import { fmtBRL, fmtNum } from '@/shared/lib/format.js'
import s from '@/features/catalog/remote/remote.module.css'

export function ProductForm({ navigate, editId, setTitle, setBackAction }) {
  const { can } = useStore()
  const query = useQueryResource(signal => editId ? loadProduct(editId, signal) : null, [editId])
  if (!can('GERENCIAR_ESTOQUE')) return <p role="alert">Você não tem permissão para gerenciar o catálogo.</p>
  if (editId && query.loading) return <LoadingBlock label="Carregando produto e receita" />
  if (editId && query.error) return <ErrorBlock error={query.error} onRetry={query.reload} onBack={() => navigate('produtos')} />
  return <Editor key={editId || 'novo'} initial={editId ? query.data?.product : undefined} initialIngredients={editId ? query.data?.ingredients || [] : []} navigate={navigate} setTitle={setTitle} setBackAction={setBackAction} />
}

function Editor({ initial, initialIngredients, navigate, setTitle, setBackAction }) {
  const toast = useToast()
  const { invalidateCatalog } = useStore()
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [saved, setSaved] = useState(initial)
  const savedRef = useRef(initial)
  const [tipo, setTipo] = useState(initial?.tipo || '')
  const [form, setForm] = useState({ name: initial?.name || '', categoriaId: initial?.categoriaId || '',
    validade: '',
    unit: initial?.unit || 'un', price: initial?.price ?? '', cost: initial?.cost ?? '',
    min: initial?.min ?? '', qty: initial?.qty ?? '', fracionado: initial?.fracionado || false,
    volumeEmbalagem: initial?.volumeEmbalagem ?? '', ativo: initial?.ativo ?? true,
    // Bundle configuration is persisted through the product API.
    vendaFardo: initial?.vendaFardo ?? false, unidadesFardo: initial?.unidadesFardo ?? '' })
  const [receita, setReceita] = useState(initial?.receita || [])
  const [ingredients, setIngredients] = useState(initialIngredients)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({})
  const [dirty, setDirty] = useState(false)
  const [discard, setDiscard] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const formRef = useRef(null)
  useEffect(() => {
    if (!dirty) return
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => { if (!initial) setTitle?.(tipo === 'padrao' ? 'Novo produto padrão' : tipo === 'drink' ? 'Novo drink' : 'Novo produto') }, [tipo, initial, setTitle])
  useEffect(() => {
    setBackAction?.(() => { if (busy) return; if (dirty) setDiscard(true); else navigate('produtos') })
    return () => setBackAction?.(null)
  }, [setBackAction, dirty, busy, navigate])
  const summary = recipeSummary(receita, ingredients)
  const salePrice = Number(form.price)
  const marginCost = tipo === 'drink' ? summary.cost : form.cost === '' ? null : Number(form.cost)
  const margin = Number.isFinite(salePrice) && salePrice > 0 && Number.isFinite(marginCost) && marginCost > 0
    ? (salePrice - marginCost) / salePrice * 100 : null
  const update = (key, value) => { setForm(f => ({ ...f, [key]: value })); setDirty(true) }
  const updateRecipe = (index, patch) => { setReceita(rows => rows.map((r, i) => i === index ? { ...r, ...patch } : r)); setDirty(true) }
  function chooseIngredient(index, id, product) {
    if (product) setIngredients(items => [...items.filter(p => p.id !== product.id), product])
    updateRecipe(index, { produtoId: id, produtoNome: product?.name || '', quantidade: product?.fracionado ? 50 : 1, unidadeConsumo: product?.fracionado ? 'ML' : 'UN' })
  }
  function validate() {
    const errors = {}
    if (!form.name.trim() || form.name.trim().length > 150) errors.name = 'Informe um nome com até 150 caracteres.'
    if (!form.categoriaId) errors.cat = 'Selecione a categoria.'
    if (!form.unit.trim() || form.unit.length > 10) errors.unit = 'Informe a unidade com até 10 caracteres.'
    if (!(Number(form.price) > 0) || !Number.isFinite(Number(form.price))) errors.price = 'Informe um preço maior que zero.'
    if (tipo === 'padrao') {
      if (!initial && !form.validade) errors.validade = 'Informe a data de validade do lote inicial.'
      if (form.vendaFardo && (!Number.isInteger(Number(form.unidadesFardo)) || Number(form.unidadesFardo) < 2)) errors.unidadesFardo = 'Informe um número inteiro de pelo menos 2 unidades.'
      for (const key of ['cost', 'min', 'qty']) if (!Number.isFinite(Number(form[key])) || Number(form[key]) < 0) errors[key] = 'Informe um número maior ou igual a zero.'
      if (form.fracionado && !(Number(form.volumeEmbalagem) > 0)) errors.volumeEmbalagem = 'Informe o volume da embalagem.'
    } else {
      if (summary.invalid) errors.receita = 'Selecione ingredientes padrão ativos, com quantidade positiva e unidade compatível.'
      if (new Set(receita.map(r => r.produtoId)).size !== receita.length) errors.receita = 'Não repita o mesmo ingrediente.'
    }
    return errors
  }
  async function submit(event) {
    event.preventDefault()
    if (busyRef.current || uncertain) return
    const errors = validate()
    setFields(errors); setError('')
    if (Object.keys(errors).length) { requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus()); return }
    busyRef.current = true; setBusy(true)
    const product = { ...saved, ...form, tipo, categoriaId: Number(form.categoriaId), price: Number(form.price),
      cost: Number(form.cost), min: Number(form.min), qty: Number(form.qty),
      volumeEmbalagem: form.volumeEmbalagem === '' ? null : Number(form.volumeEmbalagem), receita }
    try {
      await saveCatalogProduct(product, savedRef.current, p => { savedRef.current = p; setSaved(p); invalidateCatalog?.() })
      setDirty(false)
      toast(product.name + ' salvo com sucesso.', { title: initial ? 'Alterações salvas' : 'Produto criado' })
      navigate('produtos')
    } catch (ex) {
      setError(ex.message)
      setFields(ex.fieldErrors || {})
      // A lost POST response is ambiguous; never invite a blind duplicate creation.
      if (ex.status === 0 && !savedRef.current) setUncertain(true)
      requestAnimationFrame(() => formRef.current?.querySelector('[role="alert"]')?.focus())
    } finally { busyRef.current = false; setBusy(false) }
  }
  const examples = { name: 'Ex.: Vodka Absolut 1 L', unit: 'Ex.: un, garrafa ou copo', price: 'Ex.: 25,00', cost: 'Ex.: 12,50', min: 'Ex.: 5', qty: 'Ex.: 24', volumeEmbalagem: 'Ex.: 750', unidadesFardo: 'Ex.: 12' }
  const cleanLabel = label => typeof label === 'string' ? label.replace(/\s*\*$/, '') : label
  const field = (key, label, props = {}) => <label><span className={layout.labelText}>{cleanLabel(label)}{props.required && <RequiredMark />}</span>
    {['price', 'cost'].includes(key) ? <MoneyInput {...props} placeholder={examples[key]} value={form[key]} onValueChange={value => update(key, value)} aria-label={cleanLabel(label)} aria-invalid={!!fields[key]} aria-describedby={[fields[key] ? key + '-error' : '', key === 'price' ? 'price-margin' : ''].filter(Boolean).join(' ') || undefined} /> :
      <input placeholder={examples[key]} value={form[key]} onChange={e => update(key, e.target.value)} aria-invalid={!!fields[key]} aria-describedby={fields[key] ? key + '-error' : undefined} {...props} />}
    {key === 'price' && <small id="price-margin" className={layout.margin} data-tone={margin === null ? 'neutral' : margin < 0 ? 'negative' : margin === 0 ? 'neutral' : 'positive'} aria-live="polite">
      {margin === null ? (tipo === 'drink' ? 'Preencha o preço e complete a receita para estimar a margem.' : 'Informe o preço de venda e um custo maior que zero para calcular a margem.') : <>
        Margem bruta{tipo === 'drink' ? ' estimada' : ''}: {margin.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%{margin < 0 ? ' — preço abaixo do custo!' : margin === 0 ? ' — preço igual ao custo.' : ''}
      </>}
    </small>}
    {fields[key] && <small id={key + '-error'} role="alert">{fields[key]}</small>}
  </label>
  const cancel = () => dirty ? setDiscard(true) : navigate('produtos')
  if (!tipo) return <section className={choice.section} aria-labelledby="product-type-title">
    <div className={choice.intro}><span className={choice.step}>Primeiro passo</span><h2 id="product-type-title">O que você quer cadastrar?</h2><p>Escolha como o item será controlado no estoque.</p></div>
    <div className={choice.options}>
      <button type="button" className={choice.card} onClick={() => setTipo('padrao')}>
        <span className={choice.icon}><Package size={28} strokeWidth={1.6} aria-hidden="true" /></span>
        <span className={choice.title}>Produto padrão</span>
        <span className={choice.description}>Cadastre um item com estoque próprio, vendido por unidade ou de forma fracionada.</span>
        <span className={choice.examples}>Ex.: garrafa de vodka, refrigerante ou morango.</span>
        <span className={choice.feature}><Boxes size={16} aria-hidden="true" />Controle de saldo e movimentações</span>
        <span className={choice.action}>Cadastrar produto<ArrowRight size={17} aria-hidden="true" /></span>
      </button>
      <button type="button" className={choice.card} onClick={() => { setTipo('drink'); update('unit', 'copo') }}>
        <span className={choice.icon}><Wine size={28} strokeWidth={1.6} aria-hidden="true" /></span>
        <span className={choice.title}>Drink / Copo artesanal</span>
        <span className={choice.description}>Monte uma receita com ingredientes em mililitros ou unidades para preparar cada drink.</span>
        <span className={choice.examples}>Ex.: caipirinha, gin tônica ou drink de morango.</span>
        <span className={choice.feature}><ListChecks size={16} aria-hidden="true" />Baixa de estoque pelos ingredientes</span>
        <span className={choice.action}>Montar receita<ArrowRight size={17} aria-hidden="true" /></span>
      </button>
    </div>
  </section>
  return <><form className={s.editor + ' ' + layout.editor} ref={formRef} onSubmit={submit} noValidate aria-busy={busy}>
    {error && <Notice title="Não foi possível salvar" focus>{error}</Notice>}
    {uncertain && <p className={s.notice}>A conexão caiu e não foi possível confirmar o cadastro. Consulte o catálogo antes de criar novamente. <button type="button" onClick={() => navigate('produtos')}>Consultar catálogo</button></p>}
    <p className={layout.margin}><RequiredMark /> Campos obrigatórios.</p>
    <fieldset disabled={busy || uncertain} style={{ border: 0, padding: 0 }}>
      <section className="card form"><SectionTitle title="Identificação" text={!initial ? (tipo === 'drink' ? 'Defina o nome e a categoria do drink. A unidade de venda é copo, e o código SKU é gerado automaticamente ao salvar.' : 'Defina o nome e a categoria do produto. A unidade padrão é un, e o código SKU é gerado automaticamente ao salvar.') : 'Defina o nome, a categoria e a unidade de venda do produto. O código SKU é gerado automaticamente ao salvar.'} /><div className={s.grid}>
        {field('name', 'Nome do produto *', { maxLength: 150, required: true })}
        {initial && <label>Código / SKU<input readOnly value={saved?.sku || 'Gerado automaticamente ao salvar'} /></label>}
        <div><CategoryAutocomplete value={form.categoriaId} onChange={id => update('categoriaId', id)} />
          <button type="button" className={layout.newCategory} onClick={() => setCategoryOpen(true)}><Plus size={14} aria-hidden="true" />Nova categoria</button>
          {fields.cat && <p role="alert" tabIndex={-1} aria-invalid="true">{fields.cat}</p>}</div>
        {initial && field('unit', 'Unidade de venda', { maxLength: 10, required: true, autoComplete: 'off' })}
        {initial && <label>Situação cadastral<select aria-label="Situação cadastral" value={String(form.ativo)} onChange={e => update('ativo', e.target.value === 'true')}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>}
      </div></section>
      <section className="card form"><SectionTitle title={tipo === 'drink' ? 'Preço de venda' : 'Preço e estoque'} text={tipo === 'drink' ? 'Informe quanto será cobrado por copo.' : 'Informe o preço de venda e o custo de uma unidade ou embalagem. O estoque mínimo indica quando repor.'} /><div className={s.grid}>
        {field('price', 'Preço de venda (R$) *', { required: true })}
        {tipo === 'padrao' && <>
          {field('cost', 'Preço de custo por unidade/embalagem (R$)', {})}
          {field('min', 'Estoque mínimo (unidades/embalagens)', { type: 'number', min: 0, step: 'any' })}
          {saved ? <label>Quantidade em estoque<input readOnly value={fmtNum(saved.qty) + ' ' + saved.unit} /><small>Altere o saldo pela aba Movimentações.</small></label> : field('qty', 'Quantidade inicial (unidades/embalagens)', { type: 'number', min: 0, step: 'any' })}
          {!initial && <label><span>Data de validade<RequiredMark /></span><input type="date" required aria-label="Data de validade" aria-invalid={!!fields.validade} aria-describedby={fields.validade ? 'validade-error' : 'validade-hint'} value={form.validade} disabled={!!saved} onChange={e => update('validade', e.target.value)} /><small id="validade-hint">Validade obrigatória do lote inicial. Produto, saldo e validade são salvos juntos. O saldo inicial pode ser zero; novas entradas podem ter outras validades.</small>{fields.validade && <small id="validade-error" role="alert">{fields.validade}</small>}</label>}
        </>}
      </div></section>
      {tipo === 'padrao' && <section className="card form"><SectionTitle title="Fracionamento" text={(saved ? 'Fracionamento e volume não podem mudar após o cadastro. ' : 'Selecione Sim quando o produto for consumido em doses: o estoque será controlado em ml e o volume da embalagem será obrigatório. Produtos unitários, como morango, podem compor drinks sem volume. ') + 'A configuração de fardo é salva no produto. Validade é informada ao registrar entradas por lote.'} /><div className={s.grid}>
        <div className={layout.fractionGroup}>
        <label><span className={layout.fieldLabel}><GlassWater size={16} aria-hidden="true" />Venda por dose</span><select aria-label="Venda por dose" disabled={!!saved} value={String(form.fracionado)} onChange={e => update('fracionado', e.target.value === 'true')}><option value="false">Não</option><option value="true">Sim</option></select></label>
        {form.fracionado && field('volumeEmbalagem', <span className={layout.fieldLabel}><FlaskConical size={16} aria-hidden="true" />Volume da embalagem (ml)</span>, { type: 'number', min: 0, step: 'any', disabled: !!saved, required: true })}
        </div>
        <div className={layout.fractionGroup}>
        <label><span className={layout.fieldLabel}><Boxes size={16} aria-hidden="true" />Venda por fardo</span><select aria-label="Venda por fardo" value={String(form.vendaFardo)} onChange={e => { const enabled = e.target.value === 'true'; setForm(current => ({ ...current, vendaFardo: enabled, unidadesFardo: enabled ? current.unidadesFardo : '' })); setDirty(true) }}><option value="false">Não</option><option value="true">Sim</option></select></label>
        {form.vendaFardo && field('unidadesFardo', <span className={layout.fieldLabel}><Package size={16} aria-hidden="true" />Unidades por fardo</span>, { type: 'number', min: 2, step: 1, required: true })}
        </div>
      </div>
      <p className={layout.margin}>Fardos agrupam unidades do mesmo produto. O saldo inicial acima continua informado em unidades/embalagens.</p>
      </section>}
      {tipo === 'drink' && <section className="card form"><SectionTitle title="Receita" text="Informe a quantidade de cada ingrediente para preparar uma unidade do drink. Use ml para produtos fracionados e unidades para os demais. O estoque dos ingredientes é descontado ao registrar a saída." />
        <p className={layout.recipeIntro}>Adicione os ingredientes e informe quanto usar em cada {form.unit || 'drink'}.</p>
        {!receita.length && <div className={layout.recipeEmpty}>Sua receita ainda está vazia. Comece adicionando o primeiro ingrediente.</div>}
        {receita.map((r, index) => <div className={s.ingredient + ' ' + layout.recipeRow} key={index}>
          <RecordAutocomplete required kind="produtos" placeholder="Busque um ingrediente. Ex.: vodka ou morango" label={'Ingrediente ' + (index + 1)} value={r.produtoId} onChange={(id, p) => chooseIngredient(index, id, p)} />
          <label><span>Quantidade por {form.unit || 'drink'} ({r.unidadeConsumo === 'UN' ? 'un' : 'ml'})<RequiredMark /></span>
            <input type="number" min="0.001" step="any" required placeholder={r.unidadeConsumo === 'UN' ? 'Ex.: 3' : 'Ex.: 50'} value={r.quantidade} aria-label={'Dose em ' + (r.unidadeConsumo === 'UN' ? 'unidades' : 'ml') + ' da linha ' + (index + 1)} onChange={e => updateRecipe(index, { quantidade: e.target.value === '' ? '' : Number(e.target.value) })} />
          </label>
          <button type="button" aria-label={'Remover linha ' + (index + 1)} onClick={() => { setReceita(rows => rows.filter((_, i) => i !== index)); setDirty(true) }}>Remover</button>
        </div>)}
        {fields.receita && <p role="alert" tabIndex={-1} aria-invalid="true">{fields.receita}</p>}
        <button type="button" onClick={() => { setReceita(rows => [...rows, { produtoId: '', quantidade: 50, unidadeConsumo: 'ML' }]); setDirty(true) }}>Adicionar ingrediente</button>
        <div className={layout.recipeSummary} aria-live="polite">
          <h4>Resumo da receita</h4>
          <dl><div><dt>Custo estimado por {form.unit || 'drink'}</dt><dd>{summary.cost === null ? '—' : fmtBRL(summary.cost)}</dd></div><div><dt>Quantidade possível com o estoque atual</dt><dd>{summary.yield === null ? '—' : summary.yield + ' ' + (form.unit || 'drink') + '(s)'}</dd></div></dl>
          <p>{summary.invalid ? 'Complete os ingredientes e as quantidades para ver a estimativa.' : 'Estimativa com o saldo consultado. O estoque é confirmado ao registrar a saída.'}</p>
        </div>
      </section>}
    </fieldset>
    <div className={layout.footer}>
      <button type="button" onClick={cancel} disabled={busy}>Cancelar</button>
      <button type="submit" className="gold" disabled={busy || uncertain}>{busy ? 'Salvando…' : initial ? 'Salvar alterações' : 'Salvar produto'}</button>
    </div>

    {discard && <ConfirmModal title="Descartar alterações?" confirmLabel="Descartar" onConfirm={() => navigate('produtos')} onClose={() => setDiscard(false)}><p>Os dados ainda não enviados serão perdidos. Etapas já salvas no servidor permanecem gravadas.</p></ConfirmModal>}
  </form>
    {categoryOpen && <CategoriaModal onClose={() => setCategoryOpen(false)} onSaved={category => { update('categoriaId', String(category.id)); invalidateCatalog?.(); setCategoryOpen(false) }} />}
  </>
}

function SectionTitle({ title, text }) {
  const id = useId()
  const Icon = title === 'Identificação' ? Tag : title === 'Fracionamento' ? GlassWater : title === 'Receita' ? ListChecks : Coins
  return <div className={layout.sectionHeading}><Icon size={19} className={layout.sectionIcon} aria-hidden="true" /><h3>{title}</h3><span className={layout.help}><button type="button" aria-label={'Ajuda sobre ' + title} aria-describedby={id}><CircleHelp size={17} aria-hidden="true" /></button><span id={id} role="tooltip" className={layout.helpText}>{text}</span></span></div>
}
