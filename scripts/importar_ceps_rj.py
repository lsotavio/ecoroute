"""Gera o índice de CEPs a partir do CSV municipal do CNEFE 2022 em ZIP."""
import csv
import io
import json
import math
import sys
from collections import defaultdict
from pathlib import Path
from statistics import median
from zipfile import ZipFile

groups = defaultdict(lambda: defaultdict(set))
comlurb = set()
with ZipFile(sys.argv[1]) as archive:
    with archive.open("3304557_RIO_DE_JANEIRO.csv") as raw:
        reader = csv.reader(io.TextIOWrapper(raw, encoding="utf-8-sig"), delimiter=";")
        fields = next(reader)
        indices = [fields.index(key) for key in (
            "COD_MUNICIPIO", "CEP", "DSC_LOCALIDADE", "NOM_TIPO_SEGLOGR", "NOM_TITULO_SEGLOGR",
            "NOM_SEGLOGR", "NUM_ENDERECO", "LATITUDE", "LONGITUDE", "NV_GEO_COORD",
        )]
        for row in reader:
            city, cep, area, kind, title, name, number, lat, lon, level = (row[i].strip() for i in indices)
            if city != "3304557" or not name or not area or not lat or not lon or level != "1":
                continue
            xy = float(lat), float(lon)
            if not (-23.1 <= xy[0] <= -22.7 and -44 <= xy[1] <= -43):
                continue
            street = " ".join(part for part in (kind, title, name) if part)
            if street in ("RUA MAJOR AVILA", "RUA MAJOR ÁVILA") and area == "TIJUCA" and number == "358":
                comlurb.add(xy)
            if len(cep) == 8 and cep.isdigit() and "20000000" <= cep < "23800000":
                groups[cep][street, area].add(xy)

def representative(points):
    lat = median(p[0] for p in points)
    lon = median(p[1] for p in points)
    # Um endereço observado próximo à mediana. Exclui grupos geograficamente dispersos.
    def distance(p):
        return math.hypot((p[0]-lat)*111, (p[1]-lon)*102)
    if max(map(distance, points)) > 1.5:
        return None
    return min(points, key=lambda p: (distance(p), p))

index = {}
for cep, names in sorted(groups.items()):
    if len(names) != 1:
        # Várias ruas podem compartilhar um CEP. Identifique apenas a área
        # quando todas as posições observadas formarem um grupo compacto.
        points = set().union(*names.values())
        xy = representative(points)
        if xy:
            index[cep] = ["Área do CEP " + cep[:5] + "-" + cep[5:], "Rio de Janeiro", *xy, "area"]
        continue
    (street, area), points = next(iter(names.items()))
    xy = representative(points)
    if xy:
        index[cep] = [street.title(), area.title(), *xy]
# CEP institucional da Comlurb: endereço postal Rua Major Ávila, 358, Tijuca.
# A associação exige correspondência de rua, bairro e número no mesmo município.
if comlurb and (xy := representative(comlurb)):
    index["20540903"] = ["Rua Major Ávila", "Tijuca", *xy]
output = Path(__file__).resolve().parents[1] / "data" / "cep-rj.json"
output.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
print("CEPs:", len(index), "Comlurb:", index.get("20540903"), "coordenadas do número 358:", len(comlurb))
