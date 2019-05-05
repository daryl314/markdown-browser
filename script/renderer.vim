if has("python3") || has("python")

" Don't load twice
if exists("g:loaded_md_renderer")
  finish
endif
let g:loaded_md_renderer = 1

" application imports
if has("python3")
    python3 import vim
    python3 from pycmark.vim.VimHandler import VimHandler
else
    python  import vim
    python  from pycmark.vim.VimHandler import VimHandler
endif

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" initial data load hasn't happened yet
let g:hasdata = 0

" initialize VimHandler
if has("python3")
    python3 vh = VimHandler(vim)
else
    python  vh = VimHandler(vim)
endif

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" function to render text
function! RenderText()
    if has("python3")
        python3 vh.RenderText()
    else
        python  vh.RenderText()
    endif
endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" function to process a JSON file
function! ParseJSON()

    " save name of loaded file (without path or extension)
    let g:fname=expand('%:t:r')

    " grab input html and clear input buffer
    if has("python3")
        python3 vh.parseJSON()
    else
        python  vh.parseJSON()
    endif

    " break out if parsing failed
    if g:json_load_ok == 0
        return
    endif

    " content window settings
    setlocal nocursorline
    setlocal colorcolumn=0
    setlocal nonumber
    setlocal nowrap
    silent execute "file" '"'+g:fname+'"'

    " create a window for table of contents
    leftabove 30vnew
    setlocal nonumber
    setlocal cursorline
    setlocal nowrap
    hi CursorLine term=bold cterm=bold guibg=Grey40
    silent file TOC
    if has("python3")
        python3 vh.tocBuffer = vim.current.buffer.number
    else
        python  vh.tocBuffer = vim.current.buffer.number
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
        python3 vh.RenderTOC()
    else
        python  vh.RenderTOC()
    endif
    hi Folded NONE
    setlocal buftype=nofile
    setlocal nomodifiable

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

    " generate folds in content window
    wincmd l
    if has("python3")
        python3 vh.GenerateFolds()
    else
        python  vh.GenerateFolds()
    endif
    set foldtext=ContextFold()

endfunction

function! ContextFold()
  return v:folddashes . substitute(substitute(substitute(getline(v:foldstart), '<heading>', '', 'g'), '<body>', '', 'g'), '</heading>', '', 'g')
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
        python3 if vh.tocBuffer is not None and vh.contentBuffer is not None: vim.command('bdelete %d %d' % (vh.tocBuffer,vh.contentBuffer))
    else
        python  if vh.tocBuffer is not None and vh.contentBuffer is not None: vim.command('bdelete %d %d' % (vh.tocBuffer,vh.contentBuffer))
    endif
endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" scroll rendered text when <ENTER> is pressed in TOC
function! ScrollToTOC()
    if has("python3")
        python3 vim.command('call ScrollToHeading(%d)' % (vim.current.window.cursor[0]-len(vh.TOCHEADER)))
    else
        python  vim.command('call ScrollToHeading(%d)' % (vim.current.window.cursor[0]-len(vh.TOCHEADER)))
    endif
endfunction

" scroll to the nth heading
function! ScrollToHeading(n)
    wincmd l
    /<heading>.*<\/heading>
    normal gg
    execute "normal ".a:n."n"
    nohlsearch
    normal zt
endfunction

" scroll to specified heading text
function! ScrollToHeadingText(txt)
    wincmd l
    execute "/<heading>".a:txt
endfunction

""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" clear any autocommands associated with script
" not sure why this is needed if there is a guard at the top, but it is...
autocmd!

" call processing fuction when a new file is loaded
autocmd BufRead *.json call ParseJSON()

" clear existing buffers when a new file is loaded
autocmd BufReadPre *.json :call CloseBuffers()

" NERDTree configuration
let NERDTreeIgnore=['\.md$', '\.html$', '\.md\.pdf$']

endif
