#!/usr/bin/env python3
"""Validate and atomically activate immutable public exports on cloud VPS."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import tarfile
import tempfile

MAX_ARCHIVE_BYTES = 150 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024
MAX_FILES = 15000


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(name):
    p = PurePosixPath(name)
    return (bool(name) and not name.startswith('/') and '\\' not in name
            and not name.startswith('-') and all(x not in ('', '.', '..') for x in p.parts)
            and len(name) <= 240)


def symlink_atomic(path, target):
    staged = path.with_name(f'.{path.name}.new-{os.getpid()}')
    staged.symlink_to(target)
    staged.replace(path)


def activate(archive, root, keep):
    archive = archive.resolve(strict=True)
    if not archive.is_file() or archive.stat().st_size > MAX_ARCHIVE_BYTES:
        raise ValueError('Archive too large or invalid')
    root.mkdir(parents=True, exist_ok=True)
    releases = root / 'releases'
    releases.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.incoming-', dir=root) as tmp:
        stage = Path(tmp)
        with tarfile.open(archive, mode='r:gz') as tar:
            members = tar.getmembers()
            if len(members) > MAX_FILES:
                raise ValueError('Too many archive entries')
            seen = set()
            total = 0
            for m in members:
                if not safe_path(m.name) or not (m.isfile() or m.isdir()):
                    raise ValueError(f'Unsafe archive member: {m.name}')
                if m.name in seen:
                    raise ValueError('Duplicate archive member')
                seen.add(m.name)
                total += m.size
                if total > MAX_UNCOMPRESSED_BYTES:
                    raise ValueError('Archive expands beyond limit')
                if m.isfile():
                    target = stage.joinpath(*PurePosixPath(m.name).parts)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with tar.extractfile(m) as source, target.open('xb') as dest:
                        shutil.copyfileobj(source, dest)
                    target.chmod(0o644)
        manifest_path = stage / 'release-manifest.json'
        if not manifest_path.is_file():
            raise ValueError('Missing release manifest')
        manifest = json.loads(manifest_path.read_text('utf-8'))
        files = manifest.get('files')
        if manifest.get('schema') != 1 or manifest.get('version') != '4.0.0' or not isinstance(files, list):
            raise ValueError('Invalid manifest format')
        paths = set()
        normalized = []
        for item in files:
            path = item.get('path')
            if not isinstance(path, str) or not safe_path(path) or path in paths or path == 'release-manifest.json':
                raise ValueError('Unsafe or duplicate manifest path')
            paths.add(path)
            content = (stage / path).read_bytes()
            if item.get('bytes') != len(content) or item.get('sha256') != digest(content):
                raise ValueError('Invalid hash or size: ' + path)
            normalized.append(item)
        if not all((stage / path).is_file() for path in ('index.html','healthz','search-index.json')):
            raise ValueError('Missing essential public files')
        actual = {p.relative_to(stage).as_posix() for p in stage.rglob('*') if p.is_file()}
        if actual != paths | {'release-manifest.json'}:
            raise ValueError('Unexpected or missing files in release')
        canonical = sorted(normalized, key=lambda x: x['path'])
        if digest(json.dumps(canonical, ensure_ascii=False, separators=(',', ':')).encode('utf-8')) != manifest.get('digest'):
            # The exporter uses JS JSON.stringify, with compact separators and Unicode unescaped.
            raise ValueError('Release index digest mismatch')
        # TemporaryDirectory starts at mode 0700. Export is public-only,
        # so make every validated directory traversable by the Nginx worker.
        for directory in stage.rglob('*'):
            if directory.is_dir():
                directory.chmod(0o755)
        stage.chmod(0o755)
        release_id = manifest['digest'][:24]
        folder = releases / release_id
        if not folder.exists():
            shutil.move(stage, folder)
        current = root / 'current'
        previous = root / 'previous'
        old = current.resolve() if current.is_symlink() else None
        if old is not None and (not old.is_relative_to(releases.resolve()) or not old.is_dir()):
            raise ValueError('Current release points outside releases')
        if old is None or old != folder:
            if old is not None:
                symlink_atomic(previous, old)
            symlink_atomic(current, folder)
        # Keep current, previous and newest remaining releases.
        protected = {p.resolve() for p in (current, previous) if p.is_symlink()}
        entries = sorted((p for p in releases.iterdir() if p.is_dir()), key=lambda p:p.stat().st_mtime, reverse=True)
        retained = 0
        for p in entries:
            if p in protected or retained < keep:
                retained += 1
            else:
                shutil.rmtree(p)
        print(json.dumps({'activated': release_id, 'posts':manifest.get('posts'), 'current': str(current.resolve())}))


def rollback(root):
    current, previous = root / 'current', root / 'previous'
    if not (current.is_symlink() and previous.is_symlink()):
        raise ValueError('Previous release not available')
    old, prior = current.resolve(strict=True), previous.resolve(strict=True)
    releases = (root / 'releases').resolve()
    if not (old.is_relative_to(releases) and prior.is_relative_to(releases)):
        raise ValueError('Release symlink outside managed releases')
    symlink_atomic(current, prior)
    symlink_atomic(previous, old)
    print(json.dumps({'rolled_back_to':str(prior)}))


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('operation', choices=('activate','rollback'))
    parser.add_argument('--root', default='/srv/home-blog-public')
    parser.add_argument('--archive')
    parser.add_argument('--keep', type=int, default=5)
    args=parser.parse_args()
    if not 2<=args.keep<=30:parser.error('--keep must be between 2 and 30')
    if args.operation=='activate':
        if not args.archive:parser.error('--archive required')
        activate(Path(args.archive),Path(args.root).resolve(),args.keep)
    else:rollback(Path(args.root).resolve())
