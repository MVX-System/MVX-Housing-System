#!/usr/bin/env python3
"""Independent OOXML contract check for xlsx-js-style synthetic workbook.
Uses stdlib zipfile and XML parser, no third-party spreadsheet APIs.
"""
import sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
f=Path(sys.argv[1]) if len(sys.argv)>1 else None
if not f or not f.exists(): raise SystemExit('BLOCKED: provide generated synthetic .xlsx path')
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(f) as z:
    if z.testzip() is not None: raise SystemExit('BLOCKED: corrupt XLSX zip')
    styles=ET.fromstring(z.read('xl/styles.xml'))
    sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
fonts=styles.find('m:fonts',ns)
borders=styles.find('m:borders',ns)
xfs=styles.find('m:cellXfs',ns)
assert fonts is not None and borders is not None and xfs is not None, 'Missing OOXML style collections'
fx=list(fonts); bx=list(borders); xx=list(xfs)
cells={c.attrib.get('r'):c for c in sheet.findall('.//m:sheetData/m:row/m:c',ns)}
letters='ABCDEFGHIJKLMNOPQR'
for ch in letters:
    key=ch+'2'
    assert key in cells, f'{key} header missing'
    xf=xx[int(cells[key].attrib.get('s','0'))]
    font=fx[int(xf.attrib.get('fontId','0'))]
    b=font.find('m:b',ns)
    assert b is not None and b.attrib.get('val','1') not in ('0','false'),f'{key} not actually bold'
    border=bx[int(xf.attrib.get('borderId','0'))]
    left=border.find('m:left',ns)
    expected=ch in 'BHNQ'
    has=left is not None and left.attrib.get('style') in ('thin','medium','thick','double')
    assert has == expected,f'{key} unexpected/missing left vertical separator: {has}'
assert sheet.find('.//m:autoFilter',ns).attrib.get('ref')=='A2:R3','Bad auto-filter reference'
assert len(sheet.findall('.//m:mergeCell',ns)) == 1,'Legend merge not persisted'
for key,expect in {'B3':0.0,'H3':0.0,'M3':-338.0,'N3':1.5,'O3':3.5}.items():
    cell=cells.get(key)
    assert cell is not None,f'Missing number {key}'
    val=cell.find('m:v',ns)
    assert val is not None and float(val.text)==expect, f'{key} wrong numeric value'
print('PR-10K.4 STYLED XLSX OOXML PASS — 18/18 bold, separators B/H/N/Q, merged legend, zero/negative preserved')
