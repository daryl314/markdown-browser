if has("python3") || has("python")

" python imports
if has("python3")
    python3 import vim
    python3 from io import StringIO
    python3 import re
else
    python  import vim
    python  from cStringIO import StringIO
    python  import re
endif

" application imports
if has("python3")
    python3 from pycmark.render.VimRenderer import VimRenderer
    python3 from pycmark.util.TypedTree import TypedTree
    python3 from pycmark.taggedtext.TaggedCmarkDocument import TaggedTextDocument
else
    python  from pycmark.render.VimRenderer import VimRenderer
    python  from pycmark.util.TypedTree import TypedTree
    python  from pycmark.taggedtext.TaggedCmarkDocument import TaggedTextDocument
endif

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" initialize content window variables
if has("python3")
    python3 tocBuffer = None      # buffer number for table of contents
    python3 contentBuffer = None  # buffer number for rendered markdown
else
    python  tocBuffer = None      # buffer number for table of contents
    python  contentBuffer = None  # buffer number for rendered markdown
endif
let g:hasdata = 0        " has an initial data load happened?

" initialize renderer
if has("python3")
    python3 renderer = VimRenderer()
else
    python  renderer = VimRenderer()
endif

" generate vim syntax highlighting
if has("python3")
    python3 buf = StringIO()
    python3 renderer.genStyle(logger=buf)
    python3 styleCommands = buf.getvalue().split('\n')
else
    python  buf = StringIO()
    python  renderer.genStyle(logger=buf)
    python  styleCommands = buf.getvalue().split('\n')
endif

" table of contents help text
if has("python3")
    python3 tocHelp = [
        \'{TAB: switch windows',
        \'{ENTER: follow link',
        \'{Ctrl-]: follow links',
        \'{Ctrl-R: resize',
        \'{Ctrl-T: toggle TOC',
        \''
      \]
else
    python  tocHelp = [
        \'{TAB: switch windows',
        \'{ENTER: follow link',
        \'{Ctrl-]: follow links',
        \'{Ctrl-R: resize',
        \'{Ctrl-T: toggle TOC',
        \''
      \]
endif

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" function to render text
function! RenderText()

    " identify content window
    if has("python3")
        python3 contentWindow = [w for w in vim.windows if w.buffer.number == contentBuffer][0]
        python3 nCols = int(contentWindow.width) - int(contentWindow.options['numberwidth'])
    else
        python  contentWindow = [w for w in vim.windows if w.buffer.number == contentBuffer][0]
        python  nCols = int(contentWindow.width) - int(contentWindow.options['numberwidth'])
    endif

    " parse input html file
    if has("python3")
        python3 tt = TypedTree._fromjson(inData)
    else
        python  tt = TypedTree._fromjson(inData)
    endif

    " render parsed html into vim input lines
    if has("python3")
        python3 buf = StringIO()
        python3 doc = TaggedTextDocument.fromAST(tt, width=nCols)
        python3 doc.render(VimRenderer().render, writer=buf)
        python3 renderedLines = buf.getvalue().split('\n')
    else
        python  buf = StringIO()
        python  doc = TaggedTextDocument.fromAST(tt, width=nCols)
        python  doc.render(VimRenderer().render, writer=buf)
        python  renderedLines = buf.getvalue().split('\n')
    endif

    " display rendered text
    if has("python3")
        python3 vim.buffers[contentBuffer].options['modifiable'] = True
        python3 vim.buffers[contentBuffer][:] = renderedLines
        python3 vim.buffers[contentBuffer].options['buftype'] = 'nofile'
        python3 vim.buffers[contentBuffer].options['modifiable'] = False
    else
        python  vim.buffers[contentBuffer].options['modifiable'] = True
        python  vim.buffers[contentBuffer][:] = renderedLines
        python  vim.buffers[contentBuffer].options['buftype'] = 'nofile'
        python  vim.buffers[contentBuffer].options['modifiable'] = False
    endif

endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" function to process a JSON file
function! ParseJSON()

    " save name of loaded file
    let g:fname=expand('%:t:r')

    " grab input html and clear input buffer
    if has("python3")
        python3 inData = '\n'.join(vim.current.buffer)
    else
        python  inData = '\n'.join(vim.current.buffer)
    endif
    only
    bd
    if has("python3")
        python3 contentBuffer = vim.current.buffer.number
    else
        python  contentBuffer = vim.current.buffer.number
    endif

    " content window settings
    setlocal nocursorline
    setlocal colorcolumn=0
    setlocal nonumber
    setlocal nowrap
    if has("python3")
        python3 for line in styleCommands: vim.command(line)
    else
        python  for line in styleCommands: vim.command(line)
    endif
    silent execute "file" '"'+g:fname+'"'

    " create a window for table of contents
    leftabove 30vnew
    setlocal nonumber
    setlocal cursorline
    setlocal nowrap
    hi CursorLine term=bold cterm=bold guibg=Grey40
    silent file TOC
    if has("python3")
        python3 tocBuffer = vim.current.buffer.number
    else
        python  tocBuffer = vim.current.buffer.number
    endif

    " configure folding for TOC
    setlocal foldtext=getline(v:foldstart)

    " move to content window and render text
    wincmd l
    call RenderText()

    " key bindings for main window
    nnoremap <buffer> <TAB> :wincmd h<CR>          " switch to TOC
    nnoremap <buffer> <C-R> :call RenderText()<CR> " resize content
    nnoremap <buffer> <C-T> :call ToggleTOC()<CR>  " toggle TOC

    " fill out table of contents window
    wincmd h
    if has("python3")
        python3 tree,folds,src_lines = VimRenderer.getTOC(tt)
        python3 vim.current.buffer[:] = tocHelp + ['Contents'] + tree
        python3 for f in folds: vim.command('%d,%dfold' % (f[0]+2,f[1]+2))
    else
        python  tree,folds,src_lines = VimRenderer.getTOC(tt)
        python  vim.current.buffer[:] = tocHelp + ['Contents'] + tree
        python  for f in folds: vim.command('%d,%dfold' % (f[0]+2,f[1]+2))
    endif
    hi Folded NONE
    normal zR
    setlocal buftype=nofile
    setlocal nomodifiable

    " colorize table of contents
    if has("python3")
        python3 buf = StringIO()
        python3 renderer.genTreeStyle(logger=buf)
        python3 tocStyleCommands = buf.getvalue().split('\n')
        python3 for line in tocStyleCommands: vim.command(line)
    else
        python  buf = StringIO()
        python  renderer.genTreeStyle(logger=buf)
        python  tocStyleCommands = buf.getvalue().split('\n')
        python  for line in tocStyleCommands: vim.command(line)
    endif

    " jump to rendered text when <ENTER> is pressed in TOC
    " TOC key bindings
    nnoremap <buffer> <ENTER> :call ScrollToTOC()<CR> " jump to rendered text location
    nnoremap <buffer> <C-]> :call ScrollToTOC()<CR>   " jump to rendered text location
    nnoremap <buffer> <TAB> :wincmd l<CR>             " switch to content window
    nnoremap <buffer> <C-T> :call ToggleTOC()<CR>     " toggle TOC

    " resize rendered text when a buffer is hidden or a window is resized
    if !g:hasdata
        let g:hasdata = 1
        autocmd VimResized * :call RenderText()
        autocmd BufHidden * :call RenderText()
    endif

endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" toggle TOC
function! ToggleTOC()
    if has("python3")
        python3 vim.command('let g:nwindows = %d' % (len(vim.windows)))
    else
        python  vim.command('let g:nwindows = %d' % (len(vim.windows)))
    endif
    if g:nwindows == 1
        leftabove 30vnew TOC
        call RenderText()
    else
        wincmd h
        wincmd c
        call RenderText()
    endif
endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" close buffers
function! CloseBuffers()
    if has("python3")
        python3 if tocBuffer is not None and contentBuffer is not None: vim.command('bdelete %d %d' % (tocBuffer,contentBuffer))
    else
        python  if tocBuffer is not None and contentBuffer is not None: vim.command('bdelete %d %d' % (tocBuffer,contentBuffer))
    endif
endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" scroll rendered text when <ENTER> is pressed in TOC
function! ScrollToTOC()
    if has("python3")
        python3 vim.command('let g:toline = %d' % (src_lines[vim.current.window.cursor[0]-2-len(tocHelp)]+1))
    else
        python  vim.command('let g:toline = %d' % (src_lines[vim.current.window.cursor[0]-2-len(tocHelp)]+1))
    endif
    wincmd l
    execute(g:toline)
    normal zt
endfunction


""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" call processing fuction when a new file is loaded
autocmd BufRead *.json call ParseJSON()

" clear existing buffers when a new file is loaded
autocmd BufReadPre *.json :call CloseBuffers()

endif
