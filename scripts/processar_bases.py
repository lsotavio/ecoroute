"""Preparação local e reproduzível. Não altera os arquivos de entrada."""
import argparse
import codecs
import csv
import json
import re
import sqlite3
from collections import Counter
from pathlib import Path
import xlrd


def csv_info(path):
    with path.open('rb') as stream:
        sample = stream.read(65536)
    try:
        text = codecs.getincrementaldecoder('utf-8-sig')().decode(sample, final=False)
        encoding = 'utf-8-sig'
    except UnicodeDecodeError:
        text = sample.decode('cp1252')
        encoding = 'cp1252'
    first = text.splitlines()[0] if text.strip() else ''
    delimiter = ';' if first.count(';') >= first.count(',') else ','
    return encoding, delimiter, [h.strip() for h in next(csv.reader([first], delimiter=delimiter))]


def rows(path, encoding, delimiter):
    with path.open(encoding=encoding, newline='') as stream:
        yield from csv.reader(stream, delimiter=delimiter)


def valid_cep(value):
    return bool(re.fullmatch(r'[0-9]{8}', value.strip()))


def valid_coordinates(lat, lon):
    try:
        return -90 <= float(lat) <= 90 and -180 <= float(lon) <= 180
    except (TypeError, ValueError):
        return False


def export(db, table, path):
    cursor = db.execute('SELECT * FROM ' + table)
    with path.open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream, delimiter=';')
        writer.writerow([c[0] for c in cursor.description])
        writer.writerows(cursor)


def run(root, output):
    output.mkdir(parents=True, exist_ok=True)
    dbpath = output / 'reconecta.sqlite'
    if dbpath.exists():
        raise FileExistsError('Use uma pasta de saída nova para preservar resultados anteriores.')
    db = sqlite3.connect(dbpath)
    db.execute('PRAGMA cache_size=-8192')
    db.executescript("""
      CREATE TABLE fontes_dados(id INTEGER PRIMARY KEY, organizacao TEXT, arquivo TEXT,
        data_referencia TEXT, licenca_identificada TEXT, observacoes TEXT);
      CREATE TABLE indicadores_municipais(codigo_municipio TEXT, municipio TEXT, uf TEXT,
        ano_referencia TEXT, indicador TEXT, valor TEXT, unidade TEXT, fonte TEXT,
        arquivo_origem TEXT, referencia_origem TEXT);
      CREATE INDEX indicador_municipio ON indicadores_municipais(municipio,uf);
    """)
    point_fields = """id INTEGER PRIMARY KEY, nome TEXT, tipo TEXT, endereco TEXT,
      numero TEXT, complemento TEXT, bairro TEXT, cep TEXT, municipio TEXT, uf TEXT,
      latitude REAL, longitude REAL, materiais_aceitos TEXT, horario_funcionamento TEXT,
      acesso_publico INTEGER, fonte TEXT, arquivo_origem TEXT, referencia_origem TEXT,
      ano_referencia INTEGER, status_validacao TEXT, pendencias TEXT"""
    for table in ('pontos_coleta', 'pontos_candidatos'):
        db.execute(f'CREATE TABLE {table} ({point_fields})')
        for col in ('cep', 'municipio', 'uf', 'status_validacao'):
            db.execute(f'CREATE INDEX {table}_{col} ON {table}({col})')
    inventory, dictionaries, sinir = [], [], []
    for folder in (root/'IBGE', root/'Sistema Nacional de Informações sobre a Gestão de Resíduos Sólidos'):
        if not folder.is_dir():
            raise FileNotFoundError(folder)
        for path in sorted(folder.rglob('*')):
            if not path.is_file():
                continue
            rel = str(path.relative_to(root))
            year = re.findall(r'20[0-9]{2}', rel)
            category = 'irrelevante para o objetivo'
            encoding = delimiter = ''
            headers = []
            if path.suffix.lower() == '.csv':
                encoding, delimiter, headers = csv_info(path)
                if 'TOT_END' in headers and 'CEP' in headers:
                    category = 'base de CEPs'
                elif 'COD_ESPECIE' in headers:
                    category = 'coordenadas sem vínculo com CEP'
                elif path.name.startswith('Municipal') and 'Município Declarante' in headers:
                    category = 'indicadores municipais'
                else:
                    category = 'relatório administrativo'
                if 'Sistema Nacional' in rel:
                    sinir.append((path, encoding, delimiter, headers))
            elif path.suffix.lower() == '.xls':
                book = xlrd.open_workbook(str(path))
                for sheet in book.sheets():
                    dictionaries.append({'arquivo': rel, 'aba': sheet.name,
                                         'linhas': [sheet.row_values(i) for i in range(sheet.nrows)]})
                category = 'dicionário de dados'
            inventory.append([rel, path.suffix, path.stat().st_size, year[-1] if year else '',
                              encoding, delimiter, json.dumps(headers, ensure_ascii=False), category])
            db.execute('INSERT INTO fontes_dados VALUES(NULL,?,?,?,?,?)', (
                'IBGE' if rel.startswith('IBGE') else 'SINIR', rel, year[-1] if year else None,
                None, 'Ano do caminho é edição, não necessariamente referência. Licença não identificada. '+category))
    with (output/'01_inventario_arquivos.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream, delimiter=';')
        writer.writerow(['arquivo','formato','bytes','ano_caminho','codificacao_amostra','delimitador','colunas','classificacao'])
        writer.writerows(inventory)
    (output/'01_dicionarios.json').write_text(json.dumps(dictionaries, ensure_ascii=False, indent=2), encoding='utf-8')
    report = lambda name, text: (output/name).write_text(text, encoding='utf-8')
    report('01_relatorio_inventario.md', '# Inventário\n\n'+str(Counter(r[-1] for r in inventory))+
           '\n\nCSV: amostra de até 64 KiB. Coordenadas estaduais não importadas. KML de trajetos apenas inventariados; não são cadastros CEP/endereço. Dicionários XLS lidos integralmente e transcritos em 01_dicionarios.json. Cabeçalhos duplicados preservados por posição.')
    cepfiles = [r for r in inventory if r[-1] == 'base de CEPs']
    if len(cepfiles) != 1:
        raise ValueError('Esperada uma única base de CEPs')
    entry = cepfiles[0]
    source = root/entry[0]
    reader = rows(source, entry[4], entry[5])
    headers = next(reader)
    statistics = headers[1:]
    if not all(re.fullmatch(r'TOT_[A-Z0-9_]+', h) for h in statistics):
        raise ValueError('Esquema estatístico inesperado')
    db.execute('CREATE TABLE ceps(cep TEXT PRIMARY KEY CHECK(length(cep)=8),'+
               ','.join(f'"{h}" INTEGER' for h in statistics)+', fonte TEXT, ano_referencia INTEGER, referencia_origem TEXT)')
    counts = Counter(lidos=0, exportados=0, duplicados=0,
                     cep_ou_estrutura_invalida=0, estatistica_invalida=0)
    with (output/'02_rejeitados.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        reject = csv.writer(stream, delimiter=';')
        reject.writerow(['linha','cep','motivo'])
        for line, values in enumerate(reader, 2):
            counts['lidos'] += 1
            cep = values[0].strip() if values else ''
            reason = None
            if len(values) != len(headers) or not valid_cep(cep):
                reason = 'cep_ou_estrutura_invalida'
            elif not all(re.fullmatch(r'[0-9]+', v.strip()) for v in values[1:]):
                reason = 'estatistica_invalida'
            if reason:
                counts[reason] += 1
                reject.writerow([line, cep, reason])
                continue
            data = [cep, *map(int, values[1:]), entry[0], 2022, str(line)]
            existing = db.execute('SELECT * FROM ceps WHERE cep=?', (cep,)).fetchone()
            if existing:
                counts['duplicados'] += 1
                reject.writerow([line, cep, 'duplicado_identico' if list(existing[1:1+len(statistics)]) == data[1:1+len(statistics)] else 'duplicado_conflitante'])
                if list(existing[1:1+len(statistics)]) != data[1:1+len(statistics)]:
                    raise ValueError(f'CEP conflitante: {cep}; interrompido para revisão')
                continue
            db.execute('INSERT INTO ceps VALUES('+','.join('?' for _ in data)+')', data)
            counts['exportados'] += 1
    export(db, 'ceps', output/'02_ceps_ibge.csv')
    zeros = db.execute("SELECT cep FROM ceps WHERE cep LIKE '0%' LIMIT 5").fetchall()
    report('02_relatorio_ceps.md', '# CEPs CNEFE 2022\n\n'+json.dumps(counts, ensure_ascii=False)+
           '\n\nCampos TOT_* mantidos conforme dicionário. Zeros preservados: '+str(zeros)+
           '\n\nNão certifica vigência postal em 2026. Descartes rastreáveis em 02_rejeitados.csv.')
    report('03_relatorio_georreferenciamento.md', '# Georreferenciamento\n\nNão foi possível gerar coordenadas por CEP com os arquivos fornecidos.\n\nOs agregados possuem CEP e totais; as coordenadas possuem COD_UF, COD_MUN, COD_ESPECIE, LATITUDE, LONGITUDE e NV_GEO_COORD. Os dicionários não fornecem chave comum. COD_ESPECIE classifica endereços, não ecopontos. NV_GEO_COORD inclui coordenadas estimadas. Nenhuma junção por município ou UF foi realizada.')
    filecounts = {}
    for path, encoding, delimiter, headers in sorted(sinir, key=lambda x: str(x[0]), reverse=True):
        rel = str(path.relative_to(root))
        count = 0
        for line, values in enumerate(rows(path, encoding, delimiter)):
            if line == 0:
                continue
            if not values:
                continue
            if len(values) != len(headers):
                raise ValueError(f'Estrutura irregular: {rel}, registro {line+1}')
            count += 1
            data = dict(zip(headers, values))
            if not path.name.startswith('Municipal') or 'Município Declarante' not in headers:
                continue
            data = {key: value.strip() for key, value in data.items()}
            indicators = [
                {'coluna': index+1, 'indicador': header, 'valor': value.strip(),
                 'unidade': 'TON' if header == 'Massa (TON)' else None}
                for index, (header, value) in enumerate(zip(headers, values))
                if index >= 8 and value.strip()
            ]
            db.execute('INSERT INTO indicadores_municipais VALUES(?,?,?,?,?,?,?,?,?,?)', (
                None, data.get('Município Declarante'), data.get('UF Declarante'),
                data.get('Ano Referencia') or None, path.stem,
                json.dumps(indicators, ensure_ascii=False), None, 'SINIR', rel,
                f'registro {line+1}; declaração {data.get("Declaração","")}'))
        filecounts[rel] = count
        db.commit()
    for table, name in [('pontos_coleta','04_pontos_confirmados.csv'),('pontos_candidatos','04_pontos_candidatos.csv'),('indicadores_municipais','04_indicadores_municipais.csv')]:
        export(db, table, output/name)
    report('04_relatorio_sinir.md', '# SINIR\n\nOs arquivos são declarações administrativas, diagnósticos, áreas degradadas, passivos e zonas favoráveis. Endereço de área degradada ou planejada não comprova instalação operacional nem recebimento público. Nenhum ponto foi promovido a confirmado ou candidato automaticamente. Registros municipais preservados por declaração, com lista JSON de indicadores no campo valor; cada item contém coluna, indicador, valor e unidade. Não somáveis entre relatórios. Campos e colunas duplicadas preservados pela referência de origem. Ano Referencia da linha prevalece sobre pasta; edição 2025 contém referência 2024.\n\nRegistros lidos por arquivo:\n\n'+json.dumps(filecounts, ensure_ascii=False, indent=2))
    totals = {t: db.execute(f'SELECT count(*) FROM {t}').fetchone()[0] for t in
              ('ceps','pontos_coleta','pontos_candidatos','indicadores_municipais','fontes_dados')}
    coverage = db.execute('SELECT uf,count(DISTINCT municipio) FROM indicadores_municipais GROUP BY uf').fetchall()
    report('06_relatorio_final.md', '# Resultado do processamento\n\n'+json.dumps(totals, ensure_ascii=False, indent=2)+
           '\n\nCEPs: '+json.dumps(counts, ensure_ascii=False)+
           '\n\nCobertura municipal declarada por UF (nomes, sem código IBGE): '+str(coverage)+
           '\n\nZero pontos confirmados ou candidatos extraídos. Não há evidência suficiente de instalações operacionais individualizadas abertas ao público; quantidade de instalações não públicas não determinada. Indicadores estaduais permanecem nos originais e inventário. Licenças não identificadas nos arquivos inspecionados.\n\nA base não suporta proximidade por CEP: faltam coordenadas vinculadas aos CEPs e cadastro validado de pontos. Pode alimentar consulta histórica de CEPs e indicadores, com referência temporal explícita. Não conectar aos pontos demonstrativos da aplicação como dados oficiais. Próximo passo: obter base documentada CEP/coordenadas e cadastro de pontos com endereço, materiais e acesso público comprovados. Sem alterações de interface ou chamadas de rede.')
    db.commit()
    if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
        raise RuntimeError('Integridade SQLite inválida')
    db.close()
    print(json.dumps(totals))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--origem', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--saida', type=Path, default=Path(__file__).resolve().parents[1]/'_resultados')
    args = parser.parse_args()
    run(args.origem.resolve(), args.saida.resolve())

