# Ecoroute RJ

## Visão Geral

Aplicação acadêmica para consultar 127 ecopontos da Comlurb na cidade do Rio de Janeiro e criar planos pessoais de descarte, alinhada à Meta 11.6 do ODS 11. O catálogo é consumido pela API Fastify e os planos são persistidos em disco, sem reservas ou envio de solicitações à Comlurb.

## Início Rápido

Requer Node.js 20 ou superior. Execute na raiz extraída do projeto. Em PowerShell:

```powershell
npm ci
npm --prefix frontend ci
npm test
npm run build
npm run build:frontend
$env:PORT='3001'
$env:USE_IN_MEMORY_DB='true'
npm start
```

Em outro terminal, na mesma pasta:

```powershell
$env:VITE_API_BASE_URL='http://127.0.0.1:3001'
npm run dev:frontend
```

Abra http://localhost:5173. Se a porta estiver ocupada, use o endereço indicado pelo Vite. API: http://127.0.0.1:3001/api/v1/rio/ecopontos. Não abra index.html diretamente. A instalação inicial requer internet; a consulta ao catálogo e o CRUD funcionam localmente sem APIs externas.

## Configuração

| Variável | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| PORT | número | Não | 3000 | Porta da API; roteiro usa 3001 para evitar conflito com versão anterior |
| HOST | texto | Não | 0.0.0.0 | Interface de escuta |
| USE_IN_MEMORY_DB | booleano | Não | conforme ambiente | true dispensa PostgreSQL para os módulos anteriores; os planos RJ persistem em JSON |
| DATABASE_URL | texto | Não | vazio | Conexão opcional dos módulos da Sprint 1 |
| VITE_API_BASE_URL | texto | Não | http://localhost:3000 | Endereço da API; deve usar a mesma porta do servidor |

## Decisões de Arquitetura

- React/TypeScript com componentes de cartão, formulário e cliente HTTP nativo. Fonte canônica em data/ecopontos-rj.json, entregue pela API, não embutida na interface.
- GET /api/v1/rio/ecopontos aceita q, region e material. GET/POST /api/v1/rio/planos e PUT/DELETE /api/v1/rio/planos/:id implementam CRUD. Entradas validadas com Zod; erros exibidos na interface.
- Planos em data/local/planos.json, com gravação em arquivo temporário e renomeação. Adequado à demonstração com um processo local; sem autenticação e sem isolamento por usuário. Não expor como serviço público multiusuário.
- API da Sprint 1 preservada nos módulos collection-points e schedules. A interface atual usa o módulo RJ. Dados nacionais demonstrativos antigos ficam restritos aos testes no modo em memória; a inicialização não semeia PostgreSQL automaticamente.
- Catálogo baseado em 128 capturas fornecidas, com uma imagem complementar do Arará: 127 pontos distintos. Operação indicada nas capturas, não monitoramento em tempo real. Coordenadas oficiais SIURB/Comlurb; distâncias em linha reta, sem promessa de recebimento de eletrônicos.
- Consulte docs/ENTREGA_CLASSROOM.md e docs/FONTES_COMLURB.md. O processamento IBGE/SINIR é um estudo anterior, independente da execução da aplicação RJ.


Atualização: busca por CEP usa ViaCEP para obter logradouro/bairro e Esri World Geocoding para localização aproximada, sem chave ou cadastro. Requer internet e compartilha CEP com ViaCEP e logradouro com Esri; não grava consultas. Rejeita outras cidades, CEP geral sem rua e geocodificação genérica de município. GET /api/v1/rio/proximos?cep=20540903 retorna até cinco opções por distância Haversine em linha reta; parâmetro material filtra opções. Não representa percurso nem posição exata do usuário. Fonte das coordenadas: https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Hosted/2025_Ecopontos_Inaugurados_DLU_Visualizacao/FeatureServer/0 . Snapshot em data/comlurb-coordinates.json; associação por nome/região e, para Campo Grande, logradouro. Teste real do CEP 20540-903 retornou Salgueiro I como primeira opção, aproximadamente 0,94 km do ponto estimado do logradouro.
