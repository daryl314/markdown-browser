// RESOURCES
//   markdown syntax: http://daringfireball.net/projects/markdown/basics
//   markdown basics: https://help.github.com/articles/markdown-basics/
//   GFM basics: https://help.github.com/articles/github-flavored-markdown/
//   javascript regex: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
//   codemirror manual: https://codemirror.net/doc/manual.html
//   codemirror simple mode demo: https://codemirror.net/demo/simplemode.html
//   codemirror markdown mode demo: http://codemirror.net/mode/markdown/
//   regex tester: https://regex101.com/#javascript


/////////////////
// GUI CONTROL //
/////////////////

// function to return references once document is ready
function guiReferences(){

  ///// GUI ELEMENTS /////

  gui = {
    $mainMenu        : $('body > header#main-menu'),
    $loadMenuItem    : $('body > header#main-menu a#showNoteList'),
    $saveNote        : $('body > header#main-menu a#saveNote'),
    $saveNoteAs      : $('body > header#main-menu a#saveNoteAs'),
    $newNote         : $('body > header#main-menu a#newNote'),
    $previewChanges  : $('body > header#main-menu a#previewChanges'),
    $refresh         : $('body > header#main-menu a#refreshConnection'),
    $updateToken     : $('body > header#main-menu a#updateToken'),

    $viewEditor      : $('body > header#main-menu a#viewEditor'),
    $viewHistory     : $('body > header#main-menu a#viewHistory'),

    $editorToggle    : $('body > header#main-menu a#editorToggle'),

    $navMenu         : $('body > header#main-menu ul#navMenu'),
    $floatingTOC     : $('#application-window nav#floating-toc'),

    $historyMenu     : $('#application-window section#history-list'),
    $historyList     : $('#application-window section#history-list ul.list-group'),
    $noteMenu        : $('#application-window section#nav-list'),
    $noteList        : $('#application-window section#nav-list ul.list-group'),
    $editorWindow    : $('#application-window main#content'),
    $editor          : $('#application-window main#content textarea#editor'),
    $previewWindow   : $('#application-window section#viewer-container'),
    $previewContents : $('#application-window section#viewer-container div#viewer'),
    $historyWindow   : $('#application-window section#history-container'),
    $tocWindow       : $('#application-window section#floating-toc-container'),

    $promptTemplate  : $('#promptTemplate'),
    $promptOverlay   : $('#overlay-background'),
    $promptBody      : $('#promptTemplate #modalTitle'),
    $promptInput     : $('#promptTemplate .modal-body input'),
    $promptOK        : $('#promptTemplate button.btn-primary'),
    $alertContainer  : $('#alertContainer'),
    $alertTemplate   : $('#alertTemplate')
  };


  ///// DIALOG BOXES /////

  // create a new notification window
  gui.createNotification = function(message) {
    return gui.$alertTemplate
      .clone()
      .appendTo(gui.$alertContainer)
      .attr('id','')
      .show()
      .append(message);
  }

  // create a persistent alert window
  gui.persistentAlert = function(message) {
    return gui.createNotification(message).addClass('alert-info');
  }

  // create a transient alert window (hide after 5 seconds)
  gui.transientAlert = function(message) {
    $el = gui.createNotification(message).addClass('alert-info').delay(5000).slideUp();
    window.setTimeout( function(){$el.remove()}, 6000 ); // clean up element after hiding
    return $el;
  }

  // create a persistent warning window
  gui.persistentWarning = function(message) {
    return gui.createNotification(message).addClass('alert-danger');
  }

  // create a transient warning window (hide after 5 seconds)
  gui.transientWarning = function(message) {
    $el = gui.createNotification(message).addClass('alert-danger').delay(5000).slideUp();
    window.setTimeout( function(){$el.remove()}, 6000 ); // clean up element after hiding
    return $el;
  }

  // prompt user for input
  gui.promptForInput = function(message, default_entry, callback) {
    gui.$promptTemplate.add(gui.$promptOverlay).show();
    gui.$promptBody.text(message);
    gui.$promptInput.val(default_entry);
    gui.$promptOK.one('click', function(){
      gui.$promptTemplate.add(gui.$promptOverlay).hide();
      if (callback) callback( gui.$promptInput.val() );
    });
  }


  ///// GUI HANDLERS /////

  gui.showEditorWindow = function() {
    gui.$viewHistory.removeClass('btn-primary');
    gui.$viewEditor.addClass('btn-primary');
    gui.$historyMenu.add(gui.$historyWindow).hide();
    gui.$editorWindow.add(gui.$previewWindow).show();
  }

  gui.showHistoryWindow = function() {
    gui.$viewEditor.removeClass('btn-primary');
    gui.$viewHistory.addClass('btn-primary');
    gui.$historyMenu.add(gui.$historyWindow).show();
    gui.$editorWindow.add(gui.$previewWindow).hide();
  }

  gui.navigationHandler = function(event){
    var $target = $( $(this).data('href') );
    gui.$previewWindow.scrollTop(gui.$previewWindow.scrollTop() + $target.position().top);
  };

  gui.$viewHistory.on('click', function(){
    if ($(this).hasClass('btn-primary') == false) {
      showHistoryWindow();
      showNoteHistory();
    }
  });

  gui.$viewEditor.on('click', function(){
    if ($(this).hasClass('btn-primary') == false) {
      showEditorWindow();
    }
  });

  gui.$editorToggle.on('click', function(){
    gui.$editorToggle.find('span').toggle();
    gui.$editorWindow.toggle();
    gui.$previewWindow.toggleClass('col-md-6').toggleClass('col-md-10');
    gui.$tocWindow.toggle();
  });

  gui.$navMenu.on('click', 'a', gui.navigationHandler);
  gui.$floatingTOC.on('click', 'a', gui.navigationHandler);
  gui.$previewWindow.on('click', 'toc a', gui.navigationHandler);


  ///// CLEANUP /////

  return gui;
}


////////////////////////////
// CACHED LATEX RENDERING //
////////////////////////////

// convert a latex string to HTML code (with caching to speed procesing)
var cachedLatex = {}; // cache
function latexToHTML(latex, isBlock) {
  if (cachedLatex[latex]) {
    return cachedLatex[latex];
  } else {
    try {
      out = katex.renderToString(latex, {
        displayMode: isBlock,
        throwOnError: false
      });
      cachedLatex[latex] = out;
      return out;
    } catch (err) {
      return '<span style="color:red">' + err + '</span>'
    }
  }
}


////////////////////////
// MARKDOWN RENDERING //
////////////////////////

// function to render markdown into the specified element
renderMarkdown = function(x, $el) {

  // convert markdown to HTML
  var html = markdown.toHTML(
    x.replace(/\[TOC\]/gi, '<toc></toc>') // TOC jQuery can find
    ,{includeLines:true}
  );

  // process <latex> tags
  html = html.replace(/(<latex.*?>)([\s\S]*?)(<\/latex>)/g, function(match,p1,p2,p3){
    return p1 + latexToHTML(p2) + p3;
  })

  // populate specified element with text converted to markdown
  $el.html(html);

  // create a table of contents
  var toc = markdown.toHTML(
    $el.find(':header').not('h1').map(function(){
      var level = parseInt($(this).prop("tagName").slice(1));
      return Array(1+2*(level-1)).join(' ') + "* ["+$(this).html()+"](#"+$(this).attr('id')+")";
    }).toArray().join('\n'));

  // convert anchors to data-href attributes
  toc = toc.replace(/href/g, 'href="#" data-href');

  // fill TOC elements
  $el.find('toc').html(toc);

  // remove line number tags from TOC entries
  $el.find('toc [data-source-line]').each(function(){
    $(this).attr('data-source-line', null)
  });

  // style tables
  $el.find('table').addClass('table table-striped table-hover table-condensed');
  $el.find('thead').addClass('btn-primary');

  // perform syntax highlighting
  $el.find('pre code').each(function(i, block) { hljs.highlightBlock(block); });

  // create bootstrap alert boxes
  $el.find('p').filter( function(){ return $(this).html().match(/^NOTE:/i   ) } ).addClass('alert alert-info'   )
  $el.find('p').filter( function(){ return $(this).html().match(/^WARNING:/i) } ).addClass('alert alert-warning')

  // open hyperlinks in a new tab
  $el.find('a').filter(function(){ return $(this).attr('href') && $(this).attr('href')[0] != '#' }).attr({target: '_blank'});

  // return data to caller
  return {
    toc: toc
  };

}


/////////////////////////
// CODEMIRROR HANDLING //
/////////////////////////

// average adjacent points
collapseRepeated = function(x_vec, y_vec) {
  var head = 0, tail = 0;
  while (tail < x_vec.length) {
    if (tail+1 < x_vec.length && x_vec[tail] == x_vec[tail+1]) {
      var x_tail = x_vec[tail];
      var sum    = y_vec[tail];
      var count = 1;
      while (x_vec[++tail] == x_tail) {
        sum += y_vec[tail];
        count++;
      }
      x_vec[head  ] = x_tail;
      y_vec[head++] = sum / count;
    } else {
      x_vec[head  ] = x_vec[tail  ];
      y_vec[head++] = y_vec[tail++];
    }
  }
  x_vec.splice(head, tail-head);
  y_vec.splice(head, tail-head);
}

// dump location data to matlab format
dumpPoints = function(x, y, name) {
  txt = [name + ' = ['];
  if (!x) {
    x = [];
    for (var i = 0; i < y.length; i++) {
      x.push(i+1);
    }
  }
  for (var i = 0; i < x.length; i++) {
    txt.push('    '+x[i]+' '+y[i]);
  }
  txt.push('];');
  GUI.$previewContents.append(txt.join('<br>\n'))+'<br>\n';
}

// interpolate data to a linear range
interpolate = function(x_vec, y_vec, xi, xf) {
  var out = [], x1, x2, y1, y2, m;
  //dumpPoints(x_vec, y_vec, 'initial');
  collapseRepeated(x_vec, y_vec);
  //dumpPoints(x_vec, y_vec, 'collapsed');
  var updateSlope = function(){
    x1 = x2; x2 = x_vec.shift();
    y1 = y2; y2 = y_vec.shift();
    m = (y2-y1)/(x2-x1);
  }
  updateSlope(); updateSlope(); // grab first 2 points
  for (var x = xi; x < xf; x++) {
    if (x > x2 && x_vec.length > 0) {
      updateSlope();  // update slope if outside range and still have data
    }
    out.push(y1 + m*(x-x1)); // add interpolated point to output array
  }
  //dumpPoints(null, out, 'interpolated');
  return out;
}

// return locations of lines in editor window
visibleLines = function(){
  var scrollInfo = cm.getScrollInfo();
  var topLine    = cm.lineAtHeight(scrollInfo.top                          , 'local');
  var bottomLine = cm.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, 'local');
  var maxLine    = cm.lineCount() - 1;
  return {
    top:    topLine,
    bottom: Math.min(maxLine, bottomLine),
    cursor: Math.min(maxLine, cm.getCursor().line)
  }
}

// line number lookup array
var lineMap;

// heading location lookup array
var headingLookup;

// counters for number of triggered scroll actions.  this lets the scrolled
// window know that its scrolling was triggered by a user scroll in the ohter
// window.  otherwise there is a circular dependency and the windows fight with
// each other
var scrollState = {
  editorCount : 0,
  viewerCount : 0
};

// function to return viewer position associated with editor position
var editorPosToViewerPos = function(line, marker) {
  var h = GUI.$previewWindow.height();
  if (marker == 'bottom') {
    return lineMap[line-1] - h*1;
  } else if (marker == 'center') {
    return lineMap[line-1] - h*0.5;
  } else {
    return lineMap[line-1] - h*0;
  }
}

// function to return editor position associated with viewer position
var viewerPosToEditorPos = function(line) {

  // binary search function
  function binSearch(a, b, val) {
    if (b - a == 1) {
      if (lineMap[b] == val) {
        return b;
      } else if (lineMap[a] == val) {
        return a;
      } else {
        return a + (val - lineMap[a])/(lineMap[b] - lineMap[a]);
      }
    } else {
      var m = Math.round((a+b)/2);
      if (val > lineMap[m]) {
        return binSearch(m, b, val);
      } else {
        return binSearch(a, m, val);
      }
    }
  }

  // perform search
  return Math.max(
    1,
    Math.round(
      binSearch(1, lineMap.length-1, line)
    )
  );
}

// function to return closest header to a position
var parentHeader = function(pos) {

  // binary search function
  function binSearch(a, b, val) {
    if (b - a == 1) {
      if (headingLookup[b] == val) {
        return headingLookup[b][1];
      } else if (lineMap[a] == val) {
        return headingLookup[a][1];
      } else {
        return headingLookup[a][1];
      }
    } else {
      var m = Math.round((a+b)/2);
      if (val < headingLookup[m][0]) {
        return binSearch(a, m, val);
      } else {
        return binSearch(m, b, val);
      }
    }
  }

  // perform search
  var last = headingLookup.length-1;
  if (pos > headingLookup[last][0]) {
    return headingLookup[last][1];
  } else {
    return binSearch(0, headingLookup.length-1, pos);
  }

}

// scroll preview window to the location matching specified editor line number
var scrollTo = function(line, marker) {

  // if the update count is nonzero, this was a scroll triggered by a preview
  // window scroll (and not a user scroll).  decrement the scroll count and
  // return.
  if (scrollState.editorCount > 0) {
    scrollState.editorCount -= 1;
    return
  }

  // otherwise this was a user scroll, so trigger a corresponding scroll in the
  // preview window
  else {
    scrollState.viewerCount += 1;
    GUI.$previewWindow.scrollTop( editorPosToViewerPos(line,marker) );
    return
  }

}

// scroll editor to line number matching specified preview scroll location
var scrollFrom = function(line) {
  //console.log("Viewer top position "+line+" --> editor line "+viewerPosToEditorPos(line));

  // identify closest header and corresponding TOC entry
  var matchingToc = parentHeader(line);

  // style closest header
  GUI.$floatingTOC.find('li').removeClass('active');
  matchingToc
    .parentsUntil(GUI.$floatingTOC, 'li')
    .addClass('active');

  // if the update count is nonzero, this was a scroll triggered by an editor
  // window scroll (and not a user scroll).  decrement the scroll count and
  // return
  if (scrollState.viewerCount > 0) {
    scrollState.viewerCount -= 1;
    return
  }

  // otherwise this was a user scroll, so trigger a corresponding scroll in the
  // editor window
  else {
    scrollState.editorCount += 1;
    cm.scrollTo(null, cm.heightAtLine(viewerPosToEditorPos(line)-1, 'local'));
    return
  }
}

// function to render markdown
var render = function(){

  // save cursor position
  var currentScroll = GUI.$previewWindow.scrollTop();

  // execute rendering
  var renderData = renderMarkdown(cm.getValue(),GUI.$previewContents);

  // create floating table of contents and nav menu
  GUI.$floatingTOC.html(renderData.toc);
  GUI.$navMenu.children('li.divider ~ li').remove();
  GUI.$navMenu.append( $(renderData.toc).html() );

  // capture line numbers
  var x = [], y = [];
  var lineRefs = GUI.$previewWindow.find('[data-source-line]').each( function(){
    x.push( parseInt($(this).attr('data-source-line'))                          );
    y.push( $(this).position().top + GUI.$previewWindow.scrollTop()  );
  })

  // interpolate/extrapolate to create a line number lookup array
  lineMap = interpolate(x, y, 1, cm.lastLine());

  // capture heading locations
  headingLookup = [];
  GUI.$previewWindow.find(':header').each( function(){
    var matchingToc = GUI.$floatingTOC.find("a[data-href='#" + $(this).attr('id') + "']");
    if (matchingToc.length > 0) {
      headingLookup.push([
        $(this).position().top + GUI.$previewWindow.scrollTop(),
        matchingToc
      ])
    }
  });

  // scroll to the cursor location
  GUI.$previewWindow.scrollTop(currentScroll);

}


///////////////////
// LAUNCH EDITOR //
///////////////////

// function to initialize CodeMirror once startup text is available
function launchCodeMirror() {

  // add plugin to auto-close brackets
  registerCloseBrackets();

  // convert textarea to CodeMirror editor
  window.cm = CodeMirror.fromTextArea($(GUI.$editor)[0], {
    mode:                     "gfm-expanded", // use newly defined mode
    autofocus:                true,           // move focus to CodeMirror on init
    cursorScrollMargin:       3,              // DOES THIS WORK???
    lineNumbers:              true,           // show line numbers
    lineWrapping:             true,           // wrap long lines
    foldGutter:               true,           // enable folds in gutter
    styleActiveLine:          true,           // add css to curently active line
    matchBrackets:            true,           // enable bracket matching
    autoCloseBrackets:        true,           // automatically close brackets
    showCursorWhenSelecting:  true,           // show cursor when a selection is active
    keyMap:                   "vim",          // use vim key bindings
    gutters: [                                // gutters to use:
      "CodeMirror-linenumbers",               //   line numbers
      "CodeMirror-foldgutter" ],              //   folding
    extraKeys: {                              // custom key bindings
      "Ctrl-Q": function(cm){                 //   Ctrl-Q: toggle fold
        cm.foldCode(cm.getCursor()); },       //
      "Enter":                                //   Enter: hook into markdown list continuation plugin
        "newlineAndIndentContinueMarkdownList"//
    }
  });

  // adapted from markdown fold script
  CodeMirror.registerHelper("fold", "gfm-expanded", function(cm, start) {
    var maxDepth = 100;

    function isHeader(lineNo) {
      var tokentype = cm.getTokenTypeAt(CodeMirror.Pos(lineNo, 0));
      return tokentype && /\bheader\b/.test(tokentype);
    }

    function headerLevel(lineNo, line, nextLine) {
      var match = line && line.match(/^#+/);
      if (match && isHeader(lineNo)) return match[0].length;
      match = nextLine && nextLine.match(/^[=\-]+\s*$/);
      if (match && isHeader(lineNo + 1)) return nextLine[0] == "=" ? 1 : 2;
      return maxDepth;
    }

    var firstLine = cm.getLine(start.line), nextLine = cm.getLine(start.line + 1);
    var level = headerLevel(start.line, firstLine, nextLine);
    if (level === maxDepth) return undefined;

    var lastLineNo = cm.lastLine();
    var end = start.line, nextNextLine = cm.getLine(end + 2);
    while (end < lastLineNo) {
      if (headerLevel(end + 1, nextLine, nextNextLine) <= level) break;
      ++end;
      nextLine = nextNextLine;
      nextNextLine = cm.getLine(end + 2);
    }

    return {
      from: CodeMirror.Pos(start.line, firstLine.length),
      to: CodeMirror.Pos(end, cm.getLine(end).length)
    };
  });

  // render starter text and re-render on text change
  render();
  cm.on('change', _.debounce(render, 300, {maxWait:1000})); // render when typing stops

  // function to scroll preview window to editor location
  scrollSync = _.debounce(
    function(){ scrollTo(visibleLines().top); },
    100,
    {maxWait:100}
  );

  // function to scroll editor window to preview location
  scrollSyncRev = _.debounce(
    function(){ scrollFrom($(this).scrollTop()); },
    100,
    {maxWait:100}
  );

  // bind scroll callbacks to scroll events
  cm.on('scroll', scrollSync);
  GUI.$previewWindow.on('scroll', scrollSyncRev);
}

// closure containing evernote connection code
function connectToEvernote() {

  ///// APPLICATION STATE VARIABLES AND CONFIGURATION /////

  // GUID for current note
  var currentNote = undefined;

  // cached version diff data
  var diffCache = {}

  // options to pass to diff function
  function diffOptions(title, d) {
    return {
      title       : title,
      diffData    : d,
      $container  : $historyWindow,
      validate    : true,
      style       : 'adjacent'
    }
  }

  ///// SERVER CONNECTIVITY /////

  // prompt user to update developer token
  function updateToken() {
    GUI.promptForInput(
      'Please enter your Evernote developer token',
      localStorage.getItem('token'),
      function(result) {
        localStorage.setItem('token', result);
      }
    );
  }

  // alias to WrappedNote class
  var WN = EvernoteConnection.WrappedNote;

  // function to use server connection
  function getConnection(callback) {
    if (!WN.hasConnection()) {
      if (localStorage.getItem('token') === null)
        updateToken();
      var $el = GUI.persistentAlert('Connecting to Evernote...');
      var opt = {
        searchTags    : ['markdown'],
        saveTags      : ['markdown'],
        errorLogger   : GUI.persistentWarning,
        messageLogger : GUI.transientAlert
      }
      WN.connect(localStorage.getItem('token'), opt, function() {
        if (!WN.hasConnection()) {
          GUI.persistentWarning("Failed to connect to Evernote!");
          throw new Error("Unable to connect to Evernote");
        } else {
          $el.remove();
          GUI.transientAlert("Connected to Evernote!");
          populateNoteList(WN.getNoteData());
          if (callback) callback(WN);
        }
      })
    } else {
      if (callback) callback(WN);
    }
  }


  ///// UPDATE DEVELOPER TOKEN /////

  GUI.$updateToken.on('click', updateToken);


  ///// REFRESH SERVER CONNECTION /////

  GUI.$refresh.on('click', function(){
    getConnection(function(conn) {
      WN.refreshConnection(function(){
        GUI.transientAlert("Refreshed Evernote data");
        populateNoteList(WN.getNoteData());
      })
    })
  })


  ///// PREVIEW NOTE CHANGES /////

  GUI.$previewChanges.on('click', function(){
    if (currentNote === undefined) {
      GUI.transientAlert("No note currently loaded!")
    } else {
      getConnection(function(conn) {
        var note = conn.getNote(currentNote);
        note.fetchContent(function(oldContent) {
          GUI.showHistoryWindow();
          GUI.$historyWindow.empty();
          GUI.$historyMenu.hide();
          compareBlocks(oldContent, cm.getValue(), diffOptions(note.title()));
        })
      })
    }
  })


  ///// UPDATE A NOTE /////

  GUI.$saveNote.on('click', function(){
    if (currentNote === undefined) {
      GUI.transientAlert("No note currently loaded!")
    } else {
      getConnection(function(conn) {
        var note = conn.getNote(currentNote);
        note.update(cm.getValue(), function() {
          GUI.transientAlert("Note "+currentNote+" updated: "+note.title());
          GUI.$historyMenu.data('stale', true);
        })
      });
    }
  });


  ///// SAVE A NEW NOTE /////

  GUI.$saveNoteAs.on('click', function(){
    GUI.promptForInput('New note name', 'Untitled', function(noteTitle) {
      if (noteTitle !== null) {
        getConnection(function(conn) {
          conn.newNote(noteTitle, cm.getValue(), function(note) {
            GUI.$historyMenu.data('stale', true);
            currentNote = note.guid;
            populateNoteList(conn.getNoteData());
          })
        });
      }
    })
  });


  ///// CREATE A NEW NOTE /////

  GUI.$newNote.on('click', function(){
    currentNote = undefined;
    GUI.$historyMenu.data('stale', true);
    cm.setValue('');
  })


  ///// NOTE DATA LOADING /////

  // connect to evernote and populate the list of notes
  function populateNoteList(notes) {
    var notebooks = _.chain(notes).pluck('notebook').unique().sortBy(function(x){return x.toLowerCase()}).value();
    var groupedNotes = _.groupBy(notes, 'notebook');

    // clear click handler and reset note list
    GUI.$noteList.off('click').empty();

    // re-build note list
    _.each(notebooks, function(notebook){
      GUI.$noteList.append('<li class="list-group-item active">' + notebook + '</li>');
      var notes = _.sortBy(groupedNotes[notebook], function(n){return n.title.toLowerCase()});
      _.each(notes, function(note) {
        GUI.$noteList.append('<a href="#" class="list-group-item" data-guid="'+note.guid+'">' + note.title + '</a>');
      });
    });

    // bind a handler for clicking on a note in the list (load the note)
    GUI.$noteList.on('click', 'a', function(){
      var guid = $(this).data('guid');

      // indicate currently selected item
      GUI.$noteList.find('a.list-group-item.selected').removeClass('selected');
      $(this).addClass('selected');

      // fetch note content
      getConnection(function(conn){
        conn.getNote(guid).fetchContent(function(content){

          // put note content in editor
          cm.setValue(content);

          // if note has changed, flag note history list as stale and update its attached note guid
          if (currentNote !== guid) {
            GUI.$historyMenu.data('stale', true);
          }

          // update GUID of current note
          currentNote = guid;
        })
      })

      // hide the note menu
      toggleDropdown();
    });
  }

  // show or hide note menu
  function toggleDropdown() {
    GUI.$noteMenu.toggle().addClass('col-md-2');
    GUI.$previewWindow.add(GUI.$editorWindow).toggleClass('col-md-6').toggleClass('col-md-5');
    getConnection();
  }

  // bind 'Load' menu item to show/hide note menu
  GUI.$loadMenuItem.on('click', toggleDropdown);


  ///// NOTE HISTORY /////

  function showNoteHistory(){

    // nothing to do if no note is loaded
    if (currentNote === undefined) {
      GUI.persistentWarning("A note must be loaded first!");
      return
    }

    // helper function to create a history menu item
    function historyItem(version, date) {
      return '<a href="#" class="list-group-item" data-sequence="'+version+'">' + EvernoteConnection.dateString(date) + '</a>'
    }

    // helper function to return true if all diff data are available
    function diffReady() {
      var selectedItems = GUI.$historyList.find('a.active').map( function(){return $(this).data('sequence')} ).toArray();
      if (selectedItems.length < 2) {
        return true
      } else {
        for (var i = 0; i < selectedItems.length-1; i++) {
          if (!(
              diffCache[selectedItems[i+1]] &&
              diffCache[selectedItems[i+1]][selectedItems[i]]
          )) {
            return false
          }
        }
        return true
      }
    }

    // helper function to perform the rendering
    // rendering only happens once all data are available in case the function is backlogged with clicks
    function doRendering() {
      if (diffReady()) {

        // get selected item list
        var $el = GUI.$historyList.find('a.active');
        var selectedItems = $el.map( function(){return $(this).data('sequence')} ).toArray();

        // clear history window
        GUI.$historyWindow.empty();

        // if only one version is selected, display the content of this version
        if (selectedItems.length == 1) {
          GUI.$historyWindow
            .append('<h2>' + $($el[0]).text() + '</h2>')
            .append('<div class="text-diff">' + escapeText(diffCache[selectedItems[0]][null]) + '</div>')

        // otherwise show diffs between selected versions
        } else {
          for (var i = selectedItems.length-2; i >= 0; i--) {
            compareBlocks(
              diffCache[ selectedItems[i+1] ][ null ],
              diffCache[ selectedItems[i]   ][ null ],
              diffOptions(
                $($el[i+1]).text() + ' &rarr; ' + $($el[i]).text(),
                diffCache[ selectedItems[i+1] ][ selectedItems[i] ]
              )
            );
          }
        }
      }
    }

    // callback function for clicking on a history menu item
    function clickHandler() {
      $el = $(this);

      // toggle selection status of current item and get selected item list
      $(this).toggleClass('active');
      var $el = GUI.$historyList.find('a.active');
      var selectedItems = $el.map( function(){return $(this).data('sequence')} ).toArray();

      // clear history window
      GUI.$historyWindow.empty();

      // call function to fetch note history list
      getConnection(function(conn) {
        conn.getNote(currentNote).fetchContent(selectedItems, function(contentArr) {

          // cache version data
          for (var i = 0; i < contentArr.length; i++) {
            if (!diffCache[selectedItems[i]])
              diffCache[selectedItems[i]] = {null : contentArr[i]};
          }

          // compute diffs between versions
          for (var i = contentArr.length-2; i >= 0; i--) {
            var oldVersion = selectedItems[i+1];
            var newVersion = selectedItems[i];
            var oldContent = contentArr[i+1];
            var newContent = contentArr[i];
            if(! diffCache[oldVersion][newVersion] ) {
              diffCache[oldVersion][newVersion] = compareBlocks(oldContent, newContent, {
                $container : null
              });
            }
          }

          // render results
          doRendering();
        })
      })
    }

    // if history is flagged as out-of-date, regenerate menu
    if (GUI.$historyMenu.data('stale')) {
      getConnection(function(conn) {

        // clear cache
        diffCache = {};

        // fetch version list for current note
        var note = conn.getNote(currentNote);
        note.versions(function(versionData) {

          // append menu entry for current version
          GUI.$historyList.empty().append(historyItem(note.version(), note.updated()));

          // append menu entries for older versions
          // NOTE: this should be returning wrapped Notes
          for (var i = 0; i < versionData.length; i++) {
            GUI.$historyList.append(historyItem(versionData[i].version(), versionData[i].updated()));
          }

          // history menu is no longer out-of-date
          GUI.$historyMenu.data('stale', false);

          // bind to click on history menu items
          GUI.$historyMenu.find('a').on('click', clickHandler);
        })
      })
    }
  }

}

// set everything in motion once document is ready
$(function(){

  // get gui references
  window.GUI = guiReferences();

  // starter text for editor
  GUI.$editor.text(md_test + gfm_test);
  launchCodeMirror();
  // $.ajax('Inbox/Linear%20Algebra.md').success(function(x){
  //   $('textarea#editor').text(x);
  //   launchCodeMirror();
  // })

  // start evernote connection
  connectToEvernote();
});
