" python imports
py import vim
py import cStringIO
py import re

" application imports
py import Renderer

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" initialize content window variables
py tocBuffer = None      # buffer number for table of contents
py contentBuffer = None  # buffer number for rendered markdown
let g:hasdata = 0        " has an initial data load happened?

" initialize renderer
py renderer = Renderer.VimRenderer(Renderer.ColorConfiguration.vimCodeDark())

" generate vim syntax highlighting
py buf = cStringIO.StringIO()
py renderer.genStyle(logger=buf)
py styleCommands = buf.getvalue().split('\n')

" table of contents help text
py tocHelp = [
    \'{TAB: switch windows',
    \'{ENTER: follow link',
    \'{Ctrl-]: follow links',
    \'{Ctrl-R: resize',
    \'{Ctrl-T: toggle TOC',
    \''
  \]

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" function to render HTML
function! RenderHTML()

    " identify content window
    py contentWindow = [w for w in vim.windows if w.buffer.number == contentBuffer][0]
    py nCols = int(contentWindow.width) - int(contentWindow.options['numberwidth'])

    " parse input html file
    py lineData = Renderer.Parser.fromString(
      \   inData, 
      \   element='div#markdown-container', 
      \   width=nCols
      \ ).lineData

    " render parsed html into vim input lines
    py buf = cStringIO.StringIO()
    py renderer.render(lineData, cols=nCols, logger=buf)
    py renderedLines = buf.getvalue().split('\n')

    " display rendered text
    py vim.buffers[contentBuffer].options['modifiable'] = True
    py vim.buffers[contentBuffer][:] = renderedLines
    py vim.buffers[contentBuffer].options['buftype'] = 'nofile'
    py vim.buffers[contentBuffer].options['modifiable'] = False

endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" function to process an HTML file
function! ParseHTML()

    " save name of loaded file
    let g:fname=expand('%:t:r')

    " grab input html and clear input buffer
    py inData = '\n'.join(vim.current.buffer)
    only
    bd
    py contentBuffer = vim.current.buffer.number

    " content window settings
    setlocal nocursorline
    setlocal colorcolumn=0
    setlocal nonumber
    setlocal nowrap
    py for line in styleCommands: vim.command(line)
    silent execute "file" '"'+g:fname+'"'

    " create a window for table of contents
    leftabove 30vnew
    setlocal nonumber
    setlocal cursorline
    setlocal nowrap
    hi CursorLine term=bold cterm=bold guibg=Grey40
    silent file TOC
    py tocBuffer = vim.current.buffer.number

    " configure folding for TOC
    setlocal foldtext=getline(v:foldstart)

    " move to content window and render HTML
    wincmd l
    call RenderHTML()

    " key bindings for main window
    nnoremap <buffer> <TAB> :wincmd h<CR>          " switch to TOC
    nnoremap <buffer> <C-R> :call RenderHTML()<CR> " resize content
    nnoremap <buffer> <C-T> :call ToggleTOC()<CR>  " toggle TOC

    " fill out table of contents window
    wincmd h
    py tree,folds,src_lines = renderer.getTOC(renderedLines)
    py vim.current.buffer[:] = tocHelp + ['Contents'] + tree
    py for f in folds: vim.command('%d,%dfold' % (f[0]+2,f[1]+2))
    hi Folded NONE
    normal zR
    setlocal buftype=nofile
    setlocal nomodifiable

    " colorize table of contents
    py buf = cStringIO.StringIO()
    py renderer.genTreeStyle(logger=buf)
    py tocStyleCommands = buf.getvalue().split('\n')
    py for line in tocStyleCommands: vim.command(line)

    " jump to rendered text when <ENTER> is pressed in TOC
    " TOC key bindings
    nnoremap <buffer> <ENTER> :call ScrollToTOC()<CR> " jump to rendered text location
    nnoremap <buffer> <C-]> :call ScrollToTOC()<CR>   " jump to rendered text location
    nnoremap <buffer> <TAB> :wincmd l<CR>             " switch to content window
    nnoremap <buffer> <C-T> :call ToggleTOC()<CR>     " toggle TOC

    " resize rendered text when a buffer is hidden or a window is resized
    if !g:hasdata
        let g:hasdata = 1
        autocmd VimResized * :call RenderHTML()
        autocmd BufHidden * :call RenderHTML()
    endif

endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" toggle TOC
function! ToggleTOC()
    py vim.command('let g:nwindows = %d' % (len(vim.windows)))
    if g:nwindows == 1
        leftabove 30vnew TOC
        call RenderHTML()
    else
        wincmd h
        wincmd c
        call RenderHTML()
    endif
endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" close buffers
function! CloseBuffers()
    py if tocBuffer is not None and contentBuffer is not None: vim.command('bdelete %d %d' % (tocBuffer,contentBuffer))
endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" scroll rendered text when <ENTER> is pressed in TOC
function! ScrollToTOC()
    py vim.command('let g:toline = %d' % (src_lines[vim.current.window.cursor[0]-2-len(tocHelp)]+1))
    wincmd l
    execute(g:toline)
    normal zt
endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" search for a heading
function! HeadingSearch(txt)
    wincmd l 
    normal gg 
    execute "/<h.>".a:txt
endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" call processing fuction when a new file is loaded
autocmd BufRead *.html call ParseHTML()

" clear existing buffers when a new file is loaded
autocmd BufReadPre *.html :call CloseBuffers()
