#!/usr/bin/env python3
"""PR-10K.4F: validate real XLSX structure and style metadata; synthetic only."""
import sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path

path=Path(sys.argv[1]) if len(sys.argv)>1 else None
if not path or not path.is_file():raise SystemExit('usage: python3 tests/pr10k4f_verify_ooxml.py /tmp/fifth_sheet.xlsx')
M='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
N={'m':M}

def fail(s):raise SystemExit('BLOCKED: PR-10K.4F OOXML '+s)
with zipfile.ZipFile(path) as z:
 if z.testzip() is not None:fail('ZIP corruption')
 w=ET.fromstring(z.read('xl/workbook.xml'))
 names=[e.get('name') for e in w.findall('.//m:sheet',N)]
 if names!=['Сводка','Квартиры','Данные счётчиков','Отсутствующие данные','Нестандартные значения']:fail('sheet names or order')
 s=ET.fromstring(z.read('xl/worksheets/sheet5.xml'))
 def cell(a):
  v=s.find(f".//m:c[@r='{a}']",N)
  if v is None:fail(f'missing cell {a}')
  return v
 for a in ['A1','A2','B2','E2','F2','A6','L6','A7','A12','J7','J10']:
  cell(a)
 for c in 'ABCDEFGHIJKL':
  if cell(c+'6').get('s') is None:fail('header has no real style '+c)
 if len(s.findall('.//m:mergeCell',N))!=2:fail('missing title/note merges')
 af=s.find('.//m:autoFilter',N)
 if af is None or af.get('ref')!='A6:L12':fail('bad filter')
 styles=ET.fromstring(z.read('xl/styles.xml'))
 xfs=styles.find('m:cellXfs',N)
 fonts=styles.find('m:fonts',N)
 fills=styles.find('m:fills',N)
 if xfs is None or fonts is None or fills is None:fail('missing styles.xml records')
 for c in 'ABCDEFGHIJKL':
  xf=xfs[int(cell(c+'6').get('s'))]
  ft=fonts[int(xf.get('fontId','0'))]
  if ft.find('m:b',N) is None:fail('header not bold '+c)
 if cell('A7').get('s') is None:fail('critical severity not styled')
 print('PR-10K.4F REAL XLSX OOXML PASS — 5 sheets, 12 bold headers, merges, filter, critical style')
