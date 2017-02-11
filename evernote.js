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
  getSyncState     ()     { return this._noteStorePromise('getSyncState'          ) }

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


//////////////////////////////
// HANDLER FOR OFFLINE DATA //
//////////////////////////////

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


//////////////////////////////////////////
// CLASS TO HANDLE PROXY SERVER FILE IO //
//////////////////////////////////////////

class ProxyServerIO {

  // wrap jQuery ajax call in a promise
  static ajax(options) {
    return new Promise(function(resolve, reject) {
      $.ajax(options).done(resolve).fail(reject);
    });
  };

  // load a file from proxy server
  static load(url, dataType) {
    return ProxyServerIO.ajax({
      dataType  : dataType,
      url       : url,
      data      : {}
    })
  }

  // save a file to proxy server
  static save(url, data) {
    var options = {
      type: 'POST',
      url: `@writer/${url}`,
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
    return ProxyServerIO.ajax(options)
  }

  static ls(loc, search="*") {
    return ProxyServerIO.ajax(`/@ls/${loc}/${search}`);
  }

}


/////////////////////
// SYNCHRONIZATION //
/////////////////////

/* Process is documented at https://dev.evernote.com/media/pdf/edam-sync.pdf */

class Synchronizer {

  constructor(token, url, localFolder, maxResourceSize=Infinity, opt={}, ioHandler=ProxyServerIO) {
    this._conn = new EvernoteConnectionCached(token, url, opt);
    this._location = localFolder;
    this._maxResourceSize = maxResourceSize;
    this._ioHandler = ioHandler;
    this.meta = null;
    this._syncFilter = new SyncChunkFilter({

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

  // return the metadata json file
  get metadataFile() {
    return this._location+'/metadata.json';
  }

  // sleep for the specified number of seconds
  static sleep(s) {
    return new Promise(function(resolve, reject) {
      window.setTimeout(resolve, 1000*s)
    })
  }

  // log a message in a promise chain
  _logMessage(msg, p) {
    return p.then( x => {
      this._conn.messageLogger(msg);
      return x
    })
  }

  ///// FILE IO UTILITIES /////

  // load the metadata json file
  _loadMetadata() {
    return this._logMessage(`Loaded metadata file: ${this.metadataFile}`,
      this._ioHandler.load(this.metadataFile, 'json'))
  }

  // save the metadata json file
  _saveMetadata() {
    return this._logMessage(`Posted updated metadata to file: ${this.metadataFile}`,
      this._ioHandler.save(this.metadataFile, this.meta))
  }

  // get a list of resources
  _listResources() {
    return this._logMessage(`Listed resources at ${this._location}`,
      this._ioHandler.ls(this._location))
  }

  // fetch a note from server and save to local storage
  _getAndSaveNote(guid, version) {
    if (this.notes.get(guid).updateSequenceNum == version) {
      return this._conn.getNoteContent(guid).then(content => {
        return this._logMessage(`Saved file: notes/${guid}/${version}`,
          this._ioHandler.save(`${this._location}/notes/${guid}/${version}`, content))
      })
    } else {
      return this._conn.getNoteVersion(guid,version).then(data => {
        return this._logMessage(`Saved file: notes/${guid}/${version}`,
          this._ioHandler.save(`${this._location}/notes/${guid}/${version}`, data.content))
      })
    }
  }

  // save note version data
  _saveVersionData(guid, v) {
    return this._logMessage(`Saved note version data for ${guid}`,
      this._ioHandler.save(`${this._location}/notes/${guid}/versions.json`, v).then( () => v ))
  }

  // save resource contents
  _saveResource(res) {
    return this._logMessage(`Saved resource ${res.attributes.fileName} [${res.guid}]`,
      this._ioHandler.save(`${this._location}/resources/${res.guid}/${res.guid}`, res.data.body).then( () => res ))
  }

  // save resource metadata
  _saveResourceMetaData(res) {
    var newRes = Object.assign({}, res);
    newRes.data = Object.assign({}, res.data);
    delete newRes.data.body;
    return this._logMessage(`Saved resource metadata for ${res.attributes.fileName} [${res.guid}]`,
      this._ioHandler.save(`${this._location}/resources/${res.guid}/metadata.json`, newRes).then( () => res ))
  }

  ///// SYNCHRONIZATION AND DEPENDENCIES /////

  // top-level function to perform Synchronization
  synchronize() {
    return this._loadMetadata()
      .catch(e => {
        if (e.status == 404) {
          this._conn.messageLogger("Metadata file not found: starting fresh synchronization");
          return { // metadata defaults
            lastSyncCount : 0,    // no sync performed
            lastSyncTime  : 0,    // no sync performed
            blockSize     : 100,  // fetch 100 entries at a time
            notes         : [],   // empty list to contain note data
            notebooks     : [],   // empty list to contain notebook data
            resources     : [],   // empty list to contain resource data
            tags          : []    // empty list to contain tag data
          }
        } else {
          throw new Error(`Server error -- ${e.statusText}`);
        }
      })
      .then(m => {
        this.meta = m;
        let p = this._syncMetadata();
        return p.then(() => this._processSyncChunks())
      })
  }

  // check metadata
  _checkMetadata() {

    // confirm that metadata property is an object
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
    ].forEach(x => {
      if (this.meta[x] === undefined || this.meta[x] === null) {
        throw new Error('Metadata field not defined: '+x);
      }
    })

    // check properties
    if (this.meta.lastSyncCount < 0)
      throw new Error('meta.lastSyncCount must be a non-negative integer')

  }

  // function to remove fields that are not needed for cache
  _cleanMetadata(meta) {

    // fields to keep
    var fieldsToKeep = {
      note: [
        'created',
        'updated',
        'deleted',
        'guid',
        'notebookGuid',
        'title',
        'updateSequenceNum',
        'tagGuids',
        'resources'
      ],
      resource:  [
        'guid',
        'mime',
        'data',
        'updateSequenceNum',
        'height',
        'width'
      ],
      notebook: [
        'guid',
        'name',
        'stack',
        'updateSequenceNum'
      ]
    }

    // process a resource
    function processResource(res) {
      if (res.data && res.data.bodyHash) {
        res.data.bodyHash = Object.values(res.data.bodyHash).map(
          x => (x < 16 ? '0' : '') + x.toString(16)
        ).join('');
      }
      return _.pick(res, fieldsToKeep.resource)
    }

    // clean note list
    meta.notes = (meta.notes || []).map(n => {
      n = _.pick(n, fieldsToKeep.note);
      n.resources = (n.resources || []).map(processResource);
      return n
    })

    // clean resource list
    meta.resources = (meta.resources || []).map(processResource);

    // clean notebook list
    meta.notebooks = (meta.notebooks || []).map(n => _.pick(n, fieldsToKeep.notebook));
  }

  // synchronize metadata
  _syncMetadata() {

    // check that current metadata are valid
    this._checkMetadata();

    // fetch synchronization state to determine path of action
    return this._conn.getSyncState(this._conn.token).then(state => {

      // reset metadata if necessary
      if (state.fullSyncBefore > this.meta.lastSyncTime && this.meta.lastSyncTime > 0) {
        this.meta.lastSyncCount = 0;
        this.meta.lastSyncTime = 0;
      }

      // perform synchronization
      if (state.updateCount !== this.meta.lastSyncCount) {
        return this._fetchNextChunk();
      } else {
        this._conn.messageLogger("No new synchronization data!");
        return new Promise((resolve,reject) => resolve()); // no-op promise
      }
    })
  }

  // fetch next sync chunk
  _fetchNextChunk() {
    this._conn.messageLogger("Fetching data starting from afterUSN="+this.meta.lastSyncCount);
    return this._conn.getFilteredSyncChunk(
      this.meta.lastSyncCount,         // starting point for update
      this.meta.blockSize,             // number of chunks to fetch
      this._syncFilter                 // chunk filter
    ).then(data => {

      // strip unnecessary fields from sync chunk results
      this._cleanMetadata(data);

      // append chunk data
      if (data.notes    ) this.meta.notes     = this.meta.notes    .concat(data.notes    );
      if (data.notebooks) this.meta.notebooks = this.meta.notebooks.concat(data.notebooks);
      if (data.resources) this.meta.resources = this.meta.resources.concat(data.resources);
      if (data.tags     ) this.meta.tags      = this.meta.tags     .concat(data.tags     );

      // set sync counter in metadata to match position in chunk
      this.meta.lastSyncCount = data.chunkHighUSN;

      // if more chunks are available, fetch them
      if (data.chunkHighUSN < data.updateCount) {
        this._saveMetadata();
        return this._fetchNextChunk();
      } else {
        this.meta.lastSyncTime = data.currentTime;
        this._saveMetadata();
        return this.meta;
      }
    })
  }

  // function to process chunk data
  _processSyncChunks() {

    // generate maps
    this.notes     = new Map( this.meta.notes     .map(n => [n.guid,n]) );
    this.notebooks = new Map( this.meta.notebooks .map(n => [n.guid,n]) );
    this.tags      = new Map( this.meta.tags      .map(t => [t.guid,t]) );
    this.resources = new Map( this.meta.resources .map(r => [r.guid,r]) );

    // start promise chain by getting a list files in sync location
    var p = this._listResources();

    // extend chain to process each note
    this.notes.forEach((n) => {
      p = p.then(files => {
        if (files.includes(`${this._location}/notes/${n.guid}/${n.updateSequenceNum}`)) {
          console.log(`Skipping note: ${n.title} [${n.guid}]`);
          return files;
        } else {
          console.log(`Processing note: ${n.title} [${n.guid}]`);
          return this._conn.listNoteVersions(n.guid)
            .then( v => this._saveVersionData(n.guid,v) )
            .then( v => v.map( vv => vv.updateSequenceNum ) )
            .then( v => v.filter( vv => !files.includes(`${this._location}/notes/${n.guid}/${vv}`) ) )
            .then( v => {
              return Promise.all( v.map( vv => this._getAndSaveNote(n.guid,vv) ) )
                .then(() => this._getAndSaveNote(n.guid,n.updateSequenceNum) )
                .then(() => console.log(`Finished processing note: ${n.title} [${n.guid}]`))
                .then(() => Synchronizer.sleep(10))
            })
            .then( () => files )
        }
      })
    })

    // extend chain to process each resource
    this.resources.forEach((r) => {
      p = p.then(files => {
        if (files.includes(`${this._location}/resources/${r.guid}/${r.guid}`)) {
          console.log(`Skipping existing resource: [${r.guid}]`);
          return files;
        } else if (r.data.size > this._maxResourceSize) {
          console.log(`Skipping large resource (${r.data.size}): [${r.guid}]`);
          return files;
        } else {
          console.log(`Processing resource: [${r.guid}]`);
          return this._conn.getResource(r.guid)
            .then( (res) => this._saveResourceMetaData(res) )
            .then( (res) => this._saveResource(res) )
            .then( () => Synchronizer.sleep(10) )
            .then( () => files )
        }
      })
    })

    // add error handler to recurse if rate limit was reached
    p = p.catch(err => {
      if (err instanceof EDAMSystemException && err.errorCode == 19) {
        console.log(`Rate limit reached.  Cooldown time = ${err.rateLimitDuration} seconds`);
        Synchronizer.sleep(err.rateLimitDuration+5)
          .then(() => this._processSyncChunks(callback));
      } else {
        console.error(err)
      }
    });

    // return the promise
    return p
  }

}
