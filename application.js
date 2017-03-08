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

class NotificationHandler {

  constructor() {

    // alert components
    this.$promptTemplate  = $('#promptTemplate');
    this.$promptOverlay   = $('#overlay-background');
    this.$promptBody      = $('#promptTemplate #modalTitle');
    this.$promptInput     = $('#promptTemplate .modal-body input');
    this.$promptOK        = $('#promptTemplate button.btn-primary');
    this.$alertContainer  = $('#alertContainer');
    this.$alertTemplate   = $('#alertTemplate')

    // collection of elements to show/hide in dialog box prompts
    this.$dialogElements = this.$promptTemplate
      .add(this.$promptOverlay)
      .add(this.$promptInput.parent());
  }

  // helper function to create a new notification window
  _createNotification(message) {
    return this.$alertTemplate
      .clone()
      .appendTo(this.$alertContainer)
      .attr('id','')
      .show()
      .append(message);
  }

  // create a persistent alert window
  persistentAlert(message) {
    return this._createNotification(message).addClass('alert-info');
  }

  // create a transient alert window (hide after 5 seconds)
  transientAlert(message) {
    var $el = this._createNotification(message).addClass('alert-info').delay(5000).slideUp();
    window.setTimeout( function(){$el.remove()}, 6000 ); // clean up element after hiding
    return $el;
  }

  // create a persistent warning window
  persistentWarning(message) {
    return this._createNotification(message).addClass('alert-danger');
  }

  // create a transient warning window (hide after 5 seconds)
  transientWarning(message) {
    var $el = this._createNotification(message).addClass('alert-danger').delay(5000).slideUp();
    window.setTimeout( function(){$el.remove()}, 6000 ); // clean up element after hiding
    return $el;
  }

  // prompt user for input
  promptForInput(message, default_entry) {
    return new Promise((resolve,reject) => {
      this.$dialogElements.show();
      this.$promptBody.text(message);
      this.$promptInput.val(default_entry);
      this.$promptOK.off('click').one('click', function(){
        $dialogElements.hide();
        resolve( this.$promptInput.val() );
      });
    })
  }

  // prompt user for confirmation
  promptForConfirmation(message) {
    return new Promise((resolve,reject) => {
      this.$dialogElements.show();
      this.$promptBody.text(message);
      this.$promptInput.parent().hide();
      this.$promptOK.off('click').one('click', function(){
        $dialogElements.hide();
        resolve();
      });
    })
  }

}

class GuiControl {

  constructor(cm, wns) {

    // attach server if one was provided
    this.server = wns ? wns : null;

    // attach CodeMirror instance
    this.cm = cm ? cm : null;

    // attach jQuery references to GUI elements
    this._attachReferences();

    // enumeration for tabs
    this.tabs = {
      editor  : 1,
      viewer  : 2,
      changes : 3,
      history : 4,
      help    : 5
    };

    // state properties that trigger a refresh
    this.state = {
      currentNote   : null,             // GUID of current note
      currentTab    : this.tabs.editor, // currently selected tab
      floatingTOC   : false,            // display floating TOC menu?
      noteClean     : true,             // are there unsaved changes?
      noteTitle     : 'Untitled Note',  // title of current note
      showNoteList  : false             // should note list be rendered?
    };

    // other properties
    this.diffCache     = {};            // cached version diff data
    this.generation    = null;          // generation number for clean note state
    this.staleHistory  = true;          // is note history list out-of-date?

    // add a global error listener
    window.addEventListener("error", (e) => {
      this.persistentWarning(`ERROR: ${e.error.message}`);
      console.error(e.error.message);
      console.log(e);
      return false;
    });

    // attach event handlers
    this._registerCallbacks();

    // create a dialog handler
    this.dialogHandler = new NotificationHandler();

  }

  // attach a data connections
  attachServer(wns) {
    this.server = wns;
    this._debouncedRefresh();
  }

  // attach a CodeMirror instance
  attachCodeMirror(cm) {
    this.cm = cm;
  }

  // getters for properties that trigger a refresh
  get currentNote  () { return this.state.currentNote  }
  get currentTab   () { return this.state.currentTab   }
  get floatingTOC  () { return this.state.floatingTOC  }
  get noteClean    () { return this.state.noteClean    }
  get noteTitle    () { return this.state.noteTitle    }
  get showNoteList () { return this.state.showNoteList }

  // other getters
  get hasServer    () { return this.server != null     }
  get isWritable   () { }

  // setters for state properties that trigger a refresh
  set currentNote  (v) { this.state.currentNote  = v; this._debouncedRefresh(); }
  set currentTab   (v) { this.state.currenTab    = v; this._debouncedRefresh(); }
  set floatingTOC  (v) { this.state.floatingTOC  = v; this._debouncedRefresh(); }
  set noteClean    (v) { this.state.noteClean    = v; this._debouncedRefresh(); }
  set noteTitle    (v) { this.state.noteTitle    = v; this._debouncedRefresh(); }
  set showNoteList (v) { this.state.showNoteList = v; this._debouncedRefresh(); }

  // throttled call to refresh function
  _debouncedRefresh() {
    var _this = this;
    if (!this._refreshTimer) {
      var callback = function() {
        _this._refreshTimer = undefined;
        _this.refresh();
      }
      this._refreshTimer = window.setTimeout(callback, 50);
    }
  }

  // refresh gui to reflect state changes
  refresh() {

    // helper function to clear width classes
    function clearWidthClasses($el) {
      $el.removeClass('col-md-1 col-md-2 col-md-3 col-md-4 col-md-5 col-md-6 col-md-7 col-md-8 col-md-9 col-md-10 col-md-11 col-md-12');
    }

    // helper function to set column width class based on state
    var setWidthClass = ($el) => {
      let width = 12 - (this.showNoteList ? 2 : 0) - (this.floatingTOC ? 2 : 0);
      if ($el.length == 2) {
        $el.addClass(`col-md-${width/2}`)
      } else {
        $el.addClass(`col-md-${width}`)
      }
      return $el;
    }

    ///// SHOW AND HIDE GUI ELEMENTS /////

    // set note title
    if (!this.noteClean)
      this.$noteTitle.html('<span class="modificationFlag">Mod</span>'+this.noteTitle);
    else
      this.$noteTitle.text(this.noteTitle);

    // clear changes window if note is no longer modified
    if (this.noteClean)
      this.$historyWindow.empty();

    // reset arrow box classes
    this.$allTabs.removeClass('arrow_box');

    // hide all windows
    this.$allWindows.hide();

    // disable/enable menu items with server connection
    if (this.hasServer) {
      this.$serverItems.removeClass('disabled');
      this.$fileMenu.show();
    } else {
      this.$serverItems.addClass('disabled');
      this.$fileMenu.hide();
    }

    // reset column size classes
    clearWidthClasses(this.$previewWindow.add(this.$editorWindow).add(this.$historyWindow));

    // disable tabs that require loaded notes if applicable
    if (this.currentNote) {
      this.$viewHistory.parent('li').removeClass('disabled');
      this.$viewChanges.parent('li').removeClass('disabled');
    } else {
      this.$viewHistory.parent('li').addClass('disabled');
      this.$viewChanges.parent('li').addClass('disabled');
    }

    // show floating TOC menu if requested
    if (this.floatingTOC) {
      this.$tocWindow.show();
    }

    // show note list menu if requested
    if (this.showNoteList) {
      this.$noteMenu.show();
    }

    ///// CONFIGURE TAB DISPLAY /////

    switch (this.currentTab) {

      case this.tabs.editor:
        this.$viewEditor.addClass('arrow_box');
        setWidthClass( this.$editorWindow.add(this.$previewWindow) ).show();
        break;

      case this.tabs.viewer:
        this.$viewViewer.addClass('arrow_box');
        setWidthClass( this.$previewWindow ).show();
        break;

      case this.tabs.changes:
        this.$viewChanges.addClass('arrow_box');
        setWidthClass( this.$historyWindow ).show();
        break;

      case this.tabs.history:
        this.$viewHistory.addClass('arrow_box');
        this.$historyWindow.addClass('col-md-10').show();
        this.$historyMenu.show();
        break;

      case this.tabs.help:
        this.$viewHelp.addClass('arrow_box');
        setWidthClass( this.$editorWindow.add(this.$helpWindow) ).show();
        break;

      default:
        throw new Error("Invalid tab state: "+this.state.currentTab);
    }
  }

  ///// HELPER FUNCTIONS /////

  // attach jQuery references to object
  _attachReferences() {

    // container for menu bar
    this.$mainMenu        = $('body > header#main-menu');

    // File menu
    this.$fileMenu        = $('body > header#main-menu li#fileMenu');
    this.$loadMenuItem    = $('body > header#main-menu a#showNoteList');
    this.$newNote         = $('body > header#main-menu a#newNote');
    this.$saveNote        = $('body > header#main-menu a#saveNote');
    this.$saveNoteAs      = $('body > header#main-menu a#saveNoteAs');
    this.$refresh         = $('body > header#main-menu a#refreshConnection');
    this.$updateToken     = $('body > header#main-menu a#updateToken');

    // Nav menu
    this.$navMenu         = $('body > header#main-menu ul#navMenu');
    this.$noteTitle       = $('body > header#main-menu li#noteTitle');
    this.$toggleTOC       = $('body > header#main-menu a#toggleFloatingTOC');

    // Tabs
    this.$viewEditor      = $('body > header#main-menu a#viewEditor');
    this.$viewHistory     = $('body > header#main-menu a#viewHistory');
    this.$viewViewer      = $('body > header#main-menu a#viewViewer');
    this.$viewChanges     = $('body > header#main-menu a#viewChanges');
    this.$viewHelp        = $('body > header#main-menu a#viewHelp');

    // floating table of contents
    this.$floatingTOC     = $('#application-window ul#floating-toc');

    // windows
    this.$historyMenu     = $('#application-window section#history-list');
    this.$historyList     = $('#application-window section#history-list ul.list-group');
    this.$historyWindow   = $('#application-window section#history-container');
    this.$noteMenu        = $('#application-window section#nav-list');
    this.$noteList        = $('#application-window section#nav-list ul.list-group');
    this.$editorWindow    = $('#application-window main#content');
    this.$editor          = $('#application-window main#content textarea#editor');
    this.$previewWindow   = $('#application-window section#viewer-container');
    this.$previewContents = $('#application-window section#viewer-container div#viewer');
    this.$helpWindow      = $('#application-window section#help-container');
    this.$helpContents    = $('#application-window section#help-container div#rendered-help');
    this.$tocWindow       = $('#application-window section#floating-toc-container');

    // attach a wrapped set of tabs
    this.$allTabs = [
      this.$viewEditor,
      this.$viewViewer,
      this.$viewHistory,
      this.$viewChanges,
      this.$viewHelp
    ].reduce( (a,b) => a.add($(b)), $() );

    // attach a wrapped set of windows
    this.$allWindows = [
      this.$historyMenu,
      this.$historyWindow,
      this.$editorWindow,
      this.$previewWindow,
      this.$noteMenu,
      this.$tocWindow,
      this.$helpWindow
    ].reduce( (a,b) => a.add($(b)), $() );

    // collection of elements to disable without a writable connection
    this.$serverItems = this.$loadMenuItem.parent()
      .add(this.$saveNote.parent())
      .add(this.$saveNoteAs.parent())
      .add(this.$refresh.parent());

  }

  // attach to jQuery events
  _registerCallbacks() {

    // reference gui object for jQuery callbacks
    var _this = this;

    // bind to clicking on 'History' tab
    this.$viewHistory.off('click').on('click', function(){
      if (_this.currentTab !== _this.tabs.history) {
        if (_this.currentNote === null) {
          _this.transientAlert("No note currently loaded!")
        } else if (_this.staleHistory) {
          _this.diffCache = {}; // clear cache
          _this.currentTab = _this.tabs.history;
          _this.floatingTOC = false;
          _this.showHelp = false;
          _this.server.connect()
            .then(conn => {
              let note = conn.getNote(_this.currentNote);
              note.getVersions().then(versionData => {
                _this.populateNoteHistory(note, versionData);
                _this.staleHistory = false;
              })
            })
        }
      }
    });

    // bind to clicking on 'Editor' tab
    this.$viewEditor.off('click').on('click', function(){
      if (_this.currentTab !== _this.tabs.editor) {
        _this.currentTab = _this.tabs.editor;
        _this.floatingTOC = false;
        _this.showHelp = false;
      }
    });

    // bind to clicking on 'Viewer' tab
    this.$viewViewer.off('click').on('click', function(){
      if (_this.currentTab !== _this.tabs.viewer) {
        _this.currentTab = _this.tabs.viewer;
        _this.floatingTOC = false;
        _this.showHelp = false;
      }
    })

    // bind to clicking on 'Help' tab
    this.$viewHelp.off('click').on('click', function(){
      if (_this.currentTab !== _this.tabs.help) {
        _this.currentTab = _this.tabs.help;
        _this.floatingTOC = false;
        _this.showHelp = true;
      }
    })

    // bind to clicking on 'Changes' tab --> preview note changes from server version
    this.$viewChanges.off('click').on('click', function(){
      if (_this.currentTab !== _this.tabs.changes) {
        if (_this.currentNote === null) {
          _this.transientAlert("No note currently loaded!")
        } else {
          _this.server.connect()
            .then(conn => {
              let note = conn.getNote(_this.currentNote);
              note.getContent()
                .then(oldContent => {
                  _this.currentTab = _this.tabs.changes;
                  _this.floatingTOC = false;
                  _this.showHelp = false;
                  compareBlocks(oldContent, _this.cm.getValue(), _this.diffOptions(note.title));
                })
            })
        }
      }
    })

    // bind to table of contents entry clicks
    function navigationHandler(event){
      if (this !== _this.$toggleTOC[0]) {
        var $target = $( $(this).data('href') );
        _this.$previewWindow.scrollTop(_this.$previewWindow.scrollTop() + $target.position().top);
      }
    };
    this.$navMenu.off('click').on('click', 'a', navigationHandler);
    this.$floatingTOC.off('click').on('click', 'a', navigationHandler);
    this.$previewWindow.off('click').on('click', 'toc a', navigationHandler);

    // 'Toggle Floating Menu' --> toggle display of floating TOC menu
    this.$toggleTOC.off('click').on('click', function(){
      _this.floatingTOC = !_this.floatingTOC;
    })

    // bind to 'Load' menu and trigger refresh on first click
    this.$loadMenuItem.off('click').on('click', function(){
      if (_this.hasServer) {
        _this.showNoteList = true;
        _this.server.connect().then(conn => {
          _this.populateNoteList(conn.notes);
        })
      }
    })

    // bind to clicks on notes in note list
    this.$noteList.off('click').on('click', 'a', function(){
      var guid = $(this).data('guid');
      _this.$noteList.find('a.list-group-item.selected').removeClass('selected');
      $(this).addClass('selected');
      _this.server.connect()
        .then(conn => {
          let note = conn.getNote(guid);
          note.getContent().then(content => {
            _this.populateNote(guid, content);
            _this.generation = _this.cm.changeGeneration();
            _this.showNoteList = false;
            _this.noteClean = true;
            _this.noteTitle = note.title;
          })
        })
    });

    // bind to clicks on history items
    this.$historyMenu.off('click').on('click', 'a', function(){
      $(this).toggleClass('active');
      var selectedItems = _this.$historyList.find('a.active').map( function(){
        return $(this).data('sequence')}
      ).toArray();
      _this.$historyWindow.empty();
      _this.server.connect()
        .then(conn => conn.getNote(_this.currentNote).getContent(selectedItems))
        .then(contentArr => {
          _this.computeVersionDiffs(selectedItems, contentArr, _this.diffCache);
          // wait until all data are ready in case of click backlog
          if (_this.diffReady()) _this.renderNoteDiffs();
        })
    })

    // 'Save' --> update a note
    this.$saveNote.off('click').on('click', function(){
      if (_this.hasServer) {
        if (_this.currentNote === null) {
          _this.transientAlert("No note currently loaded!")
        } else {
          _this.server.connect()
            .then(conn => {
              let note = conn.getNote(_this.currentNote);
              note.setContent(_this.cm.getValue()).then(() => {
                _this.transientAlert("Note "+_this.currentNote+" updated: "+note.title);
                _this.generation = _this.cm.changeGeneration();
                _this.staleHistory = true;
                _this.noteClean = true;
              })
            })
        }
      }
    });

    // 'Save As' --> write a new note to server
    this.$saveNoteAs.off('click').on('click', function(){
      if (_this.hasServer) {
        _this.promptForInput('New note name', 'Untitled').then(noteTitle => {
          if (noteTitle !== null) {
            _this.server.connect()
              .then(conn => conn.newNote(noteTitle, _this.cm.getValue()))
              .then(note => {
                _this.generation = _this.cm.changeGeneration();
                _this.staleHistory = true;
                _this.currentNote = note.guid;
                _this.noteTitle = noteTitle;
                _this.noteClean = true;
                _this.populateNoteList(conn.notes);
              })
          }
        })
      }
    })

    // 'New' --> reset editor
    this.$newNote.off('click').on('click', function(){
      var callback = function() {
        _this.currentNote = null; // undefined in updateState throws exception
        _this.cm.setValue('');
        _this.generation = _this.cm.changeGeneration();
        _this.noteTitle = 'Untitled Note';
        _this.noteClean = true;
        _this.staleHistory = true;
      }
      if (!_this.noteClean) {
        _this.promptForConfirmation('Note has unsaved changes: okay to proceed?').then(() => callback());
      } else {
        callback();
      }
    })

    // 'Refresh' --> Refresh connection with server
    this.$refresh.off('click').on('click', function() {
      if (_this.hasServer) {
        _this.server.connect()
          .then(conn => conn.fetchMetaData())
          .then(conn => {
            _this.populateNoteList(conn.notes);
            _this.transientAlert("Refreshed server connection");
          })
      }
    })

  }

  ///// DIALOG BOXES /////

  persistentAlert       (message) { return this.dialogHandler.persistentAlert       (message) }
  transientAlert        (message) { return this.dialogHandler.transientAlert        (message) }
  persistentWarning     (message) { return this.dialogHandler.persistentWarning     (message) }
  transientWarning      (message) { return this.dialogHandler.transientWarning      (message) }
  promptForConfirmation (message) { return this.dialogHandler.promptForConfirmation (message) }
  promptForInput(message, default_entry) {
    return this.dialogHandler.promptForInput(message, default_entry)
  }

  ///// DATA VIEWS /////

  // render note list
  populateNoteList(notes) {

    // sorted list of unique notebooks
    var notebooks = _.chain(notes)
      .map(n => n.notebook)
      .unique()
      .sortBy(function(x){
        return x.toLowerCase()
      }).value();

    // notes grouped by their notebook
    var groupedNotes = _.groupBy(notes, n=>n.notebook);

    // reset note list
    this.$noteList.empty();

    // iterate over notebooks
    notebooks.forEach(notebook => {
      this.$noteList.append(`<li class="list-group-item active">${notebook}</li>`);
      _.sortBy(groupedNotes[notebook], n => n.title.toLowerCase()).forEach(note => {
        this.$noteList.append(`<a href="#" class="list-group-item" data-guid="${note.guid}">${note.title}</a>`);
      })
    });
  }

  // populate editor with note content
  populateNote(guid, content) {

    // put note content in editor
    this.cm.setValue(content);

    // if note has changed, flag note history list as stale and update its attached note guid
    if (this.currentNote !== guid)
      this.staleHistory = true;

    // update GUID of current note
    this.currentNote = guid;
  }

  // generate note history menu for a specified note
  populateNoteHistory(note, versionData) {

    // helper function to create a history menu item
    function historyItem(version, date) {
      return `<a href="#" class="list-group-item" data-sequence="${version}">${date}</a>`
    }

    // append menu entry for current version
    this.$historyList.empty().append(historyItem(note.version, note.updatedStr));

    // append menu entries for older versions
    // NOTE: this should be returning wrapped Notes
    versionData.forEach(v => {
      this.$historyList.append(historyItem(v.version, v.updatedStr));
    })
  }

  // generate viw of note diff data
  renderNoteDiffs() {

    // get selected item list
    var $el = this.$historyList.find('a.active');
    var selectedItems = $el.map( function(){return $(this).data('sequence')} ).toArray();

    // clear history window
    this.$historyWindow.empty();

    // if only one version is selected, display the content of this version
    if (selectedItems.length == 1) {
      this.$historyWindow
        .append('<h2>' + $($el[0]).text() + '</h2>')
        .append('<div class="text-diff">' + escapeText(this.diffCache[selectedItems[0]][null]) + '</div>')

    // otherwise show diffs between selected versions
    } else {
      for (var i = selectedItems.length-2; i >= 0; i--) {
        compareBlocks(
          this.diffCache[ selectedItems[i+1] ][ null ],
          this.diffCache[ selectedItems[i]   ][ null ],
          this.diffOptions(
            $($el[i+1]).text() + ' &rarr; ' + $($el[i]).text(),
            this.diffCache[ selectedItems[i+1] ][ selectedItems[i] ]
          )
        );
      }
    }
  }


  ///// HELPER FUNCTIONS /////

  // options to pass to diff function
  diffOptions(title, d) {
    return {
      title       : title,
      diffData    : d,
      $container  : this.$historyWindow,
      validate    : true,
      style       : 'adjacent'
    }
  }

  // compute diffs between a list of note versions
  computeVersionDiffs(keyArr, contentArr, diffCache) {

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
  diffReady() {

    // currently selected versions in version list
    var selectedItems = this.$historyList.find('a.active').map( function(){return $(this).data('sequence')} ).toArray();

    // if only one item is selected, don't need anything in cache
    if (selectedItems.length < 2) {
      return true

    // otherwise loop over pairs of adjacent selected versions
    } else {
      for (var i = 0; i < selectedItems.length-1; i++) {

        // if an entry doesn't exist for the current pair, return false
        if (!(
            this.diffCache[selectedItems[i+1]] &&
            this.diffCache[selectedItems[i+1]][selectedItems[i]]
        )) {
          return false
        }
      }

      // otherwise diff data are ready, so return true
      return true
    }
  }
}


////////////////////////////
// SCROLL SYNCHRONIZATION //
////////////////////////////

class ScrollSync {

  constructor(cm, $el, $toc) {

    // attach CodeMirror instance, preview window container, and table of contents
    this.cm = cm;
    this.$el = $el;
    this.$toc = $toc;

    // line number lookup array
    this.lineMap = null;

    // heading location lookup array
    this.headingLookup = null;

    // counters for number of triggered scroll actions.  this lets the scrolled
    // window know that its scrolling was triggered by a user scroll in the ohter
    // window.  otherwise there is a circular dependency and the windows fight with
    // each other
    this.scrollState = {
      editorCount : 0,
      viewerCount : 0
    };

    // don't generate debugging data
    this.debug = false;

    // reference to this for callbacks
    var _this = this;

    // initialize scroll sync data
    this.refresh();

    // bind function to scroll preview window to editor location
    this.cm.off('scroll');
    this.cm.on('scroll',
      _.debounce(
        function(){ _this.scrollTo(_this.visibleLines().top); },
        100,
        {maxWait:100}
      )
    );

    // bind function to scroll editor window to preview location
    this.$el.off('scroll').on('scroll',
      _.debounce(
        function(){ _this.scrollFrom($(this).scrollTop()); },
        100,
        {maxWait:100}
      )
    );
  }

  // refresh scroll sync information
  refresh() {
    var _this = this;

    // capture line numbers
    var x = [], y = [];
    var lineRefs = this.$el.find('[data-source-line]').each( function(){
      x.push( parseInt($(this).attr('data-source-line'))                          );
      y.push( $(this).position().top + _this.$el.scrollTop()  );
    })

    // interpolate/extrapolate to create a line number lookup array
    this.lineMap = this.interpolate(x, y, 1, this.cm.lastLine());

    // capture heading locations
    this.headingLookup = [];
    this.$el.find(':header').each( function(){
      var matchingToc = _this.$toc.find("a[data-href='#" + $(this).attr('id') + "']");
      if (matchingToc.length > 0) {
        _this.headingLookup.push([
          $(this).position().top + _this.$el.scrollTop(),
          matchingToc
        ])
      }
    });

    // confirm that lineMap entries are properly sorted
    for (var i = 1; i < this.lineMap.length; i++) {
      if (this.lineMap[i] < this.lineMap[i-1]) {
        throw new Error("lineMap algorithm failure!");
      }
    }

    // confirm that headingLookup entries are properly sorted
    for (var i = 1; i < this.headingLookup.length; i++) {
      if (this.headingLookup[i][0] < this.headingLookup[i-1][0]) {
        throw new Error("headingLookup algorithm failure!");
      }
    }
  }

  // function to return viewer position associated with editor position
  editorPosToViewerPos(line, marker) {
    var h = this.$el.height();
    if (marker == 'bottom') {
      return this.lineMap[line-1] - h*1;
    } else if (marker == 'center') {
      return this.lineMap[line-1] - h*0.5;
    } else {
      return this.lineMap[line-1] - h*0;
    }
  }

  // function to return editor position associated with viewer position
  viewerPosToEditorPos(line) {
    var _this = this;

    // binary search function
    function binSearch(a, b, val) {
      if (b - a == 1) {
        if (_this.lineMap[b] == val) {
          return b;
        } else if (_this.lineMap[a] == val) {
          return a;
        } else {
          return a + (val - _this.lineMap[a])/(_this.lineMap[b] - _this.lineMap[a]);
        }
      } else {
        var m = Math.round((a+b)/2);
        if (val > _this.lineMap[m]) {
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
        binSearch(1, this.lineMap.length-1, line)
      )
    );
  }

  // function to return closest header to a position
  parentHeader(pos) {
    var _this = this;

    // binary search function
    function binSearch(a, b, val) {
      if (b - a == 1) {
        if (_this.headingLookup[b] == val) {
          return _this.headingLookup[b][1];
        } else if (_this.lineMap[a] == val) {
          return _this.headingLookup[a][1];
        } else {
          return _this.headingLookup[a][1];
        }
      } else {
        var m = Math.round((a+b)/2);
        if (val < _this.headingLookup[m][0]) {
          return binSearch(a, m, val);
        } else {
          return binSearch(m, b, val);
        }
      }
    }

    // perform search
    var last = this.headingLookup.length-1;
    if (last == -1) {
      return;
    } else if (pos > this.headingLookup[last][0]) {
      return this.headingLookup[last][1];
    } else {
      return binSearch(0, this.headingLookup.length-1, pos);
    }

  }


  // average adjacent points
  collapseRepeated(x_vec, y_vec) {
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
  dumpPoints(x, y, name) {
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
    this.$el.append(txt.join('<br>\n'))+'<br>\n';
  }

  // interpolate data to a linear range
  interpolate(x_vec, y_vec, xi, xf) {
    var out = [], x1, x2, y1, y2, m;
    if (this.debug) this.dumpPoints(x_vec, y_vec, 'initial');

    this.collapseRepeated(x_vec, y_vec);
    if (this.debug) this.dumpPoints(x_vec, y_vec, 'collapsed');

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
    if (this.debug) this.dumpPoints(null, out, 'interpolated');
    return out;
  }

  // scroll preview window to the location matching specified editor line number
  scrollTo(line, marker) {

    // if the update count is nonzero, this was a scroll triggered by a preview
    // window scroll (and not a user scroll).  decrement the scroll count and
    // return.
    if (this.scrollState.editorCount > 0) {
      this.scrollState.editorCount -= 1;
      return
    }

    // otherwise this was a user scroll, so trigger a corresponding scroll in the
    // preview window
    else {
      this.scrollState.viewerCount += 1;
      this.$el.scrollTop( this.editorPosToViewerPos(line,marker) );
      return
    }

  }

  // scroll editor to line number matching specified preview scroll location
  scrollFrom(line) {

    // identify closest header and corresponding TOC entry
    var matchingToc = this.parentHeader(line);

    // style closest header
    if (matchingToc) {
      this.$toc.find('li').removeClass('active visible');
      matchingToc.parent('li').addClass('active');
      matchingToc.parentsUntil(this.$toc, 'li').addClass('visible');

    }

    // if the update count is nonzero, this was a scroll triggered by an editor
    // window scroll (and not a user scroll).  decrement the scroll count and
    // return
    if (this.scrollState.viewerCount > 0) {
      this.scrollState.viewerCount -= 1;
      return
    }

    // otherwise this was a user scroll, so trigger a corresponding scroll in the
    // editor window
    else {
      this.scrollState.editorCount += 1;
      this.cm.scrollTo(null, this.cm.heightAtLine(this.viewerPosToEditorPos(line)-1, 'local'));
      return
    }
  }

  // return locations of lines in editor window
  visibleLines(){
    var scrollInfo = this.cm.getScrollInfo();
    var topLine    = this.cm.lineAtHeight(scrollInfo.top                          , 'local');
    var bottomLine = this.cm.lineAtHeight(scrollInfo.top + scrollInfo.clientHeight, 'local');
    var maxLine    = this.cm.lineCount() - 1;
    return {
      top:    topLine,
      bottom: Math.min(maxLine, bottomLine),
      cursor: Math.min(maxLine, this.cm.getCursor().line)
    }
  }
}


////////////////////////
// MARKDOWN RENDERING //
////////////////////////

class MarkdownRenderer {

  constructor() {
    this.latexCache = {};
  }

  // function to render markdown into the specified element
  renderMarkdown(x, $el) {

    // convert markdown to HTML
    var html = markdown.toHTML(
      x.replace(/\[TOC\]/gi, '<toc></toc>') // TOC jQuery can find
      ,{includeLines:true}
    );

    // process <latex> tags
    html = html.replace(/(<latex.*?>)([\s\S]*?)(<\/latex>)/g, (match,p1,p2,p3) => {
      return p1 + this.latexToHTML(p2) + p3;
    })

    // populate specified element with text converted to markdown
    $el.html(html);

    // create a table of contents
    var toc = markdown.toHTML(this.extractTOC($el));

    // convert anchors to data-href attributes
    toc = toc.replace(/href/g, 'href="#" data-href');

    // fill TOC elements
    $el.find('toc').html(toc.replace(/ul>/g, 'ol>'));

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

  // function to extract header data and generate a markdown table of contents list
  extractTOC($el) {

    // identify lowest-level header
    var minHeader = Math.min.apply(null,
      $el.find(':header').not('h1').map(function(){
        return parseInt($(this).prop('tagName').slice(1))
      })
    );

    // generate markdown
    return $el.find(':header').not('h1').map(function(){
      var level = parseInt($(this).prop("tagName").slice(1));
      var spaces = Array(1+2*(level-minHeader)).join(' ');
      return spaces + "* ["+$(this).html()+"](#"+$(this).attr('id')+")";
    }).toArray().join('\n')
  }

  // convert a latex string to HTML code (with caching to speed procesing)
  latexToHTML(latex, isBlock) {
    if (this.latexCache[latex]) {
      return this.latexCache[latex];
    } else {
      try {
        var out = katex.renderToString(latex, {
          displayMode: isBlock,
          throwOnError: false
        });
        this.latexCache[latex] = out;
        return out;
      } catch (err) {
        return '<span style="color:red">' + err + '</span>'
      }
    }
  }
}


////////////////////////
// LOCAL FILE SUPPORT //
////////////////////////

// make an ajax request
function requestFile(fileName, callback) {
  $.ajax(fileName)
    .success(callback)
    .error(function(qXHR, textStatus, errorThrown){
      throw new Error("AJAX request failure!");
    });
}

// generate local note list
function generateLocalNoteList(){

  // request recursive list of markdown files
  requestFile('/@ls/*.md', function(files){

    // markdown file data grouped by containing folder
    var noteData = _.chain(files)
      .map(function(f){
        var m = f.match(/(.*)\/(.*)/);
        return { title:m[2], folder:m[1], link:f }
      })
      .sortBy(function(x){
        return x.title.toLowerCase()
      })
      .groupBy('folder')
      .value();

    // clear note list
    gui.$noteList.empty();

    // sorted list of folders
    var folders = _.sortBy(Object.keys(noteData), function(a){ return a.toLowerCase() });

    // iterate over folders
    _.each(folders, function(folder){

      // create header for current folder
      gui.$noteList.append(
        '<li class="list-group-item active">' + folder + '</li>'
      );

      // iterate over notes in folder and append to list
      _.each(noteData[folder], function(note) {
        gui.$noteList.append(
          '<a href="#" class="list-group-item" data-link="'+note.link+'">' + note.title + '</a>'
        );
      });
    })

    // bind a new click handler for notes
    gui.$noteList.off('click').on('click', 'a', function(){
      loadLocalFile($(this).data('link'));
      window.history.pushState(
        null,
        'Markdown Browser',
        document.URL.split('?')[0] + '?' + $(this).data('link').slice(2)
      );
    })
  });
}


///////////////////////////////////
// LOCAL SYNCHRONIZATION SUPPORT //
///////////////////////////////////

function viewLocalStorage() {

  EvernoteOffline.connect('syncData').then( () => {
    var conn = EvernoteOffline._instance;
    var notes = new WrappedNoteROCollection();
    conn.meta.notes.forEach(n => {
      if (n.deleted === null) {
        notes.add(new StaticWrappedNote(n,conn))
      }
    });
    notes.sortBy('updated', true);

    window.wnc = notes;

    var tagNoteCounts = new Map(conn.meta.tags.map(t => [t.name, 0]));
    var notebookNoteCounts = new Map(conn.meta.notebooks.map(nb => [nb.name,0]));
    notes._notes.forEach(n => {
      notebookNoteCounts.set(n.notebook, notebookNoteCounts.get(n.notebook)+1);
      n.tags.forEach(t => {
        tagNoteCounts.set(t, tagNoteCounts.get(t)+1);
      });
    });

    var notebooksByStack = {};
    conn.meta.notebooks.forEach(nb => {
      let stack = nb.stack || "Default";
      notebooksByStack[stack] = notebooksByStack[stack] || [];
      notebooksByStack[stack].push(nb);
    });
    Object.keys(notebooksByStack).sort().forEach(k => {
      let li = notebooksByStack[k].map( nb => `<li data-guid="${nb.guid}">${nb.name} [${notebookNoteCounts.get(nb.name)}]</li>` );
      $('#browser-menu li#browser-menu-notebooks > ul').append(
        `<li>${k}<ul>${li.join('\n')}</ul></li>`
      )
    });

    var tagMap = new Map(conn.meta.tags.map(t => [t.guid,t]));
    var tagChildren = new Map(conn.meta.tags.map(t => [t.guid, []]));
    var rootTags = [];
    conn.meta.tags.forEach(t => {
      let parent = t.parentGuid;
      if (parent) {
        tagChildren.get(parent).push(t.guid);
      } else {
        rootTags.push(t.guid);
      }
    });
    function tagToHtml(guid) {
      let nTagged = tagNoteCounts.get(tagMap.get(guid).name);
      if (tagChildren.get(guid).length > 0) {
        var children = tagChildren.get(guid).map(g => tagToHtml(g)).join('');
        return `<li data-guid="${guid}">${tagMap.get(guid).name} [${nTagged}]<ul>${children}</ul></li>`
      } else {
        return `<li data-guid="${guid}">${tagMap.get(guid).name} [${nTagged}]</li>`
      }
    }
    rootTags.forEach(t => {
      $('#browser-menu li#browser-menu-tags > ul').append(tagToHtml(t));
    });

    gui.currentTab = gui.tabs.viewer;
    gui.floatingTOC = false;
    gui.showHelp = false;
    gui.$previewWindow.hide();
    $('#browser-menu').add('#browser-notes').add('#browser-viewer').show();

    function render() {
      var tr = notes.map( n => `<tr data-guid="${n.guid}">
        <td>${n.updatedStr}</td>
        <td>${n.title}</td>
        <td>${n.notebook}</td>
        <td>${n.tags}</td>
      </tr>` ).join('\n');
      $('table#browser-note-list').html(
        `<thead>
          <tr>
            <th style="width:20%" data-field="updated" class="sort-asc">Updated</th>
            <th style="width:40%" data-field="title">Title</th>
            <th style="width:20%" data-field="notebook">Notebook</th>
            <th style="width:20%" data-field="tags">Tags</th>
          </tr>
        </thead><tbody>
          ${tr}
        </tbody>`
      );
    }

    render();

    $('#browser-notes').on('click', 'thead th', function(){
      var field = $(this).data('field');
      var sort_rev = $(this).hasClass('sort-dsc');
      notes.sortBy(field, sort_rev);
      render();
      $('#browser-notes thead th')
        .removeClass('sort-asc sort-dsc')
        .filter( function(){ return $(this).data('field') == field } )
        .addClass( sort_rev ? 'sort-asc' : 'sort-dsc' )
    });

    $('#browser-notes').on('click', 'tbody tr', function(){
      var note = conn.notes.get( $(this).data('guid') );
      conn.getNoteContent($(this).data('guid')).then(content => {
          $('#browser-viewer').html( $(content).find('en-note').html() );
          var hashLookup = new Map(note.resources.map(r => [r.data.bodyHash,r]));
          $('#browser-viewer en-media').each( function() {
            var mimeType = $(this).attr('type');
            var resData = hashLookup.get($(this).attr('hash'));
            var resLink = `syncData/resources/${resData.guid}/${resData.guid}`;
            if (mimeType.startsWith('image/')) {
              $(this).replaceWith(`<img src="${resLink}">`);
            } else if (mimeType == 'application/pdf') {
              $(this).replaceWith(`<object data='${resLink}' type='application/pdf' height="800" width="600"><a href='${resLink}'>${resLink}.pdf</a></object>`);
            } else {
              throw new Error(`Unrecognized mime type: ${mimeType}`);
            }
          });
        })
    });

    $('#browser-menu li#browser-menu-notebooks').on('click', 'li', function(event){
      event.stopPropagation();
      var notebook = conn.notebooks.get( $(this).data('guid') ).name;
      console.log("Filtering for notebook: "+notebook);
      notes.filter( n => n.notebook == notebook );
      render();
    });

    $('#browser-menu li#browser-menu-tags').on('click', 'li', function(event){
      event.stopPropagation();
      var tag = conn.tags.get( $(this).data('guid') ).name;
      console.log("Filtering for tag: "+tag)
      notes.filter( n => n.tags.includes(tag) );
      render();
    });

    conn.getNoteContent('4c337201-7320-4bf3-a646-ec096796ed16')
      .then( (content) => {
        $('#browser-viewer').html( $(content).find('en-note').html() );
      });
  })
}

function syncToLocalStorage() {
  var sync = new Synchronizer(
    localStorage.token,
    "@proxy-https/www.evernote.com/shard/s2/notestore",
    'syncData',
    1e7
  );
  sync.synchronize().then(() => console.log('Sync complete!'));
}


//////////////////////////////
// SET EVERYTHING IN MOTION //
//////////////////////////////

class Application {

  constructor() {
    this.queryOptions = this.processQueryString(window.location.search);
    this.initalDocument = 'instructions.md';
    this.GUI = null;
    this.WNC = null;
    this.scrollSync = null;
    this.renderer = new MarkdownRenderer();
  }

  get mode() {
    return this.queryOptions.mode;
  }

  static documentReady() {
    return new Promise((resolve,reject) => {$(resolve)})
  }

  static loadJavascriptFile(url) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        dataType: 'script',
        success: resolve,
        async: true
      })
    })
  }

  run() {
    Application.documentReady()
      .then(() => {
        this.GUI = new GuiControl();  // get gui references without a server connection
        return ProxyServerIO.load(this.initalDocument,'text')
      })
      .then(txt => {
        this.GUI.$editor.text(txt);
        this.launchCodeMirror(this.GUI);
      })
      .then(() => {
        if (this.queryOptions.mode == 'evernote') {
          if (localStorage.getItem('token') === null)
            getEvernoteConnection.updateToken();
          return Application.loadJavascriptFile('/lib/evernote-sdk-minified.js')
        } else {
          return null
        }
      })
      .then(() => {
        this.WNC = this.wnc();
        this.GUI.attachServer(this.WNC);
        if (!this.WNC) {
          GUI.persistentWarning('Invalid mode: '+queryOptions.mode);
          throw new Error("Invalid mode: "+queryOptions.mode);
        }
        this.GUI.transientAlert('Running in mode: '+this.queryOptions.mode);
        if (this.mode == 'evernote') {
          this.GUI.$updateToken.show().on('click', updateToken);
        } else if (this.mode == 'file') {
          this.WNC.connect().then(conn => {
            conn.getNoteContent(`${this.queryOptions.location}/${this.queryOptions.file}`).then(txt => {
              this.cm.setValue(txt);
              this.GUI.staleHistory = false;
              this.GUI.noteTitle = this.queryOptions.file;
              this.GUI.currentTab = this.GUI.tabs.viewer;
              this.GUI.showNoteList = true;
              this.GUI.floatingTOC = true;
            })
          })
        }
      });
    return this
  }

  // return the appropriate WrappedNoteCollection based on mode
  wnc() {
    switch (this.mode) {
      case 'file':
        return new WrappedNoteCollectionFiles(this.queryOptions.location);
      case 'offline':
        return new WrappedNoteCollectionSyncData(this.queryOptions.location);
      case 'evernote':
        return new WrappedNoteCollectionEvernote(
          localStorage.getItem('token'),
          "@proxy-https/www.evernote.com/shard/s2/notestore",
          {
            searchTags    : ['markdown'],
            saveTags      : ['markdown'],
            errorLogger   : msg => {this.GUI.persistentWarning(msg)},
            messageLogger : msg => {this.GUI.transientAlert(msg)}
          }
        );
      default:
        return null
    }
  }

  // function to initialize CodeMirror once startup text is available
  launchCodeMirror() {
    var _this = this;

    // add plugin to auto-close brackets
    registerCloseBrackets();

    // convert textarea to CodeMirror editor
    this.cm = CodeMirror.fromTextArea($(this.GUI.$editor)[0], {
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

    // attach Codemirror instance
    this.GUI.attachCodeMirror(this.cm);

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

    // configure scroll sync
    this.scrollSync = new ScrollSync(this.cm, this.GUI.$previewWindow, this.GUI.$floatingTOC);

    // render starter text
    this.render(this.GUI);

    // re-render on text change (debounce to render when typing stops)
    this.cm.on('change',
      _.debounce(
        () => {_this.render(_this.GUI)},
        300,
        { maxWait:1000 }
      )
    );

    // flag note as modified when the 'change' event fires
    this.cm.on('change', function(){
      if (_this.GUI.noteClean == !_this.cm.isClean(_this.GUI.generation)) {
        _this.GUI.noteClean = _this.cm.isClean(_this.GUI.generation);
      }
    })

    // copy help text to help window
    _this.GUI.$helpContents.html( _this.GUI.$previewContents.html() );

  }

  // function to render markdown
  render() {

    // save cursor position
    var currentScroll = this.GUI.$previewWindow.scrollTop();

    // execute rendering
    var renderData = this.renderer.renderMarkdown(this.cm.getValue(), this.GUI.$previewContents);

    // table of contents without outer UL
    var toc = $(renderData.toc).html();

    // create nav menu
    this.GUI.$navMenu.children('li.divider ~ li').remove();
    this.GUI.$navMenu.append(toc);

    // create floating table of contents
    this.GUI.$floatingTOC.html(toc);

    // refresh scroll sync data
    this.scrollSync.refresh();

    // scroll to the cursor location
    this.GUI.$previewWindow.scrollTop(currentScroll);

  }

  // convert html query string to options object
  processQueryString(querystring) {

    // slice off initial "?" and split components on "&"
    var queryParams = querystring.slice(1).split('&');

    // empty query string defaults to evernote connection mode
    if (queryParams.length == 1 && queryParams[0].length == 0) {
      return {
        'mode': 'evernote'
      }

    // single file string defeaults to markdown file viewer mode
    } else if (queryParams.length == 1 && queryParams[0].endsWith('.md')) {
      return {
        mode: 'file',
        location: '.',
        file: queryParams[0]
      }

    // otherwise parse the query string
    } else {
      var queryOptions = {};
      queryParams.forEach(p => {
        queryOptions[ p.split('=')[0] ] = p.split('=')[1];
      });
      return queryOptions
    }
  }

  // prompt user for Evernote developer token
  updateToken() {
    this.GUI.promptForInput(
      'Please enter your Evernote developer token',
      localStorage.getItem('token')
    ).then(result => {
      localStorage.setItem('token', result);
    });
  }

}

// set everything in motion once document is ready
window.app = new Application().run();
