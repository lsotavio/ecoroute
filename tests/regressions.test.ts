import { afterEach, expect, it, vi } from 'vitest';
import { lookupCepLocation } from '../frontend/src/geocoding';
import { createEcoRouteApi } from '../frontend/src/api';
import { SchedulesService } from '../src/modules/schedules/schedules.service';
import { InMemorySchedulesRepository } from '../src/modules/schedules/schedules.repository';
import { InMemoryCollectionPointsRepository } from '../src/modules/collection-points/collection-points.repository';

afterEach(() => vi.unstubAllGlobals());

it('rejeita CEP inexistente sem inventar coordenadas', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ erro: true })));
  vi.stubGlobal('fetch', fetch);
  await expect(lookupCepLocation('20000000')).rejects.toThrow('CEP não encontrado');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('preserva a causa da falha de rede', async () => {
  const cause = new Error('offline');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause));
  await expect(lookupCepLocation('22775055')).rejects.toMatchObject({ cause });
});

it('não usa a capital quando a geocodificação não encontra o endereço', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ localidade: 'Niterói', uf: 'RJ' })))
    .mockResolvedValueOnce(new Response('[]')));
  await expect(lookupCepLocation('24000000')).rejects.toThrow('Endereço não localizado');
});

it('rejeita booleanos textuais recebidos da API', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    status: 'UP', timestamp: 'now', service: 'API', version: '1', ods: '11',
    database: { connected: 'false', mode: 'postgres' },
  }))));
  await expect(createEcoRouteApi('http://localhost').getHealth()).rejects.toThrow('booleano');
});

it.each(['2099-02-31', '2099-02-29', '2099-13-01', '2099-01-00'])(
  'rejeita a data inexistente %s', async (scheduled_date) => {
    const service = new SchedulesService(new InMemorySchedulesRepository(), new InMemoryCollectionPointsRepository());
    await expect(service.createSchedule({
      collection_point_id: '7f8b9e6a-12ab-4c3d-8e45-f9a8b7c6d5e4',
      user_name: 'Ana Silva', user_email: 'ana@example.com', scheduled_date,
      waste_category: 'BATTERIES', items_description: 'Baterias usadas',
    })).rejects.toThrow('Data informada é inválida');
  }
);
