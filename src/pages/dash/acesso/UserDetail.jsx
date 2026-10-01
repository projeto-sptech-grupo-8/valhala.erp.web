import { useEffect, useState } from 'react'
import { Pencil, KeyRound, UserCheck, Mail, Phone, SlidersHorizontal, Copy, ShieldAlert, ArrowRight } from 'lucide-react'
import { api } from '../../../lib/api.js'
import { useResource } from '../../../lib/useResource.js'
import { fmtDateTime } from '../../../lib/format.js'
import { useToast } from '../../../components/useToast.js'
import { useStore } from '../useStore.js'
import { Avatar, UserStatus, ProfileChip, ActionMenu, LoadingBlock, ErrorBlock, ConfirmModal, Section } from './ui.jsx'
import { PermissoesEfetivas, OverridesEditor } from './Permissoes.jsx'
import { useUserActions } from './useUserActions.jsx'
import { fmtPhone } from './format.js'
import a from './acesso.module.css'

/* sobrescritas atuais derivadas das origens (a API não tem GET de sobrescritas) */
const overridesFrom = (perms = []) =>
  Object.fromEntries(perms.filter(p => p.origem !== 'PERFIL').map(p => [p.codigo, p.origem]))

/* ─── Detalhe do usuário (Object Page) ─── */
export function UserDetail({ navigate, userId, setTitle }) {
  const { can, user: me, session } = useStore()
  const toast = useToast()
  const user = useResource(() => api.usuarios.obter(userId), [userId])
  const perfis = useResource(() => (can('PERFIS_GERENCIAR') ? api.perfis.listar() : []), [])
  const funcs = useResource(() => (can('PERMISSOES_GERENCIAR') || can('PERFIS_GERENCIAR') ? api.funcionalidades.listar() : []), [])
  const perms = useResource(() => (can('PERMISSOES_GERENCIAR') ? api.permissoes.doUsuario(userId) : null), [userId])

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const [confirmSave, setConfirmSave] = useState(false)
  const [saving, setSaving] = useState(false)

  const isSelf = userId === me?.id
  const u = user.data

  useEffect(() => { if (u) setTitle?.(u.name) }, [u?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const actions = useUserActions({
    navigate, perfis: perfis.data || [], funcionalidades: funcs.data || [], overrides: overridesFrom(perms.data),
    onChanged: (nu) => { user.setData(nu); perms.reload() },
    onDeleted: () => navigate('usuarios'),
  })

  if (user.error) return <ErrorBlock error={user.error} onRetry={user.reload} onBack={() => navigate('usuarios')} backLabel="Voltar para usuários" />
  if (!u) return <LoadingBlock lines={8} label="Carregando usuário" />

  const perfil = (perfis.data || []).find(p => p.id === u.profileId)
  const perfilCodigos = perfil?.codigos
    ?? (perms.data || []).filter(p => p.origem === 'PERFIL' || p.origem === 'REVOKE').map(p => p.codigo)
  const atuais = overridesFrom(perms.data)
  const changes = [...new Set([...Object.keys(atuais), ...Object.keys(draft)])].filter(c => atuais[c] !== draft[c]).length

  function startEdit() {
    setDraft(overridesFrom(perms.data))
    setEditing(true)
  }

  async function saveOverrides() {
    setSaving(true)
    try {
      const sobrescritas = Object.entries(draft).map(([codigoFuncionalidade, efeito]) => ({ codigoFuncionalidade, efeito }))
      await api.permissoes.substituirSobrescritas(userId, sobrescritas)
      setConfirmSave(false)
      setEditing(false)
      if (isSelf) {
        toast('Suas permissões mudaram e a sessão foi encerrada. Entre novamente.', { type: 'warning', title: 'Sessão encerrada', duration: 6000 })
        setTimeout(() => session.logout(), 1200)
        return
      }
      toast(`${sobrescritas.length} ajuste(s) individual(is) aplicado(s). A sessão de ${u.name} foi encerrada.`, { title: 'Permissões atualizadas' })
      perms.reload()
    } catch (e) {
      toast(e.message, { type: 'error', title: 'Não foi possível salvar' })
    } finally {
      setSaving(false)
    }
  }

  function copyId() {
    navigator.clipboard?.writeText(u.id).then(() => toast('ID copiado.', { type: 'info' }), () => {})
  }

  return (
    <>
      {/* ── Cabeçalho do registro ── */}
      <article className={`card ${a.hero}`}>
        <Avatar name={u.name} size={56} inactive={!u.active} />
        <div className={a.heroMain}>
          <h2>{u.name}{isSelf && <em className={a.youTag}>você</em>}</h2>
          <p className={a.heroMeta}>
            <span><Mail size={13} aria-hidden="true" /> {u.email}</span>
            {u.phone && <span><Phone size={13} aria-hidden="true" /> {fmtPhone(u.phone)}</span>}
          </p>
          <p className={a.heroTags}>
            <UserStatus active={u.active} />
            <ProfileChip nome={u.profileName} onClick={can('PERFIS_GERENCIAR') && u.profileId ? () => navigate('perfil', { id: u.profileId }) : undefined} />
          </p>
        </div>
        <div className={a.heroActions}>
          {can('USUARIOS_EDITAR') && <button className="gold" onClick={() => navigate('editarusuario', { id: u.id })}><Pencil size={13} aria-hidden="true" /> Editar</button>}
          {can('USUARIOS_EDITAR') && <button onClick={() => actions.open.changeProfile(u)} disabled={!perfis.data?.length}><KeyRound size={13} aria-hidden="true" /> Mudar perfil</button>}
          <ActionMenu label="Mais ações" items={actions.menuItems(u, { view: false, edit: false }).filter(it => !it || it.label !== 'Mudar perfil')} />
        </div>
      </article>

      {!u.active && (
        <div className={a.inactiveBanner} role="status">
          <ShieldAlert size={16} aria-hidden="true" />
          <span><b>Conta inativa.</b> {u.name.split(' ')[0]} não consegue entrar no sistema. Dados e histórico estão preservados.</span>
          {can('USUARIOS_INATIVAR') && <button onClick={() => actions.open.toggleActive(u)}><UserCheck size={13} aria-hidden="true" /> Reativar</button>}
        </div>
      )}

      <div className={a.detailGrid}>
        {/* ── Permissões ── */}
        <div>
          {!can('PERMISSOES_GERENCIAR') ? (
            <Section title="Permissões" desc="Seu acesso não permite consultar as permissões individuais deste usuário.">
              <p className={a.muted}>Funcionalidades do perfil <b>{u.profileName}</b> se aplicam a esta conta.</p>
            </Section>
          ) : editing ? (
            <Section
              id="ajustes"
              title="Ajustes individuais de permissão"
              desc="Exceções sobre o perfil. Use com moderação — o ideal é que o perfil descreva a função."
              actions={<>
                <button onClick={() => setEditing(false)} disabled={saving}>Cancelar</button>
                <button className="gold" disabled={!changes || saving} onClick={() => setConfirmSave(true)}>
                  Salvar ajustes {changes > 0 && <span className={a.countBadge}>{changes}</span>}
                </button>
              </>}
            >
              <OverridesEditor funcionalidades={funcs.data || []} perfilCodigos={perfilCodigos} value={draft} onChange={setDraft} />
            </Section>
          ) : (
            <Section
              id="permissoes"
              title="Permissões efetivas"
              desc="O que este usuário pode fazer de fato: perfil + ajustes individuais."
              actions={perms.data && funcs.data && (
                <button onClick={startEdit}><SlidersHorizontal size={13} aria-hidden="true" /> Ajustar permissões</button>
              )}
            >
              {perms.error ? <ErrorBlock error={perms.error} onRetry={perms.reload} />
                : !perms.data || !funcs.data ? <LoadingBlock lines={4} label="Carregando permissões" />
                : <PermissoesEfetivas funcionalidades={funcs.data} permissoes={perms.data} />}
            </Section>
          )}
        </div>

        {/* ── Lateral ── */}
        <div>
          <Section title="Perfil de acesso">
            <div className={a.profileBox}>
              <ProfileChip nome={u.profileName} />
              {perfil?.descricao && <p className={a.muted}>{perfil.descricao}</p>}
              {perfil && <p className={a.muted}>{perfil.codigos.length} funcionalidade{perfil.codigos.length === 1 ? '' : 's'} no perfil</p>}
              <div className={a.inlineActions}>
                {can('PERFIS_GERENCIAR') && u.profileId && (
                  <button className={a.linkBtn} onClick={() => navigate('perfil', { id: u.profileId })}>Ver perfil <ArrowRight size={13} aria-hidden="true" /></button>
                )}
              </div>
            </div>
          </Section>

          <Section title="Registro">
            <dl className={a.kv}>
              <dt>Criado em</dt><dd>{u.createdAt ? fmtDateTime(u.createdAt) : '—'}</dd>
              <dt>Última atualização</dt><dd>{u.updatedAt ? fmtDateTime(u.updatedAt) : '—'}</dd>
              <dt>ID</dt>
              <dd><code className={a.mono}>{u.id.slice(0, 13)}…</code> <button className={a.iconMini} onClick={copyId} aria-label="Copiar ID" title="Copiar ID"><Copy size={12} /></button></dd>
            </dl>
          </Section>
        </div>
      </div>

      {confirmSave && (
        <ConfirmModal
          title="Aplicar ajustes de permissão?"
          confirmLabel="Aplicar e encerrar sessão" busy={saving}
          onClose={() => setConfirmSave(false)} onConfirm={saveOverrides}
        >
          <ul className={a.consequences}>
            <li>{changes} alteração(ões) em relação aos ajustes atuais.</li>
            <li>Os ajustes salvos <b>substituem todos</b> os ajustes individuais anteriores.</li>
            <li>A sessão atual de <b>{isSelf ? 'você' : u.name}</b> será encerrada{isSelf ? ' — você precisará entrar novamente.' : ' e a pessoa precisará entrar novamente.'}</li>
          </ul>
        </ConfirmModal>
      )}
      {actions.modals}
    </>
  )
}
