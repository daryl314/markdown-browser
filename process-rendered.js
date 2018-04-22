jQuery(function(){ // wait for document to be ready

    // perform rendered markdown post-processing
    var renderer = new MarkdownRenderer();
    var data = renderer.processRenderedMarkdown($('body'));

    if (window.location.href.endsWith('?map') || window.location.href.endsWith('?map#')) {
        //$('body > nav').hide();
        $('#markdown-container').addClass("col-md-10").wrap('<div id="container" class="container-fluid"></div>');
        $('#container').prepend('<div id="markdown-toc" class="col-md-2 hidden-print">');
        $('#markdown-toc').html(data.toc);
        $('#markdown-toc ul').css({
            'list-style-type':'none'
        });
        $('#markdown-toc>ul').css({
            'padding-left':'0px'
        });
        $('#markdown-toc ul ul').css({
            'padding-left':'20px'
        });
        $('#markdown-toc li').has('ul').children('a').each(function(){
            $(this).parent().prepend('<span class="tree-toggle tree-toggle-collapsed">&#9654; </span>')
        });
        $('#markdown-toc > ul > li > ul').hide();
        $('#markdown-toc').on('click', 'span.tree-toggle', function(){
            if ($(this).hasClass('tree-toggle-collapsed')) {
                $(this).parent().children().show();
                $(this).parent().children('span.tree-toggle').each(function(){
                    $(this).removeClass('tree-toggle-collapsed').html('&#9660; ');
                });
            } else {
                $(this).parent().children('ul').hide();
                $(this).parent().children('span.tree-toggle').each(function(){
                    $(this).addClass('tree-toggle-collapsed').html('&#9654; ');
                });
            }
        });
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