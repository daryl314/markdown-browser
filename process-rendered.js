jQuery(function(){ // wait for document to be ready

    // perform rendered markdown post-processing
    var renderer = new MarkdownRenderer();
    var data = renderer.processRenderedMarkdown($('body'));

    ///// PROCESSING FOR MAP MODE /////

    // set page title
    $('.navbar-brand > span').text(
        $('h1').length > 0
            ? $('h1').first().text() 
            : unescape(window.location.href.replace(/.*\//, '').replace(/\.html.*/,''))
    );

    // populate table of contents
    $('#markdown-container').wrap('<div id="container"></div>');
    $('#container').prepend('<div id="markdown-toc" class="hidden-print">');
    $('#markdown-toc').html(data.toc);
    $('body > nav > div.container').removeClass('container');
    // $('#markdown-toc > ul').css({'padding-top':'20px'});

    // cross-reference headers in table of contents
    let $h = $('#markdown-container').children('h2,h3,h4,h5,h6');
    let $a = $('#markdown-toc').find('a');
    if ($h.length != $a.length) {
        throw new Error('Heading and TOC entry count mismatch');
    } else {
        for (let i = 0; i < $a.length; i++) {
            if ($($a[i]).data('href').slice(1) !== $($h[i]).attr('id')) {
                throw new Error('Heading and TOC entry ID mismatch')
            } else {
                $($a[i]).data('heading', $($h[i]) );
            }
        }
    }

    // running on iphone
    if (navigator.platform.indexOf("iPhone") != -1) {

        // configure slideout (https://github.com/mango/slideout)
        // disable dragging on elements with data-slideout-ignore attribute:
        //    <div id="carousel" data-slideout-ignore> ... </div>
        let slideout = new Slideout({
            panel       : $('#markdown-container')[0],  // content container
            menu        : $('#markdown-toc')[0],        // menu container
            padding     : 256,                          // menu width (px)
            tolerance   : 70,                           // px needed to open menu completely
            touch       : true,                         // enable touch events
            side        : 'left'                        // open on the left side
        });

        // toggle slideout on hamburger menu click
        $('.navbar-brand').on('click', function(){ slideout.toggle() });

    // not running on iphone
    } else {

        $('#markdown-toc').addClass('col-md-2');
        $('#markdown-toc > ul').addClass('col-md-2 affix');
        $('#markdown-container').addClass('col-md-10');

        $('.navbar-brand').on('click', function() {
            $('#markdown-toc').toggleClass('col-md-2').toggle();
            $('#markdown-container').toggleClass('col-md-10').toggleClass('col-md-12');
        })

    }
        
    if (window.location.href.endsWith('?map') || window.location.href.endsWith('?map#')) {
        const ICON_BULL      = '&#9679;';
        const ICON_COLLAPSED = '&#9654;';
        const ICON_EXPANDED  = '&#9660;';

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
            let $h = $(this).data('heading');
            let level = parseInt($h.get(0).tagName.slice(1));
            let blockers = [];
            for (let i = 1; i <= level; i++) {
                blockers.push(`h${i}`);
            }
            $('#markdown-container').children().hide();
            let content = $h.nextUntil(blockers.join(','));
            $h.add(content).show();
        });

    ///// PROCESSING FOR NORMAL MODE /////

    } else {

        // configure tables of contents
        $('#markdown-toc > ul').addClass('toc-menu');
        $('#markdown-toc a').add('toc a').each(function(){ 
            $(this).attr('href', $(this).data('href')) 
        });

        // set up scroll synchronization between rendering and table of contents
        var scrollSync = new ScrollSync(null, $('#markdown-container'), $('#markdown-toc'));
    }


});