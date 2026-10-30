import { z } from 'zod';
import { AppError } from '../../shared/errors/app-error';
export function distanceKm(lat: number, lng: number, lat2: number, lng2: number) {
  const rad = (n: number) => n * Math.PI / 180;
  const a = Math.sin(rad(lat2-lat)/2)**2 + Math.cos(rad(lat))*Math.cos(rad(lat2))*Math.sin(rad(lng2-lng)/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
async function getJson(url: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('HTTP '+response.status);
    return await response.json();
  } catch (cause) { throw new AppError(503, 'Consulta indisponível', 'O serviço de localização está indisponível. Tente novamente ou use a busca por bairro.'); }
}
export async function locateCep(cep: string) {
  const raw = await getJson('https://viacep.com.br/ws/'+cep+'/json/');
  if (raw.erro) throw AppError.notFound('CEP não encontrado.');
  const address = z.object({ localidade:z.literal('Rio de Janeiro'), uf:z.literal('RJ'), logradouro:z.string().min(1), bairro:z.string().min(1) }).safeParse(raw);
  if (!address.success) throw AppError.badRequest('Informe um CEP de logradouro da cidade do Rio de Janeiro. CEPs gerais não permitem localizar seu endereço.');
  const query = new URLSearchParams({
    SingleLine: address.data.logradouro+', '+address.data.bairro+', Rio de Janeiro, RJ, Brasil',
    f:'json', outFields:'Addr_type,City', maxLocations:'1', countryCode:'BRA',
  });
  const result = await getJson('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?'+query);
  const candidate = z.object({
    address:z.string(), score:z.number().min(95),
    location:z.object({x:z.number().finite().min(-44).max(-43), y:z.number().finite().min(-23.1).max(-22.7)}),
    attributes:z.object({City:z.string(),Addr_type:z.enum(['StreetName','StreetAddress','PointAddress'])}),
  }).safeParse(result.candidates?.[0]);
  if (!candidate.success || candidate.data.attributes.City.toLowerCase() !== 'rio de janeiro') {
    throw AppError.badRequest('Não foi possível localizar esse logradouro com confiança. Use a busca por bairro.');
  }
  return { cep, street:address.data.logradouro, neighborhood:address.data.bairro,
    latitude:candidate.data.location.y, longitude:candidate.data.location.x,
    precision:'Localização aproximada do logradouro do CEP; não inclui o número da residência.' };
}
