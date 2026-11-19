export default function Brand() {
  return (
    <div className="brand">
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
        <rect width="34" height="34" rx="8" fill="rgba(201,162,39,0.13)"/>
        <text x="17" y="23" textAnchor="middle" style={{ fill: 'var(--brand-mark, #e8c660)' }} fontSize="17" fontFamily="Cinzel, serif" fontWeight="700">V</text>
      </svg>
      <span>
        <b>VALHALLA</b>
        <small>Gestão de estoque</small>
      </span>
    </div>
  )
}
