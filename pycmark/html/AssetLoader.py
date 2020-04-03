import base64
import os


ROOT = os.path.dirname(__file__)

def loadAsset(asset, indent=8, escape=True):
    with open(os.path.join(ROOT, asset), 'rt') as F:
        if escape:
            return F.read().replace('{', '{{').replace('}', '}}').replace('\n', '\n' + ' ' * indent)
        else:
            return F.read().replace('\n', '\n' + ' ' * indent)

def loadBinaryAsset(asset):
    with open(os.path.join(ROOT, asset), 'rb') as F:
        return base64.b64encode(F.read())

