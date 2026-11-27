import { KeyRound, ListChecks, Users } from 'lucide-react'
import { api } from '@/shared/api/api.js'
import { useResource } from '@/shared/lib/hooks/useResource.js'
import { isManagerProfile } from '@/entities/access'
import { useStore } from '@/entities/store'
import { Drawer } from '@/shared/ui/drawer/Drawer.jsx'
import { ErrorBlock, LoadingBlock } from '@/shared/ui/feedback/ManagementFeedback.jsx'
import { UserStatus } from '@/entities/access/ui'
import { agruparPorModulo } from '@/shared/config/funcionalidades.js'
import s from './ProfileDetailsDrawer.module.css'

export function ProfileDetailsDrawer({ profileId, users, funcs, onClose }) {
  const { can } = useStore()
  const profile = useResource(() => api.perfis.obter(profileId), [profileId])
  const p = profile.data?.id === profileId ? profile.data : null
  const usersKnown = can('USUARIOS_VISUALIZAR') && !!users.data && !users.error
  const reserved = isManagerProfile(p?.nome)
  const linked = (users.data || []).filter(u => u.profileId === profileId)
  const groups = funcs.data && p ? agruparPorModulo(p.codigos.map(codigo => funcs.data.find(f => f.codigo === codigo) || { codigo, nome: codigo })) : []
  return <Drawer title="Detalhes do perfil" onClose={onClose}>
    <header className={s.header}><span><KeyRound size={16} aria-hidden="true" />Detalhes do perfil</span><h2>{p?.nome || 'Perfil de acesso'}</h2></header>
    {profile.loading ? <LoadingBlock label="Carregando perfil" /> : profile.error ? <ErrorBlock error={profile.error} onRetry={profile.reload} /> : !p ? <LoadingBlock label="Carregando perfil" /> : <>
      <p className={s.description}>{p.descricao || 'Este perfil não possui descrição.'}</p>
      <div className={s.highlights}>
        <div><ListChecks size={19} aria-hidden="true" /><strong>{reserved ? funcs.data?.length ?? 'Todas' : p.codigos.length}</strong><span>Funcionalidades</span></div>
        <div><Users size={19} aria-hidden="true" /><strong>{usersKnown ? linked.length : '—'}</strong><span>Usuários vinculados</span></div>
      </div>
      <section className={s.section}><h3><ListChecks size={17} aria-hidden="true" />O que este perfil permite</h3><p>Funcionalidades definidas no perfil. Ajustes individuais de cada usuário podem alterar seu acesso.</p>
        {reserved ? <p>O perfil Gerente tem acesso a todas as funcionalidades do estabelecimento.</p> : funcs.error ? <ErrorBlock error={funcs.error} onRetry={funcs.reload} /> : !funcs.data ? <LoadingBlock label="Carregando funcionalidades" /> : !p.codigos.length ? <p>Nenhuma funcionalidade definida neste perfil.</p> : groups.map(group => <div className={s.group} key={group.id}><h4>{group.nome}<span>{group.itens.length}</span></h4><ul>{group.itens.map(f => <li key={f.codigo}><b>{f.nome}</b>{f.descricao && <small>{f.descricao}</small>}</li>)}</ul></div>)}
      </section>
      <section className={s.section}><h3><Users size={17} aria-hidden="true" />Usuários com este perfil</h3>
        {!can('USUARIOS_VISUALIZAR') ? <p>Seu acesso não permite consultar os usuários vinculados.</p> : users.error ? <ErrorBlock error={users.error} onRetry={users.reload} /> : !users.data ? <LoadingBlock label="Carregando usuários" /> : !linked.length ? <p>Nenhum usuário vinculado a este perfil.</p> : <><p>{linked.filter(u => u.active).length} ativos · {linked.filter(u => !u.active).length} inativos</p><ul className={s.users}>{linked.map(u => <li key={u.id}><div><b>{u.name}</b><small>{u.email}</small></div><UserStatus active={u.active} /></li>)}</ul></>}
      </section>
    </>}
  </Drawer>
}
