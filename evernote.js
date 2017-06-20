// https://dev.evernote.com/doc/reference/

// return true if running Node.js
function isNodeJs() {
  return (typeof window === 'undefined')
}


////////////////////////////////////////////////
// BASE CLASS FOR ABSTRACT JAVASCRIPT CLASSES //
////////////////////////////////////////////////

/* This class emulates behavior of abstract classes in other languages.
 *
 * To create an abstract class:
 *
 *    - Extend Abstract (class NewClass extends Abstract)
 *    - Call super(NewClass) in the constructor
 *    - Call checkGetter('propertyName') and checkMethod('methodName') for each
 *      respective getter and method that must be defined in the concrete
 *      implementation
 *    - To enable extension of NewClass to another abstract class, allow the
 *      child to pass itself to the NewClass constructor:
 *
 *        class NewClass extends Abstract {
 *          constructor(subclass) {
 *            super(subClass || NewClass)
 *            ...
 *
 * To create a concrete extension of an abstract class:
 *
 *    - Extend the abstract class
 *    - Call super() in the constructor
 *    - Define required getters and methods
 */

class Abstract {

  // constructor: ensure that class being constructed is concrete
  constructor (subClass) {
   if (subClass === undefined) {
     throw new TypeError('Subclass required in Abstract constructor');
   } else if (new.target === subClass) {
     throw new TypeError(`Cannot construct ${subClass.name} instances directly`);
   }
  }

  // throw an error if a required method doesn't exist
  static checkMethod(t,m) {
    if (t[m] === undefined) {
      throw new TypeError("Must override method: "+m);
    }
  }
  checkMethod(m) {
    Abstract.checkMethod(this,m)
  }

  // throw an error if a required getter doesn't exist
  checkGetter(m) {
   if (this.__lookupGetter__(m) === undefined) {
     throw new TypeError("Must provide a getter: "+m);
   }
  }
}


//////////////////////////////////////
// BASE EVERNOTE CONNECTIVITY CLASS //
//////////////////////////////////////

class EvernoteConnectionBase {

  constructor(token, url) {
    if (token === undefined) {
      throw new Error('Authentication token required!');
    } else if (url === undefined) {
      throw new Error('Note Store URL required!');
    } else {
      this.token = token;
      if (isNodeJs()) { // running in node.js
        var client = new Evernote.Client({token: token, sandbox:false});
        this._noteStore = client.getNoteStore();
      } else { // running in browser
        var noteStoreTransport = new Thrift.BinaryHttpTransport(url);
        var noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);
        this._noteStore = new NoteStoreClient(noteStoreProtocol);
      }
    }
  }

  static defaultNoteResultSpec() {
    return new NoteResultSpec({
      includeContent	              : true,  // include note content
      includeResourcesData	        : false, // exnclude resource binary data
      includeResourcesRecognition	  : false, // exclude resource recognition data
      includeResourcesAlternateData	: false, // exclude resource alternate data
      includeSharedNotes	          : false, // exclude note shares
      includeNoteAppDataValues	    : false, // exclude note user data
      includeResourceAppDataValues	: false, // exclude resource user data
      includeAccountLimits	        : false  // exclude user account limit data
    })
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
    if (isNodeJs()) {
      return this._noteStore[fn].call(this._noteStore, ...args)
    } else {
      return new Promise((resolve,reject) => {
        this._noteStore[fn].call(this._noteStore, this.token, ...args, resolve, reject)
      })
    }
  }

  getNoteContent   (guid) { return this._noteStorePromise('getNoteContent'  , guid) }
  listNoteVersions (guid) { return this._noteStorePromise('listNoteVersions', guid) }
  listNotebooks    ()     { return this._noteStorePromise('listNotebooks'         ) }
  listTags         ()     { return this._noteStorePromise('listTags'              ) }
  getSyncState     ()     { return this._noteStorePromise('getSyncState'          ) }

  getNote(guid, withContent=true, withResourcesData=false, withResourcesRecognition=false, withResourcesAlternateData=false) {
    return this._noteStorePromise('getNote', guid, withContent, withResourcesData, withResourcesRecognition, withResourcesAlternateData) }
  getNoteWithResultSpec(guid, resultSpec=EvernoteConnectionBase.defaultNoteResultSpec()) {
    return this._noteStorePromise('getNoteWithResultSpec', guid, resultSpec) }
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

  // encryption/decryption support
  // note that this requires the JSCL library sjcl-1.0.6.min.js
  // the included library was compiled with:
  //   > git clone https://github.com/bitwiseshiftleft/sjcl.git
  //   > cd sjcl/
  //   > git checkout 1.0.6
  //   > ./configure --without-all --with-cbc --with-codecBase64 --with-codecString --with-pbkdf2 --with-random
  //   > make
  //   > cp sjcl.js ../sjcl-1.0.6.min.js

  // decryption for <en-crypt> elements
  static decrypt(password, data) {
    const BYTE_LEN      = 8;              // 8 bits in a byte
    const WORD_LEN      = 32;             // 32 bits in a word
    const EN_ITERATIONS = 50000;          // number of iterations for HMAC/SHA-256 hash function
    const EN_KEYSIZE    = 128;            // 128 bit key
    const EN_HMACSIZE   = 32 * BYTE_LEN;  // size of hashed message authentication code (HMAC)
    const EN_IDENT      = 'ENC0';         // header text for evernote encrypted string

    // enable CBC mode
    sjcl.beware["CBC mode is dangerous because it doesn't protect message integrity."]();

    // convert string to bytes
    data = (typeof data === 'string') ? sjcl.codec.base64.toBits(data) : data;

    // confirm that encrypted string starts with 'ENC0'
    if (EN_IDENT !== sjcl.codec.utf8String.fromBits([data[0]])) {
        throw new Error('Evernote encrypted string does not start with ENC0');
    }

    // pointer into bytes after 'ENC0' header
    var cursor = BYTE_LEN * EN_IDENT.length;

    // extract random salt
    var salt = sjcl.bitArray.bitSlice(data, cursor, cursor + EN_KEYSIZE);
    cursor += EN_KEYSIZE;

    // extract salt HMAC (random salt for digest)
    var saltHMAC = sjcl.bitArray.bitSlice(data, cursor, cursor + EN_KEYSIZE);
    cursor += EN_KEYSIZE;

    // extract initialization vector
    var iv = sjcl.bitArray.bitSlice(data, cursor, cursor + EN_KEYSIZE);
    cursor += EN_KEYSIZE;

    // extract ciphertext
    var dataLen = sjcl.bitArray.bitLength(data);
    var ct = sjcl.bitArray.bitSlice(data, cursor, dataLen - EN_HMACSIZE);
    cursor += dataLen - EN_HMACSIZE - cursor;

    // extract HMAC digest
    var hmacExpected = sjcl.bitArray.bitSlice(data, cursor, cursor + EN_HMACSIZE);

    // check MAC validity
    var keyHMAC = sjcl.misc.pbkdf2(password, saltHMAC, EN_ITERATIONS, EN_KEYSIZE);
    var hmac = new sjcl.misc.hmac(keyHMAC).encrypt(sjcl.bitArray.bitSlice(data, 0, dataLen - EN_HMACSIZE));
    if (!sjcl.bitArray.equal(hmac, hmacExpected)) {
      console.error('Invalid checksum:', hmac, hmacExpected);
      throw new Error('Evernote encrypted string has invalid checksum')
    }

    // decrypt
    var key = sjcl.misc.pbkdf2(password, salt, EN_ITERATIONS, EN_KEYSIZE);
    var prp = new sjcl.cipher.aes(key);
    var result = sjcl.mode.cbc.decrypt(prp, ct, iv);

    // decode result
    return sjcl.codec.utf8String.fromBits(result);
  }

  // encryption for <en-crypt> elements
  static encrypt(password, plaintext) {
    const BYTE_LEN      = 8;              // 8 bits in a byte
    const WORD_LEN      = 32;             // 32 bits in a word
    const EN_ITERATIONS = 50000;          // number of iterations for HMAC/SHA-256 hash function
    const EN_KEYSIZE    = 128;            // 128 bit key
    const EN_HMACSIZE   = 32 * BYTE_LEN;  // size of hashed message authentication code (HMAC)
    const EN_IDENT      = 'ENC0';         // header text for evernote encrypted string

    // enable CBC mode
    sjcl.beware["CBC mode is dangerous because it doesn't protect message integrity."]();

    // convert string to bytes
    plaintext = (typeof plaintext === 'string') ? sjcl.codec.utf8String.toBits(plaintext) : plaintext;

    // generate salts for keys
    var salt = sjcl.random.randomWords(EN_KEYSIZE / WORD_LEN, 0);
    var saltHMAC = sjcl.random.randomWords(EN_KEYSIZE / WORD_LEN, 0);

    // generate keys using Password-Based Key Derivation Function 2 (pbkdf2)
    var key = sjcl.misc.pbkdf2(password, salt, EN_ITERATIONS, EN_KEYSIZE);
    var keyHMAC = sjcl.misc.pbkdf2(password, saltHMAC, EN_ITERATIONS, EN_KEYSIZE);

    // generate initialization vector
    var iv = sjcl.random.randomWords(EN_KEYSIZE / WORD_LEN, 0);

    // encrypt
    var prp = new sjcl.cipher.aes(key);
    var ct = sjcl.mode.cbc.encrypt(prp, plaintext, iv);

    // assemble message
    var result = [].concat(
      sjcl.codec.utf8String.toBits(EN_IDENT),   // "ENC0" header
      salt,                                     // random salt for encryption
      saltHMAC,                                 // random salt for HMAC verification
      iv,                                       // initialization vector
      ct                                        // cypher text
    );

    // calculate hashed message authentication code for message integrity and append to result
    var hmac = new sjcl.misc.hmac(keyHMAC).encrypt(result);
    result = result.concat(hmac);

    // encode result in base 64
    return sjcl.codec.base64.fromBits(result);
  }
}


//////////////////////////////////////////
// EXTENDED EVERNOTE CONNECTIVITY CLASS //
//////////////////////////////////////////

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


////////////////////////////
// BASE CLASSES FOR NOTES //
////////////////////////////

class WrappedNoteRO extends Abstract {
  constructor(subClass) {
    super(subClass || WrappedNoteRO);

    // check for required getters
    this.checkGetter('title');
    this.checkGetter('notebook');
    this.checkGetter('updated');
    this.checkGetter('tags');
    this.checkGetter('guid');
    this.checkGetter('deleted');
    this.checkGetter('version');
    this.checkGetter('attributes');

    // check for required methods
    this.checkMethod('getContent');
    this.checkMethod('getVersions');
  }

  // getter for update time as a string
  get updatedStr() {
    return WrappedNoteRO.dateString(this.updated)
  }

  // getter for tags as a string
  get tagStr() {
    return this.tags.join(',')
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

class WrappedNoteRW extends WrappedNoteRO {
  constructor(subClass) {
    super(subClass || WrappedNoteRW);

    // check for required methods
    this.checkMethod('setContent');

  }
}


//////////////////////////////////////
// WRAPPED NOTE BACKED BY SYNC DATA //
//////////////////////////////////////

class WrappedNoteSyncData extends WrappedNoteRO {
  constructor (note, conn) {
    super();
    this._note = note;
    this._conn = conn;
    this._tags = (note.tagGuids||[]).map( g => conn.meta.tags.filter( t => t.guid == g )[0].name );
    this._notebook = conn.meta.notebooks.filter( nb => nb.guid == note.notebookGuid )[0].name;
  }
  get title      () { return this._note.title             }
  get notebook   () { return this._notebook               }
  get tags       () { return this._tags                   }
  get updated    () { return this._note.updated           }
  get guid       () { return this._note.guid              }
  get deleted    () { return this._note.deleted           }
  get version    () { return this._note.updateSequenceNum }
  get attributes () { return null                         }
  getContent(version) {
    return this._conn.getNoteContent(this.guid, version)
  }
  getMeta(version) {
    return this._conn.getNoteMeta(this.guid, version)
  }
  getVersions() {
    return Promise.all(
      this._conn.versionData[this.guid].map(v => this._conn.getNoteMeta(this.guid, v))
    ).then(v => v.map(vv => new WrappedNoteSyncData(vv,this._conn)))
  }
}


///////////////////////////////////////////
// WRAPPED NOTE BACKED BY MARKDOWN FILES //
///////////////////////////////////////////

class WrappedNoteFiles extends WrappedNoteRO {
  constructor(conn, f) {
    super();
    let m = f.match(/(.*)\/(.*)/);
    this._conn = conn;
    this._title = m[2];
    this._location = m[1];
    this._url = f;
  }
  get title      () { return this._title    }
  get notebook   () { return this._location }
  get tags       () { return []             }
  get updated    () { return undefined      }
  get version    () { return undefined      }
  get guid       () { return this._url      }
  get deleted    () { return false          }
  get attributes () { return null           }
  getContent() {
    return this._conn.getNoteContent(this._url)
  }
}


////////////////////////////////////////////////
// WRAPPED NOTE BACKED BY EVERNOTE CONNECTION //
////////////////////////////////////////////////

class WrappedNoteEvernote extends WrappedNoteRW {

  // given a Note or NoteMetadata object, encapsulate it in a class with server connectivity
  constructor(conn, note) {
    super();
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
    if (!(note instanceof WrappedNoteEvernote))
      EvernoteConnection.errorHandler('WrappedNote required as first argument!');
    if (!(version instanceof NoteVersionId))
      EvernoteConnection.errorHandler('NoteVersionId required as second argument!');
    var newNote = new NoteMetadata(note);
    newNote.updateSequenceNum = version.updateSequenceNum;
    newNote.updated = version.updated;
    newNote.title = version.title;
    return new WrappedNoteEvernote(note._conn, newNote)
  }

  // getters for note properties
  get title      () { return this._note.title                                         }
  get guid       () { return this._note.guid                                          }
  get notebook   () { return this._conn.notebookMap.get(this._note.notebookGuid).name }
  get version    () { return this._note.updateSequenceNum                             }
  get updated    () { return this._note.updated                                       }
  get deleted    () { return this._note.deleted                                       }
  get attributes () { return this._note.attributes                                    }
  get tags       () { return (this._note.tagGuids||[]).map( g => this._conn.tagMap.get(g).name ) }

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
  setContent(content) {
    return this._conn.updateNote(this.guid, this.title, content)
  }

  // get a list of versions
  getVersions() {
    return this._conn.listNoteVersions(this.guid)
      .then( versions => versions.map(v => WrappedNoteEvernote.fromVersion(this, v)) )
  }

}


///////////////////////////////////////////////
// BASE CLASSES FOR WRAPPED NOTE COLLECTIONS //
///////////////////////////////////////////////

class WrappedNoteROCollection {

  constructor() {
    this._notes = [];
    this._noteMap = new Map();
    this._filteredNotes = null;
    this._field = 'updated';
    this._reverse = true;
    this._filter = null;
    Abstract.checkMethod(this, 'connect');
  }

  get notes() {
    let noteArr = (this._filteredNotes !== null) ? this._filteredNotes : this._notes;
    return noteArr.map(x => x[x.length-1])
  }

  add(note) {
    if (note instanceof WrappedNoteRO) {
      if (!this._noteMap.has(note.guid)) {
        let arr = [ note ];
        this._noteMap.set(note.guid, arr);
        this._notes.push(arr);
      } else {
        this._noteMap.get(note.guid).push(note);
      }
    } else {
      throw new TypeError('Must add a WrappedNoteRO');
    }
  }

  sortBy(field, reverse=false) {

    // use string representation of tag list
    if (field == 'tags')
      field = 'tagStr';

    // sort numeric fields
    if (field == 'updated') {
      if (reverse) {
        this._notes.sort( (a,b) => b[b.length-1][field] - a[a.length-1][field] );
      } else {
        this._notes.sort( (a,b) => a[a.length-1][field] - b[b.length-1][field] );
      }

    // sort string fields
    } else {
      if (reverse) {
        this._notes.sort( (a,b) => b[b.length-1][field].toLowerCase() > a[a.length-1][field].toLowerCase() ? 1 : -1 );
      } else {
        this._notes.sort( (a,b) => b[b.length-1][field].toLowerCase() > a[a.length-1][field].toLowerCase() ? -1 : 1 );
      }
    }

    // repeat filter if one exists
    if (this._filter !== null) {
      this.filter(this._filter);
    } else {
      this._filteredNotes = null;
    }

    // save the sort settings
    this._field = field;
    this._reverse = reverse;

  }

  map(fn) {
    return this.notes.map(x => fn(x[x.length-1]));
  }

  filter(fn) {
    this._filteredNotes = this._notes.filter(x => fn(x[x.length-1]));
    this._filter = fn;
    return this._filteredNotes;
  }

  getNote(guid) {
    let arr = this._noteMap.get(guid);
    return arr[arr.length-1]
  }

}


class WrappedNoteRWCollection extends WrappedNoteROCollection {

  constructor() {
    super();
    Abstract.checkMethod(this, 'newNote');
  }

  add(note) {
    if (note instanceof WrappedNoteRW) {
      super.add(note);
    } else {
      throw new TypeError('Must add a WrappedNoteRW');
    }
  }

}


/////////////////////////////////////////////////
// WRAPPED NOTE COLLECTION BACKED BY SYNC DATA //
/////////////////////////////////////////////////

class WrappedNoteCollectionSyncData extends WrappedNoteROCollection {

  constructor(localFolder, ioHandler=ProxyServerIO) {
    super();
    this._location = localFolder  // standardize path...
      .replace(/^\.\/+/ , '')     // strip initial ./
      .replace(/\/*$/   , '');    // remove trailing /
    this.ioHandler = ioHandler;
    this._connected = false;
  }

  connect() {
    if (this._connected) {
      return new Promise((resolve,reject) => {resolve(this)})
    } else {
      return this.fetchMetaData().then( () => {this.connected = true; return this} )
    }
  }

  get notebookStacks() {
    var notebooksByStack = {};
    this.meta.notebooks.forEach(nb => {
      let stack = nb.stack || "Default";
      notebooksByStack[stack] = notebooksByStack[stack] || [];
      notebooksByStack[stack].push(nb);
    });
    return notebooksByStack
  }

  get tagTree() {
    var tagMap      = new Map(this.meta.tags.map(t => [t.guid, t ] ));
    var tagChildren = new Map(this.meta.tags.map(t => [t.guid, []] ));
    var rootTags = [];

    // function to recursively assemble a tag object
    function recursiveTag(tag) {
      return {
        name     : tag.name,
        children : tagChildren.get(tag.guid).map(c =>
          recursiveTag(tagMap.get(c))
        )
      }
    }

    // iterate over tags to build up map of children and array of root-level tags
    this.meta.tags.forEach(t => {
      if (t.parentGuid) {
        tagChildren.get(t.parentGuid).push(t.guid);
      } else {
        rootTags.push(t);
      }
    });

    // convert root-level tags to recursive objects
    return rootTags.map( rt => recursiveTag(rt) );
  }

  fetchMetaData() {
    return this.ioHandler.load(`${this._location}/metadata.json`, 'json')
      .then(meta => {
        this.meta = meta;
        // only add the most recent version of each note
        let noteMap = new Map();
        meta.notes.forEach(note => {
          noteMap.set(note.guid, note)
        });
        for (var note of noteMap.values()) {
          this.add(new WrappedNoteSyncData(note, this));
        }
      })
      .then(() => this.ioHandler.ls(`${this._location}/notes/`))
      .then(files  => {
        this.versionData = {};
        files.forEach(f => {
          if (f.endsWith('.json') && !f.endsWith('versions.json')) {
            var [guid, version] = f.split('/notes/').pop().split('/');
            this.versionData[guid] = this.versionData[guid] || [];
            this.versionData[guid].push( parseInt(version.replace('.json', '')) );

            if (version !== 'versions.json' && version.match(/^\d+$/))
              this.versionData[guid].push( parseInt(version) );
            }
        })
        this._connected = true;
      })
  }

  getNoteContent(guid, version) {
    if (version === undefined)
      version = this.versionData[guid].reduce((a,b) => Math.max(a,b), 0);
    return this.ioHandler.load(`${this._location}/notes/${guid}/${version}.xml`, 'xml')
      .then(content => {
        let note = this.getNote(guid);
        let $note = isNodeJs() ? cheerio.load(content)('en-note') : $(content).find('en-note');
        let hashLookup = new Map(note._note.resources.map(r => [r.data.bodyHash,r]));

        $note.find('en-todo').each( function() {
          let $el = $(this);
          if ($el.attr('checked') == 'true') {
            $el.replaceWith('&#x2611;');
          } else {
            $el.replaceWith('&#x2610;');
          }
        });

        $note.find('en-crypt').each( function() {
          let data = $(this).text(); 
          $(this).html(`
              <span style="display:none">${data}</span>
              ${"&#9679;".repeat(7)}
          `);
        });

        $note.find('en-media').each( function() {
          var mimeType = $(this).attr('type');
          var resData = hashLookup.get($(this).attr('hash'));
          var resLink = `syncData/resources/${resData.guid}/${resData.guid}`;
          if (mimeType.startsWith('image/')) {
            $(this).replaceWith(`<img src="${resLink}"/>`);
          } else if (mimeType.startsWith('audio/')) {
            $(this).replaceWith(`
              <audio controls="controls">
                <source src="${resLink}" type="${mimeType}"/>
                Your browser does not support the audio element.
              </audio>
            `);
          } else if (mimeType.startsWith('video/')) {
            $(this).replaceWith(`
              <video controls="controls">
                <source src="${resLink}" type="${mimeType}"/>
                Your browser does not support the video element.
              </video>
            `);
          } else if (mimeType == 'application/pdf') {
            $(this).replaceWith(`<object data='${resLink}' type='application/pdf' height="800" width="600"><a href='${resLink}'>${resLink}.pdf</a></object>`);
          } else {
            throw new Error(`Unrecognized mime type: ${mimeType}`);
          }
        });

        return $note
      })
  }

  getNoteMeta(guid, version) {
    if (version === undefined)
      version = this.versionData[guid].reduce((a,b) => Math.max(a,b), 0);
    return this.ioHandler.load(`${this._location}/notes/${guid}/${version}.json`, 'json')
  }

  getNoteResourceMeta(guid) {
    return Promise.all(
      this.notes.get(guid).resources.map( r => {
        return this.ioHandler.load(`${this._location}/resources/${r.guid}/metadata.json`, 'json')
          .then(res => {
            res.data.bodyHash = Object.values(res.data.bodyHash).map(
              x => (x < 16 ? '0' : '') + x.toString(16)
            ).join('');
            return res
          })
      })
    )
  }

}


//////////////////////////////////////////////////////
// WRAPPED NOTE COLLECTION BACKED BY MARKDOWN FILES //
//////////////////////////////////////////////////////

class WrappedNoteCollectionFiles extends WrappedNoteROCollection {

  constructor(localFolder, ioHandler=ProxyServerIO) {
    super();
    this._location = localFolder;
    this.ioHandler = ioHandler;
    this._connected = false;
  }

  connect() {
    if (this._connected) {
      return new Promise((resolve,reject) => {resolve(this)})
    } else {
      return this.fetchMetaData().then( () => {this._connected = true; return this} )
    }
  }

  fetchMetaData() {
    return this.ioHandler.ls(this._location, '*.md').then( files => {
      files.forEach(f => {
        this.add(new WrappedNoteFiles(this, f))
      })
    })
  }

  getNoteContent(url) {
    return this.ioHandler.load(url, 'text')
  }

}


////////////////////////////////////////////////
// WRAPPED NOTE COLLECTION BACKED BY EVERNOTE //
////////////////////////////////////////////////

class WrappedNoteCollectionEvernote extends WrappedNoteRWCollection {

  constructor(token, url, opt) {
    super();
    if (token instanceof EvernoteConnectionCached) {
      this.conn = token;
    } else {
      this.conn = new EvernoteConnectionCached(token, url, opt);
    }
  }

  connect() {
    if (this.conn.noteMap) {
      return new Promise((resolve,reject) => {resolve(this)})
    } else {
      return this.fetchMetaData().then( () => this )
    }
  }

  fetchMetaData() {
    return this.conn.fetchMetaData().then(() => {
      this.conn.noteMap.forEach(n => {
        this.add(new WrappedNoteEvernote(this.conn,n))
      });
    })
  }

  newNote(title, content) {
    return this.conn.createNote(title, content);
  }

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

  // return true for a file not found error
  static loadFileNotFound(e) {
    return e.status == 404
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

  // return a recursive file listing
  static ls(loc, search="*") {
    return ProxyServerIO.ajax(`/@ls/${loc}/${search}`);
  }

}


// define class for Node.js IO
class NodeIO {

  static load(url, dataType) {
    return new Promise((resolve,reject) => {
      fs.readFile(url, (err,data) => {
        if (err) reject(err);
        resolve(data);
      })
    }).then(data => {
      if (dataType === 'json') {
        data = JSON.parse(data);
      }
      return data
    })
  }

  // return true for a file not found error
  static loadFileNotFound(e) {
    return e.code == 'ENOENT' && e.errno == -2
  }

  static mkdir(url) {
    var bits = url.split(path.sep);
    if (url[0] === '/') {
      bits = bits.slice(1);    // trim off empty first entry
      bits[0] = '/' + bits[0]; // re-add leading slash
    }
    for (var i = 1; i <= bits.length; i++) {
      var tgt = bits.slice(0,i).join(path.sep);
      if (!fs.existsSync(tgt)) {
        fs.mkdirSync(tgt);
      }
    }
  }

  static save(url, data) {
    if (data instanceof Uint8Array) {
      // do nothing
    } else if (data instanceof Object) {
      data = JSON.stringify(data);
    } else if (typeof(data) === 'string') {
      // do nothing
    } else {
      throw new Error('Invalid data type');
    }
    NodeIO.mkdir(path.dirname(url));
    return new Promise((resolve,reject) => {
      fs.writeFile(url, data, (err) => {
        if (err) reject(err);
        resolve();
      })
    })
  }

  static walkSync(dir, filelist = []) {
    fs.readdirSync(dir).map(file => path.join(dir,file)).forEach(file => {
      filelist = fs.statSync(file).isDirectory()
        ? NodeIO.walkSync(file, filelist)
        : filelist.concat(file);
    });
    return filelist
  }

  static ls(loc, search='*') {
    let files = NodeIO.walkSync(loc);
    if (search !== '*') {
      let extension = search.slice(1);
      files = files.filter(f => f.endsWith(extension));
    }
    return new Promise((resolve,reject) => resolve(files))
  }

}

/////////////////////
// SYNCHRONIZATION //
/////////////////////

/* Process is documented at https://dev.evernote.com/media/pdf/edam-sync.pdf */

class Synchronizer {

  constructor(token, url, localFolder, opt) {
    this._conn = new EvernoteConnectionCached(token, url, opt.connectionOptions||{});
    this._location = localFolder  // standardize path...
      .replace(/^\.\/+/ , '')     // strip initial ./
      .replace(/\/*$/   , '');    // remove trailing /
    this._maxResourceSize = opt.maxResourceSize || Infinity;
    this._ioHandler = opt.ioHandler || ProxyServerIO;
    this._statusCallback = opt.statusCallback || function(){ return true };

    this.meta = null;
    this.fileData = null;
    if (isNodeJs()) { // running in node.js
      this._syncFilter = new Evernote.NoteStore.SyncChunkFilter(this._syncOptions());
    } else { // running in browser
      this._syncFilter = new SyncChunkFilter(this._syncOptions());
    }
  }

  // sync chunk filter options
  _syncOptions() {
    return {

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
    }
  }

  // return the metadata json file
  get metadataFile() {
    return this._location+'/metadata.json';
  }

  // sleep for the specified number of seconds
  static sleep(s) {
    return new Promise(function(resolve, reject) {
      setTimeout(resolve, 1000*s)
    })
  }

  // log a message in a promise chain
  logMessageAsync(msg, p) {
    return p.then( x => {
      this._conn.messageLogger(msg);
      return x
    })
  }

  // log a message synchronously
  logMessageSync(msg) {
    this._conn.messageLogger(msg);
  }

  ///// FILE IO UTILITIES /////

  // load the metadata json file
  _loadMetadata() {
    return this.logMessageAsync(`Loaded metadata file: ${this.metadataFile}`,
      this._ioHandler.load(this.metadataFile, 'json'))
  }

  // save the metadata json file
  _saveMetadata() {
    return this.logMessageAsync(`Posted updated metadata to file: ${this.metadataFile}`,
      this._ioHandler.save(this.metadataFile, this.meta))
  }

  // get a list of resources
  _listResources() {
    return this.logMessageAsync(`Listed resources at ${this._location}`,
      this._ioHandler.ls(this._location))
  }

  // fetch a note from server and save to local storage
  // NOTE: getNote is deprecated but new method isn't in current sdk version
  // should use this._conn.getNoteWithResultSpec(guid) for newer sdk's
  _getAndSaveNote(guid, version) {
    let rootFile = `${this._location}/notes/${guid}/${version}`;
    let p = this.notes.get(guid).updateSequenceNum == version
      ? this._conn.getNote(guid)
      : this._conn.getNoteVersion(guid, version);
    return p.then(data => {
      return this.logMessageAsync(`Saved file: ${rootFile}`,
        this._ioHandler.save(`${rootFile}.xml`, data.content))
          .then(() => {
            data.content = null;
            return this._ioHandler.save(`${rootFile}.json`, data)
          })
    })
  }

  // save note version data
  _saveVersionData(guid, v) {
    return this.logMessageAsync(`Saved note version data for ${guid}`,
      this._ioHandler.save(`${this._location}/notes/${guid}/versions.json`, v).then( () => v ))
  }

  // save resource contents
  _saveResource(res) {
    return this.logMessageAsync(`Saved resource ${res.attributes.fileName} [${res.guid}]`,
      this._ioHandler.save(`${this._location}/resources/${res.guid}/${res.guid}`, res.data.body).then( () => res ))
  }

  // save resource metadata
  _saveResourceMetaData(res) {
    var newRes = Object.assign({}, res);
    newRes.data = Object.assign({}, res.data);
    delete newRes.data.body;
    return this.logMessageAsync(`Saved resource metadata for ${res.attributes.fileName} [${res.guid}]`,
      this._ioHandler.save(`${this._location}/resources/${res.guid}/metadata.json`, newRes).then( () => res ))
  }

  ///// SYNCHRONIZATION AND DEPENDENCIES /////

  // top-level function to initialize synchronization
  syncInit() {

    // create a promise to load metadata
    let p = this._loadMetadata()

      // if no file exists yet, initialize a new synchronization
      .catch(e => {

        // init with a recoverable error
        if (this._ioHandler.loadFileNotFound(e)) {
          this.logMessageSync("Metadata file not found: starting fresh synchronization");
          return { // metadata defaults
            lastSyncCount : 0,    // no sync performed
            lastSyncTime  : 0,    // no sync performed
            blockSize     : 100,  // fetch 100 entries at a time
            notes         : [],   // empty list to contain note data
            notebooks     : [],   // empty list to contain notebook data
            resources     : [],   // empty list to contain resource data
            tags          : []    // empty list to contain tag data
          }

        // bubble up a non-recoverable error
        } else {
          throw new Error(`Server error -- ${e.statusText}`);
        }
      })

      // synchronize metadata
      .then(m => {
        this.meta = m;
        return this._syncMetadata();
      })

      // initialize data structures
      .then(() => {

        // generate maps
        this.notes     = new Map( this.meta.notes     .map(n => [n.guid,n]) );
        this.notebooks = new Map( this.meta.notebooks .map(n => [n.guid,n]) );
        this.tags      = new Map( this.meta.tags      .map(t => [t.guid,t]) );
        this.resources = new Map( this.meta.resources .map(r => [r.guid,r]) );

        // augment resource data
        this.notes.forEach(n => {
          n.resources.forEach(r => {

            // attach a human readable size
            let size = r.data.size;
            if (size > 1024*1024*1024) {
              size = (Math.round(size/1024/1024/1024 * 100)/100) + 'Gb';
            } else if (size > 1024*1024) {
              size = (Math.round(size/1024/1024 * 100)/100) + 'Mb';
            } else {
              size = (Math.round(size/1024 * 100)/100) + 'Kb';
            }
            this.resources.get(r.guid).hSize = size;

            // attach resource parent
            this.resources.get(r.guid).parent = n;
          })
        });

        // return a promise containing a state object
        return this._refreshSyncState()
      });

    // return the promise
    return p
  }

  // top-level function to perform synchronization
  synchronize(useInit=true) {
    if (useInit && this.fileData !== null) {
      return this._processSyncChunks();
    } else {
      return this.syncInit().then(() => this._processSyncChunks())
    }
  }

  // refresh synchronization state based on local files
  _refreshSyncState() {

    // return a promise containing a state object
    return this._listResources().then(files => {

      // initialize state object
      this.fileData = {
        sync            : this,
        allFiles        : files,
        newNotes        : [],
        oldNotes        : [],
        noteCounter     : 0,
        newResources    : [],
        bigResources    : [],
        oldResources    : [],
        resourceCounter : 0
      };

      // organize note files
      this.notes.forEach((n) => {
        let baseFile = `${this._location}/notes/${n.guid}/${n.updateSequenceNum}`
        if (files.includes(baseFile+'.json') && files.includes(baseFile+'.xml')) {
          this.fileData.oldNotes.push(n);
        } else {
          this.fileData.newNotes.push(n);
        }
      });

      // organize resource files
      this.resources.forEach((r) => {
        if (files.includes(`${this._location}/resources/${r.guid}/${r.guid}`)) {
          this.fileData.oldResources.push(r);
        } else if (r.data.size > this._maxResourceSize) {
          this.fileData.bigResources.push(r);
        } else {
          this.fileData.newResources.push(r);
        }
      });

      // state object is promise return value
      return this.fileData
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
        this.logMessageSync("No new synchronization data!");
        return new Promise((resolve,reject) => resolve()); // no-op promise
      }
    })
  }

  // fetch next sync chunk
  _fetchNextChunk() {
    this.logMessageSync("Fetching data starting from afterUSN="+this.meta.lastSyncCount);
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

    // report on skipped notes and resources
    if (this.fileData.noteCounter == 0) {
      this.fileData.oldNotes.forEach(n => {
        this.logMessageSync(`Skipping note: ${n.title} [${n.guid}]`);
      });
      this.fileData.oldResources.forEach(r => {
        this.logMessageSync(`Skipping existing resource: [${r.guid}] ${r.parent.title}`);
      });
      this.fileData.bigResources.forEach(r => {
        this.logMessageSync(`Skipping large resource (${r.hSize}): [${r.guid}] ${r.parent.title}`);
      });
    }

    // initialize an empty promise with continuation status
    let p = new Promise((resolve,reject) => resolve(true));

    // extend promise to process notes
    for (let i = this.fileData.noteCounter; i < this.fileData.newNotes.length; i++) {
      let n = this.fileData.newNotes[i];
      p = p.then(stateOK => {
        if (stateOK) {
          this.logMessageSync(`Processing note (${this.fileData.noteCounter+1}/${this.fileData.newNotes.length}): ${n.title} [${n.guid}]`);

          // get list of versions for current note
          return this._conn.listNoteVersions(n.guid)

            // save version data
            .then( v => this._saveVersionData(n.guid,v) )

            // filter to list of version numbers that do not exist locally
            .then( v => v.map( vv => vv.updateSequenceNum ) )
            .then( v => v.filter( vv => !this.fileData.allFiles.includes(`${this._location}/notes/${n.guid}/${vv}.json`)
                                     || !this.fileData.allFiles.includes(`${this._location}/notes/${n.guid}/${vv}.xml` ) ) )

            // save new note versions
            .then( v => {
              return Promise.all( v.map( vv => this._getAndSaveNote(n.guid,vv) ) )
                .then(() => this._getAndSaveNote(n.guid,n.updateSequenceNum) )
                .then(() => this.logMessageSync(`Finished processing note: ${n.title} [${n.guid}]`))
            })

            // increment note counter
            .then( () => this.fileData.noteCounter++ )

            // execute callback to determine if chain should continue
            .then( () => this._statusCallback(this.fileData) ) // refresh
            .then( () => Synchronizer.sleep(10)              ) // sleep
            .then( () => this._statusCallback(this.fileData) ) // check

        }
      })
    }

    // extend promise to process resources
    for (let i = this.fileData.resourceCounter; i < this.fileData.newResources.length; i++) {
      let r = this.fileData.newResources[i];
      p = p.then(stateOK => {
        if (stateOK) {
          this.logMessageSync(`Processing resource (${this.fileData.resourceCounter+1}/${this.fileData.newResources.length}): [${r.guid}] ${r.parent.title}`);

          // fetch the resource
          return this._conn.getResource(r.guid)

            // save resource and metadata
            .then( (res) => this._saveResourceMetaData(res) )
            .then( (res) => this._saveResource(res) )

            // increment resource counter
            .then( () => this.fileData.resourceCounter++ )

            // execute callback to determine if chain should continue
            .then( () => this._statusCallback(this.fileData) ) // refresh
            .then( () => Synchronizer.sleep(10)              ) // sleep
            .then( () => this._statusCallback(this.fileData) ) // check
        }
      })
    }

    // add error handler to recurse if rate limit was reached
    p = p.catch(err => {

      // EDAMSystemException class
      var errorClass = isNodeJs()
        ? Evernote.Errors.EDAMSystemException
        : EDAMSystemException;

      // recurse if error was a rate limit
      if (err instanceof errorClass && err.errorCode == 19) {
        this.logMessageSync(`Rate limit reached.  Cooldown time = ${err.rateLimitDuration} seconds`);
        Synchronizer.sleep(err.rateLimitDuration+5)
          .then(() => this._processSyncChunks() );

      // otherwise throw the error
      } else {
        throw err;
      }
    });

    // return the promise
    return p
  }

}
