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

  static defaultNoteFilter(tagGuids=null) {
    return new NoteFilter({
      order : NoteSortOrder.TITLE,  // default is to sort by title
      tagGuids : tagGuids           // search for specified tags
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
  listNotebooks    ()     { return this._noteStorePromise('listNotebooks'         ) }
  listTags         ()     { return this._noteStorePromise('listTags'              ) }

  getNoteVersion(guid, version, withResourcesData=false, withResourcesRecognition=false, withResourcesAlternateData=false) {
    return this._noteStorePromise('getNoteVersion', guid, version, withResourcesData, withResourcesRecognition, withResourcesAlternateData) }
  getResource(guid, withData=true, withRecognition=true, withAttributes=true, withAlternateData=false) {
    return this._noteStorePromise('getResource', guid, withData, withRecognition, withAttributes, withAlternateData) }
  findNotesMetadata(filter=EvernoteConnectionBase.defaultNoteFilter(), offset=0, maxNotes=100, resultSpec=EvernoteConnectionBase.defaultNotesMetadataResultSpec()) {
    return this._noteStorePromise('findNotesMetadata', filter, offset, maxNotes, resultSpec) }
  getFilteredSyncChunk(afterUSN, maxEntries, filter) {
    return this._noteStorePromise('getFilteredSyncChunk', afterUSN, maxEntries, filter) }

  createNote(title, content, tagGuids=[]) {
    if (title   === undefined) throw new Error('Title is required to create a note!');
    if (content === undefined) throw new Error('Content is required to create a note!');
    return this._noteStorePromise('createNote', new Note({
      title     : title,
      content   : content,
      tagGuids  : tagGuids
    }))
  }

  updateNote(guid, title, content, tagNames=[]) {
    if (guid    === undefined) throw new Error('GUID is required to update a note!');
    if (title   === undefined) throw new Error('Title is required to update a note!');
    if (content === undefined) throw new Error('Content is required to update a note!');
    return this._noteStorePromise('updateNote', new Note({
      guid      : guid,
      title     : title,
      content   : content,
      tagNames  : tagNames
    }))
  }
}


///////////////////////////////
// EXTENDED CONNECTION CLASS //
///////////////////////////////

class EvernoteConnectionCached extends EvernoteConnectionBase {

  constructor(token, url, opt={}) {

    // call parent constructor
    super(token, url);

    // defaults for optional arguments
    var defaultOptions = {
      searchTags    : [],   // tags to include in metadata search
      saveTags      : [],   // tags to attach to newly created notes
      textContent   : true, // treat content as raw text
      errorLogger   : EvernoteConnectionCached.errorLogger,
      messageLogger : EvernoteConnectionCached.messageLogger
    };

    // assign optional arguments (preventing use of keys not in defaults)
    Object.assign(
      this,
      Object.assign(
        Object.preventExtensions(defaultOptions),
        opt));

    // declare metadata maps
    this.noteMap      = null;   // map: guid -> Note
    this.notebookMap  = null;   // map: guid -> Notebook
    this.tagMap       = null;   // map: guid -> Tag
    this.tagMapRev    = null;   // map: name -> Tag

    // cache for note content
    this.cache = new Map;
  }

  // cached note content fetch
  getNoteContentCached(guid) {
    if (this.cache.has(guid)) {
      return new Promise((resolve,reject) => {
        this.messageLogger(`Fetched note content for ${guid} from cache`)
        resolve(this.cache.get(guid))
      })
        .then( content => this.textContent ? EvernoteConnectionBase.stripFormatting(content) : content )
    } else {
      return this.getNoteContent(guid)
        .then( content => {
          this.messageLogger(`Fetched note content for ${guid} from server`)
          this.cache.set(guid, content);
          return content
        })
        .then( content => this.textContent ? EvernoteConnectionBase.stripFormatting(content) : content )
    }
  }

  // cached note version fetch
  getNoteVersionCached(guid, version) {
    var key = `${guid}|${version}`;
    var out;
    if (this.cache.has(key)) {
      out = new Promise((resolve,reject) => {
        this.messageLogger(`Fetched note version for ${key} from cache`)
        resolve(this.cache.get(key))
      });
    } else {
      out = this.getNoteVersion(guid, version)
        .then( v => {
          this.messageLogger(`Fetched note version for ${key} from server`);
          this.cache.set(key, v);
          return v
        });
    }
    return out.then( v => {
      if (this.textContent) {
        v = new Note(v);
        v.content = EvernoteConnectionBase.stripFormatting(v.content);
      }
      return v
    })
  }

  // create a new note
  createNote(title, content) {
    if (this.textContent)
      content = EvernoteConnectionBase.addFormatting(content);
    var tagGuids = this.saveTags.map( (t) => this.tagMapRev.get(t).guid );
    return super.createNote(title, content, tagGuids)
      .then( (n) => {
        this.noteMap.set(n.guid, new NoteMetadata(n));
        this.cache.set(n.guid, content);
        return n
      })
  }

  // update an existing note
  updateNote(guid, title, content) {
    if (this.textContent)
      content = EvernoteConnectionBase.addFormatting(content);
    return super.updateNote(guid, title, content, this.saveTags)
      .then( (n) => {
        this.noteMap.set(n.guid, new NoteMetadata(n));
        this.cache.set(n.guid, content);
        return n
      })
  }

  // reset metadata
  resetMetaData() {
    this.noteMap     = new Map;
    this.notebookMap = null;
    this.tagMap      = null;
    this.tagMapRev   = null;
    this.cache       = new Map;
  }

  // fetch or refresh metadata
  fetchMetaData() {
    this.resetMetaData();
    return Promise.all([
      this.listNotebooks()
        .then( (n) => { this.notebookMap = new Map(n.map(x=>[x.guid,x]))       } )
        .then( ( ) => { this.messageLogger('Fetched Evernote notebook data')   } )
      ,this.listTags()
        .then( (t) => { this.tagMap    = new Map(t.map(x=>[x.guid,x]));   return t   } )
        .then( (t) => { this.tagMapRev = new Map(t.map(x=>[x.name,x]))               } )
        .then( ( ) => { this.messageLogger('Fetched Evernote tag data')              } )
    ])
      .then( () => this._fetchNoteMetaData() )
  }

  // recursively fetch note metadata
  _fetchNoteMetaData(start=0) {
    var tagGuids = this.searchTags.map( t => this.tagMapRev.get(t).guid );
    return this.findNotesMetadata(EvernoteConnectionBase.defaultNoteFilter(tagGuids), start)
      .then( (metaList) => {
        this.messageLogger(`Fetched Evernote note data starting from ${start}`);
        metaList.notes.forEach( (n) => { this.noteMap.set(n.guid, n) } );
        if (start + metaList.notes.length < metaList.totalNotes) {
          return this._fetchNoteMetaData(start + metaList.notes.length)
        }
      })
  }

  // default error handler
  static errorLogger(error) {
    if (error instanceof Array) {
      error.forEach( (e) => console.error(e) );
    } else {
      console.error(error);
    }
    throw new Error('EvernoteConnection failure');
  }

  // default message handler
  static messageLogger(msg) {
    if (msg instanceof Array) {
      msg.forEach( (m) => console.log(m) );
    } else {
      console.log(msg);
    }
  }

}


//////////////////////////
// NOTE CONTAINER CLASS //
//////////////////////////

class WrappedNote {

  // given a Note or NoteMetadata object, encapsulate it in a class with server connectivity
  constructor(conn, note) {
    if (!(conn instanceof EvernoteConnectionBase))
      EvernoteConnection.errorHandler('EvernoteConnection required as first argument!');
    if (!(note instanceof Note) && !(note instanceof NoteMetadata))
      EvernoteConnection.errorHandler('Note or NoteMetadata required as second argument!');
    if (note instanceof Note) {
      this._note = new NoteMetadata(note);
      this._conn = conn;
    } else {
      this._note = note;
      this._conn = conn;
    }
  }

  // static method to generate a WrappedNote from note version data
  static fromVersion(note, version) {
    if (!(note instanceof WrappedNote))
      EvernoteConnection.errorHandler('WrappedNote required as first argument!');
    if (!(version instanceof NoteVersionId))
      EvernoteConnection.errorHandler('NoteVersionId required as second argument!');
    var newNote = new NoteMetadata(note);
    newNote.updateSequenceNum = version.updateSequenceNum;
    newNote.updated = version.updated;
    newNote.title = version.title;
    return new WrappedNote(note._conn, newNote)
  }

  // getters for note properties
  get title      () { return this._note.title                                         }
  get guid       () { return this._note.guid                                          }
  get notebook   () { return this._conn.notebookMap.get(this._note.notebookGuid).name }
  get version    () { return this._note.updateSequenceNum                             }
  get updated    () { return this._note.updated                                       }
  get updatedStr () { return WrappedNote.dateString(this._note.updated)              }

  // return a copy of the object
  copy() {
    var newMeta = new NoteMetadata(this._note);
    newMeta.tagGuids = this._note.tagGuids.slice(0);
    return new WrappedNote(this._conn, newMeta)
  }

  // get note content
  getContent(version) {
    if (!(version instanceof Array)) {
      if (version === null || version === undefined || version == this._note.updateSequenceNum) {
        return this._conn.getNoteContentCached(this.guid);
      } else {
        return this._conn.getNoteVersionCached(this.guid, version).then(v => v.content)
      }
    } else {
      return Promise.all(version.map( v => this.getContent(v) ))
    }
  }

  // update note content
  updateContent(content) {
    return this._conn.updateNote(this.guid, this.title, content)
  }

  // get a list of versions
  getVersions() {
    return this._conn.listNoteVersions(this.guid)
      .then( versions => versions.map(v => WrappedNote.fromVersion(this, v)) )
  }

  // format a date as a string
  static dateString(d) {
    return new Intl.DateTimeFormat("en-US", {
      year    : 'numeric',
      month   : '2-digit',
      day     : '2-digit',
      hour    : '2-digit',
      minute  : '2-digit',
      second  : '2-digit',
      hour12  : false
    }).format(new Date(d))
  }

}


//////////////////////////////////////////////
// CLASS TO CONNECT WRAPPED NOTES TO SERVER //
//////////////////////////////////////////////

class WrappedNoteServer {

  constructor(token, url, opt) {
    if (token instanceof EvernoteConnectionCached) {
      this.conn = token;
    } else {
      this.conn = new EvernoteConnectionCached(token, url, opt);
    }
  }

  checkConnection() {
    if (this.conn.noteMap instanceof Map && this.conn.noteMap.size > 0) {
      return this.conn
    } else {
      throw new Error('Invalid WrappedNoteServer operation without server metadata')
    }
  }

  fetchMetaData() {
    return this.conn.fetchMetaData()
  }

  get notes() {
    var out = [];
    this.checkConnection().noteMap.forEach(n => {
      out.push(new WrappedNote(this.conn,n))
    });
    return out;
  }

  getNote(guid) {
    return new WrappedNote(this.conn, this.checkConnection().noteMap.get(guid));
  }

  newNote(title, content) {
    return this.conn.createNote(title, content);
  }

}


EvernoteConnection = function(){

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
        .then(meta => {
          this.meta = meta;
          this.notes     = new Map( meta.notes     .map(n => [n.guid,n]) );
          this.notebooks = new Map( meta.notebooks .map(n => [n.guid,n]) );
          this.tags      = new Map( meta.tags      .map(t => [t.guid,t]) );
          this.resources = new Map( meta.resources .map(r => [r.guid,r]) );
        })
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

    getNoteResourceMeta(guid) {
      return Promise.all(
        this.notes.get(guid).resources.map( r => {
          return EvernoteOffline.ajax({
            type: 'GET',
            dataType: 'json',
            url: `${this._location}/resources/${r.guid}/metadata.json`
          }).then(res => {
            res.data.bodyHash = Object.values(res.data.bodyHash).map(
              x => (x < 16 ? '0' : '') + x.toString(16)
            ).join('');
            return res
          })
        })
      )
    }

    _processFiles(files) {
      this.fileData = {};
      files.filter( (f) => f.startsWith(`${this._location}/notes/`) ).forEach( (f) => {
        var [guid, version] = f.split('/notes/').pop().split('/');
        this.fileData[guid] = this.fileData[guid] || [];
        if (version !== 'versions.json' && version.match(/^\d+$/))
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

  return {
    Synchronizer: Synchronizer,
    EvernoteOffline: EvernoteOffline
  }

}();
