import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppError } from '../../shared/errors/app-error';
import { distanceKm, locateCep } from './proximity';

const pointSchema = z.object({
  id: z.string().uuid(), name: z.string(), address: z.string(), locality: z.string(),
  region: z.string(), city: z.literal('Rio de Janeiro'), materials: z.array(z.string()),
  source: z.string(), sourceFile: z.string(), reviewedAt: z.string(), status: z.string(),
  hours: z.string(), opened: z.string(), latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
});
const planInput = z.object({
  pointId: z.string().uuid(),
  material: z.enum(['Lixo domiciliar','Entulho','Bens inservíveis','Galhada']),
  date: z.string().date(),
  notes: z.string().trim().max(500).default(''),
  status: z.enum(['Planejado','Concluído','Cancelado']).default('Planejado'),
}).strict();
const planSchema = planInput.extend({ id: z.string().uuid() });
const tags = ['Ecopontos RJ'];
const cepQuery = z.object({ cep: z.string().regex(/^[0-9]{8}$/), material: z.string().optional() });
const catalogQuery = z.object({ q: z.string().max(100).optional(), region: z.string().optional(), material: z.string().optional() });
const planParams = z.object({ id: z.string().uuid() });
const problem = z.object({
  type: z.string(), title: z.string(), detail: z.string(), status: z.number(),
  timestamp: z.string(), instance: z.string().optional(),
  invalid_params: z.array(z.object({ name: z.string(), reason: z.string() })).optional(),
});
const nearbyResponse = z.object({
  origin: z.object({
    cep: z.string(), street: z.string(), neighborhood: z.string(), latitude: z.number(),
    longitude: z.number(), precision: z.string(),
  }),
  points: z.array(pointSchema.extend({ distanceKm: z.number() })).max(5),
});
export async function rioRoutes(app: FastifyInstance, options: { storagePath?: string } = {}) {
  const points = z.array(pointSchema).parse(JSON.parse(readFileSync(resolve('data/ecopontos-rj.json'), 'utf8')));
  const file = options.storagePath ?? resolve('data/local/planos.json');
  let plans = existsSync(file) ? z.array(planSchema).parse(JSON.parse(readFileSync(file, 'utf8'))) : [];
  function save(next: typeof plans) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file + '.tmp', JSON.stringify(next, null, 2));
    renameSync(file + '.tmp', file);
    plans = next;
  }
  const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  app.get('/proximos', { schema: {
    tags, summary: 'Buscar até cinco ecopontos por distância em linha reta', querystring: cepQuery,
    response: { 200: nearbyResponse, 400: problem, 404: problem, 422: problem, 503: problem }
  } }, async (request) => {
    const { cep, material } = cepQuery.parse(request.query);
    const origin = await locateCep(cep);
    const results = points.filter(p => !material || p.materials.includes(material))
      .map(p => ({...p, distanceKm:distanceKm(origin.latitude, origin.longitude, p.latitude,p.longitude)}))
      .sort((a,b) => a.distanceKm-b.distanceKm).slice(0,5);
    return {origin, points:results};
  });
  app.get('/ecopontos', { schema: {
    tags, summary: 'Consultar catálogo por nome, região ou material', querystring: catalogQuery,
    response: { 200: z.array(pointSchema), 422: problem }
  } }, async (request) => {
    const query = catalogQuery.parse(request.query);
    return points.filter(p => (!query.region || p.region === query.region) &&
      (!query.material || p.materials.includes(query.material)) &&
      (!query.q || fold(p.name+' '+p.address+' '+p.locality).includes(fold(query.q))));
  });
  app.get('/planos', { schema: {
    tags, summary: 'Listar planos pessoais', response: { 200: z.array(planSchema) }
  } }, async () => plans);
  function validatePlan(body: unknown) {
    const data = planInput.parse(body);
    const point = points.find(p => p.id === data.pointId);
    if (!point) throw AppError.notFound('Ecoponto não encontrado.');
    if (!point.materials.includes(data.material)) throw AppError.badRequest('Material não informado como aceito neste ecoponto.');
    return data;
  }
  app.post('/planos', { schema: {
    tags, summary: 'Criar plano pessoal', body: planInput,
    response: { 201: planSchema, 400: problem, 404: problem, 422: problem }
  } }, async (request, reply) => {
    const data = validatePlan(request.body);
    const plan = { ...data, id: randomUUID() };
    save([...plans, plan]);
    return reply.code(201).send(plan);
  });
  app.put('/planos/:id', { schema: {
    tags, summary: 'Atualizar plano pessoal', params: planParams, body: planInput,
    response: { 200: planSchema, 400: problem, 404: problem, 422: problem }
  } }, async (request) => {
    const { id } = planParams.parse(request.params);
    if (!plans.some(p => p.id === id)) throw AppError.notFound('Plano não encontrado.');
    const updated = { ...validatePlan(request.body), id };
    save(plans.map(p => p.id === id ? updated : p));
    return updated;
  });
  app.delete('/planos/:id', { schema: {
    tags, summary: 'Excluir plano pessoal (204 sem conteúdo)', params: planParams,
    response: { 204: z.null(), 404: problem, 422: problem }
  } }, async (request, reply) => {
    const { id } = planParams.parse(request.params);
    if (!plans.some(p => p.id === id)) throw AppError.notFound('Plano não encontrado.');
    save(plans.filter(p => p.id !== id));
    return reply.code(204).send();
  });
}
