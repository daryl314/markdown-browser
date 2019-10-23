import os
import subprocess
from . import cmarkgfm
from .CmarkDocument import CmarkDocument


def mdToLatex(txt):
    """Convert markdown to latex"""
    P = subprocess.Popen([os.path.join(os.path.dirname(__file__), 'bin', 'gfm'), '--latex', '-'],
                         stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    stdout, stderr = P.communicate(txt.encode())
    return stdout

def parse(txt, encoding='utf_8'):
    """Parse markdown and return a CmarkDocument"""
    return CmarkDocument(txt, encoding=encoding)

# attach extensions and perform startup tasks
cmarkgfm.startup()