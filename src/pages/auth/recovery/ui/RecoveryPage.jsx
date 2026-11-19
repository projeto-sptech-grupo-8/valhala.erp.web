import Brand from '@/shared/ui/brand/Brand.jsx'
import styles from './RecoveryPage.module.css'

export default function Forgot({ go }) {
  return <div className={styles.auth}>
    <section className={styles.panel}><Brand /></section>
    <section className={styles.formSide}>
      <div className={styles.form}>
        <h1 className={styles.title}>Recuperar acesso</h1>
        <p className={styles.sub}>A recuperação por e-mail está indisponível. Procure o responsável pelo acesso da sua adega. Se você ainda consegue entrar, pode alterar sua senha em Configurações gerais → Segurança.</p>
        <button type="button" className={'gold ' + styles.submit} onClick={() => go('login')}>Voltar ao login</button>
      </div>
    </section>
  </div>
}
