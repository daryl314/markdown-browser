/////////////////////////////////////////////////
// CONTAINER OBJECT FOR AN EVERNOTE CONNECTION //
/////////////////////////////////////////////////

EvernoteConnection = function(){


  /////////////////
  // CONSTRUCTOR //
  /////////////////

  // constructor
  var EvernoteConnection = function(token, opt) {
    if (token === undefined) {
      throw new Error('Authentication token required!');
    } else {
      _this = this;

      // process optional arguments
      this.opt = opt || {};
      this.opt.searchTags     = opt.searchTags    || [];
      this.opt.saveTags       = opt.saveTags      || [];
      this.opt.errorLogger    = opt.errorLogger   || function(){};
      this.opt.messageLogger  = opt.messageLogger || function(){};

      // assign error handler
      if (opt.errorHandler) {
        this._errorHandler = EvernoteConnection.errorHandler;
      } else {
        this._errorHandler = function(err) {
          _this.opt.errorLogger(err);
          EvernoteConnection.errorHandler(err);
        }
      }

      // assign log handler
      if (opt.logHandler) {
        this._logHandler = EvernoteConnection.logHandler;
      } else {
        this._logHandler = function(msg) {
          _this.opt.messageLogger(msg);
          EvernoteConnection.logHandler(msg);
        }
      }

      // "public" members
      this.notes        = null;   // list of notes
      this.noteMap      = {};     // map of notes by guid
      this.versionCache = {};     // map of note version data
      this.notebookMap  = {};     // map of notebooks by guid

      // "private" members
      this._hasData   = false;    // haven't fetched any data yet
      this._tags      = null;     // tag data returned by server
      this._tagMap    = {};       // map of tags by guid
      this._notebooks = null;     // notebook data returned by server

      // default note filter is notes sorted by title w/ specified tags
      this._noteFilter = function() {
        var filterOptions = { order : NoteSortOrder.TITLE };
        if (this.opt.searchTags.length > 0) {
          filterOptions.tagGuids = [];
          for (var i = 0; i < this.opt.searchTags.length; i++) {
            filterOptions.tagGuids.push(this._tagMap[this.opt.searchTags[i]]);
          }
        }
        return new NoteFilter(filterOptions);
      }

      // instantiate Evernote connection objects
      this.authenticationToken = token;
      var noteStoreURL = "proxy-https/www.evernote.com/shard/s2/notestore";
      var noteStoreTransport = new Thrift.BinaryHttpTransport(noteStoreURL);
      var noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);
      this.noteStore = new NoteStoreClient(noteStoreProtocol);
    }
  }


  ////////////////////
  // STATIC METHODS //
  ////////////////////

  // default error handler
  EvernoteConnection.errorHandler = function(error) {
    if (error instanceof Array) {
      for (var i = 0; i < error.length; i++) {
        console.error(error[i]);
      }
    } else {
      console.error(error);
    }
    throw new Error('EvernoteConnection failure');
  }

  // default log handler
  EvernoteConnection.logHandler = function(msg) {
    console.log(msg);
  }

  // return true if an input is an array of the specified type
  EvernoteConnection.isArrayOf = function(arr, c) {
    return (arr instanceof Array) && (arr.length == 0 || arr[0] instanceof c)
  }

  // helper function to format a date
  EvernoteConnection.dateString = function(d) {
    d = new Date(d);
    return (d.getYear()+1900)                         +'-'+
      ('0'+(d.getMonth()+1)).replace(/0(\d\d)/,'$1')  +'-'+
      ('0'+(d.getDate()   )).replace(/0(\d\d)/,'$1')  +' '+
      ('0'+ d.getHours()   ).replace(/0(\d\d)/,'$1')  +':'+
      ('0'+ d.getMinutes() ).replace(/0(\d\d)/,'$1')  +':'+
      ('0'+ d.getSeconds() ).replace(/0(\d\d)/,'$1')
  }

  // helper function to convert a Note to NoteMetadata
  EvernoteConnection.noteToMetadata = function(note) {
    if (!(note instanceof Note)) {
      throw new Error('Input is not a Note object')
    } else {
      return new NoteMetadata({
        guid              : note.guid               ,
        title             : note.title              ,
        contentLength     : note.contentLength      ,
        created           : note.created            ,
        updated           : note.updated            ,
        deleted           : note.deleted            ,
        updateSequenceNum : note.updateSequenceNum  ,
        notebookGuid      : note.notebookGuid       ,
        tagGuids          : note.tagGuids           ,
        attributes        : note.attributes
      });
    }
  }

  // helper function to copy NoteMetadata
  EvernoteConnection.copyMetadata = function(obj) {
    if (!(obj instanceof NoteMetadata)) {
      throw new Error('Input is not a NoteMetadata object!')
    } else {
      tagGuids = [];
      for (var i = 0; i < obj.tagGuids.length; i++) {
        tagGuids.push(obj.tagGuids[i]);
      }
      return new NoteMetadata({
        guid                : obj.guid                 ,
        title               : obj.title                ,
        contentLength       : obj.contentLength        ,
        created             : obj.created              ,
        updated             : obj.updated              ,
        deleted             : obj.deleted              ,
        updateSequenceNum   : obj.updateSequenceNum    ,
        notebookGuid        : obj.notebookGuid         ,
        tagGuids            : tagGuids                ,
        attributes          : obj.attributes           ,
        largestResourceMime : obj.largestResourceMime  ,
        largestResourceSize : obj.largestResourceSize
      })
    }
  }

  // convert Evernote note content to plain text
  EvernoteConnection.stripFormatting = function(txt) {
    return txt
      .replace(/\s*<span.*?>([\S\s]*?)<\/span>\s*/g, '$1')  // clear span tags
      .replace(/\n/g,'')                                    // clear newlines
      .replace(/<\/div>[\s\n]*<div>/g, '</div><div>')       // clear whitespace between div tags
      .replace(/<div><br.*?><\/div>/g, '<div></div>')       // convert <div><br/></div> to <div></div>
      .replace(/(<\/?div>){1,2}/g,'\n')                     // convert <div> boundaries to newlines
      .replace(/<br.*?>/g,'\n')                             // convert <br> to newlines
      .replace(/<.*?>/g,'')                                 // strip any remaining tags
      .replace(/\u00A0/g, ' ')                              // non-breaking spaces to spaces
      .replace(/&nbsp;/g,' ')                               // &nbsp; -> ' '
      .replace(/&lt;/g,'<')                                 // &lt;   -> '<'
      .replace(/&gt;/g,'>')                                 // &gt;   -> '>'
      .replace(/&apos;/g,"'")                               // &apos; -> "'"
      .replace(/&quot;/g,'"')                               // &quot; -> '"'
      .replace(/&#124;/g, '|')                              // &#124; -> '|'
      .replace(/&amp;/g,'&')                                // &amp;  -> '&'
      .replace(/^\n/, '')                                   // clear leading newline
  }

  // convert plain text to Evernote note format
  EvernoteConnection.addFormatting = function(txt) {
    return '<?xml version="1.0" encoding="UTF-8"?>' +
      '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">' +
      '<en-note>' +
        txt
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/(.+)/mg, '<div>$1</div>')
          .replace(/^$/mg, '<div><br /></div>')
        +
      '</en-note>'
  }


  ////////////////////
  // FETCH METADATA //
  ////////////////////

  // function to fetch/refresh data
  EvernoteConnection.prototype.fetchMetaData = function(callback) {
    var _this = this;
    _this._hasData = false; // no data yet
    _this.versionCache = {}; // reset version cache
    var cb = function(notes) {
      _this._hasData = true; // okay to start using connection
      if (callback) callback(notes);
    }
    _this._fetchNotebookData(function(){
      _this._fetchTagData(function(){
        _this._fetchNoteMetaData(_this._noteFilter(), 0,
          cb
        )
      })
    });
  }

  // function to fetch notebook data
  EvernoteConnection.prototype._fetchNotebookData = function(callback) {
    var _this = this;
    _this.notebookMap = {}; // reset notebook map
    _this._notebooks = null; // reset results array
    var cb = function(notebooks) {
      _this._checkArray(notebooks, Notebook);
      _this._notebooks = notebooks;
      for (var i = 0; i < _this._notebooks.length; i++) {
        _this.notebookMap[ _this._notebooks[i].guid ] = _this._notebooks[i].name;
      }
      _this._logHandler('Fetched Evernote notebook data');
      if (callback) callback(notebooks);
    };
    this.noteStore.listNotebooks(this.authenticationToken, cb, this._errorHandler);
  }

  // function to fetch tag data
  EvernoteConnection.prototype._fetchTagData = function(callback) {
    var _this = this;
    _this._tagMap = {}; // reset tag map
    _this._tags = null; // reset results array
    var cb = function(tags) {
      _this._checkArray(tags, Tag);
      _this._tags = tags;
      _this._logHandler('Fetched Evernote tag data');
      for (var i = 0; i < tags.length ; i++) {
        _this._tagMap[tags[i].name] = tags[i].guid;
      }
      if (callback) callback(tags);
    }
    this.noteStore.listTags(this.authenticationToken, cb, this._errorHandler)
  }

  // function to add a note (or array of notes) to data structures
  EvernoteConnection.prototype._addNoteMetadata = function(note) {
    if (note instanceof Array) {
      for (var i = 0; i < note.length; i++) {
        this._addNoteMetadata(note[i]);
      }
    } else if (note instanceof NoteMetadata) {
      this.noteMap[note.guid] = note;
      this.notes.push(note);
    } else {
      _this._errorHandler('Invalid input type')
    }
  }

  // function to fetch note metadata
  EvernoteConnection.prototype._fetchNoteMetaData = function(noteFilter, start, callback) {
      var _this = this;

      // check inputs
      _this._checkObject(noteFilter, NoteFilter);
      if (typeof start !== 'number' || start < 0)
        _this._errorHandler('Start index >= 0 required');

      // callback function
      var cb = function(metaList) {
        _this._checkObject(metaList, NotesMetadataList);
        var nextNote = start + metaList.notes.length;
        _this._addNoteMetadata(metaList.notes);
        _this._logHandler('Fetched Evernote note data starting from '+start);
        if (nextNote < metaList.totalNotes) {
          _this._fetchNoteMetaData(noteFilter, nextNote, callback);
        } else {
          if (callback) callback(_this.notes);
        }
      }

      // clear list if starting a new fetch
      if (start == 0) {
        this.notes = [];
        this.noteMap = {};
      }

      // execute search in noteStore
      this.noteStore.findNotesMetadata(   // search for notes...
        this.authenticationToken,         //   authentication token
        noteFilter,                       //   passed note serach filter
        start,                            //   starting index
        100,                              //   max notes to return
        new NotesMetadataResultSpec({     //   results to return...
          includeTitle: true,             //     with the note title
          includeUpdated: true,           //     with the update time
          includeUpdateSequenceNum: true, //     with the update sequence number
          includeTagGuids: true,          //     with the list of tag guids
          includeNotebookGuid: true       //     with the notebook guid
        }),                               //
        cb,                               //   success callback
        this._errorHandler                //   error callback
      )
  }


  ///////////////////
  // FETCH CONTENT //
  ///////////////////

  // function to fetch note content
  EvernoteConnection.prototype.fetchNoteContent = function(guid, callback) {
    this._checkConnection();
    var _this = this;

    // create a version cache entry for current guid if one doesn't existing
    if (this.versionCache[guid] === undefined) {
      this.versionCache[guid] = {};
    }

    // callback function
    var cb = function(content) {

      // most recent Note version associated with GUID
      var n = _this.noteMap[guid];

      // create a new Note including content and add to version cache
      _this.versionCache[guid][n.updateSequenceNum] = new Note({
        guid:               guid,
        notebookGuid:       n.notebookGuid,
        title:              n.title,
        updateSequenceNum:  n.updateSequenceNum,
        updated:            n.updated,
        content:            content
      });

      // trigger user-provided callback if one was specified
      if (callback) callback(content)
    }

    // actually fetch the content
    this._logHandler('Fetching note: '+guid);
    this.noteStore.getNoteContent(
      this.authenticationToken,
      guid,
      cb,
      this._errorHandler
    );
  }


  ////////////////////////
  // FETCH VERSION DATA //
  ////////////////////////

  // function to get a list of note versions
  EvernoteConnection.prototype.listNoteVersions = function(guid, callback) {
    this._checkConnection();
    this._logHandler('Fetching note version list for '+guid);
    this.noteStore.listNoteVersions(
      this.authenticationToken,
      guid,
      callback,
      this._errorHandler
    );
  }

  // function to fetch a note version (with cache)
  EvernoteConnection.prototype.fetchNoteVersion = function(guid, version, callback) {
    this._checkConnection();
    var _this = this;

    // create a version cache entry for current guid if one doesn't exist
    if (this.versionCache[guid] === undefined) {
      this.versionCache[guid] = {};
    }

    // use cached version if available
    if (this.versionCache[guid][version]) {
      this._logHandler('Using cached note version: '+guid+'['+version+']');
      var x = this.versionCache[guid][version];
      callback(x);

    // otherwise fetch from note store
    } else {
      this._logHandler('Fetching note version: '+guid+'['+version+']');
      this.noteStore.getNoteVersion(
        this.authenticationToken, // token
        guid,                     // guid of the note to fetch
        version,                  // version number to fetch
        false,                    // don't include resource data
        false,                    // don't include resource recognition data
        false,                    // don't include resource binary alternateData
        function (x) {
          _this._checkObject(x, Note);
          _this.versionCache[guid][version] = x;
          if (callback) callback(x);
        }
      );
    }
  }

  // function to fetch a list of note versions
  EvernoteConnection.prototype.fetchNoteVersionList = function(guid, versions, callback, data) {
    this._checkConnection();
    var _this = this;

    // initialize output list
    if (data === undefined)
      data = [];

    // if done processing, run callback
    if (versions.length == 0) {
      callback(data, meta);

    // otherwise fetch current version and recurse on version list tail
    } else {
      this.fetchNoteVersion(guid, versions[0], function(x) {
        data = data.concat(x);
        _this.fetchNoteVersionList(guid, versions.slice(1), callback, data);
      })
    }
  }


  /////////////
  // HELPERS //
  /////////////

  // confirm that data have been Fetched
  EvernoteConnection.prototype._checkConnection = function() {
    if (!this._hasData) this._errorHandler('Not connected!')
  }

  // type check an array
  EvernoteConnection.prototype._checkArray = function(arr, c) {
    if (!EvernoteConnection.isArrayOf(arr,c)) {
      this._errorHandler('Invalid array type.  Expected Array<'+c.name+'>')
    }
  }

  // type check an object
  EvernoteConnection.prototype._checkObject = function(obj, c) {
    if (!(obj instanceof c)) {
      this._errorHandler('Invalid object type.  Expected '+c.name)
    }
  }

  // type check a string
  EvernoteConnection.prototype._checkString = function(str) {
    if (typeof str !== 'string') {
      this._errorHandler('Invalid string type')
    }
  }


  //////////////////////
  // UPDATE FUNCTIONS //
  //////////////////////

  // create a new note
  EvernoteConnection.prototype.createNote = function(title, content, callback) {
    this._checkConnection();
    if (title   === undefined) throw new Error('Title is required to create a note!');
    if (content === undefined) throw new Error('Content is required to create a note!');
    this._checkString(title);
    this._checkString(content);
    var _this = this;
    var note = new Note();
    note.title = title;
    note.content = content;
    note.tagGuids = [];
    for (var i = 0; i < this.opt.saveTags.length; i++) {
      note.tagGuids.push(this._tagMap[ this.opt.saveTags[i] ]);
    }
    this.noteStore.createNote(this.authenticationToken, note, function(note, err) {
      if (err) {
        _this._errorHandler(['Error creating note: '+title, err]);
      } else {
        note.content = content; // content not returned by API
        _this._logHandler('Created note '+note.guid+': '+note.title);
        _this._logHandler(note);
        _this._addNoteMetadata(EvernoteConnection.noteToMetadata(note));
        _this.versionCache[note.guid] = {};
        _this.versionCache[note.guid][note.updateSequenceNum] = note;
        if (callback) callback(note);
      }
    });
  }

  // update an existing note
  EvernoteConnection.prototype.updateNote = function(title, content, guid, callback) {
    this._checkConnection();
    if (guid    === undefined) throw new Error('GUID is required to update a note!');
    if (title   === undefined) throw new Error('Title is required to update a note!');
    if (content === undefined) throw new Error('Content is required to update a note!');
    this._checkString(title);
    this._checkString(content);

    var _this = this;
    var note = new Note();
    note.guid = guid;
    note.title = title;
    note.content = content;
    note.tagNames = this.opt.saveTags;

    this.noteStore.updateNote(this.authenticationToken, note, function(note, err) {
      if (err) {
        _this._errorHandler(['Error updating note '+note.guid+': '+note.title, err]);
      } else {
        note.content = content; // content not returned by API
        _this._logHandler('Updated note '+note.guid+': '+note.title);
        _this._logHandler(note);
        _this.noteMap[note.guid] = EvernoteConnection.noteToMetadata(note);
        _this.versionCache[note.guid][note.updateSequenceNum] = note;
        if (callback) callback(note);
      }
    });
  }


  //////////////////////////
  // NOTE CONTAINER CLASS //
  //////////////////////////

  // constructor
  var WrappedNote = function(conn, note) {

    // check inputs
    if (!(conn instanceof EvernoteConnection))
      EvernoteConnection.errorHandler('EvernoteConnection required as first argument!');
    if (!(note instanceof Note) && !(note instanceof NoteMetadata))
      EvernoteConnection.errorHandler('Note or NoteMetadata required as second argument!');

    // recurse with metadata if a Note was passed
    if (note instanceof Note) {
      return new WrappedNote(conn, EvernoteConnection.noteToMetadata(note));
    }

    // attach inputs
    this._note = note;
    this._conn = conn;
  }

  // return the note title
  WrappedNote.prototype.title = function() {
    return this._note.title;
  }

  // return the note guid
  WrappedNote.prototype.guid = function() {
    return this._note.guid;
  }

  // return the notebook
  WrappedNote.prototype.notebook = function() {
    return this._conn.notebookMap[ this._note.notebookGuid ];
  }

  // return the current version number
  WrappedNote.prototype.version = function() {
    return this._note.updateSequenceNum;
  }

  // return the update time
  WrappedNote.prototype.updated = function() {
    return this._note.updated;
  }

  // return the note as an object
  WrappedNote.prototype.asObject = function() {
    return {
      title:    this._note.title,
      guid:     this._note.guid,
      notebook: this._conn.notebookMap[ this._note.notebookGuid ],
      version:  this._note.updateSequenceNum,
      updated:  this._note.updated
    }
  }

  // return a copy of the note
  WrappedNote.prototype.copy = function() {
    return new WrappedNote(
      this._conn,
      EvernoteConnection.copyMetadata(this._note)
    )
  }

  // return a list of note versions
  WrappedNote.prototype.versions = function(callback) {
    var _this = this;
    var cb = function(versionList) {
      var noteList = [];
      for (var i = 0; i < versionList.length; i++) {
        var note = _this.copy();
        note._note.updateSequenceNum = versionList[i].updateSequenceNum;
        note._note.title             = versionList[i].title;
        note._note.updated           = versionList[i].updated;
        noteList.push(note);
      }
      if (callback) callback(noteList);
    }
    this._conn.listNoteVersions(this._note.guid, cb);
  }

  // return note content (with optional version number)
  WrappedNote.prototype.fetchContent = function(version, callback, data) {

    // if only one argument, this is the callback
    if (callback === undefined) {
      callback = version;
      version = undefined;
    }

    // if the most recent note version exists in the cache, set version variable
    if (version === undefined
        && this._conn.versionCache[this._note.guid]
        && this._conn.versionCache[this._note.guid][this._note.updateSequenceNum]
    ) {
      version = this._note.updateSequenceNum;
    }

    // fetch without a version number
    if (version === undefined) {
      this._conn.fetchNoteContent(this._note.guid, function(content) {
        if (callback) callback(EvernoteConnection.stripFormatting(content))
      })
    }

    // fetch with a list of version numbers
    else if (version instanceof Array) {
      var _this = this;
      if (data === undefined)
        data = [];
      if (version.length == 0) {
        if (callback) callback(data);
      } else {
        this._conn.fetchNoteVersion(this._note.guid, version[0], function(note) {
          data.push(EvernoteConnection.stripFormatting(note.content));
          _this.fetchContent(version.slice(1), callback, data);
        })
      }
    }

    // fetch with a single version number
    else {
      this._conn.fetchNoteVersion(this._note.guid, version, function(note) {
        if (callback) callback(EvernoteConnection.stripFormatting(note.content))
      })
    }
  }

  // update note content
  WrappedNote.prototype.update = function(content, callback) {
    var _this = this;
    this._conn.updateNote(
      this.title(),
      EvernoteConnection.addFormatting(content),
      this.guid(),
      function(note) {
        _this._note = EvernoteConnection.noteToMetadata(note);
        if (callback) callback(_this);
      }
    )
  }

  // add note to data structures
  WrappedNote.prototype._add = function() {
    WrappedNote._noteData.push(this.asObject());
    WrappedNote._noteList.push(this);
    WrappedNote._noteMap[this.guid()] = this;
  }

  ///// STATIC METHODS /////

  // create a connection
  WrappedNote.connect = function(token, opt, callback) {
    WrappedNote._conn = new EvernoteConnection(token, opt);
    WrappedNote._conn.fetchMetaData(callback);
  }

  // refresh data in connection
  WrappedNote.refreshConnection = function(callback) {
    WrappedNote._checkConnection();
    WrappedNote._conn.fetchMetaData(function(){
      WrappedNote._refreshNoteData();
      if (callback) callback();
    })
  }

  // return true if connected
  WrappedNote.hasConnection = function() {
    return WrappedNote._conn && true;
  }

  // check connection
  WrappedNote._checkConnection = function() {
    if (WrappedNote._conn === undefined)
      EvernoteConnection.errorHandler('No connection!');
    if (!(WrappedNote._conn instanceof EvernoteConnection))
      EvernoteConnection.errorHandler('Invalid connection type!');
  }

  // refresh note data
  WrappedNote._refreshNoteData = function() {
    WrappedNote._checkConnection();
    WrappedNote._noteData = [];
    WrappedNote._noteList = [];
    WrappedNote._noteMap = {};
    for (var i = 0; i < WrappedNote._conn.notes.length; i++) {
      var wNote = new WrappedNote(WrappedNote._conn, WrappedNote._conn.notes[i]);
      wNote._add();
    }
  }

  // return a list of note data
  WrappedNote.getNoteData = function() {
    WrappedNote._checkConnection();
    if (WrappedNote._noteData === undefined)
      WrappedNote._refreshNoteData();
    return WrappedNote._noteData;
  }

  // return a list of notes
  WrappedNote.getNotes = function() {
    WrappedNote._checkConnection();
    if (WrappedNote._noteList === undefined)
      WrappedNote._refreshNoteData();
    return WrappedNote._noteList;
  }

  // return a map of notes
  WrappedNote.getNoteMap = function() {
    WrappedNote._checkConnection();
    if (WrappedNote._noteMap === undefined)
      WrappedNote._refreshNoteData();
    return WrappedNote._noteMap;
  }

  // return a note
  WrappedNote.getNote = function(guid) {
    WrappedNote._checkConnection();
    if (WrappedNote._noteMap === undefined)
      WrappedNote._refreshNoteData();
    return WrappedNote._noteMap[guid];
  }

  // create a new note
  WrappedNote.newNote = function(title, content, callback) {
    WrappedNote._checkConnection();
    WrappedNote._conn.createNote(
      title,
      EvernoteConnection.addFormatting(content),
      function(note) {
        var wNote = new WrappedNote(WrappedNote._conn, note);
        wNote._add();
        if (callback) callback(wNote);
      }
    );
  }


  //////////////////////
  // FINAL PROCESSING //
  //////////////////////

  // attach WrappedNote class
  EvernoteConnection.WrappedNote = WrappedNote;

  // return the nested item
  return EvernoteConnection;
}();
