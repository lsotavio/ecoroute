export interface RioPoint {
  distanceKm?: number;
  id: string; name: string; address: string; locality: string; region: string;
  materials: string[]; sourceFile: string; status: string; hours: string;
}
export interface Plan {
  id: string; pointId: string; material: string; date: string; notes: string;
  status: 'Planejado' | 'Concluído' | 'Cancelado';
}
const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
export async function rioRequest<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(base+'/api/v1/rio'+path, {
      method, headers: data ? { 'Content-Type': 'application/json' } : undefined,
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch (cause) { throw new Error('Não foi possível conectar à API. Verifique se o servidor está iniciado.', { cause }); }
  if (response.status === 204) return undefined as T;
  const value = await response.json();
  if (!response.ok) throw new Error(value.detail || value.message || 'Não foi possível realizar a operação.');
  return value as T;
}
