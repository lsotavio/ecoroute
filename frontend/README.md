# Ecoroute RJ — Front-End

## Visão Geral

Interface React para consulta de ecopontos da cidade do Rio de Janeiro e gerenciamento de planos pessoais de descarte pela API do projeto.

## Início Rápido

Execute o roteiro completo no README.md da raiz, iniciando API e interface em terminais separados.

## Configuração

| Variável | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| VITE_API_BASE_URL | texto | Não | http://localhost:3000 | URL da API local |

## Decisões de Arquitetura

- Entrada atual: RioApp.tsx; componentes RioPointCard e RioPlanForm.
- Cliente fetch nativo, feedback de erro/sucesso e persistência no servidor.
- Componentes anteriores preservados como histórico da Sprint 1, fora da entrada atual.
