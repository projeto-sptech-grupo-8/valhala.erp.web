import { useState } from 'react'
import { Plus, Minus, AlertTriangle } from 'lucide-react'
import { diffCodigos } from '../../../lib/funcionalidades.js'
import { Modal } from '../components/Modal.jsx'
import a from './acesso.module.css'

/* ─── Mudar perfil: escolha + diferença de permissões ─── */
export function ChangeProfileModal({ user, perfis, funcionalidades, overrides = {}, isSelf, busy, onClose, onConfirm }) {
  const [perfilId, setPerfilId] = useState(user.profileId)
  const atual = perfis.find(p => p.id === user.profileId)
  const novo = perfis.find(p => p.id === perfilId)
  const { ganha, perde } = diffCodigos(atual?.codigos, novo?.codigos)
  const nome = (c) => funcionalidades.find(f => f.codigo === c)?.nome || c
  const changed = perfilId && perfilId !== user.profileId
  // GRANT de algo que o novo perfil já tem, ou REVOKE de algo que ele não tem, deixa de ter efeito
  const novoSet = new Set(novo?.codigos || [])
  const semEfeito = Object.entries(overrides).filter(([c, ef]) => (ef === 'GRANT' ? novoSet.has(c) : !novoSet.has(c)))

  return (
    <Modal
      title="Mudar perfil de acesso"
      subtitle={`${user.name} · perfil atual: ${atual?.nome || 'nenhum'}`}
      onClose={busy ? () => {} : onClose}
      width={640}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="button" className="gold" disabled={!changed || busy} onClick={() => onConfirm(novo)}>
          {busy ? 'Salvando…' : changed ? `Mudar para ${novo.nome}` : 'Selecione outro perfil'}
        </button>
      </>}
    >
      <div className={a.profilePick} role="radiogroup" aria-label="Perfis disponíveis">
        {perfis.map(p => (
          <label key={p.id} className={`${a.profileCard} ${perfilId === p.id ? a.profileCardOn : ''}`}>
            <input type="radio" name="perfil" checked={perfilId === p.id} onChange={() => setPerfilId(p.id)} data-autofocus={perfilId === p.id || undefined} />
            <span>
              <b>{p.nome}{p.id === user.profileId && <em>atual</em>}</b>
              <small>{p.descricao || 'Sem descrição'}</small>
              <small>{p.codigos.length} funcionalidade{p.codigos.length === 1 ? '' : 's'}</small>
            </span>
          </label>
        ))}
      </div>

      {changed && (
        <div className={a.diff} aria-live="polite">
          <div>
            <b className={a.diffAdd}><Plus size={13} aria-hidden="true" /> Passa a ter ({ganha.length})</b>
            {ganha.length ? <ul>{ganha.map(c => <li key={c}>{nome(c)}</li>)}</ul> : <p className={a.muted}>Nada novo.</p>}
          </div>
          <div>
            <b className={a.diffDel}><Minus size={13} aria-hidden="true" /> Deixa de ter ({perde.length})</b>
            {perde.length ? <ul>{perde.map(c => <li key={c}>{nome(c)}</li>)}</ul> : <p className={a.muted}>Não perde nada.</p>}
          </div>
        </div>
      )}
      {changed && <p className={a.note}>Ajustes individuais de permissão deste usuário continuam valendo após a troca.</p>}
      {changed && semEfeito.length > 0 && (
        <p className={a.warnBox} role="note">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>
            Com o perfil {novo.nome}, {semEfeito.length === 1 ? 'este ajuste individual fica' : 'estes ajustes individuais ficam'} sem efeito:{' '}
            <b>{semEfeito.map(([c, ef]) => `${nome(c)} (${ef === 'GRANT' ? 'concedida' : 'revogada'})`).join(', ')}</b>. Revise depois em Ajustes individuais.
          </span>
        </p>
      )}
      {changed && isSelf && perde.length > 0 && (
        <p className={a.warnBox} role="alert"><AlertTriangle size={14} aria-hidden="true" /> Você está alterando o seu próprio perfil e pode perder acesso a esta tela.</p>
      )}
    </Modal>
  )
}
