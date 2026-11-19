export const MOVEMENT_TYPES = {
  ENTRADA_INICIAL: { label: 'Entrada inicial', color: '#3b82f6', description: 'Saldo registrado na criação do produto.' },
  ENTRADA: { label: 'Entrada', color: 'var(--green)', description: 'Entrada de estoque, como um recebimento de produtos.' },
  SAIDA: { label: 'Saída', color: '#f97316', description: 'Retirada direta de estoque registrada como saída.' },
  SAIDA_DRINK: { label: 'Saída de drink', color: '#a855f7', description: 'Consumo de um ingrediente na preparação de drink.' },
  PERDA: { label: 'Perda', color: 'var(--red)', description: 'Baixa registrada como perda, por exemplo por vencimento ou avaria.' },
  AJUSTE_POSITIVO: { label: 'Ajuste positivo', color: '#14b8a6', description: 'Correção que aumenta o saldo do estoque.' },
  AJUSTE_NEGATIVO: { label: 'Ajuste negativo', color: '#ec4899', description: 'Correção que reduz o saldo do estoque.' },
}
