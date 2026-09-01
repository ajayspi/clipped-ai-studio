import os
import zipfile

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        if 'node_modules' in root or '.git' in root or '.next\\cache' in root or '.next/cache' in root:
            continue
        for file in files:
            if file.endswith('.zip'):
                continue
            ziph.write(os.path.join(root, file), 
                       os.path.relpath(os.path.join(root, file), path))

if __name__ == '__main__':
    zipf = zipfile.ZipFile('clipped_update.zip', 'w', zipfile.ZIP_DEFLATED)
    zipdir('.', zipf)
    zipf.close()
