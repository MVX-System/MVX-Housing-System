#!/usr/bin/env python3
"""Local-only XLSX/OOXML -> minimal SheetJS worksheet bridge, standard library only.

SECURITY: Reads ONLY input local xlsx, never accesses network, never writes files,
prints a bounded JSON structure with PRIVATE cells over a local stdout pipe to the
calling Node process. The Node process must NOT log or archive the JSON.

Never evaluate formulas or external links; preserve formula presence for HOLD rules.
"""
import json
import os
import posixpath
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

S = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
P = '{http://schemas.openxmlformats.org/package/2006/relationships}'
ALLOWED_CELL = re.compile(r'^(?:A|B|I|J|K|L|M|N)([1-9][0-9]{0,2})$')
DIM = re.compile(r'^[A-Z]{1,3}[1-9][0-9]{0,2}:[A-Z]{1,3}[1-9][0-9]{0,2}$')
MAX_BYTES = 10_000_000
MAX_DECOMPRESSED = 32_000_000
MAX_ENTRIES = 200
MAX_CELLS = 9000


def reject(code):
    raise ValueError(code)


def string_text(el):
    return ''.join(x.text or '' for x in el.iter(S+'t'))


def shared_strings(z, names):
    if 'xl/sharedStrings.xml' not in names:
        return []
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    items = root.findall(S+'si')
    if len(items)>100_000:
        reject('TOO_MANY_SHARED_STRINGS')
    return [string_text(x) for x in items]


def resolve_sheet(z,names):
    root=ET.fromstring(z.read('xl/workbook.xml'))
    sheets=root.find(S+'sheets')
    if sheets is None or len(sheets)!=1:
        reject('EXPECTED_ONE_WORKSHEET')
    rid=sheets[0].get(R+'id')
    rels='xl/_rels/workbook.xml.rels'
    if not rid or rels not in names:
        reject('WORKSHEET_REL_MISSING')
    relroot=ET.fromstring(z.read(rels))
    for r in relroot.findall(P+'Relationship'):
        if r.get('Id')!=rid:
            continue
        if r.get('TargetMode')=='External':
            reject('EXTERNAL_SHEET_REL')
        target=r.get('Target','')
        # OOXML targets may start at package root or be relative to xl/.
        resolved=posixpath.normpath(target.lstrip('/') if target.startswith('/') else 'xl/'+target)
        if resolved not in names or not resolved.startswith('xl/worksheets/'):
            reject('WORKSHEET_TARGET_INVALID')
        return resolved
    reject('WORKSHEET_REL_MISSING')


def convert(path):
    if not os.path.isfile(path) or not path.lower().endswith('.xlsx'):
        reject('XLSX_FILE_REQUIRED')
    size=os.path.getsize(path)
    if size<100 or size>MAX_BYTES:
        reject('XLSX_SIZE_REJECTED')
    with zipfile.ZipFile(path) as z:
        members=z.infolist()
        if len(members)>MAX_ENTRIES or sum(m.file_size for m in members)>MAX_DECOMPRESSED:
            reject('XLSX_CONTAINER_LIMIT_EXCEEDED')
        if any(m.file_size>0 and (m.compress_size==0 or m.file_size/max(m.compress_size,1)>1000) for m in members):
            reject('XLSX_COMPRESSION_REJECTED')
        names=set(z.namelist())
        if 'xl/workbook.xml' not in names:
            reject('MISSING_WORKBOOK_XML')
        sheet_path=resolve_sheet(z,names)
        strings=shared_strings(z,names)
        sheet=ET.fromstring(z.read(sheet_path))
        dim=sheet.find(S+'dimension')
        ref=dim.get('ref','') if dim is not None else ''
        if not DIM.fullmatch(ref):
            reject('INVALID_WORKSHEET_DIMENSIONS')
        rows=sheet.find(S+'sheetData')
        if rows is None:
            reject('MISSING_SHEETDATA')
        out={'!ref':ref}
        count=0
        for row in rows.findall(S+'row'):
            for c in row.findall(S+'c'):
                address=c.get('r','')
                m=ALLOWED_CELL.fullmatch(address)
                if not m:
                    continue
                if int(m.group(1))>800:
                    reject('ROW_OVER_LIMIT')
                count+=1
                if count>MAX_CELLS:
                    reject('CELL_LIMIT_EXCEEDED')
                t=c.get('t','n')
                value=c.find(S+'v')
                inline=c.find(S+'is')
                formula=c.find(S+'f')
                value_text=value.text if value is not None else None
                if t=='s':
                    try: v=strings[int(value_text)]
                    except (IndexError,ValueError,TypeError):reject('INVALID_SHARED_STRING_ID')
                    ctype='s'
                elif t=='inlineStr':
                    v=string_text(inline) if inline is not None else ''
                    ctype='s'
                elif t in ('str','e'):
                    v=value_text if value_text is not None else ''
                    ctype='s'
                elif t=='b':
                    v=value_text if value_text is not None else ''
                    ctype='b'
                elif t=='n':
                    # Preserve numeric decimal source string (no binary floating point rounding).
                    v=value_text
                    ctype='n'
                else:
                    v=value_text or ''
                    ctype='s'
                cell={'t':ctype}
                if v is not None:
                    if len(str(v))>300:reject('CELL_VALUE_TOO_LONG')
                    cell['v']=v
                if formula is not None:
                    # Do not transfer formula text, only the fact a formula exists.
                    cell['f']='FORMULA_PRESENT'
                out[address]=cell
        return out

if __name__=='__main__':
    try:
        if len(sys.argv)!=2:reject('USAGE_LOCAL_XLSX_ONLY')
        result=convert(sys.argv[1]); print(json.dumps(result,ensure_ascii=False,separators=(',',':')))
    except (ValueError,KeyError,zipfile.BadZipFile,ET.ParseError,OSError) as ex:
        # Exceptions should be stable error codes only, never local file content.
        code=str(ex)
        if not re.fullmatch(r'[A-Z][A-Z0-9_]*',code):code='INVALID_XLSX_CONTAINER'
        print('XLSX_BRIDGE_'+code,file=sys.stderr)
        sys.exit(2)
