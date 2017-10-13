" python imports
py import vim
py import cStringIO
py import re

" application imports
py import Renderer

" save name of loaded file
let g:fname=expand('%:t:r')

" grab input html and clear input buffer
py inData = '\n'.join(vim.current.buffer)
bd

" create a window for table of contents
leftabove 30vnew
setlocal nonumber
silent file 'TOC'
wincmd l

" parse input html file
py nCols = int(vim.eval('winwidth(0)')) - int(vim.current.window.options['numberwidth'])
py lineData = Renderer.Parser.fromString(
  \   inData, 
  \   element='div#markdown-container', 
  \   width=nCols
  \ ).lineData
py colors = Renderer.ColorConfiguration.vimCodeDark()
py renderer = Renderer.VimRenderer(colors)

" render parsed html into vim input lines
py buf = cStringIO.StringIO()
py renderer.render(lineData, cols=nCols, logger=buf)
py renderedLines = buf.getvalue().split('\n')

" generate vim syntax highlighting
py buf = cStringIO.StringIO()
py renderer.genStyle(logger=buf)
py styleCommands = buf.getvalue().split('\n')

" display rendered text
setlocal buftype=nofile
py vim.current.buffer[:] = renderedLines
py for line in styleCommands: vim.command(line)
setlocal nomodifiable
silent execute "file" g:fname

" fill out table of contents window
wincmd h
py headings = [
  \ (line.split('</h')[0],i) 
  \ for i,line in enumerate(renderedLines) 
  \ if re.match(r'^<h[1-6]>',line)]
py headings = [(int(h[2]),h[4:],i) for h,i in headings]
py tree = [u'\u2502  '*(h-2)+(u'\u251c' if i+1 < len(headings) and headings[i+1][0] >= h else u'\u2514')+u'\u2500'*2+txt for i,(h,txt,row) in enumerate(headings)]
py vim.current.buffer[:] = ['Contents'] + tree
setlocal buftype=nofile
setlocal nowrap
setlocal nomodifiable

" colorize table of contents
syn match treeLine "─"
syn match treeLine "├"
syn match treeLine "│"
syn match treeLine "│"
syn match treeLine "└"
hi treeLine guifg=#4040ff
hi Normal guifg=#ffffff gui=bold

" scroll rendered text when <ENTER> is pressed in TOC
function! ScrollToTOC()
  py vim.command('let g:toline = %d' % (headings[vim.current.window.cursor[0]-2][2]+1))
  wincmd l
  execute(g:toline)
  normal zt
endfunction
nnoremap <buffer> <ENTER> :call ScrollToTOC()<CR>
