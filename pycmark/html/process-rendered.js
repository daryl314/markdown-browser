// wait until specified time (in ms) has elapsed without a call to the
// debounced function prior to calling inner function
function debounce(fn, time) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(fn, time);
    }
}

// limit function call frequency to specified time (in ms)
function impatientDebounce(fn, time) {
    let timeout;
    return function() {
        if (!timeout) {
            setTimeout(function(){ fn(); timeout=null; }, time)
        }
    }
}

jQuery(function(){ // wait for document to be ready
    
    // base container for rendered markdown
    let $el = $('#markdown-container');

    // process <latex> tags
    if (typeof katex !== 'undefined') {
        $('latex').each(function(){
            try {
                $(this).html(katex.renderToString($(this).text(), {displayMode: $(this).hasClass('block'), throwOnError: false}));
            } catch (err) {
                $(this).html(`<span style="color:red">${err}</span>`);
            }
        })        
    }

    // style tables
    $el.find('table').addClass('table table-striped table-hover table-condensed');
    $el.find('thead').addClass('btn-primary');

    // perform syntax highlighting
    if (typeof hljs !== 'undefined') {
    $el.find('pre code').each(function(i, block) {
        try {
            hljs.highlightBlock(block); 
        } catch (error) {
            console.log('Caught highlight.js exception', error);
        }
    })
    }

    // create bootstrap alert boxes
    $el.find('p').filter( function(){ return $(this).html().match(/^NOTE:/i   ) } ).addClass('alert alert-info'   )
    $el.find('p').filter( function(){ return $(this).html().match(/^WARNING:/i) } ).addClass('alert alert-warning')

    // open hyperlinks in a new tab
    $el.find('a').filter(function(){ return $(this).attr('href') && $(this).attr('href')[0] != '#' }).attr({target: '_blank'});

    ///// PROCESSING FOR MAP MODE /////

    // set page title
    $('a#navbar-title > span').text(
        $('h1').length > 0
            ? $('h1').first().text() 
            : unescape(window.location.href.replace(/.*\//, '').replace(/\.html.*/,''))
    );

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

    // add bullets to TOC entries
    const ICON_BULL      = '&#9679;';
    const ICON_COLLAPSED = '&#9654;';
    const ICON_EXPANDED  = '&#9660;';
    $('#markdown-toc a').each(function(){
        if ($(this).parent().has('ul').length > 0) {
            $(this).parent().prepend(`<div class="tree-toggle tree-toggle-collapsed">${ICON_COLLAPSED}</div>`)    
        } else {
            $(this).parent().prepend(`<div class="tree-toggle tree-toggle-bullet">${ICON_BULL}</div>`)
        }
    });

    // hide bullets initially
    $('#markdown-toc .tree-toggle').hide();

    // running on iphone
    let is_iPhone = navigator.platform.indexOf("iPhone") != -1;
    if (is_iPhone) {

        // configure slideout (https://github.com/mango/slideout)
        // disable dragging on elements with data-slideout-ignore attribute:
        //    <div id="carousel" data-slideout-ignore> ... </div>
        let slideout = new Slideout({
            panel       : $('#markdown-container')[0],  // content container
            menu        : $('#markdown-toc')[0],        // menu container
            padding     : 700,                          // menu width (px)
            tolerance   : 70,                           // px needed to open menu completely
            touch       : true,                         // enable touch events
            side        : 'left'                        // open on the left side
        });

        // toggle slideout on hamburger menu click
        $('a#navbar-title').on('click', function(){ slideout.toggle() });

        // increase menu font size
        $('#markdown-toc > ul').css('font-size','2.0em');

    // not running on iphone
    } else {
        $('a#navbar-title').on('click', function() {
            $('#markdown-toc').toggle();
        })
    }

    ///// SCROLL SYNC /////

    // callback function
    function scrollSync() {
        let top = $('#markdown-container').scrollTop();
        let htop = $h.map(function(){ return $(this).position().top }).toArray();
        var i;
        for (i = 0; htop[i] <= 0; i++) {}
        $('#markdown-toc li').removeClass('active visible');
        $($a[i-1]).parent('li').addClass('active');
        $($a[i-1]).parentsUntil($('#markdown-toc'), 'li').addClass('visible')
    }

    // bind to scroll event with debouncing
    if (is_iPhone) {
        $('#markdown-container').on('scroll', debounce(scrollSync, 100))
    } else {
        $('#markdown-container').on('scroll', impatientDebounce(scrollSync, 100))
    }

    ///// MAP MODE /////

    function mapMode() {

        // add bullets to TOC entries
        $('#markdown-toc .tree-toggle').show();

        // hide nested items
        $('#markdown-toc ul').show();
        $('#markdown-toc > ul > li ul').hide();

        // clear any previous click handlers
        $('#markdown-toc').off('click').off('dblclick');

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

        // click handler for sidebar entries
        $('#markdown-toc').on('click', 'a', function(){
            if ($('a#map-mode-toggle').parent().hasClass('active')) {
                let $h = $(this).data('heading');
                let level = parseInt($h.get(0).tagName.slice(1));
                let blockers = [];
                for (let i = 1; i <= level; i++) {
                    blockers.push(`h${i}`);
                }
                $('#markdown-container').children().hide();
                let content = $h.nextUntil(blockers.join(','));
                $h.add(content).show();
            } else {
                $(this).data('heading')[0].scrollIntoView();
            }
        });

        // click handler to show everything in map mode
        $('a#map-show-all').on('click', function(){
            $('#markdown-container').children().show(); 
        })
    }

    ///// MODE HANDLER /////

    if (window.location.href.endsWith('?map') || window.location.href.endsWith('?map#')) {
        $('a#map-mode-toggle').parent().addClass('active');
    } else {
        $('a#map-show-all').parent().hide();
    }
    mapMode();

    $('a#map-mode-toggle').on('click', function(){
        if ($(this).parent().hasClass('active')) {
            // enter outline mode
            $('#markdown-container').children().show();
            $(this).blur(); // un-select element
        } else {
            // enter map mode
        }
        $(this).parent().toggleClass('active');
        $('a#map-show-all').parent().toggle();
    })

});
