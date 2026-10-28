"""Minimal ComfyUI API client for the character pipeline (stdlib only).

  python tools/charpipe/comfy.py upscale SourceArt/<Char>/character.json [--scale 2] [--model RealESRGAN_x4plus_anime_6B.pth]

Upscales every reference through a running ComfyUI server (default http://127.0.0.1:8188,
override with COMFY_URL) and writes SourceArt/<Char>/references/upscaled/<view>.png. The
character.json gets "texture_references" so the bake samples the sharper pictures while
segmentation and measurement keep using the originals.
"""
import json, os, sys, time, uuid, urllib.request, urllib.parse, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
URL = os.environ.get('COMFY_URL', 'http://127.0.0.1:8188')


def upload(path):
    boundary = uuid.uuid4().hex; data = Path(path).read_bytes()
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{Path(path).name}"\r\n'
            f'Content-Type: image/png\r\n\r\n').encode() + data + f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request(URL + '/upload/image', body, {'Content-Type': f'multipart/form-data; boundary={boundary}'})
    return json.load(urllib.request.urlopen(req))['name']


def run(graph, timeout=1800):
    """Queue an API-format graph, wait for it, return the saved image descriptors."""
    req = urllib.request.Request(URL + '/prompt', json.dumps({'prompt': graph, 'client_id': uuid.uuid4().hex}).encode(), {'Content-Type': 'application/json'})
    pid = json.load(urllib.request.urlopen(req))['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        h = json.load(urllib.request.urlopen(f'{URL}/history/{pid}'))
        if pid in h:
            st = h[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st.get('messages'))[:2000])
            if st.get('completed'):
                return [im for out in h[pid]['outputs'].values() for im in out.get('images', [])]
        time.sleep(1)
    raise TimeoutError(pid)


def fetch(im, dest):
    q = urllib.parse.urlencode({'filename': im['filename'], 'subfolder': im.get('subfolder', ''), 'type': im.get('type', 'output')})
    Path(dest).write_bytes(urllib.request.urlopen(f'{URL}/view?{q}').read())


def upscale_graph(name, model, scale):
    return {
        '1': {'class_type': 'LoadImage', 'inputs': {'image': name}},
        '2': {'class_type': 'UpscaleModelLoader', 'inputs': {'model_name': model}},
        '3': {'class_type': 'ImageUpscaleWithModel', 'inputs': {'upscale_model': ['2', 0], 'image': ['1', 0]}},
        '4': {'class_type': 'ImageScaleBy', 'inputs': {'image': ['3', 0], 'upscale_method': 'lanczos', 'scale_by': scale / 4}},
        '5': {'class_type': 'SaveImage', 'inputs': {'images': ['4', 0], 'filename_prefix': 'charpipe/' + Path(name).stem}},
    }


def cmd_upscale(cfg_path, scale=2, model='RealESRGAN_x4plus_anime_6B.pth'):
    cfg = json.loads(cfg_path.read_text(encoding='utf-8')); cdir = cfg_path.parent
    out = cdir / 'references' / 'upscaled'; out.mkdir(parents=True, exist_ok=True)
    tex = {}
    for view, rel in cfg['references'].items():
        t = time.time(); name = upload(cdir / rel)
        ims = run(upscale_graph(name, model, scale))
        dest = out / f'{view}.png'; fetch(ims[0], dest)
        tex[view] = str(dest.relative_to(cdir)).replace('\\', '/')
        print(f'{view}: {rel} -> {tex[view]} ({time.time() - t:.1f}s)')
    cfg['texture_references'] = {'scale': scale, 'model': model, 'views': tex}
    cfg_path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding='utf-8')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[0] == 'upscale':
        kw = {}
        if '--scale' in a: kw['scale'] = float(a[a.index('--scale') + 1])
        if '--model' in a: kw['model'] = a[a.index('--model') + 1]
        cmd_upscale(ROOT / a[1], **kw)
