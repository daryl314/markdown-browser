import os, subprocess, json

def processLatex(data):
    p = subprocess.Popen(['node', '-e', KATEX_RENDER],
                         stdin=subprocess.PIPE, stdout=subprocess.PIPE, cwd=os.path.dirname(__file__))
    stdout, _ = p.communicate(json.dumps(data).encode())
    return [escapeUnicode(src) for src in json.loads(stdout)]

def escapeUnicode(txt):
    return ''.join([x if ord(x) <= 127 else '&#x%x;' % ord(x) for x in txt])

KATEX_RENDER = '''
let katex = require('katex');
console.log(
    JSON.stringify(
        JSON.parse(require('fs').readFileSync(0, 'utf8')).map(x => {
            let [src, isBlock] = x;
            try {
                return katex.renderToString(src, {displayMode: isBlock, throwOnError: false});
            } catch (err) {
                return `<span style="color:red">${err}</span>`;
            }
        })
    )
);
'''
