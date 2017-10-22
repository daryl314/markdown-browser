" python imports
py import vim
py import cStringIO
py import re

" application imports
py import Renderer

" function to process an HTML file
function! ParseHTML()

    " save name of loaded file
    let g:fname=expand('%:t:r')

    " grab input html and clear input buffer
    py inData = '\n'.join(vim.current.buffer)
    bd

    " create a window for table of contents
    leftabove 30vnew
    setlocal nonumber
    setlocal cursorline
    hi CursorLine term=bold cterm=bold guibg=Grey40
    silent file 'TOC'

    " configure folding for TOC
    setlocal foldtext=getline(v:foldstart)

    " move to content window
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
    silent execute "file" '"'+g:fname+'"'

    " fill out table of contents window
    wincmd h
    py tree,folds,src_lines = renderer.getTOC(renderedLines)
    py vim.current.buffer[:] = ['Contents'] + tree
    py for f in folds: vim.command('%d,%dfold' % (f[0]+2,f[1]+2))
    hi Folded NONE
    normal zR
    setlocal buftype=nofile
    setlocal nowrap
    setlocal nomodifiable

    " colorize table of contents
    py buf = cStringIO.StringIO()
    py renderer.genTreeStyle(logger=buf)
    py tocStyleCommands = buf.getvalue().split('\n')
    py for line in tocStyleCommands: vim.command(line)

    " scroll rendered text when <ENTER> is pressed in TOC
    nnoremap <buffer> <ENTER> :call ScrollToTOC()<CR>

endfunction

" scroll rendered text when <ENTER> is pressed in TOC
function! ScrollToTOC()
    py vim.command('let g:toline = %d' % (src_lines[vim.current.window.cursor[0]-2]+1))
    wincmd l
    execute(g:toline)
    normal zt
endfunction

autocmd BufRead *.html call ParseHTML()
