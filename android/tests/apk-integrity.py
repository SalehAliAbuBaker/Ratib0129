"""Verify literal ZIP paths (not Windows-normalized zipfile names) in a signed APK."""
import json,sys,zipfile,hashlib,struct
from pathlib import Path

apk=Path(sys.argv[1])
with zipfile.ZipFile(apk) as archive,apk.open('rb') as raw:
    names=[]
    for item in archive.infolist():
        name=item.orig_filename
        assert '\\' not in name, 'Noncanonical central-directory path: '+repr(name)
        raw.seek(item.header_offset)
        header=raw.read(30)
        assert header[:4]==b'PK\x03\x04'
        size=struct.unpack_from('<H',header,26)[0]
        local=raw.read(size).decode('utf-8')
        assert local==name and '\\' not in local, 'Local/central filename mismatch: '+repr(name)
        names.append(name)
    assert len(names)==len(set(names)), 'Duplicate ZIP entries'
    for required in ['AndroidManifest.xml','classes.dex','assets/www/index.html','assets/www/ratib-native-bridge.js','assets/www/ratib-native-adapter.js','assets/www/vendor/xlsx.full.min.js','assets/www/vendor/chart.umd.min.js','assets/www/vendor/tajawal.css','assets/www/assets/ratib-accounts-template.xlsx']:
        assert required in names, 'Missing literal asset path: '+required
    assert b'Landroidx/webkit/WebViewAssetLoader;' in archive.read('classes.dex'), 'Official loader absent from DEX'
    assert not any(name.endswith('.jks') or name.endswith('password.txt') or 'test-native' in name for name in names), 'Private/test file in APK'
    result={'apk':apk.name,'literal_zip_entries':len(names),'assets':sum(n.startswith('assets/www/') for n in names),'sha256':hashlib.sha256(apk.read_bytes()).hexdigest().upper()}
    print(json.dumps(result))
