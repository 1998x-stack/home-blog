"""Release activation: integrity, traversal rejection and atomic rollback."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/public/activate-release.py'

def digest(b):return hashlib.sha256(b).hexdigest()

def make_archive(path,content,extra=None):
    data={'index.html':content.encode(),'healthz':b'ok\n','search-index.json':b'[]'}
    if extra:data.update(extra)
    files=[{'path':name,'bytes':len(val),'sha256':digest(val)} for name,val in sorted(data.items())]
    manifest={'schema':1,'version':'4.0.0','posts':0,'digest':digest(json.dumps(files,ensure_ascii=False,separators=(',',':')).encode()),'files':files}
    with tarfile.open(path,'w:gz') as t:
        for name,bytes_ in {**data,'release-manifest.json':json.dumps(manifest).encode()}.items():
            info=tarfile.TarInfo(name);info.size=len(bytes_);t.addfile(info,io.BytesIO(bytes_))

class PublicReleaseTest(unittest.TestCase):
    def test_activate_idempotency_and_rollback(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'public'
            a=Path(tmp)/'a.tar.gz';b=Path(tmp)/'b.tar.gz'
            make_archive(a,'version A');make_archive(b,'version B')
            cmd=lambda action,archive=None:subprocess.run(['python3',str(SCRIPT),action,'--root',str(root)]+(['--archive',str(archive)] if archive else []),capture_output=True,text=True)
            self.assertEqual(cmd('activate',a).returncode,0)
            self.assertEqual(cmd('activate',a).returncode,0)
            self.assertEqual((root/'current/index.html').read_text(),'version A')
            # Public Nginx must traverse root/current and nested directories, even with a restrictive umask.
            self.assertEqual((root/'current').resolve().stat().st_mode & 0o777, 0o755)
            self.assertEqual(cmd('activate',b).returncode,0)
            self.assertEqual((root/'current/index.html').read_text(),'version B')
            self.assertEqual(cmd('rollback').returncode,0)
            self.assertEqual((root/'current/index.html').read_text(),'version A')
    def test_rejects_tampering(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'public';a=Path(tmp)/'bad.tar.gz'
            make_archive(a,'valid',{'extra.txt':b'safe'})
            with tarfile.open(a,'r:gz') as tf:contents={m.name:tf.extractfile(m).read() for m in tf.getmembers()}
            contents['extra.txt']=b'evil'
            with tarfile.open(a,'w:gz') as tf:
                for name,data in contents.items():
                    m=tarfile.TarInfo(name);m.size=len(data);tf.addfile(m,io.BytesIO(data))
            r=subprocess.run(['python3',str(SCRIPT),'activate','--root',str(root),'--archive',str(a)],capture_output=True)
            self.assertNotEqual(r.returncode,0)
            self.assertFalse((root/'current').exists())
    def test_rejects_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)/'public';a=Path(tmp)/'bad.tar.gz'
            with tarfile.open(a,'w:gz') as tf:
                m=tarfile.TarInfo('../bad');m.size=3;tf.addfile(m,io.BytesIO(b'bad'))
            r=subprocess.run(['python3',str(SCRIPT),'activate','--root',str(root),'--archive',str(a)],capture_output=True)
            self.assertNotEqual(r.returncode,0)
            self.assertFalse((Path(tmp)/'bad').exists())

if __name__=='__main__':unittest.main()
