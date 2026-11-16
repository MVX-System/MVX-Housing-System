/** PR-10K.8B3J — browser-only exact OOXML decoder.
 * Reads the user's File in memory, never uploads, evaluates formulas, or
 * converts Excel numeric text through IEEE-754. Uses native DecompressionStream.
 * Narrowly supports the MVX source template: one worksheet, cells A/B/I:N.
 * Rejects unsupported / suspicious ZIP/XML. Returns a bounded SheetJS-shaped
 * worksheet for the unchanged source-only R4 classifier.
 */
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const RID='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const REL='http://schemas.openxmlformats.org/package/2006/relationships';
const MAX_COMPRESSED=10_000_000, MAX_UNCOMPRESSED=32_000_000, MAX_ENTRIES=200, MAX_CELLS=9000;
const decoder=new TextDecoder('utf-8',{fatal:true});
const fail=code=>{ const e=new Error(code); e.code=code; throw e; };
const u16=(v,o)=>v.getUint16(o,true), u32=(v,o)=>v.getUint32(o,true);
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++) c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function validPath(name){const n=name.endsWith('/')?name.slice(0,-1):name;return /^(?!\/)[A-Za-z0-9_.\/\[\]-]{1,200}$/.test(n)&&!n.split('/').some(x=>x==='.'||x==='..'||!x);}
function directory(bytes){
  if(bytes.length<100||bytes.length>MAX_COMPRESSED)fail('XLSX_SIZE_REJECTED');
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let end=-1;for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){
    if(u32(dv,p)===0x06054b50 && p+22+u16(dv,p+20)===bytes.length){end=p;break;}
  }
  if(end<0)fail('ZIP_END_RECORD_MISSING');
  if(u16(dv,end+4)!==0||u16(dv,end+6)!==0)fail('MULTI_DISK_ZIP_UNSUPPORTED');
  const count=u16(dv,end+10),size=u32(dv,end+12),offset=u32(dv,end+16);
  if(count===0||count!==u16(dv,end+8)||count>MAX_ENTRIES||count===65535||
     offset===0xffffffff||size===0xffffffff||offset+size>end)fail('ZIP_DIRECTORY_INVALID');
  const entries=new Map();let pos=offset,total=0;
  for(let i=0;i<count;i++){
    if(pos+46>offset+size||u32(dv,pos)!==0x02014b50)fail('ZIP_CENTRAL_DIRECTORY_INVALID');
    const flags=u16(dv,pos+8),method=u16(dv,pos+10),crc=u32(dv,pos+16);
    const compressed=u32(dv,pos+20),uncompressed=u32(dv,pos+24);
    const nameLen=u16(dv,pos+28),extra=u16(dv,pos+30),comment=u16(dv,pos+32),local=u32(dv,pos+42);
    const next=pos+46+nameLen+extra+comment;
    if(next>offset+size||local===0xffffffff||compressed===0xffffffff||uncompressed===0xffffffff)fail('ZIP64_UNSUPPORTED');
    const name=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen));
    if(!validPath(name)||entries.has(name))fail('UNSAFE_OR_DUPLICATE_ZIP_ENTRY');
    if(flags&1 || (method!==0&&method!==8))fail('UNSUPPORTED_ZIP_ENCRYPTION_OR_METHOD');
    total+=uncompressed;
    if(total>MAX_UNCOMPRESSED||(uncompressed && (!compressed||uncompressed/compressed>1000)))fail('XLSX_CONTAINER_LIMIT_EXCEEDED');
    if(local+30>offset||u32(dv,local)!==0x04034b50)fail('ZIP_LOCAL_HEADER_INVALID');
    const localNameLen=u16(dv,local+26),localExtra=u16(dv,local+28),start=local+30+localNameLen+localExtra;
    if(start+compressed>offset)fail('ZIP_FILE_BOUNDS_INVALID');
    entries.set(name,{compressed,uncompressed,method,crc,start});pos=next;
  }
  if(pos!==offset+size)fail('ZIP_DIRECTORY_SIZE_MISMATCH');
  return entries;
}
async function member(bytes,entries,name){
  const e=entries.get(name);if(!e)fail('XLSX_REQUIRED_XML_MISSING');
  const chunk=bytes.subarray(e.start,e.start+e.compressed);let result;
  if(e.method===0) result=chunk;
  else {
    if(typeof DecompressionStream==='undefined')fail('DEFLATE_RAW_UNSUPPORTED');
    try{
      const stream=new Blob([chunk]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      // Central size limit already checked. A fabricated stream can still expand;
      // bound the decompressed bytes as they arrive rather than buffering without limit.
      const reader=stream.getReader();const parts=[];let len=0;
      while(true){const r=await reader.read();if(r.done)break;len+=r.value.byteLength;
        if(len>e.uncompressed||len>MAX_UNCOMPRESSED){await reader.cancel();fail('ZIP_INFLATED_SIZE_INVALID');}
        parts.push(r.value);
      }
      result=new Uint8Array(len);let at=0;for(const p of parts){result.set(p,at);at+=p.byteLength;}
    }catch(ex){if(ex?.code)throw ex;fail('ZIP_DEFLATE_FAILED');}
  }
  if(result.byteLength!==e.uncompressed||crc32(result)!==e.crc)fail('ZIP_MEMBER_CHECKSUM_INVALID');
  try{return decoder.decode(result);}catch{fail('INVALID_XML_UTF8');}
}
function xml(text){
  if(text.length>MAX_UNCOMPRESSED||/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text))fail('UNSAFE_XML_DECLARATION');
  if(typeof DOMParser!=='function')fail('DOM_PARSER_UNAVAILABLE');
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.getElementsByTagName('parsererror').length||doc.getElementsByTagNameNS('*','parsererror').length)fail('INVALID_OOXML_XML');
  return doc;
}
const tags=(doc,tag)=>doc.getElementsByTagNameNS(NS,tag);
const first=(doc,tag)=>tags(doc,tag).item(0);
function textOf(el){return Array.from(tags(el,'t')).map(x=>x.textContent??'').join('');}
function resolvedSheet(wb,rels,names){
  const sheets=tags(wb,'sheet');if(sheets.length!==1)fail('EXPECTED_ONE_WORKSHEET');
  const rid=sheets.item(0).getAttributeNS(RID,'id')||sheets.item(0).getAttribute('r:id');
  if(!rid)fail('WORKSHEET_REL_MISSING');
  const relation=Array.from(rels.getElementsByTagNameNS(REL,'Relationship')).find(x=>x.getAttribute('Id')===rid);
  if(!relation||relation.getAttribute('TargetMode')==='External')fail('WORKSHEET_REL_MISSING');
  const path=relation.getAttribute('Target')||'';
  const combined=path.startsWith('/')?path.slice(1):'xl/'+path;
  const out=[];for(const part of combined.split('/')){
    if(part==='.'||part==='')continue;
    if(part==='..'){if(!out.length)fail('WORKSHEET_TARGET_INVALID');out.pop();}
    else out.push(part);
  }
  const resolved=out.join('/');
  if(!/^xl\/worksheets\/[a-zA-Z0-9_.-]+\.xml$/.test(resolved)||!names.has(resolved))fail('WORKSHEET_TARGET_INVALID');
  return resolved;
}
function sharedStrings(doc){
  if(!doc)return [];
  const items=tags(doc,'si');if(items.length>100_000)fail('TOO_MANY_SHARED_STRINGS');
  return Array.from(items,x=>textOf(x));
}
function cellsFromXml(doc,strings){
  const dimension=first(doc,'dimension');const ref=dimension?.getAttribute('ref')??'';
  if(!/^[A-Z]{1,3}[1-9]\d{0,2}:[A-Z]{1,3}[1-9]\d{0,2}$/.test(ref))fail('INVALID_WORKSHEET_DIMENSIONS');
  const output={'!ref':ref};const sd=first(doc,'sheetData');if(!sd)fail('MISSING_SHEETDATA');
  let count=0;
  for(const row of tags(sd,'row'))for(const cell of tags(row,'c')){
    const addr=cell.getAttribute('r')||'';const m=/^(?:A|B|I|J|K|L|M|N)([1-9]\d{0,2})$/.exec(addr);
    if(!m)continue;if(Number(m[1])>800)fail('ROW_OVER_LIMIT');
    if(++count>MAX_CELLS||output[addr])fail('CELL_LIMIT_OR_DUPLICATE');
    const t=cell.getAttribute('t')||'n';const value=first(cell,'v')?.textContent??null;
    const inline=first(cell,'is');const formula=first(cell,'f');let v=value,ct='s';
    if(t==='s'){
      const ix=Number(value);if(!/^\d+$/.test(value??'')||!Number.isInteger(ix)||ix<0||ix>=strings.length)fail('INVALID_SHARED_STRING_ID');
      v=strings[ix];
    }else if(t==='inlineStr')v=inline?textOf(inline):'';
    else if(t==='n')ct='n';
    else if(t==='b')ct='b';
    else if(t==='str'||t==='e')v=value??'';
    else v=value??'';
    if(v!==null&&String(v).length>300)fail('CELL_VALUE_TOO_LONG');
    const c={t:ct};if(v!==null)c.v=v;if(formula)c.f='FORMULA_PRESENT';
    output[addr]=c;
  }
  return output;
}
export async function readRawExternalWaterWorksheet(input){
  const bytes=input instanceof ArrayBuffer?new Uint8Array(input):input;
  if(!(bytes instanceof Uint8Array))fail('INVALID_XLSX_BUFFER');
  const dir=directory(bytes);
  if(!dir.has('xl/workbook.xml')||!dir.has('xl/_rels/workbook.xml.rels'))fail('MISSING_WORKBOOK_XML');
  const wb=xml(await member(bytes,dir,'xl/workbook.xml'));
  const rels=xml(await member(bytes,dir,'xl/_rels/workbook.xml.rels'));
  const sheetPath=resolvedSheet(wb,rels,new Set(dir.keys()));
  const strings=dir.has('xl/sharedStrings.xml')?sharedStrings(xml(await member(bytes,dir,'xl/sharedStrings.xml'))):[];
  const sheet=xml(await member(bytes,dir,sheetPath));
  return cellsFromXml(sheet,strings);
}
