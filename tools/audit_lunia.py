"""Fresh local archive inventory and bounded sample extraction. Never modifies Client."""
from pathlib import Path
import zipfile, json, struct, hashlib, collections
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'Evidence/lunia-20261026'
OUT.mkdir(parents=True,exist_ok=True)
z=zipfile.ZipFile(r'D:\Jogos\source\Client\Animation\Player.zip')
pwd=b'JuhaniHonkala'
records=[]
for name in z.namelist():
    p=Path(name)
    if p.parts[0] not in ('Fighter','Sieg','Krieg'): continue
    if len(p.parts)!=2: continue
    if not (p.suffix.lower()=='.skeleton' or p.name.endswith('_000.SkinnedMesh') or p.name in [p.parts[0]+s for s in ('.xml','.material.xml','.animation.xml','_Stand.SkinnedAnim','_Run.SkinnedAnim','_AtkA1.SkinnedAnim')]):continue
    b=z.read(name,pwd=pwd)
    dest=OUT/'samples'/name
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
    rec={'path':name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
    if p.suffix.lower()=='.skinnedmesh':
        n=struct.unpack_from('<I',b)[0]; off=4+2*n
        v,idx=struct.unpack_from('<II',b,off)
        rec.update(vertices=v,triangles=idx//3)
    if p.suffix.lower()=='.skeleton':rec['bones']=struct.unpack_from('<I',b,280)[0]
    records.append(rec)
(OUT/'inventory.json').write_text(json.dumps({'archive':z.filename,'entries':len(z.infolist()),'extensions':dict(collections.Counter(Path(n).suffix.lower() for n in z.namelist())),'samples':records},indent=2),encoding='utf-8')
print(json.dumps(records,indent=2))
