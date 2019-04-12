import os, subprocess, json

def highlight(data):
    p = subprocess.Popen(['node', '-e', NODE_HIGHLIGHT],
                         stdin=subprocess.PIPE, stdout=subprocess.PIPE, cwd=os.path.dirname(__file__))
    stdout, _ = p.communicate(json.dumps(data))
    return json.loads(stdout)

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