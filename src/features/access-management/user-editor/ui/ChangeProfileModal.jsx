import { Notice } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { useState } from 'react'
import { Plus, Minus, AlertTriangle } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useResource } from '@/shared/lib/hooks/useResource.js'
import { isManagerProfile } from '@/entities/access'
import { useStore } from '@/entities/store'
import { diffCodigos } from '@/shared/config/funcionalidades.js'
import { Modal } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import a from '@/entities/access/ui/access.module.css'

function effectivePermissions(profile, overrides, funcionalidades) {
  if (isManagerProfile(profile?.nome)) return new Set(funcionalidades.map(f => f.codigo))
  const codes = new Set(profile?.codigos)
  for (const [code, effect] of Object.entries(overrides)) {
    if (effect === 'GRANT') codes.add(code)
    if (effect === 'REVOKE') codes.delete(code)
  }
  return codes
}

/* ─── Mudar perfil: escolha + diferença de permissões ─── */
export function ChangeProfileModal({ user, perfis, funcionalidades, isSelf, busy, error, onClose, onConfirm }) {
  const { can } = useStore()
  const consultarAjustes = can('PERMISSOES_GERENCIAR')
  const permissao = useResource(() => consultarAjustes ? api.permissoes.doUsuario(user.id) : null, [user.id, consultarAjustes])
  const ajustesConhecidos = !!permissao.data && !permissao.error && !permissao.loading
  const overrides = Object.fromEntries((permissao.data || []).filter(p => p.origem !== 'PERFIL').map(p => [p.codigo, p.origem]))
  const [perfilId, setPerfilId] = useState(user.profileId)
  const novo = perfis.find(p => p.id === perfilId)
  const antes = isManagerProfile(user.profileName) ? new Set(funcionalidades.map(f => f.codigo)) : new Set(user.permissoes ?? [])
  const { ganha, perde } = diffCodigos(antes, effectivePermissions(novo, overrides, funcionalidades))
  const nome = (c) => funcionalidades.find(f => f.codigo === c)?.nome || c
  const changed = !!novo && perfilId !== user.profileId
  // GRANT de algo que o novo perfil já tem, ou REVOKE de algo que ele não tem, deixa de ter efeito
  const novoSet = new Set(novo?.codigos || [])
  const semEfeito = Object.entries(overrides).filter(([c, ef]) => (ef === 'GRANT' ? novoSet.has(c) : !novoSet.has(c)))

  return (
    <Modal
      title="Mudar perfil de acesso"
      subtitle={`${user.name} · perfil atual: ${user.profileName || 'nenhum'}`}
      busy={busy} onClose={onClose}
      width={640}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="button" className="gold" disabled={!changed || busy} onClick={() => onConfirm(novo)}>
          {busy ? 'Salvando…' : changed ? `Mudar para ${novo.nome}` : 'Selecione outro perfil'}
        </button>
      </>}
    >
      {error && <Notice title="Não foi possível mudar o perfil" focus>{error}</Notice>}
      {!perfis.length && <Notice tone="warning" title="Nenhum perfil disponível">Atualize a lista de perfis antes de alterar o acesso.</Notice>}
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className={a.profilePick} role="radiogroup" aria-label="Perfis disponíveis">
        {perfis.map(p => (
          <label key={p.id} className={`${a.profileCard} ${perfilId === p.id ? a.profileCardOn : ''}`}>
            <input type="radio" name="perfil" checked={perfilId === p.id} onChange={() => setPerfilId(p.id)} data-autofocus={perfilId === p.id || undefined} />
            <span>
              <b>{p.nome}{p.id === user.profileId && <em>atual</em>}</b>
              <small>{p.descricao || 'Sem descrição'}</small>
              <small>{isManagerProfile(p.nome) ? 'Acesso a todas as funcionalidades' : `${p.codigos.length} funcionalidade${p.codigos.length === 1 ? '' : 's'}`}</small>
            </span>
          </label>
        ))}
      </div>

      </fieldset>
      {changed && ajustesConhecidos && !ganha.length && !perde.length && <p className={a.note} aria-live="polite">O acesso deste usuário fica igual após a troca de perfil.</p>}
      {changed && ajustesConhecidos && (ganha.length > 0 || perde.length > 0) && (
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
      {changed && !ajustesConhecidos && <p className={a.note}>A prévia de permissões efetivas está indisponível.</p>}
      {changed && <p className={a.note}>Ajustes individuais de permissão deste usuário continuam valendo após a troca.</p>}
      {changed && ajustesConhecidos && semEfeito.length > 0 && (
        <p className={a.warnBox} role="note">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>
            Com o perfil {novo.nome}, {semEfeito.length === 1 ? 'este ajuste individual fica' : 'estes ajustes individuais ficam'} sem efeito:{' '}
            <b>{semEfeito.map(([c, ef]) => `${nome(c)} (${ef === 'GRANT' ? 'concedida' : 'revogada'})`).join(', ')}</b>. Revise depois em Ajustes individuais.
          </span>
        </p>
      )}
      {changed && isSelf && (
        <p className={a.warnBox} role="alert"><AlertTriangle size={14} aria-hidden="true" /> Sua sessão será encerrada para aplicar o novo perfil.</p>
      )}
    </Modal>
  )
}
