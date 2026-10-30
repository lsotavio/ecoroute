import { FormEvent, useState } from 'react';
import { Plan, RioPoint } from '../rio-api';
export function RioPlanForm({ point, initial, onSave, onCancel, busy }: {
  point: RioPoint; initial?: Plan; onSave: (data: Omit<Plan,'id'>) => Promise<void>;
  onCancel: () => void; busy: boolean;
}) {
  const [material, setMaterial] = useState(initial?.material || point.materials[0]);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return initial?.date || [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-');
  });
  const [notes, setNotes] = useState(initial?.notes || '');
  const [status, setStatus] = useState<Plan['status']>(initial?.status || 'Planejado');
  function submit(event: FormEvent) {
    event.preventDefault();
    void onSave({ pointId: point.id, material, date, notes, status });
  }
  return <form className="rj-card rj-form" onSubmit={submit}>
    <h2>{initial ? 'Editar plano' : 'Novo plano'} — {point.name}</h2>
    <p>Organização pessoal. Não é reserva nem agendamento com a Comlurb.</p>
    <label>Material<select value={material} onChange={e => setMaterial(e.target.value)}>{point.materials.map(m => <option key={m}>{m}</option>)}</select></label>
    <label>Data pretendida<input required type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
    <label>Situação<select value={status} onChange={e => setStatus(e.target.value as Plan['status'])}>
      <option>Planejado</option><option>Concluído</option><option>Cancelado</option>
    </select></label>
    <label>Anotações<textarea maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} /></label>
    <div className="rj-actions"><button disabled={busy}>Salvar plano</button><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button></div>
  </form>;
}
