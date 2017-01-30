// https://dev.evernote.com/doc/reference/

///////////////////////////
// BASE CONNECTION CLASS //
///////////////////////////

class EvernoteConnectionBase {

  constructor(token, url) {
    if (token === undefined) {
      throw new Error('Authentication token required!');
    } else if (url === undefined) {
      throw new Error('Note Store URL required!');
    } else {
      this.token = token;
      var noteStoreTransport = new Thrift.BinaryHttpTransport(url);
      var noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);
      this._noteStore = new NoteStoreClient(noteStoreProtocol);
    }
  }

  static defaultNotesMetadataResultSpec() {
    return new NotesMetadataResultSpec({
      includeTitle: true,             // include the note title
      includeUpdated: true,           // include the update time
      includeUpdateSequenceNum: true, // include the update sequence number
      includeTagGuids: true,          // include the list of tag guids
      includeNotebookGuid: true       // include the notebook guid
    })
  }

  // convert Evernote note content to plain text
  static stripFormatting(txt) {
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
  static addFormatting(txt) {
    var escaped = txt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(.+)/mg, '<div><span style="font-family: \'Courier New\';">$1</span></div>')
      .replace(/^$/mg, '<div><span style="font-family: \'Courier New\';"><br /></span></div>');
    return `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${escaped}</en-note>`
  }

  _noteStorePromise(fn, ...args) {
    return new Promise((resolve,reject) => {
      this._noteStore[fn].call(this._noteStore, this.token, ...args, resolve, reject)
    })
  }

  getNoteContent   (guid) { return this._noteStorePromise('getNoteContent'  , guid) }
  listNoteVersions (guid) { return this._noteStorePromise('listNoteVersions', guid) }
  listNotebooks    (guid) { return this._noteStorePromise('listNotebooks'   , guid) }
  listTags         (guid) { return this._noteStorePromise('listTags'        , guid) }

  getNoteVersion(guid, version, withResourcesData=false, withResourcesRecognition=false, withResourcesAlternateData=false) {
    return this._noteStorePromise('getNoteVersion', guid, version, withResourcesData, withResourcesRecognition, withResourcesAlternateData) }
  getResource(guid, withData=true, withRecognition=true, withAttributes=true, withAlternateData=false) {
    return this._noteStorePromise('getResource', guid, withData, withRecognition, withAttributes, withAlternateData) }
}


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
      var noteStoreURL = "@proxy-https/www.evernote.com/shard/s2/notestore";
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
          .replace(/(.+)/mg, '<div><span style="font-family: \'Courier New\';">$1</span></div>')
          .replace(/^$/mg, '<div><span style="font-family: \'Courier New\';"><br /></span></div>')
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
  WrappedNote.prototype.updatedStr = function() {
    return EvernoteConnection.dateString(this._note.updated);
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
    return WrappedNote;
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

  // load note data if not already loaded
  WrappedNote._checkNoteData = function() {
    if (WrappedNote._noteData === undefined)
      WrappedNote._refreshNoteData();
  }

  // return a list of note data
  WrappedNote.getNoteData = function() {
    WrappedNote._checkConnection()._checkNoteData();
    return WrappedNote._noteData;
  }

  // return a list of notes
  WrappedNote.getNotes = function() {
    WrappedNote._checkConnection()._checkNoteData();
    return WrappedNote._noteList;
  }

  // return a map of notes
  WrappedNote.getNoteMap = function() {
    WrappedNote._checkConnection()._checkNoteData();
    return WrappedNote._noteMap;
  }

  // return a note
  WrappedNote.getNote = function(guid) {
    WrappedNote._checkConnection()._checkNoteData();
    return WrappedNote._noteMap[guid];
  }

  // create a new note
  WrappedNote.newNote = function(title, content, callback) {
    WrappedNote._checkConnection()._checkNoteData();
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


  /////////////////////
  // SYNCHRONIZATION //
  /////////////////////

  /* Process is documented at https://dev.evernote.com/media/pdf/edam-sync.pdf */

  class EvernoteOffline {

    constructor(localFolder) {
      this._location = localFolder;
    }

    getMetadata() {
      return EvernoteOffline.ajax({
        type:     'GET',
        dataType: 'json',
        url:      `${this._location}/metadata.json`,
        data:     {}
      })
        .then(m  => { this.meta = m } )
        .then(() => EvernoteOffline.ajax(`/@ls/${this._location}/*`) )
        .then(f  => { this._processFiles(f) } )
    }

    getNoteContent(guid) {
      var lastVersion = this.fileData[guid].reduce((a,b) => Math.max(a,b), 0);
      return EvernoteOffline.ajax({
        type: 'GET',
        dataType: 'xml',
        url: `${this._location}/notes/${guid}/${lastVersion}`
      })
    }

    _processFiles(files) {
      this.fileData = {};
      files.filter( (f) => f.startsWith(`${this._location}/notes/`) ).forEach( (f) => {
        var [guid, version] = f.split('/notes/').pop().split('/');
        this.fileData[guid] = this.fileData[guid] || [];
        if (version !== 'versions.json')
          this.fileData[guid].push( parseInt(version) );
      })
    }

    static connect(location) {
      EvernoteOffline._instance = new EvernoteOffline(location);
      var _this = EvernoteOffline._instance;
      return _this.getMetadata()
    }

    static ajax(options) {
      return new Promise((resolve, reject) => {
        $.ajax(options).done(resolve).fail(reject);
      });
    };

  }


  // constructor
  var Synchronizer = function(conn, localFolder) {
    if (!(conn instanceof EvernoteConnection))
      EvernoteConnection.errorHandler('EvernoteConnection required as first argument!');
    if (!(localFolder))
      EvernoteConnection.errorHandler('Synchronization output location required as second argument!');
    this._conn = conn;
    this._location = localFolder;
    this._syncFilter = Synchronizer._syncFilter();
    this.meta = null;
  }

  // top-level function to perform synchronization
  Synchronizer.prototype.synchronize = function(callback){
    var _this = this;
    $.ajax({
      dataType: "json",
      url: _this._metadataFile(),
      data: {},
      success: function(m){
        _this._conn._logHandler("Loaded metadata file: "+_this._metadataFile());
        _this.meta = m;
        _this._syncMetadata(function(){ _this._processSyncChunks(callback) });
      },
      error: function(e){
        if (e.status == 404) {
          _this._conn._logHandler("Metadata file not found: starting fresh synchronization");
          _this.meta = Synchronizer._metaDefaults;
          _this._syncMetadata(function(){ _this._processSyncChunks(callback) });
        } else {
          _this._conn._errorHandler("Server error -- "+e.statusText);
        }
      }
    });
  }

  // return the metadata json file
  Synchronizer.prototype._metadataFile = function(){
    return this._location+'/metadata.json';
  }

  // check metadata
  Synchronizer.prototype._checkMetadata = function() {
    var _this = this;
    if (!(this.meta instanceof Object))
      throw new Error('Invalid metadata object type');

    // check that all required fields exist
    [
      'lastSyncCount',
      'lastSyncTime',
      'blockSize',
      'notes',
      'notebooks',
      'resources',
      'tags'
    ].forEach(function(x){
      if (_this.meta[x] === undefined || _this.meta[x] === null) {
        throw new Error('Metadata field not defined: '+x);
      }
    })

    // check properties
    if (this.meta.lastSyncCount < 0)
      throw new Error('meta.lastSyncCount must be a non-negative integer')

  }

  // post updated metadata
  Synchronizer.prototype._postMetaData = function(callback) {
    var _this = this;
    this._conn._logHandler("Posting updated metadata to "+this._metadataFile());
    $.ajax({
      type: "POST",
      url: '@writer/'+this._metadataFile(),
      data: JSON.stringify(this.meta),
      success: callback,
      error: function(e){
        _this._conn._errorHandler("Server error "+e.status+" -- "+e.statusText);
      },
      dataType: 'text'
    });
  }

  // function to remove fields that are not needed for cache
  Synchronizer.prototype._cleanMeta = function(meta) {

    // clean note list
    for (var i = 0; i < (meta.notes||[]).length; i++) {

      // filter note fields
      n = _.pick(meta.notes[i], [
        'created',
        'updated',
        'deleted',
        'guid',
        'notebookGuid',
        'title',
        'updateSequenceNum',
        'tagGuids',
        'resources'
      ]);

      // filter note resource data
      for (var j = 0; j < (meta.notes[i].resources||[]).length; j++) {
        n.resources[j] = _.pick(n.resources[j], [
          'guid',
          'mime',
          'updateSequenceNum',
          'height',
          'width'
        ]);
      }

      // replace note with new object
      meta.notes[i] = n;
    }

    // clean resource list
    for (var i = 0; i < (meta.resources||[]).length; i++) {
      meta.resources[i] = _.pick(meta.resources[i], [
        'guid',
        'mime',
        'updateSequenceNum',
        'height',
        'width'
      ]);
    }

    // clean notebook list
    for (var i = 0; i < (meta.notebooks||[]).length; i++) {
      meta.notebooks[i] = _.pick(meta.notebooks[i], [
        'guid',
        'name',
        'stack',
        'updateSequenceNum'
      ])
    }
  }

  //
  Synchronizer.prototype._syncMetadata = function(callback){
    var _this = this;
    _this._checkMetadata();

    // fetch synchronization state to determine path of action
    _this._conn.noteStore.getSyncState(_this._conn.authenticationToken, function(state){

      // reset metadata if necessary
      if (state.fullSyncBefore > _this.meta.lastSyncTime && _this.meta.lastSyncTime > 0) {
        _this.meta.lastSyncCount = 0;
        _this.meta.lastSyncTime = 0;
      }

      // perform synchronization
      if (state.updateCount !== _this.meta.lastSyncCount) {
        _this._fetchNextChunk(callback);
      } else {
        _this._conn._logHandler("No new synchronization data!");
        if (callback) callback();
      }
    })
  }

  // fetch next sync chunk
  Synchronizer.prototype._fetchNextChunk = function(callback) {
    var _this = this;
    _this._conn._logHandler("Fetching data starting from afterUSN="+_this.meta.lastSyncCount);

    // callback function
    var cb = function(data) {

      // check for a bad result
      if (!(data instanceof SyncChunk)) {
        _this._conn._errorHandler("Error receiving sync chunk");
        return
      }

      // strip unnecessary fields from sync chunk results
      _this._cleanMeta(data);

      // append chunk data
      if (data.notes    ) _this.meta.notes     = _this.meta.notes    .concat(data.notes    );
      if (data.notebooks) _this.meta.notebooks = _this.meta.notebooks.concat(data.notebooks);
      if (data.resources) _this.meta.resources = _this.meta.resources.concat(data.resources);
      if (data.tags     ) _this.meta.tags      = _this.meta.tags     .concat(data.tags     );

      // set sync counter in metadata to match position in chunk
      _this.meta.lastSyncCount = data.chunkHighUSN;

      // if more chunks are available, fetch them
      if (data.chunkHighUSN < data.updateCount) {
        _this._postMetaData();
        _this._fetchNextChunk(callback);
      } else {
        _this.meta.lastSyncTime = data.currentTime;
        _this._postMetaData();
        if (callback) callback();
      }
    }

    // perform the chunk request
    _this._conn.noteStore.getFilteredSyncChunk(
      _this._conn.authenticationToken,  // token
      _this.meta.lastSyncCount,         // starting point for update
      _this.meta.blockSize,             // number of chunks to fetch
      _this._syncFilter,                // chunk filter
      cb                                // callback function
    );
  }

  // function to process chunk data
  Synchronizer.prototype._processSyncChunks = function(callback) {

    // generate maps
    this.notes     = new Map( this.meta.notes     .map(n => [n.guid,n]) );
    this.notebooks = new Map( this.meta.notebooks .map(n => [n.guid,n]) );
    this.tags      = new Map( this.meta.tags      .map(t => [t.guid,t]) );
    this.resources = new Map( this.meta.resources .map(r => [r.guid,r]) );

    // instantiate connection to Evernote server
    var conn = new EvernoteConnectionBase(this._conn.authenticationToken, "@proxy-https/www.evernote.com/shard/s2/notestore");

    // synchronization base location
    var loc = this._location;


    /////////////////////
    // PROMISE HELPERS //
    /////////////////////

    function ajax(options) {
      return new Promise(function(resolve, reject) {
        $.ajax(options).done(resolve).fail(reject);
      });
    };

    function ajaxSave(url, data) {
      var options = {
        type: 'POST',
        url: `@writer/${loc}/${url}`,
        headers: { 'x-mkdir': true }
      };
      if (data instanceof Uint8Array) {
        options.data = data;
        options.contentType = 'application/octet-stream';
        options.processData = false;
      } else if (data instanceof Object) {
        options.data = JSON.stringify(data);
      } else if (typeof(data) === 'string') {
        options.data = data;
      } else {
        throw new Error('Invalid data type');
      }
      return ajax(options)
    }

    function sleep(s) {
      return new Promise(function(resolve, reject) {
        window.setTimeout(resolve, 1000*s)
      })
    }


    //////////////////////
    // FILE I/O HELPERS //
    //////////////////////

    var getAndSaveNote = (guid, version) => {
      if (this.notes.get(guid).updateSequenceNum == version) {
        return conn.getNoteContent(guid).then(content => {
          return ajaxSave(`notes/${guid}/${version}`, content)
            .then( () => console.log(`Saved file: notes/${guid}/${version}`) )
        })
      } else {
        return conn.getNoteVersion(guid,version).then(data => {
          return ajaxSave(`notes/${guid}/${version}`, data.content)
            .then( () => console.log(`Saved file: notes/${guid}/${version}`) )
        })
      }
    }

    function saveVersionData(guid, v) {
      return ajaxSave(`notes/${guid}/versions.json`, v).then( () => v )
    }

    function saveResource(res) {
      return ajaxSave(`resources/${res.guid}/${res.guid}`, res.data.body)
    }

    function saveResourceMetaData(res) {
      var newRes = Object.assign({}, res);
      newRes.data = Object.assign({}, res.data);
      delete newRes.data.body;
      return ajaxSave(`resources/${res.guid}/metadata.json`, newRes)
        .then( () => res )
    }


    //////////////////////
    // EXECUTE PROMISES //
    //////////////////////

    // start promise chain by getting a list files in sync location
    var p = ajax(`/@ls/${loc}/*`);

    // extend chain to process each note
    this.notes.forEach((n) => {
      p = p.then(files => {
        if (files.includes(`${loc}/notes/${n.guid}/${n.updateSequenceNum}`)) {
          console.log(`Skipping note: ${n.title} [${n.guid}]`);
          return files;
        } else {
          console.log(`Processing note: ${n.title} [${n.guid}]`);
          return conn.listNoteVersions(n.guid)
            .then( v => saveVersionData(n.guid,v) )
            .then( v => v.map( vv => vv.updateSequenceNum ) )
            .then( v => v.filter( vv => !files.includes(`${loc}/notes/${n.guid}/${vv}`) ) )
            .then( v => {
              return Promise.all( v.map( vv => getAndSaveNote(n.guid,vv) ) )
                .then(() => getAndSaveNote(n.guid,n.updateSequenceNum) )
                .then(() => console.log(`Finished processing note: ${n.title} [${n.guid}]`))
                .then(() => sleep(10))
            })
            .then( () => files )
        }
      })
    })

    // extend chain to process each resource
    this.resources.forEach((r) => {
      p = p.then(files => {
        if (files.includes(`${loc}/resources/${r.guid}/${r.guid}`)) {
          console.log(`Skipping resource: [${r.guid}]`);
          return files;
        } else {
          console.log(`Processing resource: [${r.guid}]`);
          return conn.getResource(r.guid)
            .then( saveResourceMetaData )
            .then( saveResource )
            .then( () => sleep(10) )
            .then( () => files )
        }
      })
    })

    // execute callback
    if (callback) {
      p = p.then( () => callback() );
    }

    // add error handler to recurse if rate limit was reached
    p = p.catch(err => {
      if (err instanceof EDAMSystemException && err.errorCode == 19) {
        console.log(`Rate limit reached.  Cooldown time = ${err.rateLimitDuration} seconds`);
        sleep(err.rateLimitDuration+5)
          .then(() => this._processSyncChunks(callback));
      } else {
        console.error(err)
      }
    });

  }

  ///// STATIC METHODS AND PROPERTIES /////

  // create a connection
  Synchronizer.connect = function(token, localFolder, opt) {
    var conn = new EvernoteConnection(token, opt||{});
    Synchronizer._instance = new Synchronizer(conn, localFolder);
  }

  // perform synchronization
  Synchronizer.synchronize = function(callback) {
    Synchronizer._instance._conn._checkObject(Synchronizer._instance, Synchronizer);
    Synchronizer._instance.synchronize(callback);
  }

  // metadata defaults
  Synchronizer._metaDefaults = {
    lastSyncCount : 0,    // no sync performed
    lastSyncTime  : 0,    // no sync performed
    blockSize     : 100,  // fetch 100 entries at a time
    notes         : [],   // empty list to contain note data
    notebooks     : [],   // empty list to contain notebook data
    resources     : [],   // empty list to contain resource data
    tags          : []    // empty list to contain tag data
  }

  // filter to use for sync chunks
  Synchronizer._syncFilter = function(){
    return new SyncChunkFilter({

      // basic primitives
      includeNotes                              : true,
      includeResources                          : true,
      includeNotebooks                          : true,
      includeTags                               : true,
      includeSearches                           : false,

      // shared resources
      includeLinkedNotebooks                    : false,
      includeSharedNote                         : false,
      omitSharedNotebooks                       : true,

      // expunged notes
      includeExpunged                           : false,

      // note properties
      includeNoteResources                      : true,
      includeNoteAttributes                     : false,
      includeNoteApplicationDataFullMap         : false,

      // resource properties
      includeResourceApplicationDataFullMap     : false,
      includeNoteResourceApplicationDataFullMap : false
    });
  }


  //////////////////////
  // FINAL PROCESSING //
  //////////////////////

  // attach WrappedNote class
  EvernoteConnection.WrappedNote = WrappedNote;

  // attach Synchronizer class
  EvernoteConnection.Synchronizer = Synchronizer;
  EvernoteConnection.EvernoteOffline = EvernoteOffline;

  // return the nested item
  return EvernoteConnection;
}();
