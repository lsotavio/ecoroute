import { RioPoint } from '../rio-api';
export function RioPointCard({ point, onPlan }: { point: RioPoint; onPlan: (point: RioPoint) => void }) {
  return <article className="rj-card">
    <small>{point.region}</small><h3>{point.name}</h3>
    <p><strong>Materiais aceitos</strong><br />{point.materials.length ? point.materials.join(', ') : 'Sem informação na fonte. Consulte a Comlurb.'}</p>
    <p>{point.address}<br /><span className="muted">{point.locality}</span></p>
    {point.distanceKm !== undefined && <p><strong>{point.distanceKm.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} km</strong> em linha reta</p>}
    <details><summary>Fonte e funcionamento</summary>
      <p>Operação indicada na captura do painel Comlurb. Horários não transcritos. Confirme antes de sair.</p>
      <p>Imagem: {point.sourceFile}. Revisão: 30/10/2026.</p>
      <a href="https://comlurb.prefeitura.rio/ecopontos/" target="_blank" rel="noreferrer">Consultar Comlurb</a>
    </details>
    <button disabled={!point.materials.length} onClick={() => onPlan(point)}>Planejar meu descarte</button>
  </article>;
}
