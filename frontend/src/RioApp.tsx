import { useEffect, useState } from 'react';
import { Plan, RioPoint, rioRequest } from './rio-api';
import { RioPointCard } from './components/RioPointCard';
import { RioPlanForm } from './components/RioPlanForm';
import './rio.css';

export function RioApp() {
  const [points, setPoints] = useState<RioPoint[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tab, setTab] = useState('pontos');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [material, setMaterial] = useState('');
  const [selected, setSelected] = useState<RioPoint>();
  const [editing, setEditing] = useState<Plan>();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setLoading(true); setError('');
    try {
      const [p, s] = await Promise.all([rioRequest<RioPoint[]>('/ecopontos'), rioRequest<Plan[]>('/planos')]);
      setPoints(p); setPlans(s);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar dados.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const filtered = points.filter(p => (!region || p.region === region) &&
    (!material || p.materials.includes(material)) && fold(p.name+' '+p.address+' '+p.locality).includes(fold(query)));
  async function save(data: Omit<Plan,'id'>) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await rioRequest<Plan>('/planos'+(editing ? '/'+editing.id : ''), editing ? 'PUT' : 'POST', data);
      setPlans(prev => editing ? prev.map(p => p.id === result.id ? result : p) : [...prev,result]);
      setSelected(undefined); setEditing(undefined); setTab('planos'); setMessage('Plano salvo.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar.'); }
    finally { setBusy(false); }
  }
  async function remove(plan: Plan) {
    if (!window.confirm('Excluir este plano de descarte?')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await rioRequest('/planos/'+plan.id, 'DELETE');
      setPlans(prev => prev.filter(p => p.id !== plan.id)); setMessage('Plano excluído.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao excluir.'); }
    finally { setBusy(false); }
  }
  return <div className="rj-shell">
    <header className="rj-header"><a href="#" className="rj-brand">Ecoroute <strong>RJ</strong></a><span>RIO DE JANEIRO · ODS 11.6</span></header>
    <main>
      <section className="rj-hero"><small>DESCARTE RESPONSÁVEL, PERTO DA SUA ROTINA</small>
        <h1>Um Rio mais limpo<br/>começa no destino certo.</h1>
        <p>Encontre ecopontos da Comlurb na cidade do Rio de Janeiro, confira os resíduos informados e organize seu descarte.</p>
        <div className="rj-metrics"><div><strong>{points.length || '—'}</strong><span>ecopontos no catálogo</span></div><div><strong>5</strong><span>regiões da cidade</span></div><div><strong>{plans.length}</strong><span>planos pessoais</span></div></div>
      </section>
      <nav className="rj-tabs" aria-label="Navegação"><button className={tab==='pontos'?'active':'secondary'} onClick={() => {setTab('pontos');setSelected(undefined);}}>Encontrar ecopontos</button><button className={tab==='planos'?'active':'secondary'} onClick={() => {setTab('planos');setSelected(undefined);}}>Meus planos de descarte</button></nav>
      {error && <div role="alert" className="rj-error">{error} <button onClick={() => void refresh()}>Tentar novamente</button></div>}
      {message && <p role="status" className="rj-success">{message}</p>}
      {selected ? <RioPlanForm key={editing?.id || selected.id} point={selected} initial={editing} busy={busy} onSave={save} onCancel={() => {setSelected(undefined);setEditing(undefined);}} /> : tab==='pontos' ? <>
        <section className="rj-filters" aria-label="Filtros">
          <label>Nome, bairro ou endereço<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex.: Madureira, Rocinha, Rua Bela" /></label>
          <label>Região<select value={region} onChange={e => setRegion(e.target.value)}><option value="">Todas as regiões</option>{['Centro','Zona Norte','Zona Oeste','Zona Sudoeste','Zona Sul e Grande Tijuca'].map(r => <option key={r}>{r}</option>)}</select></label>
          <label>Material<select value={material} onChange={e => setMaterial(e.target.value)}><option value="">Todos os materiais</option>{['Lixo domiciliar','Entulho','Bens inservíveis','Galhada'].map(m => <option key={m}>{m}</option>)}</select></label>
        </section>
        <p className="muted">{loading ? 'Carregando catálogo…' : filtered.length+' ecopontos encontrados'}</p>
        {!loading && !filtered.length && <p>Nenhum ponto corresponde à busca. Tente outro bairro ou remova os filtros.</p>}
        <section className="rj-grid">{filtered.map(p => <RioPointCard key={p.id} point={p} onPlan={p => {setEditing(undefined);setSelected(p);setMessage('');}} />)}</section>
      </> : <section><h2>Meus planos de descarte</h2><p>Planos salvos neste servidor local. Nenhuma solicitação é enviada à Comlurb.</p>
        {!plans.length && <p>Você ainda não criou um plano. Escolha um ecoponto para começar.</p>}
        <div className="rj-grid">{plans.map(p => <article className="rj-card" key={p.id}><small>{p.status}</small><h3>{points.find(point => point.id===p.pointId)?.name || 'Ecoponto'}</h3><p>{p.material} · {p.date.split('-').reverse().join('/')}</p><p>{p.notes}</p><div className="rj-actions"><button disabled={busy} onClick={() => {setEditing(p);setSelected(points.find(point => point.id===p.pointId));}}>Editar</button><button className="secondary" disabled={busy} onClick={() => void remove(p)}>Excluir</button></div></article>)}</div>
      </section>}
      <aside className="rj-note"><strong>Sobre os dados</strong><p>Catálogo transcrito de capturas do painel “Ache seu Ecoponto” da Comlurb, revisado em 30/10/2026. A indicação de operação corresponde às imagens, não a uma verificação em tempo real. Consulte horários e condições antes do deslocamento. Não presumimos recebimento de eletrônicos, pilhas ou materiais perigosos.</p><a href="https://comlurb.prefeitura.rio/ecopontos/" target="_blank" rel="noreferrer">Acessar fonte oficial da Comlurb</a></aside>
    </main><footer>Ecoroute RJ · Projeto acadêmico Reconecta 2026 · ODS 11 — Cidades e comunidades sustentáveis</footer>
  </div>;
}
