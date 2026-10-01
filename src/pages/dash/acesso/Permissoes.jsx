import { useState } from 'react'
import { Check, Minus, Plus, Ban, Search } from 'lucide-react'
import { agruparPorModulo } from '../../../lib/funcionalidades.js'
import a from './acesso.module.css'

/* ─── Seletor de funcionalidades agrupado por módulo ─── */
export function FuncionalidadesPicker({ funcionalidades, value, onChange, baseline, readOnly, idPrefix = 'fn' }) {
  const [q, setQ] = useState('')
  const sel = new Set(value)
  const base = baseline ? new Set(baseline) : null
  const query = q.trim().toLowerCase()
  const filtered = query
    ? funcionalidades.filter(f => f.nome.toLowerCase().includes(query) || f.codigo.toLowerCase().includes(query))
    : funcionalidades
  const grupos = agruparPorModulo(filtered)

  function toggle(codigo) {
    const next = new Set(sel)
    if (next.has(codigo)) next.delete(codigo)
    else next.add(codigo)
    onChange([...next])
  }
  function toggleGroup(itens, all) {
    const next = new Set(sel)
    itens.forEach(f => (all ? next.delete(f.codigo) : next.add(f.codigo)))
    onChange([...next])
  }

  if (readOnly) {
    const ativos = funcionalidades.filter(f => sel.has(f.codigo))
    if (!ativos.length) return <p className={a.muted}>Nenhuma funcionalidade neste perfil.</p>
    return (
      <div className={a.groupsRead}>
        {agruparPorModulo(ativos).map(g => (
          <div key={g.id} className={a.groupRead}>
            <b>{g.nome} <small>{g.itens.length}</small></b>
            <ul>
              {g.itens.map(f => (
                <li key={f.codigo} title={f.descricao}><Check size={12} aria-hidden="true" /> {f.nome}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={a.picker}>
      <div className={a.pickerTop}>
        <label className={a.searchBox}>
          <Search size={13} aria-hidden="true" />
          <input type="search" placeholder="Filtrar funcionalidades…" value={q} onChange={e => setQ(e.target.value)} aria-label="Filtrar funcionalidades" />
        </label>
        <span className={a.muted} aria-live="polite">{sel.size} de {funcionalidades.length} selecionadas</span>
      </div>
      {grupos.length === 0 && <p className={a.muted}>Nenhuma funcionalidade encontrada.</p>}
      <div className={a.groups}>
        {grupos.map(g => {
          const n = g.itens.filter(f => sel.has(f.codigo)).length
          const all = n === g.itens.length
          return (
            <fieldset key={g.id} className={a.group}>
              <legend>
                <label className={a.groupToggle}>
                  <input type="checkbox" checked={all} ref={el => { if (el) el.indeterminate = n > 0 && !all }}
                    onChange={() => toggleGroup(g.itens, all)} aria-label={`Selecionar todo o módulo ${g.nome}`} />
                  <b>{g.nome}</b>
                  <small>{n}/{g.itens.length}</small>
                </label>
              </legend>
              {g.itens.map(f => {
                const on = sel.has(f.codigo)
                const mark = base ? (on && !base.has(f.codigo) ? 'add' : !on && base.has(f.codigo) ? 'del' : null) : null
                return (
                  <label key={f.codigo} className={`${a.fn} ${mark === 'add' ? a.fnAdd : mark === 'del' ? a.fnDel : ''}`} htmlFor={`${idPrefix}-${f.codigo}`}>
                    <input id={`${idPrefix}-${f.codigo}`} type="checkbox" checked={on} onChange={() => toggle(f.codigo)} />
                    <span>
                      <b>{f.nome}{mark === 'add' && <em>+ adicionada</em>}{mark === 'del' && <em>− removida</em>}</b>
                      <small>{f.descricao || f.codigo}</small>
                    </span>
                    <code>{f.codigo}</code>
                  </label>
                )
              })}
            </fieldset>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Permissões efetivas (com origem) ─── */
const ORIGEM = {
  PERFIL: { label: 'Do perfil', cls: 'origPerfil' },
  GRANT:  { label: 'Concedida individualmente', cls: 'origGrant' },
  REVOKE: { label: 'Revogada individualmente', cls: 'origRevoke' },
}

export function PermissoesEfetivas({ funcionalidades, permissoes }) {
  const byCode = Object.fromEntries(funcionalidades.map(f => [f.codigo, f]))
  const itens = permissoes.map(p => ({ ...(byCode[p.codigo] || { codigo: p.codigo, nome: p.codigo }), ...p }))
  const permitidas = itens.filter(p => p.concedida)
  const count = (o) => itens.filter(p => p.origem === o).length

  if (!itens.length) return <p className={a.muted}>Este usuário não possui nenhuma permissão.</p>

  return (
    <>
      <ul className={a.permSummary} aria-label="Resumo das permissões">
        <li><b>{permitidas.length}</b> permitidas</li>
        <li className={a.origPerfil}><b>{count('PERFIL')}</b> do perfil</li>
        <li className={a.origGrant}><b>{count('GRANT')}</b> concedidas individualmente</li>
        <li className={a.origRevoke}><b>{count('REVOKE')}</b> revogadas</li>
      </ul>
      <div className={a.groupsRead}>
        {agruparPorModulo(itens).map(g => (
          <div key={g.id} className={a.groupRead}>
            <b>{g.nome}</b>
            <ul>
              {g.itens.map(f => {
                const o = ORIGEM[f.origem] || ORIGEM.PERFIL
                const Icon = f.concedida ? Check : Ban
                return (
                  <li key={f.codigo} className={f.concedida ? undefined : a.permOff} title={f.descricao}>
                    <Icon size={12} aria-hidden="true" />
                    <span>{f.nome}</span>
                    <em className={`${a.orig} ${a[o.cls]}`}>{o.label}</em>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </>
  )
}

/* ─── Editor de ajustes individuais (sobrescritas) ───
 * value: { [codigo]: 'GRANT' | 'REVOKE' }
 * Conceder só faz sentido fora do perfil; revogar só dentro dele — evita sobrescrita redundante.
 */
export function OverridesEditor({ funcionalidades, perfilCodigos, value, onChange }) {
  const [soAjustes, setSoAjustes] = useState(false)
  const noPerfil = new Set(perfilCodigos)
  const lista = soAjustes ? funcionalidades.filter(f => value[f.codigo]) : funcionalidades

  function set(codigo, efeito) {
    const next = { ...value }
    if (!efeito) delete next[codigo]
    else next[codigo] = efeito
    onChange(next)
  }

  const nAjustes = Object.keys(value).length

  return (
    <div className={a.overrides}>
      <div className={a.pickerTop}>
        <label className={a.inlineCheck}>
          <input type="checkbox" checked={soAjustes} onChange={e => setSoAjustes(e.target.checked)} />
          Mostrar só funcionalidades com ajuste ({nAjustes})
        </label>
      </div>
      <table className={a.ovTable}>
        <caption className={a.srOnly}>Ajustes individuais de permissão</caption>
        <thead>
          <tr>
            <th scope="col">Funcionalidade</th>
            <th scope="col">No perfil</th>
            <th scope="col">Ajuste individual</th>
            <th scope="col">Resultado</th>
          </tr>
        </thead>
        {agruparPorModulo(lista).map(g => (
          <tbody key={g.id}>
            <tr className={a.ovGroup}><th colSpan={4} scope="rowgroup">{g.nome}</th></tr>
            {g.itens.map(f => {
              const inProfile = noPerfil.has(f.codigo)
              const ef = value[f.codigo] || ''
              const result = ef === 'GRANT' ? true : ef === 'REVOKE' ? false : inProfile
              const name = `ov-${f.codigo}`
              return (
                <tr key={f.codigo} className={ef ? a.ovChanged : undefined}>
                  <th scope="row">
                    <b>{f.nome}</b>
                    <small>{f.codigo}</small>
                  </th>
                  <td>{inProfile ? <span className={a.yes}><Check size={13} aria-hidden="true" /> Sim</span> : <span className={a.no}><Minus size={13} aria-hidden="true" /> Não</span>}</td>
                  <td>
                    <div className={a.seg} role="radiogroup" aria-label={`Ajuste para ${f.nome}`}>
                      <label className={!ef ? a.segOn : undefined}>
                        <input type="radio" name={name} checked={!ef} onChange={() => set(f.codigo, null)} /> Herdar
                      </label>
                      <label className={`${ef === 'GRANT' ? a.segGrant : ''} ${inProfile ? a.segDisabled : ''}`} title={inProfile ? 'Já incluída no perfil' : 'Conceder mesmo sem estar no perfil'}>
                        <input type="radio" name={name} checked={ef === 'GRANT'} disabled={inProfile} onChange={() => set(f.codigo, 'GRANT')} />
                        <Plus size={11} aria-hidden="true" /> Conceder
                      </label>
                      <label className={`${ef === 'REVOKE' ? a.segRevoke : ''} ${!inProfile ? a.segDisabled : ''}`} title={!inProfile ? 'Não faz parte do perfil' : 'Bloquear mesmo estando no perfil'}>
                        <input type="radio" name={name} checked={ef === 'REVOKE'} disabled={!inProfile} onChange={() => set(f.codigo, 'REVOKE')} />
                        <Ban size={11} aria-hidden="true" /> Revogar
                      </label>
                    </div>
                  </td>
                  <td>{result ? <span className={a.yes}><Check size={13} aria-hidden="true" /> Permitido</span> : <span className={a.blocked}><Ban size={13} aria-hidden="true" /> Bloqueado</span>}</td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
      {soAjustes && nAjustes === 0 && <p className={a.muted}>Nenhum ajuste individual — o usuário segue exatamente o perfil.</p>}
    </div>
  )
}
