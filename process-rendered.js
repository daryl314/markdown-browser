jQuery(function(){ // wait for document to be ready

    // perform rendered markdown post-processing
    var renderer = new MarkdownRenderer();
    var data = renderer.processRenderedMarkdown($('body'));

    ///// PROCESSING FOR MAP MODE /////

    if (window.location.href.endsWith('?map') || window.location.href.endsWith('?map#')) {
        const ICON_BULL = '&#9679;';
        const ICON_COLLAPSED = '&#9654;';
        const ICON_EXPANDED = '&#9660;';

        // set page title
        $('.navbar-brand > span').text(
            $('h1').length > 0
                ? $('h1').first().text() 
                : window.location.href.replace(/.*\//, '').replace(/\.html.*/,'')
        );
        
        // add TOC in a left pane
        $('#markdown-container').wrap('<div id="container"></div>');
        $('#container').prepend('<div id="markdown-toc">');
        $('#markdown-toc').html(data.toc);

        // configure slideout
        let slideout = new Slideout({
            panel       : $('#markdown-container')[0],
            menu        : $('#markdown-toc')[0],
            padding     : 256,
            tolerance   : 70
        });

        // toggle slideout on hamburger menu click
        $('.navbar-brand').on('click', function(){ slideout.toggle() });
        
        // TOC css
        $('#markdown-toc').css({
            'padding-left':'0px',
            'padding-right':'0px',
            'padding-bottom':'0px',
            'padding-top':'20px'
        })
        $('#markdown-toc ul').css({
            'list-style-type':'none'
        });
        $('#markdown-toc > ul').css({
            'font-size':'0.8em'
        });
        $('#markdown-toc ul').css({
            'padding-left':'1.3em',
            'text-indent':'-1.0em'
        });

        // slideout css
        let slideout_css = `
            <style type="text/css">
                body {
                    width: 100%;
                    height: 100%;
                }

                .slideout-menu {
                    position: fixed;
                    top: 0;
                    bottom: 0;
                    width: 256px;
                    min-height: 100vh;
                    overflow-y: scroll;
                    -webkit-overflow-scrolling: touch;
                    z-index: 0;
                    display: none;
                }

                .slideout-menu-left {
                    left: 0;
                }

                .slideout-menu-right {
                    right: 0;
                }

                .slideout-panel {
                    position: relative;
                    z-index: 1;
                    will-change: transform;
                    background-color: #FFF; /* A background-color is required */
                    min-height: 100vh;
                }

                .slideout-open, .slideout-open body, .slideout-open .slideout-panel {
                    overflow: hidden;
                }

                .slideout-open .slideout-menu {
                    display: block;
                }
            </style>
        `;
        $('html > head').append(slideout_css);

        // add bullets to TOC entries
        $('#markdown-toc a').each(function(){
            if ($(this).parent().has('ul').length > 0) {
                $(this).parent().prepend(`<div style="float:left;width:1em;" class="tree-toggle tree-toggle-collapsed">${ICON_COLLAPSED}</div>`)    
            } else {
                $(this).parent().prepend(`<div style="float:left;width:1em;">${ICON_BULL}</div>`)
            }
        }) 

        // hide nested items
        $('#markdown-toc > ul > li ul').hide();

        // click handler for toggles
        $('#markdown-toc').on('click', 'div.tree-toggle', function(){

            // expand a collapsed node
            if ($(this).hasClass('tree-toggle-collapsed')) {
                $(this).parent().children().show();
                $(this).parent().children('div.tree-toggle').each(function(){
                    $(this).removeClass('tree-toggle-collapsed').html(ICON_EXPANDED);
                });
            
            // collapse an expanded node
            } else {
                $(this).parent().children('ul').hide();
                $(this).parent().children('div.tree-toggle').each(function(){
                    $(this).addClass('tree-toggle-collapsed').html(ICON_COLLAPSED);
                });
            }
        });

        // double click expands entire tree
        $('#markdown-toc').on('dblclick', 'div.tree-toggle', function(){
            $(this).parent().find('ul').show();
            $(this).parent().find('div.tree_toggle').html(ICON_EXPANDED);
        }); 

        // click handler for entries
        $('#markdown-toc').on('click', 'a', function(){
            let $h = $(`:header${$(this).data('href')}`);
            if ($h.length > 1) {
                barf
            } else if ($h.length == 1) {
                let level = parseInt($h.get(0).tagName.slice(1));
                let blockers = [];
                for (let i = 1; i <= level; i++) {
                    blockers.push(`h${i}`);
                }
                $('#markdown-container').children().hide();
                let content = $h.nextUntil(blockers.join(','));
                $h.add(content).show();
            }
        });

    ///// PROCESSING FOR NORMAL MODE /////

    } else {

        // add bootstrap compontents
        $('#markdown-container').addClass("col-md-10").wrap('<div id="container" class="container-fluid"></div>');
        $('#container').append('<div id="markdown-toc" class="col-md-2 hidden-print">');

        // configure tables of contents
        $('#markdown-toc').html(data.toc);
        $('#markdown-toc > ul').addClass('col-md-2 affix toc-menu');
        $('#markdown-toc a').add('toc a').each(function(){ 
            $(this).attr('href', $(this).data('href')) 
        });

        // set up scroll synchronization between rendering and table of contents
        var scrollSync = new ScrollSync(null, $('#markdown-container'), $('#markdown-toc'));

        // configure navigation bar
        $('h2').each(function(){
            if ($('h1').length > 0) {
                $('nav span.navbar-brand').text($('h1').first().text());
            }
            let h2_txt = $(this).text();
            let $h3 = $(this).nextUntil('h2', 'h3');
            if ($h3.length > 0) {
                let $h3_li = $h3.map(function(){ 
                    return `<li><a href="#${$(this).attr('id')}">${$(this).text()}</a></li>` 
                }).toArray().join('\\n');
                let $h3_dropdown = `
                    <li class="dropdown">
                        <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
                            ${h2_txt} <span class="caret"></span>
                        </a>
                        <ul class="dropdown-menu">
                            <li><a href="#${$(this).attr('id')}">${$(this).text()}</a></li>
                            <li role="separator" class="divider"></li>
                            ${$h3_li}
                        </ul>
                    </li>
                `;
                $('div#navbar > ul').append($h3_dropdown)
            } else {
                $('div#navbar > ul').append($(`<li><a href="#${$(this).attr('id')}">${h2_txt}</a></li>`));
            }
        });
    }


});