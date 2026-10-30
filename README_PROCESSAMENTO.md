# Processamento Reconecta

Prepara dados locais IBGE/CNEFE e SINIR em CSV e SQLite. Não modifica a interface nem publica os dados como pontos de coleta.

## Execução

Na pasta Projeto Final, em PowerShell:

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -r scripts/requirements.txt
.venv/Scripts/python scripts/processar_bases.py
.venv/Scripts/python -m unittest discover -s tests -p "test_*.py"
```

O leitor xlrd é necessário somente para os dicionários XLS. O processamento não faz chamadas de rede. Os testes utilizam dados sintéticos e verificam a base gerada localmente.

## Configuração

| Opção | Padrão | Descrição |
|---|---|---|
| --origem | Pasta acima do projeto | Contém IBGE e Sistema Nacional de Informações sobre a Gestão de Resíduos Sólidos |
| --saida | Projeto Final/_resultados | Pasta de resultados; SQLite existente não é sobrescrito |

Para repetir, use outra pasta: `--saida _resultados_nova_execucao`.

## Decisões e limites

- CSVs lidos linha a linha; coordenadas estaduais somente amostradas. SQLite mantém os índices de deduplicação em disco.
- TOT_* conserva os nomes e definições dos dicionários. Não se infere vigência postal atual.
- Referência SINIR vem da coluna Ano Referencia, não do ano da pasta. Cada linha guarda uma declaração. O campo valor contém uma lista JSON com indicador, valor, unidade e posição da coluna. Não são valores automaticamente somáveis.
- Colunas repetidas conservam a posição na referência de origem. Nomes municipais não são convertidos em códigos IBGE sem tabela documentada.
- Pontos confirmados e candidatos ficam separados. Não há conversão automática de áreas degradadas ou planejadas em pontos de coleta.
- A base não se conecta automaticamente aos registros demonstrativos da API. Faltam coordenadas vinculadas a CEPs e pontos com recebimento público comprovado.
- Originais intactos. Resultados e ambiente virtual ficam fora do Git. Licenças devem ser verificadas antes da publicação.

