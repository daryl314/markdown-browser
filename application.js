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

class WrappedNoteBrowser {

  constructor(wnc, $menu, $table, $viewer) {

    // check inputs
    if (!(wnc instanceof WrappedNoteROCollection)) {
      throw new Error("A connection of type WrappedNoteROCollection is required!");
    } else if (!($menu instanceof $)) {
      throw new Error("Wrapped jQuery object for browser menu is required!")
    } else if (!($table instanceof $)) {
      throw new Error("Wrapped jQuery object for browser note table is required!")
    } else if (!($viewer instanceof $)) {
      throw new Error("Wrapped jQuery object for browser viewer is required!")
    }

    // attach note collection and sort by updated date
    this.wnc = wnc;
    this.wnc.sortBy('updated', true);

    // attach jQuery objects
    this.$menu = $menu;
    this.$table = $table;
    this.$viewer = $viewer;

    // initialize maps to contain counts for number of notes by tag and notebook
    this.tagNoteCounts      = new Map();
    this.notebookNoteCounts = new Map();

    // iterate over notes to count number of notes by tag and notebook
    this.wnc._notes.forEach(note => {

      // increment corresponding notebook counter
      let nn  = this.notebookNoteCounts.has(note.notebook)
              ? this.notebookNoteCounts.get(note.notebook)
              : 0;
      this.notebookNoteCounts.set(note.notebook, nn+1);

      // iterate over tags and increment corresponding tag counter
      note.tags.forEach(tag => {
        let nt  = this.tagNoteCounts.has(tag)
                ? this.tagNoteCounts.get(tag)
                : 0;
        this.tagNoteCounts.set(tag, nt+1);
      });
    });

    // get notebooks grouped by stack if defined in WNC
    this.notebookStacks = this.wnc.notebookStacks;

    // get tag dependency tree if defined in wnc
    this.tagTree = this.wnc.tagTree;

    // generate notebook menu items
    var notebookMenuItems = [];
    if (this.notebookStacks) {
      notebookMenuItems = Object.keys(this.notebookStacks).sort().map(k => {
        let li = this.notebookStacks[k].map( nb =>
          `<li data-notebook="${nb.name}">${nb.name} [${this.notebookNoteCounts.get(nb.name)}]</li>`
        );
        return `<li>${k}<ul>${li.join('\n')}</ul></li>`
      });
    } else {
      var iterator = this.notebookNoteCounts.keys();
      for (var key = iterator.next(); !key.done; key = iterator.next()) {
        notebookMenuItems.push(`<li data-notebook="${key.value}">${key.value} [${this.notebookNoteCounts.get(key.value)}]</li>`)
      }
    }

    // generate tag menu items
    var tagMenuItems = [];
    if (this.tagTree) {
      tagMenuItems = this.tagTree.map(t => this.tagToHtml(t))
    } else {
      var iterator = this.tagNoteCounts.keys();
      for (var key = iterator.next(); !key.done; key = iterator.next()) {
        tagMenuItems.push(`<li data-tag="${key.value}">${key.value} [${this.tagNoteCounts.get(key.value)}]</li>`)
      }
    }

    // generate the browser menu
    this.$menu.html(`
      <ul>
        <li>Notes</li>
        <li id="browser-menu-notebooks">Notebooks<ul>
          ${notebookMenuItems.join('\n')}
        </ul></li>
        <li id="browser-menu-tags">Tags<ul>
          ${tagMenuItems.join('\n')}
        </ul></li>
        <li>Atlas</li>
        <li>Trash</li>
      </ul>
    `);

    // render note table
    this.renderTable();

    var _this = this;
    $table.off('click').on('click', 'thead th', function(){
      var field = $(this).data('field');
      var sort_rev = $(this).hasClass('sort-dsc');
      wnc.sortBy(field, sort_rev);
      _this.renderTable();
      _this.$table.find('thead th')
        .removeClass('sort-asc sort-dsc')
        .filter( function(){ return $(this).data('field') == field } )
        .addClass( sort_rev ? 'sort-asc' : 'sort-dsc' )
    });

    $table.off('click').on('click', 'tbody tr', function(){
      var note = _this.wnc.getNote( $(this).data('guid') );
      note.getContent().then(content => {
        if (content instanceof $) {
          _this.$viewer.html( content.html() );
        } else {
          _this.$viewer.text(content);
        }
      })
    });

    $menu.off('click');

    $menu.on('click', 'li#browser-menu-notebooks li', function(event){
      event.stopPropagation();
      var notebook = $(this).data('notebook');
      console.log("Filtering for notebook: "+notebook);
      _this.wnc.filter( n => n.notebook == notebook );
      _this.renderTable();
    });

    $menu.on('click', 'li#browser-menu-tags li', function(event){
      event.stopPropagation();
      var tag = $(this).data('tag');
      console.log("Filtering for tag: "+tag)
      _this.wnc.filter( n => n.tags.includes(tag) );
      _this.renderTable();
    });
  }

  tagToHtml(tag) {
    let nTagged = this.tagNoteCounts.get(tag.name);
    if (tag.children.length > 0) {
      var children = tag.children.map(g => this.tagToHtml(g)).join('');
      return `<li data-tag="${tag.name}">${tag.name} [${nTagged}]<ul>${children}</ul></li>`
    } else {
      return `<li data-tag="${tag.name}">${tag.name} [${nTagged}]</li>`
    }
  }

  renderTable() {
    var tr = this.wnc.notes.map( n => `
      <tr data-guid="${n.guid}">
        <td>${n.updatedStr}</td>
        <td>${n.title}</td>
        <td>${n.notebook}</td>
        <td>${n.tags}</td>
      </tr>
    ` ).join('\n');

    this.$table.html(`
      <table id="browser-note-list">
        <thead>
          <tr>
            <th style="width:20%" data-field="updated" class="sort-asc">Updated</th>
            <th style="width:40%" data-field="title">Title</th>
            <th style="width:20%" data-field="notebook">Notebook</th>
            <th style="width:20%" data-field="tags">Tags</th>
          </tr>
        </thead><tbody>
          ${tr}
        </tbody>
      </table>
      `);
  }

}

class GuiControl {

  constructor(cm, wns) {
    this.cm = cm;
    this.server = wns;

    // attach jQuery references to GUI elements
    Object.assign(this, GuiControl.getReferences());

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
    this.keepFileMenu  = false;         // keep file menu after clicking on an entry?
    this.browser       = null;          // object to handle browser operation

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

    // render content
    this._debouncedRefresh();

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
  set currentNote  (v)  { this.state.currentNote  = v; this._debouncedRefresh(); }
  set currentTab   (v)  { this.state.currentTab   = v; this._debouncedRefresh(); }
  set floatingTOC  (v)  { this.state.floatingTOC  = v; this._debouncedRefresh(); }
  set noteClean    (v)  { this.state.noteClean    = v; this._debouncedRefresh(); }
  set noteTitle    (v)  { this.state.noteTitle    = v; this._debouncedRefresh(); }
  set showNoteList (v)  { this.state.showNoteList = v; this._debouncedRefresh();
                          if (v) {
                            this.server.connect().then(conn => {
                              this.populateNoteList(conn.notes);
                            })
                          }
                        }

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

    // disable editor tab for a read-only collection
    if (this.hasServer && !(this.server instanceof WrappedNoteRWCollection)) {
      this.$writableServerItems.addClass('disabled');
    } else {
      this.$writableServerItems.removeClass('disabled');
    }

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

      case this.tabs.browser:
        this.$viewBrowser.addClass('arrow_box');
        this.$previewWindow.hide();
        this.$browserMenu.show();
        this.$browserTable.show();
        this.$browserViewer.show();
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

  // return jQuery reference object
  static getReferences() {

    // output object
    var refs = {};

    // container for menu bar
    refs.$mainMenu        = $('body > header#main-menu');

    // File menu
    refs.$fileMenu        = $('body > header#main-menu li#fileMenu');
    refs.$loadMenuItem    = $('body > header#main-menu a#showNoteList');
    refs.$newNote         = $('body > header#main-menu a#newNote');
    refs.$saveNote        = $('body > header#main-menu a#saveNote');
    refs.$saveNoteAs      = $('body > header#main-menu a#saveNoteAs');
    refs.$refresh         = $('body > header#main-menu a#refreshConnection');
    refs.$updateToken     = $('body > header#main-menu a#updateToken');

    // Nav menu
    refs.$navMenu         = $('body > header#main-menu ul#navMenu');
    refs.$noteTitle       = $('body > header#main-menu li#noteTitle');
    refs.$toggleTOC       = $('body > header#main-menu a#toggleFloatingTOC');

    // Tabs
    refs.$viewEditor      = $('body > header#main-menu a#viewEditor');
    refs.$viewHistory     = $('body > header#main-menu a#viewHistory');
    refs.$viewViewer      = $('body > header#main-menu a#viewViewer');
    refs.$viewBrowser     = $('body > header#main-menu a#viewBrowser');
    refs.$viewChanges     = $('body > header#main-menu a#viewChanges');
    refs.$viewHelp        = $('body > header#main-menu a#viewHelp');

    // floating table of contents
    refs.$floatingTOC     = $('#application-window ul#floating-toc');

    // windows
    refs.$historyMenu     = $('#application-window section#history-list');
    refs.$historyList     = $('#application-window section#history-list ul.list-group');
    refs.$historyWindow   = $('#application-window section#history-container');
    refs.$noteMenu        = $('#application-window section#nav-list');
    refs.$noteList        = $('#application-window section#nav-list ul.list-group');
    refs.$editorWindow    = $('#application-window main#content');
    refs.$editor          = $('#application-window main#content textarea#editor');
    refs.$previewWindow   = $('#application-window section#viewer-container');
    refs.$previewContents = $('#application-window section#viewer-container div#viewer');
    refs.$helpWindow      = $('#application-window section#help-container');
    refs.$helpContents    = $('#application-window section#help-container div#rendered-help');
    refs.$tocWindow       = $('#application-window section#floating-toc-container');
    refs.$browserMenu     = $('#application-window section#browser-menu');
    refs.$browserTable    = $('#application-window section#browser-notes');
    refs.$browserViewer   = $('#application-window section#browser-viewer');

    // attach a wrapped set of tabs
    refs.$allTabs = [
      refs.$viewEditor,
      refs.$viewViewer,
      refs.$viewBrowser,
      refs.$viewHistory,
      refs.$viewChanges,
      refs.$viewHelp
    ].reduce( (a,b) => a.add($(b)), $() );

    // attach a wrapped set of windows
    refs.$allWindows = [
      refs.$historyMenu,
      refs.$historyWindow,
      refs.$editorWindow,
      refs.$previewWindow,
      refs.$noteMenu,
      refs.$tocWindow,
      refs.$helpWindow,
      refs.$browserMenu,
      refs.$browserTable,
      refs.$browserViewer
    ].reduce( (a,b) => a.add($(b)), $() );

    // collection of items to disable without a server connection
    refs.$serverItems = refs.$loadMenuItem.parent()
      .add(refs.$refresh.parent());

    // collection of elements to disable without a writable connection
    refs.$writableServerItems = refs.$viewEditor.parent()
      .add(refs.$newNote.parent())
      .add(refs.$saveNote.parent())
      .add(refs.$saveNoteAs.parent());

    // return the references
    return refs
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
    });

    // bind to clicking on 'Browser' tab
    this.$viewBrowser.off('click').on('click', function(){
      _this.server.connect().then(conn => {
        if (_this.browser == null) {
          _this.browser = new WrappedNoteBrowser(_this.server, _this.$browserMenu, _this.$browserTable, _this.$browserViewer);
        }
        _this.currentTab = _this.tabs.browser;
        _this.floatingTOC = false;
        _this.showHelp = false;
        _this.showNoteList = false;
      })
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
            if (!_this.keepFileMenu) {
              _this.showNoteList = false;
            }
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

  // load note content into GUI
  populateNote(guid, content) {

    // content is XML, so only load into viewer
    if (content instanceof $) {
      this.$previewWindow.html( content.html() );

    // content is text, so load into editor
    } else {
      this.cm.setValue(content);
    }

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


///////////////////////////////////
// LOCAL SYNCHRONIZATION SUPPORT //
///////////////////////////////////

class SyncHandler {
  constructor(location) {
    let _this = this;
    this.sync = new Synchronizer(
      localStorage.token,
      "@proxy-https/www.evernote.com/shard/s2/notestore",
      location,
      {
        maxResourceSize : 1e7,
        statusCallback : (status) => this.processStatus(status),
        connectionOptions : {
          messageLogger: (msg) => { _this.$el.find('div#log').prepend(msg+'<br/>') }
        }
      }
    );
    this.$el = $('body');
  }

  synchronize() {
    sync.synchronize().then(() => console.log('Sync complete!'));
  }

  processStatus(status) {

    // component status
    let nNotes = status.oldNotes.length + status.newNotes.length;
    let nResources = status.oldResources.length + status.newResources.length + status.bigResources.length;
    let noteCounter = status.noteCounter + status.oldNotes.length;
    let resourceCounter = status.resourceCounter + status.oldResources.length + status.bigResources.length;

    // table of big resources
    let bigs = status.bigResources.map(r => {
      return `<tr><td>${r.parent.title}</td><td>${r.mime}</td><td>${r.hSize}</td></tr>`
    });

    // update progress bars
    this.$el.find('div#noteProgress').html(`
      ${this.progressBar("Overall note progress", noteCounter, nNotes)}
      ${this.progressBar("Current sync note progress", status.noteCounter, status.newNotes.length)}
      ${this.progressBar("Overall resource progress", resourceCounter, nResources)}
      ${this.progressBar("Current sync resource progress", status.resourceCounter, status.newResources.length)}
      <h3>Large resources to skip</h3>
      <table border=1>
        ${bigs.join('\n')}
      </table>
    `);

    // return value: should synchronization proceed?
    let shouldPause = this.$el.find('button#pauseSync').data('pause');
    if (shouldPause) {
      this.sync.logMessageSync('Synchronization paused!');
    }
    return !shouldPause
  }

  progressBar(msg, cur, max) {
    return `
      <h3>${msg}: ${cur}/${max}</h3>
      <div>
      <div style="width:${90*cur/max}%;
                  background-color:powderblue;
                  height:20px;
                  display:inline-block;
                  margin-right: -3px;
      ">
      </div>
      <div style="width:${90*(1-cur/max)}%;
                  background-color:gray;
                  height:20px;
                  display:inline-block;
      "></div>
      </div>
    `
  }

  render() {
    this.sync._loadMetadata().then(m => {
      this.$el.html(`
        <div class="container-fluid">
          <h1>Synchronizer Status: Updated ${WrappedNoteRO.dateString(m.lastSyncTime)}</h1>
          <table width="100%"><tr>
            <td width="50%" style="vertical-align: top">
              <div id="noteProgress" style="border-right:1px solid black;padding:10px;margin:10px;">
              </div>
              <ul>
                <li>Sync counter: ${m.lastSyncCount}</li>
              </ul>
              <button type="button" id="startSync" class="btn btn-primary">Synchronize</button>
              <button type="button" id="pauseSync" class="btn btn-primary">Pause</button>
            </td>
            <td width="50%" style="vertical-align: top">
              <h2>Sync log</h2>
              <div id="log" style="border:1px solid black;padding:10px;margin-top:20px;"></div>
            </td>
          </tr></table>
        </div>
      `);
      console.log(m);
    })
    .then(() => this.sync._ioHandler.ls(this.sync._location))
    .then(files  => {
      let notes = [];
      let versions = [];
      files.forEach(f => {
        let fileData = f.split('/');
        if (fileData[3]) {
          if (fileData[3] === 'versions.json') {
            notes.push(fileData[2]);
          } else {
            versions.push(fileData[3]);
          }
        }
      });
      this.$el.find('ul').append(`
        <li>${notes.length} notes</li>
        <li>${versions.length} versions</li>
      `);
      let _this = this;
      this.$el.find('button#startSync').on('click', function(){
        $(this).hide();
        _this.$el.find('button#pauseSync').data('pause', false).show();
        _this.sync.synchronize();
      });
      this.$el.find('button#pauseSync').data('pause', false).hide().on('click', function(){
        $(this).data('pause', true);
        _this.$el.find('button#startSync').show();
      })
      this.sync.syncInit().then(status => this.processStatus(status));
    })
  }
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
    this.$el = GuiControl.getReferences();
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

    // wait until document is ready for manipulation...
    Application.documentReady()

      // load contents of initial document
      .then(() => {
        return ProxyServerIO.load(this.initalDocument,'text')
      })

      // populate editor window and start CodeMirror
      .then(txt => {
        this.$el.$helpContents.html( this.$el.$previewContents.html() );
        this.$el.$editor.text(txt);
        this.launchCodeMirror();
      })

      // load evernote application resources required for WNC call
      .then(() => {
        if (this.queryOptions.mode == 'evernote' || this.queryOptions.mode == 'syncReport') {
          if (localStorage.getItem('token') === null)
            getEvernoteConnection.updateToken();
          return Application.loadJavascriptFile('/lib/evernote-sdk-minified.js')
        } else {
          return null
        }
      })

      // create GUI class
      .then(() => {
        this.WNC = this.wnc();
        this.GUI = new GuiControl(this.cm, this.WNC);
        if (!this.WNC) {
          this.GUI.persistentWarning('Invalid mode: '+this.queryOptions.mode);
          throw new Error("Invalid mode: "+this.queryOptions.mode);
        }
        this.GUI.transientAlert('Running in mode: '+this.queryOptions.mode);
      })

      // launch appropriate mode
      .then(() => {
        if (this.mode == 'evernote') {
          this.GUI.$updateToken.show().on('click', updateToken);
        } else if (this.mode == 'offline') {
          this.GUI.currentTab = this.GUI.tabs.viewer;
          this.GUI.showNoteList = true;
          this.GUI.keepFileMenu = true;
        } else if (this.mode == 'syncReport') {
          this.WNC.render();
        } else if (this.mode == 'file') {
          this.WNC.connect().then(conn => {
            conn.getNoteContent(`${this.queryOptions.location}/${this.queryOptions.file}`).then(txt => {
              this.cm.setValue(txt);
              this.GUI.staleHistory = false;
              this.GUI.noteTitle = this.queryOptions.file;
              this.GUI.currentTab = this.GUI.tabs.viewer;
              this.GUI.showNoteList = true;
              this.GUI.keepFileMenu = true;
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
      case 'syncReport':
        return new SyncHandler(this.queryOptions.location);
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
    this.cm = CodeMirror.fromTextArea(this.$el.$editor[0], {
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

    // configure scroll sync
    this.scrollSync = new ScrollSync(this.cm, this.$el.$previewWindow, this.$el.$floatingTOC);

    // render starter text
    this.render();

    // re-render on text change (debounce to render when typing stops)
    this.cm.on('change',
      _.debounce(
        () => {_this.render()},
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
  }

  // function to render markdown
  render() {

    // save cursor position
    var currentScroll = this.$el.$previewWindow.scrollTop();

    // execute rendering
    var renderData = this.renderer.renderMarkdown(this.cm.getValue(), this.$el.$previewContents);

    // table of contents without outer UL
    var toc = $(renderData.toc).html();

    // create nav menu
    this.$el.$navMenu.children('li.divider ~ li').remove();
    this.$el.$navMenu.append(toc);

    // create floating table of contents
    this.$el.$floatingTOC.html(toc);

    // refresh scroll sync data
    this.scrollSync.refresh();

    // scroll to the cursor location
    this.$el.$previewWindow.scrollTop(currentScroll);

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
