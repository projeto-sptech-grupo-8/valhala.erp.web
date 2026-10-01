import { cloneElement, useRef, useState } from 'react'
import { Package, Wine, CheckCircle, Plus, X, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useToast } from '../../components/useToast.js'
import { fmtBRL, fmtNum } from '../../lib/format.js'
import { cats, stores, fornecedoresData } from './mock.js'
import { useStore } from './useStore.js'
import { getCustoDrink, rendColor } from './estoque.js'
import { Modal } from './components/Modal.jsx'
import s from './dash.module.css'

/* ─── Seletor de tipo de produto ─── */
function TypeSelector({ onSelect }) {
  return (
    <div className={s.typeSelector}>
      <p className={s.typeSelectorLabel}>Qual é o tipo deste produto?</p>
      <div className={s.typeCards}>
        <button className={s.typeCard} onClick={() => onSelect('padrao')}>
          <Package size={32} style={{ color: 'var(--gold)' }} aria-hidden="true" />
          <b>Produto padrão</b>
          <span>Garrafa, caixa, fardo ou combo físico com estoque próprio</span>
        </button>
        <button className={s.typeCard} onClick={() => onSelect('drink')}>
          <Wine size={32} style={{ color: 'var(--gold)' }} aria-hidden="true" />
          <b>Drink / Copo artesanal</b>
          <span>Feito com doses de outros produtos — estoque deduzido automaticamente dos insumos</span>
        </button>
      </div>
    </div>
  )
}

/* ─── Campo com rótulo, dica e erro acessíveis ─── */
function Field({ name, label, error, hint, required, children }) {
  const errId = `${name}-err`
  const hintId = `${name}-hint`
  const child = cloneElement(children, {
    id: name,
    name,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [error && errId, hint && hintId].filter(Boolean).join(' ') || undefined,
  })
  return (
    <label className={error ? s.fieldError : undefined} htmlFor={name}>
      <span>{label}{required && <i className={s.req} aria-hidden="true"> *</i>}</span>
      {child}
      {hint && <small id={hintId} className={s.hint}>{hint}</small>}
      {error && <small id={errId} className={s.errMsg}>{error}</small>}
    </label>
  )
}

function emptyForm(tipo, p) {
  return {
    name: p?.name || '',
    id: p?.id || '',
    cat: p?.cat || (tipo === 'drink' ? 'Drinks' : ''),
    unit: p?.unit || (tipo === 'drink' ? 'copo' : 'un'),
    local: p?.local || '',
    fornecedor: p?.fornecedor || '',
    lote: p?.lote || '',
    validade: p?.validade || '',
    cost: p?.cost ?? '',
    price: p?.price ?? '',
    min: p?.min ?? '',
    qty: p?.qty ?? '',
    vendaDose: p?.doseMl ? 'Sim' : 'Não',
    doseMl: p?.doseMl ?? '',
    fardo: p?.unidadesFardo ? 'Sim' : 'Não',
    unidadesFardo: p?.unidadesFardo ?? '',
    volumeEmbalagem: p?.volumeEmbalagem ?? '',
  }
}

const num = (v) => (v === '' || v == null ? NaN : Number(v))

function validate(tipo, f, receita, { products, drinks, originalId }) {
  const e = {}
  if (!f.name.trim()) e.name = 'Informe o nome do produto.'
  if (!f.id.trim()) e.id = 'Informe o código/SKU.'
  else if (!/^[A-Z0-9-]{3,20}$/i.test(f.id.trim())) e.id = 'Use de 3 a 20 letras, números ou hífen.'
  else if ([...products, ...drinks].some(p => p.id.toUpperCase() === f.id.trim().toUpperCase() && p.id !== originalId)) e.id = 'Já existe um produto com este código.'
  if (!f.cat) e.cat = 'Selecione a categoria.'
  if (!(num(f.price) > 0)) e.price = 'Informe um preço de venda maior que zero.'

  if (tipo === 'padrao') {
    if (!(num(f.cost) >= 0)) e.cost = 'Informe o custo (pode ser 0).'
    if (!(num(f.min) >= 0)) e.min = 'Informe o estoque mínimo — ele dispara os alertas de reposição.'
    if (!originalId && !(num(f.qty) >= 0)) e.qty = 'Informe a quantidade inicial (pode ser 0).'
    if (f.vendaDose === 'Sim') {
      if (!(num(f.doseMl) > 0)) e.doseMl = 'Informe o volume da dose.'
      if (!(num(f.volumeEmbalagem) > 0)) e.volumeEmbalagem = 'Necessário para calcular doses por garrafa.'
      else if (num(f.doseMl) > num(f.volumeEmbalagem)) e.doseMl = 'A dose não pode ser maior que a embalagem.'
    }
    if (f.fardo === 'Sim' && !(num(f.unidadesFardo) > 1)) e.unidadesFardo = 'Um fardo precisa ter 2 ou mais unidades.'
  } else {
    const tracked = receita.filter(r => !r.livre)
    if (!tracked.length) e.receita = 'Adicione ao menos um insumo rastreado.'
    else if (tracked.some(r => !r.produtoId)) e.receita = 'Selecione o insumo de todas as linhas.'
    else if (tracked.some(r => !(r.quantidade > 0))) e.receita = 'Todas as doses precisam ser maiores que zero.'
    else if (new Set(tracked.map(r => r.produtoId)).size !== tracked.length) e.receita = 'Há insumos repetidos na receita.'
  }
  return e
}

/* ─── Novo / Editar produto (padrão Object Page) ─── */
export function ProductForm({ navigate, editId }) {
  const { products, drinks, saveProduct } = useStore()
  const toast = useToast()
  const editData = editId ? [...products, ...drinks].find(p => p.id === editId) : null
  const isEdit = !!editData

  const [tipo, setTipo]         = useState(editData?.tipo || null)
  const [form, setForm]         = useState(() => emptyForm(editData?.tipo, editData))
  const [receita, setReceita]   = useState(() => editData?.receita?.map(r => ({ ...r })) || [])
  const [errors, setErrors]     = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [dirty, setDirty]       = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const formRef = useRef(null)

  if (editId && !editData) {
    return (
      <article className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p>Produto <b>{editId}</b> não encontrado.</p>
        <button onClick={() => navigate('produtos')}><ArrowLeft size={13} aria-hidden="true" /> Voltar para produtos</button>
      </article>
    )
  }

  if (!tipo) {
    return (
      <>
        <div className={s.formTopBar}>
          <button onClick={() => navigate('produtos')}><ArrowLeft size={13} aria-hidden="true" /> Cancelar</button>
        </div>
        <TypeSelector onSelect={(t) => { setTipo(t); setForm(emptyForm(t)) }} />
      </>
    )
  }

  const ctx = { products, drinks, originalId: editData?.id }

  function upd(k, v) {
    const next = { ...form, [k]: v }
    setForm(next)
    setDirty(true)
    if (submitted) setErrors(validate(tipo, next, receita, ctx))
  }
  function updReceita(fn) {
    const next = fn(receita)
    setReceita(next)
    setDirty(true)
    if (submitted) setErrors(validate(tipo, form, next, ctx))
  }

  const bind = (k) => ({ value: form[k], onChange: e => upd(k, e.target.value) })

  function save(e) {
    e?.preventDefault()
    setSubmitted(true)
    const errs = validate(tipo, form, receita, ctx)
    setErrors(errs)
    if (Object.keys(errs).length) {
      const first = formRef.current?.querySelector('[aria-invalid="true"], [data-error]')
      first?.focus()
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    const base = {
      ...(editData || {}),
      id: form.id.trim().toUpperCase(),
      name: form.name.trim(),
      cat: form.cat,
      unit: form.unit,
      local: form.local,
      price: Number(form.price),
      tipo,
    }
    const product = tipo === 'drink'
      ? { ...base, receita }
      : {
          ...base,
          cost: Number(form.cost),
          min: Number(form.min),
          qty: isEdit ? editData.qty : Number(form.qty),
          fornecedor: form.fornecedor,
          lote: form.lote,
          validade: form.validade,
          volumeEmbalagem: num(form.volumeEmbalagem) > 0 ? Number(form.volumeEmbalagem) : null,
          doseMl: form.vendaDose === 'Sim' ? Number(form.doseMl) : null,
          unidadesFardo: form.fardo === 'Sim' ? Number(form.unidadesFardo) : null,
          saidas30d: editData?.saidas30d ?? 0,
        }
    saveProduct(product, editData?.id)
    toast(`${product.name} ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso.`, { title: isEdit ? 'Alterações salvas' : 'Produto criado' })
    navigate('produtos')
  }

  function cancel() {
    if (dirty) setConfirmLeave(true)
    else navigate('produtos')
  }

  const sections = tipo === 'drink'
    ? [['ident', 'Identificação'], ['preco', 'Preço de venda'], ['receita', 'Receita']]
    : [['ident', 'Identificação'], ['preco', 'Preço e estoque'], ['frac', 'Fracionamento']]

  const errCount = Object.keys(errors).length

  /* prévia da receita */
  const custoPorCopo = getCustoDrink(receita, products)
  const rendimentoPreview = (() => {
    const limits = receita.filter(r => !r.livre && r.produtoId && r.quantidade > 0).map(r => {
      const ins = products.find(p => p.id === r.produtoId)
      return ins?.volumeEmbalagem ? Math.floor((ins.qty * ins.volumeEmbalagem) / r.quantidade) : null
    }).filter(l => l !== null)
    return limits.length ? Math.min(...limits) : null
  })()
  const margemPreview = Number(form.price) > 0 && custoPorCopo > 0
    ? Math.round((Number(form.price) - custoPorCopo) / Number(form.price) * 100) : null
  const margemPadrao = tipo === 'padrao' && Number(form.price) > 0 && form.cost !== ''
    ? Math.round((Number(form.price) - Number(form.cost)) / Number(form.price) * 100) : null

  return (
    <form ref={formRef} onSubmit={save} noValidate>
      <div className={s.objBar}>
        <nav aria-label="Seções do formulário" className={s.objAnchors}>
          {sections.map(([id, label]) => (
            <a key={id} href={`#sec-${id}`} onClick={e => { e.preventDefault(); document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
              {label}
            </a>
          ))}
        </nav>
        <div className={s.tabsActions}>
          <button type="button" onClick={cancel}>Cancelar</button>
          <button type="submit" className="gold">
            {isEdit ? 'Salvar alterações' : 'Salvar produto'} <CheckCircle size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      {errCount > 0 && (
        <div className={s.errSummary} role="alert">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>Corrija {errCount === 1 ? '1 campo destacado' : `${errCount} campos destacados`} para salvar.</span>
        </div>
      )}

      <section id="sec-ident" className={'card form ' + s.objSection}>
        <h3>Identificação</h3>
        <div className="two">
          <Field name="name" label="Nome do produto" required error={errors.name}>
            <input placeholder={tipo === 'drink' ? 'Ex.: Copo Jack Rocks' : 'Ex.: Heineken 600ml'} {...bind('name')} />
          </Field>
          <Field name="id" label="Código / SKU" required error={errors.id} hint={isEdit ? 'Alterar o código não afeta o histórico de movimentações.' : undefined}>
            <input placeholder={tipo === 'drink' ? 'DRK-001' : 'BEB-001'} {...bind('id')} autoCapitalize="characters" />
          </Field>
          <Field name="cat" label="Categoria" required error={errors.cat}>
            <select {...bind('cat')}>
              <option value="">Selecione</option>
              {tipo === 'drink'
                ? <option value="Drinks">Drinks</option>
                : [...new Set([...cats.map(c => c[0]), ...products.map(p => p.cat)])].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field name="unit" label="Unidade de venda" required>
            <select {...bind('unit')}>
              {tipo === 'drink'
                ? <><option value="copo">Copo</option><option value="taça">Taça</option><option value="dose">Dose</option><option value="porção">Porção</option></>
                : <><option value="un">Unidade (un)</option><option value="garrafa">Garrafa</option><option value="cx">Caixa</option><option value="fardo">Fardo</option><option value="kit">Kit</option><option value="L">Litro (L)</option></>}
            </select>
          </Field>
          <Field name="local" label="Localização">
            <select {...bind('local')}>
              <option value="">Selecione</option>
              {stores.map(st => <option key={st[0]}>{st[0]}</option>)}
            </select>
          </Field>
          {tipo === 'padrao' && (
            <>
              <Field name="fornecedor" label="Fornecedor">
                <select {...bind('fornecedor')}>
                  <option value="">Selecione</option>
                  {fornecedoresData.map(f => <option key={f.nome}>{f.nome}</option>)}
                </select>
              </Field>
              <Field name="lote" label="Número do lote"><input placeholder="Ex.: LOTE-2026-09" {...bind('lote')} /></Field>
              <Field name="validade" label="Data de validade"><input type="date" {...bind('validade')} /></Field>
            </>
          )}
        </div>
      </section>

      <section id="sec-preco" className={'card form ' + s.objSection}>
        <h3>{tipo === 'drink' ? 'Preço de venda' : 'Preço e estoque'}</h3>
        <div className="two">
          {tipo === 'padrao' && (
            <Field name="cost" label="Preço de custo (R$)" required error={errors.cost}>
              <input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" {...bind('cost')} />
            </Field>
          )}
          <Field
            name="price" label="Preço de venda (R$)" required error={errors.price}
            hint={margemPadrao !== null ? `Margem bruta: ${margemPadrao}%${margemPadrao < 0 ? ' — preço abaixo do custo!' : ''}` : undefined}
          >
            <input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0,00" {...bind('price')} />
          </Field>
          {tipo === 'padrao' && (
            <>
              <Field name="min" label="Estoque mínimo" required error={errors.min} hint="Abaixo deste valor o produto entra em alerta de reposição.">
                <input type="number" inputMode="numeric" min="0" placeholder="0" {...bind('min')} />
              </Field>
              {isEdit ? (
                <Field name="qty" label="Quantidade em estoque" hint="Para alterar o saldo, registre uma movimentação (mantém o histórico auditável).">
                  <input value={`${fmtNum(editData.qty)} ${editData.unit}`} readOnly />
                </Field>
              ) : (
                <Field name="qty" label="Quantidade inicial" required error={errors.qty}>
                  <input type="number" inputMode="numeric" min="0" placeholder="0" {...bind('qty')} />
                </Field>
              )}
            </>
          )}
        </div>
      </section>

      {tipo === 'padrao' && (
        <section id="sec-frac" className={'card form ' + s.objSection}>
          <h3>Fracionamento</h3>
          <p className={s.sectionDesc}>Configure como este produto pode ser vendido fracionado (doses) ou em fardos.</p>
          <div className="two">
            <Field name="volumeEmbalagem" label="Volume da embalagem (ml)" error={errors.volumeEmbalagem} hint="Preenchido, este produto pode ser usado como insumo em drinks.">
              <input type="number" inputMode="numeric" min="0" placeholder="Ex.: 750" {...bind('volumeEmbalagem')} />
            </Field>
            <Field name="vendaDose" label="Venda por dose?">
              <select {...bind('vendaDose')}><option>Não</option><option>Sim</option></select>
            </Field>
            {form.vendaDose === 'Sim' && (
              <Field
                name="doseMl" label="Volume por dose (ml)" required error={errors.doseMl}
                hint={num(form.doseMl) > 0 && num(form.volumeEmbalagem) > 0 ? `≈ ${Math.floor(form.volumeEmbalagem / form.doseMl)} doses por embalagem` : undefined}
              >
                <input type="number" inputMode="numeric" min="1" placeholder="Ex.: 50" {...bind('doseMl')} />
              </Field>
            )}
            <Field name="fardo" label="Vendido também em fardo?">
              <select {...bind('fardo')}><option>Não</option><option>Sim</option></select>
            </Field>
            {form.fardo === 'Sim' && (
              <Field name="unidadesFardo" label="Unidades por fardo" required error={errors.unidadesFardo}>
                <input type="number" inputMode="numeric" min="2" placeholder="Ex.: 12" {...bind('unidadesFardo')} />
              </Field>
            )}
          </div>
        </section>
      )}

      {tipo === 'drink' && (
        <section id="sec-receita" className={'card form ' + s.objSection}>
          <h3>Receita</h3>
          <div className={s.receitaLayout}>
            <div>
              <div className={s.receitaHeader} aria-hidden="true">
                <span>Insumo</span><span>Dose</span><span>Custo / rendimento</span><span>Livre</span><span />
              </div>

              {receita.map((r, idx) => {
                const ins = products.find(p => p.id === r.produtoId)
                const mlDisp = ins?.volumeEmbalagem ? ins.qty * ins.volumeEmbalagem : 0
                const rendIngr = r.quantidade > 0 && ins?.volumeEmbalagem ? Math.floor(mlDisp / r.quantidade) : null
                const custoDose = ins?.volumeEmbalagem ? (ins.cost / ins.volumeEmbalagem) * r.quantidade : null
                const set = (k, v) => updReceita(list => list.map((x, i) => i === idx ? { ...x, [k]: v } : x))

                return (
                  <div key={idx} className={s.receitaRow}>
                    <select value={r.produtoId} onChange={e => set('produtoId', e.target.value)} disabled={r.livre} aria-label={`Insumo da linha ${idx + 1}`}>
                      <option value="">Selecione o insumo...</option>
                      {products.filter(p => p.volumeEmbalagem).map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({fmtNum(p.qty)} un · {fmtNum(p.qty * p.volumeEmbalagem)}ml)</option>
                      ))}
                    </select>
                    <div className={s.receitaQtd}>
                      <input type="number" min="1" value={r.livre ? '' : r.quantidade} disabled={r.livre} onChange={e => set('quantidade', Number(e.target.value))} aria-label={`Dose em ml da linha ${idx + 1}`} />
                      <span>ml</span>
                    </div>
                    <div className={s.receitaCusto}>
                      <b>{custoDose != null && !r.livre ? fmtBRL(custoDose) : '—'}</b>
                      {rendIngr !== null && !r.livre && <small style={{ color: rendColor(rendIngr) }}>→ {rendIngr} copos</small>}
                    </div>
                    <label className={s.receitaLivre}>
                      <input type="checkbox" checked={r.livre} onChange={e => set('livre', e.target.checked)} />
                      Livre
                    </label>
                    <button className={s.iconBtn} type="button" onClick={() => updReceita(list => list.filter((_, i) => i !== idx))} aria-label={`Remover linha ${idx + 1}`} title="Remover">
                      <X size={13} />
                    </button>
                  </div>
                )
              })}

              {errors.receita && <p className={s.errMsg} data-error tabIndex={-1}>{errors.receita}</p>}

              <button type="button" className={s.addIngrediente} onClick={() => updReceita(list => [...list, { produtoId: '', quantidade: 50, livre: false }])}>
                Adicionar ingrediente <Plus size={13} aria-hidden="true" />
              </button>
            </div>

            <div className={s.receitaPreview} aria-live="polite">
              <p className={s.receitaPreviewTitle}>Resumo da receita</p>
              <div className={s.receitaPreviewStat}><span>Custo por copo</span><b>{custoPorCopo > 0 ? fmtBRL(custoPorCopo) : '—'}</b></div>
              {Number(form.price) > 0 && (
                <div className={s.receitaPreviewStat}><span>Preço de venda</span><b style={{ color: 'var(--gold2)' }}>{fmtBRL(Number(form.price))}</b></div>
              )}
              {margemPreview !== null && (
                <div className={s.receitaPreviewStat}>
                  <span>Margem bruta</span>
                  <b style={{ color: margemPreview >= 50 ? 'var(--green)' : margemPreview >= 30 ? 'var(--gold2)' : 'var(--red)' }}>{margemPreview}%</b>
                </div>
              )}
              <div className={s.receitaPreviewDivider} />
              <div className={s.receitaPreviewStat}>
                <span>Rendimento atual</span>
                <b style={{ color: rendColor(rendimentoPreview) }}>{rendimentoPreview !== null ? `~${rendimentoPreview} copos` : '—'}</b>
              </div>
              {rendimentoPreview !== null && (
                <>
                  <div className={s.receitaBar}>
                    <div style={{ width: Math.min(100, rendimentoPreview * 2) + '%', background: rendColor(rendimentoPreview) }} />
                  </div>
                  <small className={s.hint}>com o estoque de hoje</small>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <div className={s.objFooter}>
        <button type="button" onClick={cancel}>Cancelar</button>
        <button type="submit" className="gold">{isEdit ? 'Salvar alterações' : 'Salvar produto'} <CheckCircle size={13} aria-hidden="true" /></button>
      </div>

      {confirmLeave && (
        <Modal
          title="Descartar alterações?"
          subtitle="As informações preenchidas neste formulário serão perdidas."
          onClose={() => setConfirmLeave(false)}
          width={420}
          footer={<>
            <button type="button" onClick={() => setConfirmLeave(false)} data-autofocus>Continuar editando</button>
            <button type="button" className={s.dangerBtn} onClick={() => navigate('produtos')}>Descartar</button>
          </>}
        />
      )}
    </form>
  )
}
