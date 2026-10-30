# Ecoroute RJ — entrega da Sprint 2

## Propósito

Ajudar moradores da cidade do Rio de Janeiro a encontrar ecopontos da Comlurb por nome, região, endereço ou material e organizar planos pessoais de descarte. O projeto contribui para a gestão de resíduos urbanos prevista na Meta 11.6 do ODS 11.

## O que entregar

Anexe Ecoroute-RJ-Sprint2.zip e o link do repositório atualizado. O ZIP contém código-fonte, catálogo transcrito, testes e instruções. Não contém dependências instaladas, credenciais, planos pessoais ou as bases nacionais de vários gigabytes. O professor instala as dependências com npm ci conforme README.md.

## Demonstração de 3 a 5 minutos

1. Abra a aplicação e mostre os 127 pontos das cinco regiões.
2. Filtre Centro: resultado esperado, 10 pontos.
3. Busque Merindiba: confira que aceita somente lixo domiciliar conforme a captura.
4. Clique em Planejar meu descarte, escolha a data e registre uma anotação.
5. Salve e mostre o plano retornado pela API. Recarregue a página para demonstrar persistência.
6. Edite a situação para Concluído e salve.
7. Exclua o plano e mostre a mensagem de confirmação.
8. Mostre Fonte e funcionamento e explique que não há vínculo de agendamento com a Comlurb.

## Correspondência com os requisitos

| Requisito | Evidência |
|---|---|
| Front-End organizado | React, CSS responsivo, catálogo e planos pessoais |
| Componentização | RioApp, RioPointCard, RioPlanForm e rio-api |
| Integração | GET/POST/PUT/DELETE no módulo RJ da API Fastify existente |
| Cadastro e formulários | Criação de planos pessoais validados no servidor |
| Consulta e atualização | Listagem, filtros, edição de dados e situação |
| Exclusão | DELETE com confirmação na interface |
| Tratamento de erros | Validação Zod e mensagens de sucesso/erro |
| Testes | 34 testes Vitest aprovados, incluindo CRUD, persistência e validação |

## Limites apresentados com transparência

- O status de operação corresponde às capturas, não a uma inspeção ao vivo.
- Não há coordenadas numéricas verificadas nas capturas. A entrega utiliza busca textual e regional.
- Sá Viana não informa materiais; não permite criar plano com material presumido.
- Planos são organização pessoal, não reservas com a Comlurb.
- Aplicação local, sem login, sem implantação pública e sem isolamento entre usuários.
- Validação manual realizada no navegador: busca, filtro Centro, criação, edição, exclusão. Layout adaptável implementado; teste em dispositivo físico não realizado.

## Texto para acompanhar a entrega

Ecoroute RJ é uma aplicação web voltada à cidade do Rio de Janeiro, alinhada ao ODS 11.6. A Sprint 2 integra o Front-End React à API Fastify, disponibilizando consulta de 127 ecopontos da Comlurb e CRUD de planos pessoais de descarte com persistência local. Os dados foram transcritos de capturas do painel oficial, com indicação de origem e limitações. O projeto inclui instruções de execução, testes automatizados e documentação das funcionalidades.
