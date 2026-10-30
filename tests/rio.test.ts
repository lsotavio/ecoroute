import { afterAll, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify from 'fastify';
import { rioRoutes } from '../src/modules/rio/rio.routes';
import { errorHandlerFilter } from '../src/shared/errors/error-handler.filter';
const directory = mkdtempSync(join(tmpdir(), 'ecoroute-rj-test-'));
const storagePath = join(directory, 'plans.json');
const app = Fastify();
app.setErrorHandler(errorHandlerFilter);
await app.register(rioRoutes, { prefix: '/rio', storagePath });
afterAll(async () => { await app.close(); rmSync(directory, { recursive: true }); });

it('serve 127 pontos reais, cinco regiões e materiais específicos por ponto', async () => {
  const response = await app.inject('/rio/ecopontos');
  const points = response.json();
  expect(response.statusCode).toBe(200);
  expect(points).toHaveLength(127);
  expect(new Set(points.map((p: any) => p.region)).size).toBe(5);
  expect(points.every((p: any) => p.city === 'Rio de Janeiro' && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && p.sourceFile)).toBe(true);
  expect(points.find((p: any) => p.name === 'SÁ VIANA').materials).toEqual([]);
  expect(points.find((p: any) => p.name === 'MERINDIBA').materials).toEqual(['Lixo domiciliar']);
  expect((await app.inject('/rio/ecopontos?region=Centro')).json()).toHaveLength(10);
});

it('faz CRUD e persiste planos após reabrir o servidor', async () => {
  const points = (await app.inject('/rio/ecopontos')).json();
  const data = { pointId: points[0].id, material: points[0].materials[0], date: '2026-10-30', notes: 'Separar resíduos' };
  const create = await app.inject({ method:'POST', url:'/rio/planos', payload: data });
  expect(create.statusCode).toBe(201);
  const id = create.json().id;
  const second = Fastify();
  await second.register(rioRoutes, { prefix:'/rio', storagePath });
  expect((await second.inject('/rio/planos')).json()[0].id).toBe(id);
  await second.close();
  const update = await app.inject({ method:'PUT', url:'/rio/planos/'+id, payload:{...data,status:'Concluído'} });
  expect(update.statusCode).toBe(200);
  expect(update.json().status).toBe('Concluído');
  expect((await app.inject({method:'DELETE',url:'/rio/planos/'+id})).statusCode).toBe(204);
  expect((await app.inject('/rio/planos')).json()).toEqual([]);
  expect((await app.inject({method:'DELETE',url:'/rio/planos/'+id})).statusCode).toBe(404);
});

it('rejeita data inexistente e material não aceito sem gravar', async () => {
  const points = (await app.inject('/rio/ecopontos')).json();
  const point = points.find((p: any) => p.name === 'MERINDIBA');
  for (const payload of [
    {pointId:point.id,material:'Lixo domiciliar',date:'2027-02-31'},
    {pointId:point.id,material:'Entulho',date:'2026-10-30'},
  ]) expect((await app.inject({method:'POST',url:'/rio/planos',payload})).statusCode).toBeGreaterThanOrEqual(400);
  expect((await app.inject('/rio/planos')).json()).toEqual([]);
});

