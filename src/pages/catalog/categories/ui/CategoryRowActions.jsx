import { Eye, Pencil, Trash2, CirclePause, CircleCheck } from 'lucide-react'
import a from './CategoriesPage.module.css'

export function CategoryRowActions({ category, can, onEdit, onDelete, onStatus, navigate }) {
  return <div className={a.rowActions} role="group" aria-label={'Ações de ' + category.nome}>
    <button type="button" data-tone="view" title="Ver produtos" aria-label="Ver produtos" onClick={() => navigate('produtos', { categoriaId: category.id })}><Eye size={16} aria-hidden="true" /><span>Produtos</span></button>
    {can('GERENCIAR_ESTOQUE') && <>
      <button type="button" data-tone="edit" title="Editar categoria" aria-label="Editar categoria" onClick={onEdit}><Pencil size={16} aria-hidden="true" /><span>Editar</span></button>
      <button type="button" data-tone={category.ativo ? 'pause' : 'activate'} title={category.ativo ? 'Inativar categoria' : 'Reativar categoria'} aria-label={category.ativo ? 'Inativar categoria' : 'Reativar categoria'} onClick={onStatus}>{category.ativo ? <CirclePause size={16} aria-hidden="true" /> : <CircleCheck size={16} aria-hidden="true" />}<span>{category.ativo ? 'Inativar' : 'Reativar'}</span></button>
      <button type="button" data-tone="delete" title="Excluir categoria" aria-label="Excluir categoria" className={a.deleteAction} onClick={onDelete}><Trash2 size={16} aria-hidden="true" /><span>Excluir</span></button>
    </>}
  </div>
}
