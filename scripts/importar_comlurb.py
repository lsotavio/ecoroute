import json
import re
import uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
records = json.loads((root/'data/comlurb-ocr.json').read_text(encoding='utf-8-sig'))
points = []
corrections = {'Ceju': 'Caju', 'Gar-nEH)a': 'Gamboa', 'Cervalho': 'Carvalho',
               'Alemêo': 'Alemão', 'Cc:elho': 'Coelho', 'Cernpo': 'Campo',
               "R\'xque": 'Roque', 'JaFFa': 'Jaffa', 'Estaçõo': 'Estação'}
for item in records:
    if item['region'] == 'Centro' and item['file'] == 'Centro (2).png':
        continue
    pos = lambda v: min(v) if isinstance(v, list) else v
    threshold = 1440 if item['region'].startswith('Zona Sul') else 1500
    lines = [line['text'] for line in item['lines']
             if pos(line['x']) > threshold and 235 < pos(line['y']) < 560]
    text = ' '.join(lines).split('Como chegar')[0]
    for old, new in corrections.items():
        text = text.replace(old, new)
    text = text.replace('Lcaidade:', 'Localidade:').replace('(Localidade: Foi', '(Localidade: Rocinha). Foi')
    text = text.replace('lado da UPP - (Localidade:', 'lado da UPP - Botafogo (Localidade:')
    match = re.search(r'^(.*?) Ecoponto Localizado na (.*?) \(Localidade: (.*?)\)\. Foi inaugurado em (.*?) e recebe resíduos de (.*)', text)
    if not match:
        raise ValueError((item['file'], text))
    name, address, locality, opened, waste = match.groups()
    if name == 'MERINDIBA':
        address = 'Rua Jacupema, s/n, próximo ao largo da Penha - Penha'
    materials = [label for label in ['Lixo domiciliar','Entulho','Bens inservíveis','Galhada']
                 if label.lower() in waste.lower()]
    points.append(dict(
        id=str(uuid.uuid5(uuid.NAMESPACE_URL, item['region']+'/'+item['file'])),
        name=name, address=address, locality=locality, region=item['region'],
        city='Rio de Janeiro', materials=materials, opened=opened,
        source='Comlurb — Ache seu Ecoponto',
        sourceFile=item['region']+'/'+item['file'], reviewedAt='2026-10-30',
        status='Operação indicada na captura', hours='Não informado',
        latitude=None, longitude=None,
    ))
assert len(points) == 127
(root/'data/ecopontos-rj.json').write_text(json.dumps(points, ensure_ascii=False, indent=2), encoding='utf-8')
print(len(points))
