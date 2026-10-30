import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppError } from '../../shared/errors/app-error';

const pointSchema = z.object({
  id: z.string().uuid(), name: z.string(), address: z.string(), locality: z.string(),
  region: z.string(), city: z.literal('Rio de Janeiro'), materials: z.array(z.string()),
  source: z.string(), sourceFile: z.string(), reviewedAt: z.string(), status: z.string(),
  hours: z.string(), opened: z.string(), latitude: z.null(), longitude: z.null(),
});
const planInput = z.object({
  pointId: z.string().uuid(),
  material: z.enum(['Lixo domiciliar','Entulho','Bens inservíveis','Galhada']),
  date: z.string().date(),
  notes: z.string().trim().max(500).default(''),
  status: z.enum(['Planejado','Concluído','Cancelado']).default('Planejado'),
}).strict();
const planSchema = planInput.extend({ id: z.string().uuid() });
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
  app.get('/ecopontos', async (request) => {
    const query = z.object({ q: z.string().max(100).optional(), region: z.string().optional(), material: z.string().optional() }).parse(request.query);
    return points.filter(p => (!query.region || p.region === query.region) &&
      (!query.material || p.materials.includes(query.material)) &&
      (!query.q || fold(p.name+' '+p.address+' '+p.locality).includes(fold(query.q))));
  });
  app.get('/planos', async () => plans);
  function validatePlan(body: unknown) {
    const data = planInput.parse(body);
    const point = points.find(p => p.id === data.pointId);
    if (!point) throw AppError.notFound('Ecoponto não encontrado.');
    if (!point.materials.includes(data.material)) throw AppError.badRequest('Material não informado como aceito neste ecoponto.');
    return data;
  }
  app.post('/planos', async (request, reply) => {
    const data = validatePlan(request.body);
    const plan = { ...data, id: randomUUID() };
    save([...plans, plan]);
    return reply.code(201).send(plan);
  });
  app.put('/planos/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    if (!plans.some(p => p.id === id)) throw AppError.notFound('Plano não encontrado.');
    const updated = { ...validatePlan(request.body), id };
    save(plans.map(p => p.id === id ? updated : p));
    return updated;
  });
  app.delete('/planos/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    if (!plans.some(p => p.id === id)) throw AppError.notFound('Plano não encontrado.');
    save(plans.filter(p => p.id !== id));
    return reply.code(204).send();
  });
}
