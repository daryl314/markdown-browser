" script to colorize text with ANSI escape sequences in vim

:py << EOF

import vim
import re

# identify unique ansi sequences
seq = set()
for line in vim.current.buffer:
    seq |= set(re.findall(r'(?:\x1b\[[1-9].*?m)+', line))

data = {}

for s in seq:
    s_esc = s.replace('\\','\\\\').replace('[','\\[')
    print s_esc

    style = []
    key = ''

    if s.startswith('\033[38;2;'):
        color = ''.join(['%x'%int(x) for x in s[7:s.find('m')].split(';')])
        style.append('guifg=#%s' % color)
        key += 'fg0x%s' % color
        s = s[ s.find('m')+1 : ]
        #data['fg0x%s'%color] = (( s_esc, 'guifg=#%s'%color ))

    if s.startswith('\033[48;2;'):
        color = ''.join(['%x'%int(x) for x in s[7:s.find('m')].split(';')])
        style.append('guibg=#%s' % color)
        key += 'bg0x%s' % color
        s = s[ s.find('m')+1 : ]
        #data['bg0x%s'%color] = (( s_esc, 'guibg=#%s'%color ))

    gui = []
    if '\033[1m' in s:
        key += 'b'
        gui.append('bold')
        #data['ansiBold'] = (( s_esc, 'gui=bold' )) 
    if '\033[3m' in s:
        key += 'i'
        gui.append('italic')
        #data['ansiItalic'] = (( s_esc, 'gui=italic' )) 
    if '\033[4m' in s:
        key += 'u'
        gui.append('underline')
        #data['ansiUnderline'] = (( s_esc, 'gui=underline' )) 
    if len(gui) > 0:
        style.append('gui=%s' % ','.join(gui))

    data[key] = (( s_esc, ' '.join(style) ))

for k,(e,s) in data.items():
    #vim.command('syn region %s concealends matchgroup=%s start="%s" end="\\e\\[0m" keepend' % (k,k,e))
    vim.command('syn region %s concealends matchgroup=in%s start="%s" end="\\e\\[0m"' % (k,k,e))
    print 'syn region %s concealends matchgroup=in%s start="%s" end="\\e\\[0m"' % (k,k,e)
    vim.command('hi %s %s' % (k,s))
vim.command('set conceallevel=2')
vim.command('set concealcursor=nc')

def dumpData():
    for k,v in data.items():
        print k,v
        #cmds.append('syn region %s concealends matchgroup=body start="%s" end="\\e[0m"' % (k,s.__repr__()))
        #cmds.append('hi %s %s' % (k,v))

EOF
