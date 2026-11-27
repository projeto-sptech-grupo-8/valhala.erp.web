import { Eye, Pencil, Trash2, CirclePause, CircleCheck } from 'lucide-react'
import { ActionMenu } from '@/entities/access/ui'
import a from './CategoriesPage.module.css'

export function CategoryRowActions({ category, can, onEdit, onDelete, onStatus, navigate }) {
  return <div className={a.rowActions} role="group" aria-label={'Ações de ' + category.nome}>
    <button type="button" title="Ver Produto" aria-label="Ver Produto" onClick={() => navigate('produtos', { categoriaId: category.id })}><Eye size={16} aria-hidden="true" /><span>Ver Produto</span></button>
    {can('GERENCIAR_ESTOQUE') && <ActionMenu label={'Gerenciar categoria ' + category.nome} items={[
      { label: 'Editar categoria', icon: Pencil, onClick: onEdit },
      { label: category.ativo ? 'Inativar categoria' : 'Reativar categoria', icon: category.ativo ? CirclePause : CircleCheck, onClick: onStatus },
      { divider: true },
      { label: 'Excluir categoria', icon: Trash2, onClick: onDelete, danger: true },
    ]} />}
  </div>
}
