import { useEffect, useRef, useState } from 'react';
import { Plan, RioPoint, rioRequest } from './rio-api';
import { RioPointCard } from './components/RioPointCard';
import { RioPlanForm } from './components/RioPlanForm';
import { RioCatalogFilters } from './components/RioCatalogFilters';
import './rio.css';

const materials = ['Lixo domiciliar', 'Entulho', 'Bens inservíveis', 'Galhada'];

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
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [planMaterial, setPlanMaterial] = useState('');
  const neighborhoodField = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cep, setCep] = useState('');
  const [cepMaterial, setCepMaterial] = useState('');
  const [cepError, setCepError] = useState('');
  const [nearby, setNearby] = useState<RioPoint[]>();
  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);
  async function searchCep() {
    setLocating(true); setCepError(''); setNearby(undefined); setLocation('');
    try {
      const value = await rioRequest<{origin:{street:string;neighborhood:string;precision:string};points:RioPoint[]}>('/proximos?'+new URLSearchParams({cep:cep.replace(/\D/g,''), ...(cepMaterial ? {material: cepMaterial} : {})}));
      setNearby(value.points);
      setLocation(value.origin.street+', '+value.origin.neighborhood+'. '+value.origin.precision);
    } catch(e) { setCepError(e instanceof Error ? e.message : 'Falha ao consultar CEP.'); }
    finally { setLocating(false); }
  }
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
    setBusy(true); setSaveError(''); setMessage('');
    try {
      const result = await rioRequest<Plan>('/planos'+(editing ? '/'+editing.id : ''), editing ? 'PUT' : 'POST', data);
      setPlans(prev => editing ? prev.map(p => p.id === result.id ? result : p) : [...prev,result]);
      setSelected(undefined); setEditing(undefined); setTab('planos'); setMessage('Plano salvo.');
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Falha ao salvar.'); }
    finally { setBusy(false); }
  }
  async function remove(plan: Plan) {
    if (!window.confirm('Excluir este plano de descarte?')) return;
    setBusy(true); setDeleteError(''); setMessage('');
    try {
      await rioRequest('/planos/'+plan.id, 'DELETE');
      setPlans(prev => prev.filter(p => p.id !== plan.id)); setMessage('Plano excluído.');
    } catch (e) { setDeleteError(e instanceof Error ? e.message : 'Falha ao excluir.'); }
    finally { setBusy(false); }
  }
  return <div className="rj-shell">
    <header className="rj-header"><a href="#" className="rj-brand">Ecoroute <strong>RJ</strong></a><span>RIO DE JANEIRO · ODS 11.6</span></header>
    <main>
      <h1>Ecopontos da Comlurb no Rio de Janeiro</h1>
      <nav className="rj-tabs" aria-label="Navegação"><button className={tab==='pontos'?'active':'secondary'} disabled={busy} onClick={() => {setDeleteError('');setTab('pontos');setSelected(undefined);}}>Encontrar ecopontos</button><button className={tab==='planos'?'active':'secondary'} disabled={busy} onClick={() => {setDeleteError('');setTab('planos');setSelected(undefined);}}>Meus planos de descarte</button></nav>
      {error && <div role="alert" className="rj-error">{error} <button onClick={() => void refresh()}>{tab === 'planos' ? 'Recarregar planos' : 'Recarregar catálogo'}</button></div>}
      {message && <p role="status" className="rj-success">{message}</p>}
      {selected ? <RioPlanForm key={editing?.id || selected.id} point={selected} initial={editing} preferredMaterial={planMaterial} error={saveError} busy={busy} onSave={save} onCancel={() => {setSelected(undefined);setEditing(undefined);}} /> : tab==='pontos' ? <>
        <form className="rj-card rj-search" onSubmit={e => { e.preventDefault(); void searchCep(); }}>
          <h2>Buscar por CEP</h2>
          <fieldset disabled={locating} className="rj-search-fields" onChange={() => {
            setNearby(undefined); setLocation(''); setCepError('');
          }}>
            <label>CEP da rua<input inputMode="numeric" autoComplete="postal-code" required pattern="[0-9]{5}-?[0-9]{3}" title="Informe os oito dígitos do CEP, com ou sem hífen." placeholder="20540-903" value={cep} onChange={e => setCep(e.target.value)} /></label>
            <label>Material para descarte<select value={cepMaterial} onChange={e => setCepMaterial(e.target.value)}>
              <option value="">Todos os materiais</option>{materials.map(m => <option key={m}>{m}</option>)}
            </select></label>
            <button>{locating ? 'Buscando…' : 'Buscar ecopontos'}</button>
          </fieldset>
          <p>A busca usa os endereços do IBGE. Para CEPs fora da base local, consulta o CEP no ViaCEP e a rua na Esri. Distâncias aproximadas em linha reta.</p>
          {cepError && <div className="rj-error">
            <p role="alert">{cepError}</p>
            <button type="button" className="secondary" onClick={() => neighborhoodField.current?.focus()}>Buscar por bairro</button>
          </div>}
        </form>
        {nearby !== undefined ? <>
          <h2>Ecopontos próximos</h2>
          <p role="status">{nearby.length} de até 5 resultados para {cep}{cepMaterial && ' · '+cepMaterial}. {location}</p>
          {!nearby.length && <p>Nenhum ecoponto encontrado. Experimente outro material ou consulte o catálogo.</p>}
          <button type="button" className="secondary" onClick={() => {setNearby(undefined);setLocation('');}}>Voltar ao catálogo</button>
        </> : <>
        <h2>Catálogo de ecopontos</h2>
        <RioCatalogFilters searchField={neighborhoodField} query={query} region={region}
          material={material} materials={materials} onQuery={setQuery} onRegion={setRegion} onMaterial={setMaterial} />
        {!error && <p className="muted">{loading ? 'Carregando catálogo…' : filtered.length+' ecopontos encontrados'}</p>}
        {!error && !loading && !filtered.length && <p>Nenhum ponto corresponde à busca. Tente outro bairro ou remova os filtros.</p>}
        </>}
        <section className="rj-grid">{(nearby ?? filtered).map(p => <RioPointCard key={p.id} point={p} onPlan={p => {setPlanMaterial(nearby !== undefined ? cepMaterial : material);setSaveError('');setEditing(undefined);setSelected(p);setMessage('');}} />)}</section>
      </> : <section><h2>Meus planos de descarte</h2><p>Planos salvos neste servidor local. Nenhuma solicitação é enviada à Comlurb.</p>
        {deleteError && <p role="alert" className="rj-error">{deleteError}</p>}
        {!loading && !error && !plans.length && <p>Você ainda não criou um plano. Escolha um ecoponto para começar.</p>}
        <div className="rj-grid">{plans.map(p => <article className="rj-card" key={p.id}><small>{p.status}</small><h3>{points.find(point => point.id===p.pointId)?.name || 'Ecoponto'}</h3><p>{p.material} · {p.date.split('-').reverse().join('/')}</p><p>{p.notes}</p><div className="rj-actions"><button disabled={busy} onClick={() => {setSaveError('');setEditing(p);setSelected(points.find(point => point.id===p.pointId));}}>Editar</button><button className="secondary" disabled={busy} onClick={() => void remove(p)}>Excluir</button></div></article>)}</div>
      </section>}
      <aside className="rj-note"><strong>Sobre os dados</strong><p>Catálogo transcrito de capturas do painel “Ache seu Ecoponto” da Comlurb, revisado em 30/10/2026. A indicação de operação corresponde às imagens, não a uma verificação em tempo real. Consulte horários e condições antes do deslocamento. Não presumimos recebimento de eletrônicos, pilhas ou materiais perigosos.</p><a href="https://comlurb.prefeitura.rio/ecopontos/" target="_blank" rel="noreferrer">Acessar fonte oficial da Comlurb</a></aside>
    </main><footer>Ecoroute RJ · Projeto acadêmico Reconecta 2026 · ODS 11 — Cidades e comunidades sustentáveis</footer>
  </div>;
}

