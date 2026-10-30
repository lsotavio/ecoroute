# Fonte do catálogo Comlurb

Fonte: painel Ache seu Ecoponto da Comlurb, capturas fornecidas pelo autor do projeto. Página de referência: https://comlurb.prefeitura.rio/ecopontos/ . Revisão das transcrições: 30/10/2026. A data exata de captura não foi informada.

| Região | Pontos distintos |
|---|---:|
| Centro | 10 |
| Zona Norte | 41 |
| Zona Oeste | 20 |
| Zona Sudoeste | 23 |
| Zona Sul e Grande Tijuca | 33 |
| Total | 127 |

As 128 imagens foram processadas com OCR do Windows e revisadas visualmente em painéis de leitura. Centro (2).png é uma imagem complementar do Arará, não um novo ponto. Dois pontos chamados Campo Grande têm endereços distintos e foram mantidos.

Cada registro mantém sourceFile, source, reviewedAt e status. A transcrição mantém grafias da fonte, corrigindo erros de reconhecimento identificados na revisão. Os originais não foram alterados. OCR bruto: data/comlurb-ocr.json. Catálogo: data/ecopontos-rj.json. Rotina reproduzível: scripts/ocr-comlurb.ps1 e scripts/importar_comlurb.py; para refazer OCR são necessárias as imagens originais na pasta irmã Ecopontos da Comlurb.

Não foram inferidas latitude, longitude, CEP, limites de volume, horários de abertura ou capacidade diária. Coordenadas adicionadas da camada oficial, com objectid preservado. O Sá Viana tem a lista de materiais vazia na descrição da fonte. Merindiba, Paranapuã, Praia da Rosa, Sertão, Nova Divinéia e Pedro Américo (Santo Amaro) indicam apenas lixo domiciliar.

Os pontos são apresentados como operação indicada na captura. Isso não comprova funcionamento em tempo real. Os planos não são transmitidos à Comlurb. A licença MIT cobre o código do projeto; não atribui licença MIT às capturas ou marcas de terceiros. As imagens originais não são redistribuídas no pacote.


Atualização: busca por CEP usa ViaCEP para obter logradouro/bairro e Esri World Geocoding para localização aproximada, sem chave ou cadastro. Requer internet e compartilha CEP com ViaCEP e logradouro com Esri; não grava consultas. Rejeita outras cidades, CEP geral sem rua e geocodificação genérica de município. GET /api/v1/rio/proximos?cep=20540903 retorna até cinco opções por distância Haversine em linha reta; parâmetro material filtra opções. Não representa percurso nem posição exata do usuário. Fonte das coordenadas: https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Hosted/2025_Ecopontos_Inaugurados_DLU_Visualizacao/FeatureServer/0 . Snapshot em data/comlurb-coordinates.json; associação por nome/região e, para Campo Grande, logradouro. Teste real do CEP 20540-903 retornou Salgueiro I como primeira opção, aproximadamente 0,94 km do ponto estimado do logradouro.
