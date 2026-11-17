"""Canonicalize Windows AAPT2 ZIP names before signing; never change entry bytes."""
import sys,zipfile,os
from pathlib import Path

source=Path(sys.argv[1]).resolve()
dest=source.with_name(source.name+'.canonical')
changed=0
with zipfile.ZipFile(source) as original,zipfile.ZipFile(dest,'w') as result:
    seen=set()
    for item in original.infolist():
        # orig_filename retains the literal central-directory name on Windows;
        # filename may already have been silently normalized by zipfile.
        name=item.orig_filename.replace('\\','/')
        if name in seen or name.startswith('/') or '..' in name.split('/'):
            raise ValueError('Invalid/duplicate APK entry: '+name)
        seen.add(name)
        fixed=zipfile.ZipInfo(name,item.date_time)
        fixed.compress_type=item.compress_type
        fixed.external_attr=item.external_attr
        fixed.internal_attr=item.internal_attr
        fixed.create_system=item.create_system
        fixed.comment=item.comment
        # Do not copy name-dependent extra fields from non-canonical ZIP headers.
        result.writestr(fixed,original.read(item))
        changed+=item.orig_filename!=name
    if 'assets/www/index.html' not in seen:raise ValueError('Missing canonical index.html')
os.replace(dest,source)
print('Canonical APK ZIP names; corrected entries:',changed)
