# Design do EcoRoute RJ

A consulta começa com a rua do morador e o material que ele deseja descartar. No computador, CEP, material e ação de busca ficam na mesma linha. Em telas estreitas, os campos passam a uma coluna e mantêm a ordem de leitura pelo teclado.

O catálogo permite explorar por nome, região e material. Seus filtros são independentes da consulta por CEP e reaparecem com os valores anteriores ao voltar ao catálogo.

Nos resultados, identifique a região e o nome do ecoponto. Em seguida, apresente os materiais aceitos, o endereço e a localidade. Quando a API fornecer distância, use quilômetros com vírgula decimal e indique que a medida é em linha reta. Mantenha a fonte consultável e coloque a ação de planejar depois das informações do ponto.

O formulário informa os serviços que recebem o CEP e o logradouro. Erros de consulta aparecem junto aos campos. Uma resposta válida sem pontos oferece a opção de mudar o material ou voltar ao catálogo.

Ao abrir um plano novo, o formulário leva o material escolhido na busca ou no catálogo quando o ponto o aceita. Na edição, o valor inicial é sempre o do plano salvo.

Se a consulta por CEP falhar, “Buscar por bairro” leva o foco ao campo do catálogo. Uma falha ao salvar aparece junto ao botão de salvar e preserva os valores digitados. A contagem de resultados exige uma resposta válida do catálogo.

## Revisar o fluxo

Na raiz do projeto, execute:

```powershell
node .agents/skills/antiwebslop/scripts/slop-lint.mjs frontend/src/RioApp.tsx frontend/src/rio.css frontend/src/components/RioPointCard.tsx --quiet
```
