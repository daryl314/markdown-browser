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
//  - WN: WrappedNote class for note handling
//  - getConnection: function to pass actions to server
function guiReferences(WN, getConnection){

  ///// GUI ELEMENTS /////

  gui = {

    // container for menu bar
    $mainMenu        : $('body > header#main-menu'),

    // File menu
    $loadMenuItem    : $('body > header#main-menu a#showNoteList'),
    $newNote         : $('body > header#main-menu a#newNote'),
    $saveNote        : $('body > header#main-menu a#saveNote'),
    $saveNoteAs      : $('body > header#main-menu a#saveNoteAs'),
    $refresh         : $('body > header#main-menu a#refreshConnection'),
    $updateToken     : $('body > header#main-menu a#updateToken'),

    // Nav menu
    $navMenu         : $('body > header#main-menu ul#navMenu'),

    // View toggles
    $viewEditor      : $('body > header#main-menu a#viewEditor'),
    $viewHistory     : $('body > header#main-menu a#viewHistory'),
    $viewViewer      : $('body > header#main-menu a#viewViewer'),

    // floating table of contents
    $floatingTOC     : $('#application-window nav#floating-toc'),

    // windows
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

    // alert components
    $promptTemplate  : $('#promptTemplate'),
    $promptOverlay   : $('#overlay-background'),
    $promptBody      : $('#promptTemplate #modalTitle'),
    $promptInput     : $('#promptTemplate .modal-body input'),
    $promptOK        : $('#promptTemplate button.btn-primary'),
    $alertContainer  : $('#alertContainer'),
    $alertTemplate   : $('#alertTemplate')
  };


  ///// STATE VARIABLES /////

  gui.state = {
    staleHistory  : true,         // is note history list out-of-date?
    diffCache     : {},           // cached version diff data
    currentTab    : "editor",     // currently selected tab
    showNoteList  : false,        // should note list be rendered?
    currentNote   : undefined     // GUID of current note
  };


  ///// DIALOG BOXES /////

  (function() {

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

  }());


  ///// GUI HANDLERS /////

  gui.updateLayout = function(newTab) {

    // set tab if applicable
    if (newTab)
      gui.state.currentTab = newTab;

    // reset arrow box classes
    gui.$viewEditor.removeClass('arrow_box');
    gui.$viewViewer.removeClass('arrow_box');
    gui.$viewHistory.removeClass('arrow_box');

    // hide all windows
    gui.$historyMenu.hide();
    gui.$historyWindow.hide();
    gui.$editorWindow.hide();
    gui.$previewWindow.hide();
    gui.$noteMenu.hide();
    gui.$tocWindow.hide();

    // reset column size classes
    gui.$previewWindow.removeClass('col-md-5').removeClass('col-md-6').removeClass('col-md-8').removeClass('col-md-10');
    gui.$editorWindow.removeClass('col-md-5').removeClass('col-md-6');

    // disable history mode if applicable
    if (gui.state.currentNote)
      gui.$viewHistory.parent('li').removeClass('disabled');
    else
    gui.$viewHistory.parent('li').addClass('disabled');

    // configure 'editor' mode
    if (gui.state.currentTab == 'editor') {
      gui.$viewEditor.addClass('arrow_box');
      gui.$editorWindow.show();
      gui.$previewWindow.show();
      if (gui.state.showNoteList) {
        gui.$previewWindow.addClass('col-md-5');
        gui.$editorWindow.addClass('col-md-5');
        gui.$noteMenu.show();
      } else {
        gui.$previewWindow.addClass('col-md-6');
        gui.$editorWindow.addClass('col-md-6');
      }

    // configure 'viewer' mode
    } else if (gui.state.currentTab == 'viewer') {
      gui.$viewViewer.addClass('arrow_box');
      gui.$previewWindow.show();
      gui.$tocWindow.show();
      if (gui.state.showNoteList) {
         gui.$previewWindow.addClass('col-md-8');
         gui.$noteMenu.show();
      } else {
        gui.$previewWindow.addClass('col-md-10');
      }

    // configure 'history' mode
    } else if (gui.state.currentTab == 'history') {
      gui.$viewHistory.addClass('arrow_box');
      gui.$historyMenu.show();
      gui.$historyWindow.show();

    // otherwise an error
    } else {
      throw new Error("Invalid tab state: "+gui.state.currentTab);
    }


  }

  // function to navigate to a table of contents cross-reference
  gui.navigationHandler = function(event){
    var $target = $( $(this).data('href') );
    gui.$previewWindow.scrollTop(gui.$previewWindow.scrollTop() + $target.position().top);
  };


  ///// DATA VIEWS /////

  // render note list
  gui.populateNoteList = function(notes) {

    // sorted list of unique notebooks
    var notebooks = _.chain(notes)
      .pluck('notebook')
      .unique()
      .sortBy(function(x){
        return x.toLowerCase()
      }).value();

    // notes grouped by their notebook
    var groupedNotes = _.groupBy(notes, 'notebook');

    // reset note list
    gui.$noteList.empty();

    // iterate over notebooks
    _.each(notebooks, function(notebook){

      //
      gui.$noteList.append(
        '<li class="list-group-item active">' + notebook + '</li>'
      );

      // iterate over notes in notebook
      var notes = _.sortBy(groupedNotes[notebook], function(n){return n.title.toLowerCase()});
      _.each(notes, function(note) {

        //
        gui.$noteList.append(
          '<a href="#" class="list-group-item" data-guid="'+note.guid+'">' + note.title + '</a>'
        );
      });
    });
  }

  // populate GUI with note content
  gui.populateNote = function(guid, content) {

    // put note content in editor
    cm.setValue(content);

    // if note has changed, flag note history list as stale and update its attached note guid
    if (gui.state.currentNote !== guid)
      gui.state.staleHistory = true;

    // update GUID of current note
    gui.state.currentNote = guid;

  }

  // generate note history menu for a specified note
  gui.populateNoteHistory = function(note, versionData) {

    // helper function to create a history menu item
    function historyItem(version, date) {
      return '<a href="#" class="list-group-item" data-sequence="'+version+'">' + date + '</a>'
    }

    // append menu entry for current version
    gui.$historyList.empty().append(historyItem(note.version(), note.updatedStr()));

    // append menu entries for older versions
    // NOTE: this should be returning wrapped Notes
    for (var i = 0; i < versionData.length; i++) {
      gui.$historyList.append(historyItem(versionData[i].version(), versionData[i].updatedStr()));
    }
  }

  // generate viw of note diff data
  gui.renderNoteDiffs = function() {

    // get selected item list
    var $el = GUI.$historyList.find('a.active');
    var selectedItems = $el.map( function(){return $(this).data('sequence')} ).toArray();

    // clear history window
    GUI.$historyWindow.empty();

    // if only one version is selected, display the content of this version
    if (selectedItems.length == 1) {
      GUI.$historyWindow
        .append('<h2>' + $($el[0]).text() + '</h2>')
        .append('<div class="text-diff">' + escapeText(gui.state.diffCache[selectedItems[0]][null]) + '</div>')

    // otherwise show diffs between selected versions
    } else {
      for (var i = selectedItems.length-2; i >= 0; i--) {
        compareBlocks(
          gui.state.diffCache[ selectedItems[i+1] ][ null ],
          gui.state.diffCache[ selectedItems[i]   ][ null ],
          gui.diffOptions(
            $($el[i+1]).text() + ' &rarr; ' + $($el[i]).text(),
            gui.state.diffCache[ selectedItems[i+1] ][ selectedItems[i] ]
          )
        );
      }
    }
  }


  ///// HELPER FUNCTIONS /////

  // options to pass to diff function
  gui.diffOptions = function(title, d) {
    return {
      title       : title,
      diffData    : d,
      $container  : gui.$historyWindow,
      validate    : true,
      style       : 'adjacent'
    }
  }

  // compute diffs between a list of note versions
  gui.computeVersionDiffs = function(keyArr, contentArr, diffCache) {

    // add entries for keys (version numbers) if they aren't already in cache

    for (var i = 0; i < contentArr.length; i++) {
      if (!diffCache[ keyArr[i] ]) {
        diffCache[ keyArr[i] ] = {
          null : contentArr[i]
        };
      }
    }

    // compute diffs between adjacent versions

    for (var i = contentArr.length-2; i >= 0; i--) {

      // current and previous version numbers
      var oldVersion = keyArr[i+1];
      var newVersion = keyArr[i];

      // current and previous note content
      var oldContent = contentArr[i+1];
      var newContent = contentArr[i];

      // if a comparison between version numbers isn't in cache, compute difference
      // and add it to the cache
      if(! diffCache[ oldVersion ][ newVersion ]) {
        diffCache[ oldVersion ][ newVersion ] = compareBlocks(oldContent, newContent, {
          $container : null
        });
      }
    }
  }

  // return true if all note diff data are ready
  gui.diffReady = function() {

    // currently selected versions in version list
    var selectedItems = gui.$historyList.find('a.active').map( function(){return $(this).data('sequence')} ).toArray();

    // if only one item is selected, don't need anything in cache
    if (selectedItems.length < 2) {
      return true

    // otherwise loop over pairs of adjacent selected versions
    } else {
      for (var i = 0; i < selectedItems.length-1; i++) {

        // if an entry doesn't exist for the current pair, return false
        if (!(
            gui.state.diffCache[selectedItems[i+1]] &&
            gui.state.diffCache[selectedItems[i+1]][selectedItems[i]]
        )) {
          return false
        }
      }

      // otherwise diff data are ready, so return true
      return true
    }
  }


  ///// SERVER CONNECTIVITY /////

  // generate/refresh note list
  gui.refreshNoteList = function(callback) {
    getConnection(function(conn){
      gui.populateNoteList(WN.getNoteData());
      if (callback) callback();
    })
  }

  // generate note list (no-op if already done)
  gui.generateNoteList = function(callback) {
    if (!WN.hasConnection()) {
      gui.refreshNoteList(callback);
    } else if (callback) {
      callback();
    }
  }

  // load a note
  gui.loadNote = function(guid, callback) {
    getConnection(function(conn){
      var note = conn.getNote(guid);
      var cb = undefined;
      if (callback)
        cb = function(content) { callback(content, note) };
      note.fetchContent(cb);
    })
  }

  // load note version data
  gui.loadNoteVersions = function(guid, versions, callback) {
    getConnection(function(conn){
      var note = conn.getNote(guid);
      note.fetchContent(versions, callback);
    });
  }

  // update a note
  gui.updateNote = function(guid, content, callback) {
    getConnection(function(conn) {
      var note = conn.getNote(guid);
      note.update(content, callback);
    });
  }

  // create a new note
  gui.createNote = function(title, content, callback) {
    getConnection(function(conn) {
      conn.newNote(title, content, callback)
    });
  }

  // fetch a note version list
  gui.fetchNoteVersions = function(guid, callback) {
    getConnection(function(conn) {
      var note = conn.getNote(guid);
      var cb = undefined;
      if (callback)
        cb = function(versionList) { callback(versionList, note) };
      note.versions(cb);
    })
  }

  // refresh connection
  gui.refreshConnection = function(callback) {
    getConnection(function(conn) {
      WN.refreshConnection(callback);
    })
  }


  ///// ATTACH TO EVENTS /////

  // bind to clicking on 'History' menu
  gui.$viewHistory.on('click', function(){
    if ($(this).hasClass('btn-primary') == false) {
      if (gui.state.currentNote === undefined) {
        gui.transientAlert("No note currently loaded!")
      } else if (gui.state.staleHistory) {
        gui.state.diffCache = {}; // clear cache
        gui.updateLayout('history');
        gui.fetchNoteVersions(gui.state.currentNote, function(versionData, note) {
          gui.populateNoteHistory(note, versionData);
          gui.state.staleHistory = false;
        })
      }
    }
  });

  // bind to clicking on 'Editor' menu
  gui.$viewEditor.on('click', function(){
    if ($(this).hasClass('btn-primary') == false) {
      gui.updateLayout('editor');
    }
  });

  // bind to clicking on 'Viewer' menu
  gui.$viewViewer.on('click', function(){
    gui.updateLayout('viewer');
  })

  // bind to table of contents entry clicks
  gui.$navMenu.on('click', 'a', gui.navigationHandler);
  gui.$floatingTOC.on('click', 'a', gui.navigationHandler);
  gui.$previewWindow.on('click', 'toc a', gui.navigationHandler);

  // bind to 'Load' menu and trigger refresh on first click
  gui.$loadMenuItem.on('click', function(){
    gui.generateNoteList();
    gui.toggleNoteList();
  })

  // bind to clicks on note list
  gui.$noteList.on('click', 'a', function(){
    var guid = $(this).data('guid');
    gui.$noteList.find('a.list-group-item.selected').removeClass('selected');
    $(this).addClass('selected');
    gui.loadNote(guid, function(content){
      gui.populateNote(guid, content)
    });
    gui.hideNoteList();
  });

  // bind to clicks on history items
  gui.$historyMenu.on('click', 'a', function(){
    $(this).toggleClass('active');
    var selectedItems = gui.$historyList.find('a.active').map( function(){
      return $(this).data('sequence')}
    ).toArray();
    gui.$historyWindow.empty();
    gui.loadNoteVersions(gui.state.currentNote, selectedItems, function(contentArr){
      gui.computeVersionDiffs(selectedItems, contentArr, gui.state.diffCache);
      // wait until all data are ready in case of click backlog
      if (gui.diffReady()) gui.renderNoteDiffs();
    })
  })

  // 'Save' --> update a note
  gui.$saveNote.on('click', function(){
    if (gui.state.currentNote === undefined) {
      gui.transientAlert("No note currently loaded!")
    } else {
      gui.updateNote(gui.state.currentNote, cm.getValue(), function(note){
        gui.transientAlert("Note "+gui.state.currentNote+" updated: "+note.title());
        gui.state.staleHistory = true;
      })
    }
  });

  // 'Preview Changes' --> preview note changes from server version
  /*gui.$previewChanges.on('click', function(){
    if (gui.state.currentNote === undefined) {
      gui.transientAlert("No note currently loaded!")
    } else {
      gui.loadNote(gui.state.currentNote, function(oldContent, note){
        gui.showHistoryWindow();
        gui.$historyWindow.empty();
        gui.$historyMenu.hide();
        compareBlocks(oldContent, cm.getValue(), gui.diffOptions(note.title()));
      })
    }
  })*/

  // 'Save As' --> write a new note to server
  gui.$saveNoteAs.on('click', function(){
    gui.promptForInput('New note name', 'Untitled', function(noteTitle) {
      if (noteTitle !== null) {
        gui.generateNoteList(function(){
          gui.createNote(noteTitle, cm.getValue(), function(note){
            gui.state.staleHistory = true;
            gui.state.currentNote = note.guid;
            gui.refreshNoteList();
          })
        });
      }
    })
  });

  // 'New' --> reset editor
  gui.$newNote.on('click', function(){
    gui.state.currentNote = undefined;
    gui.state.staleHistory = true;
    cm.setValue('');
  })

  // 'Refresh' --> Refresh connection with server
  gui.$refresh.on('click', function() {
    gui.refreshConnection(function() {
      gui.transientAlert("Refreshed server connection");
      gui.populateNoteList(WN.getNoteData());
    })
  })



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
  var minHeader = Math.min.apply(null,
    $el.find(':header').not('h1').map(function(){
      return parseInt($(this).prop('tagName').slice(1))
    })
  );
  var toc = markdown.toHTML(
    $el.find(':header').not('h1').map(function(){
      var level = parseInt($(this).prop("tagName").slice(1));
      return Array(1+2*(level-(minHeader-1))).join(' ') +
        "* ["+$(this).html()+"](#"+$(this).attr('id')+")";
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
  if (last == -1) {
    return;
  } else if (pos > headingLookup[last][0]) {
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
  if (matchingToc) {
    GUI.$floatingTOC.find('li').removeClass('active');
    matchingToc
      .parentsUntil(GUI.$floatingTOC, 'li')
      .addClass('active');
  }

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


/////////////////////////
// SERVER CONNECTIVITY //
/////////////////////////

// return an Evernote server connection
function getEvernoteConnection(callback) {

  // alias to WrappedNote class
  var WN = EvernoteConnection.WrappedNote;

  // if a connection exists, use it
  if (WN.hasConnection()) {
    if (callback) callback(WN);

  // otherwise create connection
  } else {

    // prompt user for token if it isn't set in local storage
    if (localStorage.getItem('token') === null)
      getEvernoteConnection.updateToken();

    // create a connection notification
    var $el = GUI.persistentAlert('Connecting to Evernote...');

    // connection options
    var opt = {
      searchTags    : ['markdown'],
      saveTags      : ['markdown'],
      errorLogger   : GUI.persistentWarning,
      messageLogger : GUI.transientAlert
    }

    // create connection
    WN.connect(localStorage.getItem('token'), opt, function() {

      // raise an exception if connection failed
      if (!WN.hasConnection()) {
        GUI.persistentWarning("Failed to connect to Evernote!");
        throw new Error("Unable to connect to Evernote");

      // otherwise notify user and trigger callback
      } else {
        $el.remove();
        GUI.transientAlert("Connected to Evernote!");
        //populateNoteList(WN.getNoteData());
        if (callback) callback(WN);
      }
    })
  }
}

// attach a function to update developer token
getEvernoteConnection.updateToken = function() {
  GUI.promptForInput(
    'Please enter your Evernote developer token',
    localStorage.getItem('token'),
    function(result) {
      localStorage.setItem('token', result);
    }
  );
}


//////////////////////////////
// SET EVERYTHING IN MOTION //
//////////////////////////////

// set everything in motion once document is ready
$(function(){

  // get gui references
  window.GUI = guiReferences(
    EvernoteConnection.WrappedNote,
    getEvernoteConnection
  );

  // enable menu to update token (Evernote-specific)
  GUI.$updateToken.show().on('click', getEvernoteConnection.updateToken);

  // starter text for editor
  GUI.$editor.text(md_test + gfm_test);
  launchCodeMirror();
  // $.ajax('Inbox/Linear%20Algebra.md').success(function(x){
  //   $('textarea#editor').text(x);
  //   launchCodeMirror();
  // })

});
