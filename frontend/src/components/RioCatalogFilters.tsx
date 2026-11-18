import type { Ref } from 'react';

interface Props {
  searchField: Ref<HTMLInputElement>;
  query: string;
  region: string;
  material: string;
  materials: string[];
  onQuery: (value: string) => void;
  onRegion: (value: string) => void;
  onMaterial: (value: string) => void;
}

export function RioCatalogFilters({ searchField, query, region, material, materials, onQuery, onRegion, onMaterial }: Props) {
  return (
    <section className="rj-filters" aria-label="Filtros">
      <label>Nome, bairro ou endereço<input ref={searchField} value={query} onChange={e => onQuery(e.target.value)} placeholder="Ex.: Madureira, Rocinha, Rua Bela" /></label>
      <label>Região<select value={region} onChange={e => onRegion(e.target.value)}><option value="">Todas as regiões</option>{['Centro','Zona Norte','Zona Oeste','Zona Sudoeste','Zona Sul e Grande Tijuca'].map(r => <option key={r}>{r}</option>)}</select></label>
      <label>Material<select value={material} onChange={e => onMaterial(e.target.value)}><option value="">Todos os materiais</option>{materials.map(m => <option key={m}>{m}</option>)}</select></label>
    </section>
  );
}
