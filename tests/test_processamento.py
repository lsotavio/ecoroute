import sqlite3
import unittest
from pathlib import Path
from scripts.processar_bases import valid_cep, valid_coordinates, rows
import tempfile
import tracemalloc
import csv


class ProcessingTests(unittest.TestCase):
    def test_cep(self):
        self.assertTrue(valid_cep('01001000'))
        for value in ('1001000', '', 'abcdefgh', '123456789'):
            self.assertFalse(valid_cep(value))

    def test_coordinates(self):
        self.assertTrue(valid_coordinates('-22.9', '-43.3'))
        for pair in [('nan', '0'), ('91', '0'), ('0', '181'), ('', '')]:
            self.assertFalse(valid_coordinates(*pair))

    def test_stream_memory(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'sample.csv'
            with path.open('w') as stream:
                for _ in range(100000):
                    stream.write('01001000;1\n')
            tracemalloc.start()
            self.assertEqual(sum(1 for _ in rows(path, 'utf-8', ';')), 100000)
            _, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            self.assertLess(peak, 2_000_000)

    def test_real_database(self):
        path = Path(__file__).resolve().parents[1]/'_resultados/reconecta.sqlite'
        with sqlite3.connect(f'file:{path.as_posix()}?mode=ro', uri=True) as db:
            self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
            total, distinct = db.execute('SELECT count(*),count(DISTINCT cep) FROM ceps').fetchone()
            self.assertGreater(total, 0)
            self.assertEqual(total, distinct)
            with (path.parent/'02_ceps_ibge.csv').open(encoding='utf-8-sig', newline='') as stream:
                reader = csv.reader(stream, delimiter=';')
                next(reader)
                self.assertEqual(sum(1 for _ in reader), total)
            self.assertEqual(db.execute("SELECT count(*) FROM ceps WHERE length(cep)!=8 OR fonte IS NULL OR referencia_origem IS NULL").fetchone()[0], 0)
            self.assertGreater(db.execute("SELECT count(*) FROM ceps WHERE cep LIKE '0%'").fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM pontos_coleta').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM pontos_candidatos').fetchone()[0], 0)
            self.assertGreater(db.execute('SELECT count(*) FROM indicadores_municipais').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM indicadores_municipais WHERE arquivo_origem IS NULL OR referencia_origem IS NULL').fetchone()[0], 0)


if __name__ == '__main__':
    unittest.main()
