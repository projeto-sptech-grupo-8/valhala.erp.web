import { useState } from 'react'
import { Mail, Phone, ShieldCheck, CalendarClock, UserRound } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useResource } from '@/shared/lib/hooks/useResource.js'
import { useStore } from '@/entities/store'
import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { UserStatus, ProfileChip } from '@/entities/access/ui'
import { PermissoesEfetivas, UserOverridesModal } from '@/features/access-management'
import { fmtDateTime } from '@/shared/lib/format.js'
import { fmtPhone, isManagerProfile } from '@/entities/access'
import s from './UserDetailsDrawer.module.css'

export function UserDetailsDrawer({ userId, funcionalidades, onClose }) {
  const { can, user: me } = useStore()
  const [adjusting, setAdjusting] = useState(false)
  const user = useResource(() => api.usuarios.obter(userId), [userId])
  const perms = useResource(() => can('PERMISSOES_GERENCIAR') ? api.permissoes.doUsuario(userId) : null, [userId])
  const u = user.data?.id === userId ? user.data : null
  const canAdjust = can('PERMISSOES_GERENCIAR') && u && u.id !== me?.id && !isManagerProfile(u.profileName)
    && funcionalidades?.some(f => can(f.codigo)) && perms.data?.every(p => p.origem !== 'GRANT' || can(p.codigo))
  return <Drawer title="Detalhes do usuário" onClose={onClose}>
    <div className={s.content}>
      <header className={s.header}><span><UserRound size={16} aria-hidden="true" />Detalhes do usuário</span><h2>{u?.name || 'Usuário'}</h2></header>
      {user.loading ? <LoadingBlock label="Carregando usuário" /> : user.error ? <ErrorBlock error={user.error} onRetry={user.reload} /> : !u ? <LoadingBlock label="Carregando usuário" /> : <>
        <div className={s.highlights}>
          <div><span>Status do acesso</span><UserStatus active={u.active} /></div>
          <div><span>Perfil de acesso</span><ProfileChip nome={u.profileName} /></div>
        </div>
        {!u.active && <p className={s.warning}>Esta conta está inativa e não pode entrar no sistema. O histórico está preservado.</p>}
        <section className={s.section}><h3><Mail size={17} aria-hidden="true" />Contato</h3><dl>
          <div><dt>E-mail de acesso</dt><dd>{u.email || 'Não informado'}</dd></div>
          <div><dt><Phone size={14} aria-hidden="true" />Telefone</dt><dd>{u.phone ? fmtPhone(u.phone) : 'Não informado'}</dd></div>
        </dl></section>
        <section className={s.section}><h3><ShieldCheck size={17} aria-hidden="true" />Permissões de acesso</h3>
          {canAdjust && <button type="button" onClick={() => setAdjusting(true)}>Ajustar permissões</button>}
          {isManagerProfile(u.profileName) ? <p>O perfil Gerente tem acesso a todas as funcionalidades do estabelecimento.</p> : !can('PERMISSOES_GERENCIAR') ? <p>Seu acesso não permite consultar as permissões individuais desta conta.</p> : perms.error ? <ErrorBlock error={perms.error} onRetry={perms.reload} /> : !perms.data ? <LoadingBlock label="Carregando permissões" /> : funcionalidades ? <PermissoesEfetivas funcionalidades={funcionalidades} permissoes={perms.data} /> : <p>Não foi possível carregar a descrição das funcionalidades. Consulte novamente a lista de usuários.</p>}
        </section>
        <section className={s.section}><h3><CalendarClock size={17} aria-hidden="true" />Registro da conta</h3><dl>
          <div><dt>Criado em</dt><dd>{u.createdAt ? fmtDateTime(u.createdAt) : 'Não informado'}</dd></div>
          <div><dt>Última atualização</dt><dd>{u.updatedAt ? fmtDateTime(u.updatedAt) : 'Não informado'}</dd></div>
        </dl></section>
      </>}
    </div>
    {adjusting && canAdjust && <UserOverridesModal user={u} funcionalidades={funcionalidades}
      permissoes={perms.data} can={can} onClose={() => setAdjusting(false)}
      onSaved={() => { setAdjusting(false); perms.reload() }} />}
  </Drawer>
}
