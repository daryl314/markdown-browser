import json
import os
import subprocess

from pycmark.html.Katex import escapeUnicode
from .AssetLoader import loadAsset

try:
    import pygments
    import pygments.formatters
    import pygments.lexers
except ImportError:
    pass

with open('/dev/null', 'w') as devnull:
    has_node = subprocess.call(['which', 'node'], stdout=devnull, stderr=devnull) == 0

if has_node:

    def highlight(data):
        p = subprocess.Popen(['node', '-e', NODE_HIGHLIGHT],
                             stdin=subprocess.PIPE, stdout=subprocess.PIPE, cwd=os.path.dirname(__file__))
        stdout, _ = p.communicate(json.dumps(data).encode())
        return ['<code class="hljs language-{}">{}</code>'.format(lang, escapeUnicode(src))
                for (lang, _), src in zip(data, json.loads(stdout))]

    highlight_css = "<style type='text/css'>{}</style>".format(
        loadAsset('node_modules/highlight.js/styles/atelier-forest-light.css', escape=False))

elif 'pygments' in globals():

    class CodeHtmlFormatter(pygments.formatters.HtmlFormatter):

        def wrap(self, source, outfile):
            return self._wrap_code(source)

        def _wrap_code(self, source):
            yield 0, '<code class="highlight">'
            for i, t in source:
                yield i, t
            yield 0, '</code>'

    def highlight(data):
        out = []
        formatter = CodeHtmlFormatter()
        for i, (lang, src) in enumerate(data):
            try:
                lexer = pygments.lexers.get_lexer_by_name(lang)
            except pygments.util.ClassNotFound:
                lexer = pygments.lexers.guess_lexer(src)
            fmt = pygments.highlight(src, lexer, formatter)
            out.append(escapeUnicode(fmt))
        return out

    highlight_css = "<style type='text/css'>{}</style>".format(CodeHtmlFormatter().get_style_defs('.highlight'))

else:

    def highlight(data):
            return [src for _, src in data]

    highlight_css = ''

HIGHLIGHT_LANGUAGES = {
    'apache',
    'armasm',
    'awk',
    'bash',
    'c',
    'cmake',
    'coffeescript',
    'c++',
    'cs',
    'css',
    'diff',
    'dockerfile',
    'go',
    'haskell',
    'http',
    'ini',
    'java',
    'javascript',
    'json',
    'kotlin',
    'llvm',
    'lua',
    'makefile',
    'markdown',
    'matlab',
    'nginx',
    'objectivec',
    'ocaml',
    'perl',
    'php',
    'prolog',
    'properties',
    'protobuf',
    'python',
    'r',
    'reasonml',
    'ruby',
    'rust',
    'shell',
    'sql',
    'vim',
    'x86asm',
    'xml',
    'yaml'
}

NODE_HIGHLIGHT = '''
let hljs = require('highlight.js');
let languages = [%s];
console.log(
    JSON.stringify(
        JSON.parse(require('fs').readFileSync(0, 'utf8')).map(x => {
            let [language, code] = x;
            //console.error(`==> language=${language}, code=${code}`);
            if (language) {
                return hljs.highlight(language, code, true).value
            } else {
                return hljs.highlightAuto(code, languages).value
            }
        })
    )
);
''' % ', '.join(['"%s"' % hl for hl in sorted(HIGHLIGHT_LANGUAGES)])