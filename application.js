var latexLoaded = false;

renderMarkdown = function(x, $el) {

  // regex to match latex blocks
  var LATEX_REGEX = /(\\\\\([^]*?\\\\\))|(\$\$[^]*?\$\$)/g;

  // capture latex blocks
  var latex = x.match(LATEX_REGEX);

  // populate specified element with text converted to markdown
  $el.html(marked(x
    .replace(/\r?\n/g,    '\n'         ) // standardize line breaks to /n
    .replace(LATEX_REGEX, '<latex />'  ) // escape latex
    .replace(/\[TOC\]/gi, '<toc></toc>') // TOC jQuery can find
  ));

  // return latex to page
  $el.find('latex').each(function(){
    $(this).text(latex.shift());
    /*var tex = latex.shift().replace(/^\\\\\(/, '').replace(/\\\\\)$/, '').replace(/^\$\$/, '').replace(/\$\$$/, '');
    try {
      tex = katex.renderToString(tex);
    } catch(err) {
      console.log("Error processing latex: \n\n" + tex + "\n\n" + err);
    }
    $(this).html(tex);*/
  });

  // create a table of contents
  var toc = marked(
    $(':header').not('h1').map(function(){
      var level = parseInt($(this).prop("tagName").slice(1));
      return Array(1+2*(level-1)).join(' ') + "* ["+$(this).html()+"](#"+$(this).attr('id')+")";
    }).toArray().join('\n'));

  // fill TOC elements
  $el.find('toc').html(toc);

  // add latex processor if applicable
  if (latex) {
    if (latexLoaded) {
      $el.find('latex').each(function(){
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, this]);
      });
    } else {
      $.getScript('https://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS_HTML');
      latexLoaded = true;
    }
  }

  // style tables
  $el.find('table').addClass('table table-striped table-hover table-condensed');
  $el.find('thead').addClass('btn-primary');

  // perform syntax highlighting
  $el.find('pre code').each(function(i, block) { hljs.highlightBlock(block); });

  // create bootstrap alert boxes
  $el.find('p').filter( function(){ return $(this).html().match(/^NOTE:/i   ) } ).addClass('alert alert-info'   )
  $el.find('p').filter( function(){ return $(this).html().match(/^WARNING:/i) } ).addClass('alert alert-warning')

  // return data to caller
  return {
    toc: toc
  };

}
