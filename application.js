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
      let _this = this;
      this.$dialogElements.show();
      this.$promptBody.text(message);
      this.$promptInput.val(default_entry);
      this.$promptInput.focus();
      this.$promptInput.off('keyup').on('keyup', function(e){
        if (e.key === 'Enter') {
          _this.$dialogElements.hide();
          resolve( _this.$promptInput.val() );
        } else if (e.key === 'Escape') {
          _this.$dialogElements.hide();
        }
      })
      this.$promptOK.off('click').one('click', function(){
        _this.$dialogElements.hide();
        resolve( _this.$promptInput.val() );
      });
    })
  }

  // prompt user for confirmation
  promptForConfirmation(message) {
    return new Promise((resolve,reject) => {
      let _this = this;
      this.$dialogElements.show();
      this.$promptBody.text(message);
      this.$promptInput.parent().hide();
      this.$promptOK.off('click').one('click', function(){
        _this.$dialogElements.hide();
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

    // only look at non-deleted notes
    this.wnc.filter( n => !n.deleted );

    // iterate over notes to count number of notes by tag and notebook
    this.wnc.notes.filter(note => !note.deleted).forEach(note => {

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
        <li id="browser-menu-all" class="selected">All Notes</li>
        <li id="browser-menu-notebooks">Notebooks<ul>
          ${notebookMenuItems.join('\n')}
        </ul></li>
        <li id="browser-menu-tags">Tags<ul>
          ${tagMenuItems.join('\n')}
        </ul></li>
        <li id="browser-menu-atlas">Atlas</li>
        <li id="browser-menu-trash">Trash</li>
      </ul>
    `);

    // generate the viewer area
    this.$viewer.html(`
      <button type="button" id="browser-version-toggle" class="btn btn-primary" style="margin-right:10px;">Versions</button>
      <button type="button" id="browser-attribute-toggle" class="btn btn-primary">Attributes</button>
      <div>
        <div id="browser-versions" style="display:inline-block;vertical-align:top;padding:5px;"></div>
        <div id="browser-attributes" style="display:inline-block;vertical-align:top;padding:5px;"></div>
      </div>
      <div id="browser-content"></div>
    `);

    // start with version and attribute blocks hidden
    this.$viewer.find('#browser-versions').hide();
    this.$viewer.find('#browser-attributes').hide();

    // render note table
    this.renderTable();

    // reference to this for jQuery callbacks
    var _this = this;

    // prevent double registration
    $table.off('click');
    this.$viewer.off('click');
    $menu.off('click');

    // callback to sort notes on a column header click
    $table.on('click', 'thead th', function(){
      var field = $(this).data('field');
      var sort_rev = $(this).hasClass('sort-dsc');
      wnc.sortBy(field, sort_rev);
      _this.renderTable();
      _this.$table.find('thead th')
        .removeClass('sort-asc sort-dsc')
        .filter( function(){ return $(this).data('field') == field } )
        .addClass( sort_rev ? 'sort-asc' : 'sort-dsc' )
    });

    // callback to load a note on a cell click
    $table.on('click', 'tbody tr', function(){
      var note = _this.wnc.getNote( $(this).data('guid') );
      note.getContent().then(content => {
        if (content instanceof $) {
          _this.$viewer.find('#browser-content').html( content.html() );
        } else {
          _this.$viewer.find('#browser-content').text(content);
        }
        return note.getVersions()
      }).then(versions => {
        _this.$viewer.find('#browser-versions').html(
          `<table border=1 data-guid="${note.guid}">` + versions.map(v => `<tr><td>${v.version}</td><td>${v.updatedStr}</td></tr>`).join('') + '</table>'
        );
        return note.getMeta()
      }).then(meta => {
        let attrib = Object.entries(meta.attributes).filter(entry => entry[1] !== null);
        if (attrib.length > 0) {
          let tr = attrib.map(entry => `<tr><td>${entry[0]}</td><td>${entry[1]}</td></tr>`);
          _this.$viewer.find('#browser-attributes').html(`<table border=1>${tr.join('')}</table>`)
        }
      })
    });

    // toggle version and attribute display
    _this.$viewer
      .on('click', '#browser-version-toggle',   () => _this.$viewer.find('#browser-versions'  ).toggle() )
      .on('click', '#browser-attribute-toggle', () => _this.$viewer.find('#browser-attributes').toggle() );

    // callback to load a note version
    this.$viewer.on('click', '#browser-versions tr', function(){
      let $parent = $(this).parents('table').first();
      let note = _this.wnc.getNote( $parent.data('guid') );
      let version = parseInt($(this).children().first().text());
      $parent.find('tr').css('background-color', 'white');
      $(this).css('background-color', 'aliceblue');
      note.getContent(version).then(content => {
        if (content instanceof $) {
          _this.$viewer.find('#browser-content').html( content.html() );
        } else {
          _this.$viewer.find('#browser-content').text(content);
        }
      })
    });

    // callback to decrypt encrypted content
    this.$viewer.on('click', 'en-crypt', function(){
      let $en_crypt = $(this);
      let data = $en_crypt.find('span').html(); 
      (new NotificationHandler()).promptForInput('Encryption password: '+$(this).attr('hint')).then(password => {
        let out = EvernoteConnectionBase.decrypt(password, data);
        $en_crypt.parent().text(out);
      }).catch((err) => {
        (new NotificationHandler()).persistentWarning(err.message)
      })
    })

    // load all notes
    $menu.on('click', 'li#browser-menu-all', function(event) {
      event.stopPropagation();
      $menu.find('li').removeClass('selected');
      $(this).addClass('selected');
      (new NotificationHandler()).transientAlert("Filtering for all notes");
      _this.wnc.filter( n => !n.deleted );
      _this.renderTable();
    });

    // load notes in selected notebook
    $menu.on('click', 'li#browser-menu-notebooks li', function(event){
      event.stopPropagation();
      $menu.find('li').removeClass('selected');
      $(this).addClass('selected');
      var notebook = $(this).data('notebook');
      (new NotificationHandler()).transientAlert("Filtering for notebook: "+notebook);
      _this.wnc.filter( n => n.notebook == notebook && !n.deleted );
      _this.renderTable();
    });

    // load notes in selected tag
    $menu.on('click', 'li#browser-menu-tags li', function(event){
      event.stopPropagation();
      $menu.find('li').removeClass('selected');
      $(this).addClass('selected');
      var tag = $(this).data('tag');
      (new NotificationHandler()).transientAlert("Filtering for tag: "+tag)
      _this.wnc.filter( n => n.tags.includes(tag) && !n.deleted );
      _this.renderTable();
    });

    // load deleted notes
    $menu.on('click', 'li#browser-menu-trash', function(event) {
      event.stopPropagation();
      $menu.find('li').removeClass('selected');
      $(this).addClass('selected');
      (new NotificationHandler()).transientAlert("Filtering for deleted notes");
      _this.wnc.filter( n => n.deleted );
      _this.renderTable();
    });

    // load Atlas
    $menu.on('click', 'li#browser-menu-atlas', function(event) {
      event.stopPropagation();
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

    // enumeration for editor side panes
    this.sidePanes = {
      none    : 1,
      preview : 2,
      help    : 3,
      sorter  : 4
    };

    // state properties that trigger a refresh
    this.state = {
      currentNote   : null,                   // GUID of current note
      currentTab    : this.tabs.editor,       // currently selected tab
      sidePane      : this.sidePanes.preview, // side pane displayed with editor
      floatingTOC   : false,                  // display floating TOC menu?
      noteClean     : true,                   // are there unsaved changes?
      noteTitle     : 'Untitled Note',        // title of current note
      showNoteList  : false                   // should note list be rendered?
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

    // add a handler for navigating away from page
    $(window).bind('beforeunload', () => {
      if (!this.state.noteClean) {
        return 'Editor has unsaved changes'
      }
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
  get sidePane     () { return this.state.sidePane     }
  get floatingTOC  () { return this.state.floatingTOC  }
  get noteClean    () { return this.state.noteClean    }
  get noteTitle    () { return this.state.noteTitle    }
  get showNoteList () { return this.state.showNoteList }

  // other getters
  get hasServer    () { return this.server != null     }
  get isWritable   () { }

  // setters for state properties that trigger a refresh
  set currentNote  (v)  { this._updateProperty(v,'currentNote' ) }
  set currentTab   (v)  { this._updateProperty(v,'currentTab'  ) }
  set sidePane     (v)  { this._updateProperty(v,'sidePane'    ) }
  set floatingTOC  (v)  { this._updateProperty(v,'floatingTOC' ) }
  set noteClean    (v)  { this._updateProperty(v,'noteClean'   ) }
  set noteTitle    (v)  { this._updateProperty(v,'noteTitle'   ) }
  set showNoteList (v)  { this._updateProperty(v,'showNoteList') ; 
                          if (v) {
                            this.server.connect().then(conn => {
                              this.populateNoteList(conn.notes);
                            })
                          }
                        }

  // update a property and trigger a refresh if the property changed
  _updateProperty(v,k) {
    if (this.state[k] !== v) {
      this.state[k] = v;
      this._debouncedRefresh();
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

    // hide side pane menu unless in editor mode
    if (this.currentTab === this.tabs.editor) {
      this.$sidePaneMenu.show()
    } else {
      this.$sidePaneMenu.hide()
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
        let $windows = this.$editorWindow;
        if (this.state.sidePane === this.sidePanes.preview) {
          $windows = $windows.add(this.$previewWindow);
          this.$sidePaneTitle.html('Preview<span class="caret"></span></a>');
        } else if (this.state.sidePane === this.sidePanes.help) {
          $windows = $windows.add(this.$helpWindow);
          this.$sidePaneTitle.html('Help<span class="caret"></span></a>');
        } else if (this.state.sidePane === this.sidePanes.sorter) {
          $windows = $windows.add(this.$sorterWindow);
          this.$sidePaneTitle.html('Sorter<span class="caret"></span></a>');
        } else {
          this.$sidePaneTitle.html('None<span class="caret"></span></a>');
        }
        setWidthClass($windows).show();
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

    // Editor side pane selection menu
    refs.$sidePaneMenu    = $('body > header#main-menu li#editSidePane');
    refs.$sidePaneTitle   = $('body > header#main-menu li#editSidePane > a.dropdown-toggle');
    refs.$sidePaneNone    = $('body > header#main-menu a#sidePaneNone');
    refs.$sidePanePreview = $('body > header#main-menu a#sidePanePreview');
    refs.$sidePaneHelp    = $('body > header#main-menu a#sidePaneHelp');
    refs.$sidePaneSorter  = $('body > header#main-menu a#sidePaneSorter');

    // Tabs
    refs.$viewEditor      = $('body > header#main-menu a#viewEditor');
    refs.$viewHistory     = $('body > header#main-menu a#viewHistory');
    refs.$viewViewer      = $('body > header#main-menu a#viewViewer');
    refs.$viewBrowser     = $('body > header#main-menu a#viewBrowser');
    refs.$viewChanges     = $('body > header#main-menu a#viewChanges');

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
    refs.$sorterWindow    = $('#application-window section#sorter-container');
    refs.$sorterTree      = $('#application-window section#sorter-container div#sorter-tree');

    // attach a wrapped set of tabs
    refs.$allTabs = [
      refs.$viewEditor,
      refs.$viewViewer,
      refs.$viewBrowser,
      refs.$viewHistory,
      refs.$viewChanges,
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
      _this.currentTab = _this.tabs.editor;
      _this.floatingTOC = false;
    });

    // bind to clicking on 'Viewer' tab
    this.$viewViewer.off('click').on('click', function(){
      _this.currentTab = _this.tabs.viewer;
      _this.floatingTOC = false;
    });

    // bind to clicking on 'Browser' tab
    this.$viewBrowser.off('click').on('click', function(){
      _this.server.connect().then(conn => {
        if (_this.browser == null) {
          _this.browser = new WrappedNoteBrowser(_this.server, _this.$browserMenu, _this.$browserTable, _this.$browserViewer);
        }
        _this.currentTab = _this.tabs.browser;
        _this.floatingTOC = false;
        _this.showNoteList = false;
      })
    })

    // bind to clicking on 'Changes' tab --> preview note changes from server version
    this.$viewChanges.off('click').on('click', function(){
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
                compareBlocks(oldContent, _this.cm.getValue(), _this.diffOptions(note.title));
              })
          })
      }
    })

    // bind to clicking on side panel selection menu
    this.$sidePaneNone   .off('click').on('click', function(){ _this.sidePane = _this.sidePanes.none    });
    this.$sidePanePreview.off('click').on('click', function(){ _this.sidePane = _this.sidePanes.preview });
    this.$sidePaneHelp   .off('click').on('click', function(){ _this.sidePane = _this.sidePanes.help    });
    this.$sidePaneSorter .off('click').on('click', function(){ _this.sidePane = _this.sidePanes.sorter  ; _this.refreshSorter() });

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
              .then(conn => {
              conn.newNote(noteTitle, _this.cm.getValue())
                .then(note => {
                  _this.generation = _this.cm.changeGeneration();
                  _this.staleHistory = true;
                  _this.currentNote = note.guid;
                  _this.noteTitle = noteTitle;
                  _this.noteClean = true;
                  _this.populateNoteList(conn.notes);
                })
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

  // start note heading sorter
  refreshSorter() {

    // parse data
    let ast = Model.parse(this.cm.getValue());

    // break content into chunks by heading
    let headings = [];
    let node = {name:'', depth:1, children:[]};
    ast.arr.forEach(el => {
      if (el.rule.name === 'Heading' && el.attr.depth.length >= 2) {
        if (node.children.length > 0) {
          headings.push(node)
        }
        node = {name:el.attr.text.cap, depth:el.attr.depth.length, children:[el.cap]};
      } else {
        node.children.push(el.cap);
      }
    })
    headings.push(node);

    // initialize root of tree to containg nested headings
    let tree = {
      name     : 'Root', 
      depth    : 1, 
      children : [], 
      id       : 0, 
      content  : headings[0].children.join('')
    };

    // initialize a chain of parent nodes to identify current parent at a given heading depth
    let chain = [tree];

    // initialize lookup list to map id numbers to heading nodes
    let ids = [tree];

    // iterate over lower-level headings
    headings.slice(1).forEach(el => {

      // extend chain for any detached headings (such as an h4 inside an h2)
      while (el.depth >= chain.length) {
        chain.push( chain[chain.length-1] )
      }

      // create object
      let obj = {
        name     : el.name, 
        depth    : el.depth, 
        children : [], 
        id       : ids.length, 
        content  : el.children.slice(1).join('')
      };

      // add object to parent (using chain to identify)
      chain[el.depth-2].children.push(obj);

      // add object to chain and trim off any lower-level items
      chain[el.depth-1] = obj;
      chain = chain.slice(0, el.depth);

      // add object to id lookup list
      ids.push(obj);
    });

    // convert tree to json object for jqTree plugin: https://mbraak.github.io/jqTree
    function treeToJson(node) {
      return node.children.map(c => {return {name:c.name, id:c.id, children:treeToJson(c)}})
    }
    this.$sorterTree.tree({
      data: [{
        name:'Root',
        id:0,
        children: treeToJson(tree)
      }],
      autoOpen: true, 
      dragAndDrop: true
    });

    // update editor when a node is moved
    let _this = this;
    this.$sorterTree.bind('tree.move', function(event) {
          
      // hook is pre-move so let move happen first
      event.preventDefault();
      event.move_info.do_move();

      // get reference to root node of tree
      var rootNode = $(this).tree('getTree');

      // convert a node back to markdown text
      function processChild(child) {
        var lvl = child.getLevel();
        var ref = ids[child.id];
        var childData = child.children.map(processChild).join('');
        if (lvl > 1) {
          return `${'#'.repeat(lvl)} ${ref.name} ${'#'.repeat(lvl)}\n\n` + ref.content + childData
        } else {
          return ref.content + childData
        }
      }

      // recursively convert tree back to markdown text
      var txt = rootNode.children.map(processChild).join('');

      // update editor
      _this.cm.setValue(txt);
    });
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
    this.renderer = new MarkdownRenderer({ includeLines : true });
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
    let _this = this;

    // wait until document is ready for manipulation...
    Application.documentReady()

      // load contents of initial document
      .then(() => {
        if (this.mode !== 'offline') {
          return ProxyServerIO.load(this.initalDocument,'text')
        } else {
          return null;
        }
      })

      // populate editor window and start CodeMirror
      .then(txt => {
        if (this.mode !== 'offline') {
          this.renderer.renderMarkdown(txt, this.$el.$helpContents);
          this.$el.$editor.text(txt);
          this.launchCodeMirror();
        }
      })

      // load evernote application resources required for WNC call
      .then(() => {
        if (this.queryOptions.mode == 'evernote' || this.queryOptions.mode == 'syncReport') {
          if (localStorage.getItem('token') === null)
            this.updateToken();
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
          this.GUI.$updateToken.show().on('click', function(){ _this.updateToken() });
        } else if (this.mode == 'offline') {
          this.GUI.$viewBrowser.trigger('click'); // need to set up browser object
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
      },                                        //
      rulers: [                                 // vertical rulers...
        {                                       //   ruler for terminal width
          column: 80,                           //
          color: 'rgb(101,123,131)',            //
          lineStyle: 'dashed'                   //
        }, {                                    //
          column: 110,                          //   ruler for print width
          color: 'red',                         //
          lineStyle: 'dashed'                   //
        }                                       //
      ]
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
    let obj = this.GUI ? this.GUI : new NotificationHandler();
    obj.promptForInput(
      'Please enter your Evernote developer token',
      localStorage.getItem('token')
    ).then(result => {
      localStorage.setItem('token', result);
    });
  }

}

// set everything in motion once document is ready
window.app = new Application().run();
