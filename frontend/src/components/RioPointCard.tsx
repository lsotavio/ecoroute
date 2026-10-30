import { RioPoint } from '../rio-api';
export function RioPointCard({ point, onPlan }: { point: RioPoint; onPlan: (point: RioPoint) => void }) {
  return <article className="rj-card">
    <small>{point.region}</small><h3>{point.name}</h3>
    <p>{point.address}</p><p className="muted">Localidade: {point.locality}</p>
    <div className="rj-tags">{point.materials.map(m => <span key={m}>{m}</span>)}</div>
    {!point.materials.length && <p>Materiais não informados na fonte. Consulte a Comlurb.</p>}
    <details><summary>Fonte e funcionamento</summary>
      <p>Operação indicada na captura do painel Comlurb. Horários não transcritos. Confirme antes de sair.</p>
      <p>Imagem: {point.sourceFile}. Revisão: 30/10/2026.</p>
      <a href="https://comlurb.prefeitura.rio/ecopontos/" target="_blank" rel="noreferrer">Consultar Comlurb</a>
    </details>
    <button disabled={!point.materials.length} onClick={() => onPlan(point)}>Planejar meu descarte</button>
  </article>;
}
