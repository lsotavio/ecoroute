import { afterEach, expect, it, vi } from 'vitest';
import { distanceKm, locateCep } from '../src/modules/rio/proximity';
afterEach(() => vi.unstubAllGlobals());
it('calcula distância geográfica conhecida e identidade', () => {
  expect(distanceKm(-22.9,-43.2,-22.9,-43.2)).toBe(0);
  expect(distanceKm(0,0,0,1)).toBeCloseTo(111.195,2);
});
it('recusa CEP de outra cidade', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({localidade:'Niterói',uf:'RJ',logradouro:'Rua A',bairro:'Centro'}))));
  await expect(locateCep('24000000')).rejects.toThrow('cidade do Rio');
});
it('recusa localização genérica da cidade', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({localidade:'Rio de Janeiro',uf:'RJ',logradouro:'Rua A',bairro:'Tijuca'})))
    .mockResolvedValueOnce(new Response(JSON.stringify({candidates:[{address:'Rio',score:100,location:{x:-43.2,y:-22.9},attributes:{City:'Rio De Janeiro',Addr_type:'Locality'}}]}))));
  await expect(locateCep('20540903')).rejects.toThrow('confiança');
});
it('localiza um logradouro válido e mantém a precisão explícita', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({localidade:'Rio de Janeiro',uf:'RJ',logradouro:'Rua Major Ávila',bairro:'Tijuca'})))
    .mockResolvedValueOnce(new Response(JSON.stringify({candidates:[{address:'Rua Major Ávila',score:100,location:{x:-43.23,y:-22.92},attributes:{City:'Rio De Janeiro',Addr_type:'StreetName'}}]}))));
  expect(await locateCep('20540903')).toMatchObject({latitude:-22.92,longitude:-43.23});
});
