/////////////////////////////////////
// FUNCTION TO COMPARE TEXT BLOCKS //
/////////////////////////////////////

  function createRow($el, rowClass, a, b, c, d) {
    $el.append(
      '<tr class="' + rowClass + '">' +
        '<td class="row-number">' + a + '</td>' +
        '<td class="row-data">' + b + '</td>' +
        '<td class="row-number">' + c + '</td>' +
        '<td class="row-data">' + d + '</td>' +
      '</tr>'
    );
  }

  function escapeText(txt) {
    return txt
      .replace(/&/g,  "&amp;")
      .replace(/</g,  "&lt;" )
      .replace(/>/g,  "&gt;" )
      .replace(/\n/g, "<br/>");
  }

  // function to perform the diff operation
  // requires diff function from diff.js for now
  function doDiff(text1, text2) {

    // compare results
    d = diff(text1, text2);

    // perform diff line standardization
    for (var i = 0; i < d.length-2; i++) {

      // standardize line deletion
      //   OLD: Eq[abc  ]   Del[\ndef  ]   Eq[\nghi]
      //   NEW: Eq[abc\n]   Del[  def\n]   Eq[  ghi]
      if (
          d[i  ][0] == diff.EQUAL  &&
          d[i+1][0] == diff.DELETE &&
          d[i+2][0] == diff.EQUAL  &&
          d[i+1][1][0] == '\n'     &&
          d[i+2][1][0] == '\n'
      ) {
        d[i  ][1] = d[i][1] + '\n';
        d[i+1][1] = d[i+1][1].slice(1) + '\n';
        d[i+2][1] = d[i+2][1].slice(1)
      }

      // standardize line insertion
      //  OLD: Eq[...\nXX]   Ins[YYY\nXX]   Eq[ZZZ  ]
      //  NEW: Eq[...\n  ]   Ins[XXYYY\n]   Eq[XXZZZ]
      if (
          d[i  ][0] == diff.EQUAL  &&
          d[i+1][0] == diff.INSERT &&
          d[i+2][0] == diff.EQUAL  &&
          d[i  ][1].match(/\n/)    &&
          d[i+1][1].match(/\n/)    &&
          d[i  ][1].replace(/[\s\S]*\n(.*)/,'$1') == d[i+1][1].replace(/[\s\S]*\n(.*)/,'$1')
      ) {
        var leader = /[\s\S]*\n(.*)/.exec(d[i][1])[1];
        d[i  ][1] =          d[i  ][1].replace(/([\s\S]*\n).*/, '$1');
        d[i+1][1] = leader + d[i+1][1].replace(/([\s\S]*\n).*/, '$1');
        d[i+2][1] = leader + d[i+2][1];
      }

    } // done standardizing current line

    // return results
    return d
  }

  // overlay user-provided options on top of default options
  function optionOverlay(overlay, def) {
    var keys = Object.keys(def);
    for (var i = 0; i < keys.length; i++) {
      if (overlay[keys[i]] === undefined)
        overlay[keys[i]] = def[keys[i]];
    }
    return overlay;
  }

  // validate diffs
  function validateDiffs(text1, text2, d) {
    var txt1 = '', txt2 = '';
    for (var i = 0; i < d.length; i++) {
      if (d[i][0] == diff.EQUAL || d[i][0] == diff.DELETE)
        txt1 += d[i][1];
      if (d[i][0] == diff.EQUAL || d[i][0] == diff.INSERT)
        txt2 += d[i][1];
    }
    if (txt1 === text1 && txt2 === text2) {
      console.log('Diff Validation OK');
    } else {
      console.error('Diff Validation FAIL!');
    }
  }

  // display diffs as a table
  function displayDiffsAsTable(d, $container, title) {

    // prepare text area
    if (title)
      $('<h2>'+title+'</h2>').appendTo($container);
    var $table = $('<table class="text-diff">').appendTo($container);

    // display output as a table
    var nL   = 0 , nR   = 0 ; // line number counters
    var txtL = '', txtR = ''; // text associated with current line
    for (var i = 0; i < d.length; i++) {

      // process lines within diff
      var lines = d[i][1].split(/\n/);
      for (var j = 0; j < lines.length; j++) {
        var line = escapeText(lines[j]);

        // special case for a full line change
        if (txtL === '' && txtR === '' && j+1 < lines.length) {
          if (d[i][0] == diff.EQUAL) {
            createRow($table, 'line-equal', nL++, line, nR++, line);
          } else if (d[i][0] == diff.INSERT) {
            createRow($table, 'line-insert', '', '', nR++, line);
          } else {
            createRow($table, 'line-delete', nL++, line, '', '');
          }
        }

        // otherwise this is a within-line change
        else if (j+1 < lines.length || line.length > 0) {

          // append span content
          if (d[i][0] == diff.EQUAL) {
            txtL += '<span class="chunk-equal">' + line + '</span>';
            txtR += '<span class="chunk-equal">' + line + '</span>';
          } else if (d[i][0] == diff.INSERT) {
            txtR += '<span class="chunk-insert">' + line + '</span>';
          } else {
            txtL += '<span class="chunk-delete">' + line + '</span>';
          }

          // increment lines if applicable
          if (j+1 < lines.length) {
            if (d[i][0] == diff.EQUAL) {
              createRow($table, 'line-change', nL++, txtL, nR++, txtR);
              txtL = '';
              txtR = '';
            } else if (d[i][0] == diff.INSERT) {
              createRow($table, 'line-change', '', '', nR++, txtR);
              txtR = '';
            } else {
              createRow($table, 'line-change', nL++, txtL, '', '');
              txtL = '';
            }
          }

        }
      }
    }

    // collapse large blocks of unchanged text
    var tableRows = $table.find('tr');
    for (var i = 0; i < tableRows.length; i++) {
      var $tr = $(tableRows[i]);
      if ($tr.hasClass('line-equal')) {
        var startIndex = i;
        i += 1;
        while ($(tableRows[i]).hasClass('line-equal')) i++;
        if (i - startIndex > 6) {
          for (var j = startIndex+2; j < i-2; j++) {
            $(tableRows[j]).toggle();
          }
          $(tableRows[startIndex+2]).before(
            '<tr class="collapsed" data-lines="' + (i-startIndex-4) + '">' +
              '<td>' + $(tableRows[startIndex+2]).find('td').first().text() + '</td>' +
              '<td colspan="3">+++ ' + (i - startIndex - 4) + ' lines +++</td>' +
            '</tr>'
          );
        }
      }
    }

    // toggle collapsed text
    $table.find('tr.collapsed').on('click', function(){
      $(this).nextAll().slice(0,$(this).data('lines')).toggle()
    })

  }

  // display diffs as a text block
  function displayDiffsAsBlock(d, $container, title) {

    // prepare text area
    if (title)
      $('<h2>'+title+'</h2>').appendTo($container);
    $block = $('<div class="text-diff">').appendTo($container);

    // display output as block
    for (var i = 0; i < d.length; i++) {
      text = escapeText(d[i][1]);
      if (d[i][0] == diff.INSERT) {
        $span = $('<span class="chunk-insert">')
      } else if (d[i][0] == diff.DELETE) {
        $span = $('<span class="chunk-delete">')
      } else {
        $span = $('<span class="chunk-equal">')
      }
      $span.html(text).appendTo($block);
    }
  }

  // function to compare two blocks of text
  function compareBlocks(text1, text2, opt) {

    // process default options
    opt = optionOverlay(opt, {
      $container  : $('body') , // default to body for output
      validate    : true      , // validate that diffs match input text
      style       : 'adjacent', // default to side-by-side display
      title       : null,       // no default title
      diffData    : null        // precalculated diff data
    })

    // perform and validate diffs
    var d = opt.diffData ? opt.diffData : doDiff(text1, text2);
    if (opt.validate)
      validateDiffs(text1, text2, d);

    // render output
    if (opt.$container) {
      if (opt.style === 'adjacent')
        displayDiffsAsTable(d, opt.$container, opt.title);
      else if (opt.style === 'inline')
        displayDiffsAsBlock(d, opt.$container, opt.title);
      else
        throw new Error('Invalid display style: '+opt.style);
    }

    // return the diff data
    return d
  }
