/////////////////////////////////////////////////
// CONTAINER OBJECT FOR AN EVERNOTE CONNECTION //
/////////////////////////////////////////////////

EvernoteConnection = function(){

  // constructor
  var EvernoteConnection = function(token){
    if (token === undefined) {
      throw new Error('Authentication token required!');
    } else {
      this.versionCache = {};
      this.authenticationToken = token;
      var noteStoreURL = "proxy-https/www.evernote.com/shard/s2/notestore";
      var noteStoreTransport = new Thrift.BinaryHttpTransport(noteStoreURL);
      var noteStoreProtocol = new Thrift.BinaryProtocol(noteStoreTransport);
      this.noteStore = new NoteStoreClient(noteStoreProtocol);
    }
  }

  // error handler
  EvernoteConnection.prototype._errorHandler = function(error) {
    console.error(error);
  }

  // helper function to format a date
  EvernoteConnection.prototype.dateString = function(d) {
    d = new Date(d);
    return (d.getYear()+1900)                         +'-'+
      ('0'+(d.getMonth()+1)).replace(/0(\d\d)/,'$1')  +'-'+
      ('0'+(d.getDate()   )).replace(/0(\d\d)/,'$1')  +' '+
      ('0'+ d.getHours()   ).replace(/0(\d\d)/,'$1')  +':'+
      ('0'+ d.getMinutes() ).replace(/0(\d\d)/,'$1')  +':'+
      ('0'+ d.getSeconds() ).replace(/0(\d\d)/,'$1')
  }

  // helper function to convert a Note to NoteMetadata
  EvernoteConnection.prototype._noteToMetadata = function(note) {
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

  // return a filter for markdown notes
  EvernoteConnection.prototype._markdownFilter = function() {
    return new NoteFilter({
      tagGuids: [
        this._getTag('markdown')
      ],
      order: NoteSortOrder.TITLE
    });
  }

  // function to fetch notebook data
  EvernoteConnection.prototype._fetchNotebookData = function(callback) {
    var _this = this;
    var cb = function(notebooks) {
      _this._notebookMap = null;
      _this._noteData = null;
      _this.notebooks = notebooks;
      console.log('Fetched Evernote notebook data');
      if (callback) callback(notebooks);
    };
    this.noteStore.listNotebooks(this.authenticationToken, cb, this._errorHandler);
  }

  // function to fetch tag data
  EvernoteConnection.prototype._fetchTagData = function(callback) {
    var _this = this;
    var cb = function(tags) {
      _this.tags = tags;
      console.log('Fetched Evernote tag data');
      if (callback) callback(tags);
    }
    this.noteStore.listTags(this.authenticationToken, cb, this._errorHandler)
  }

  // function to fetch note data
  EvernoteConnection.prototype._fetchNoteData = function(noteFilter, start, callback) {
      var _this = this;
      var cb = function(notes) {
        _this._noteData = null;
        _this.notes = _this.notes.concat(notes.notes);
        console.log('Fetched Evernote note data');
        if (_this.notes.length < notes.totalNotes) {
          _this._fetchNoteData(noteFilter, _this.notes.length, callback);
        } else {
          _this.noteMap = {};
          for (var i = 0; i < _this.notes.length; i++) {
            _this.noteMap[_this.notes[i].guid] = _this.notes[i];
          };
          if (callback) callback(notes);
        }
      }

      if (start == 0) {
        this.notes = []; // clear list if starting a new fetch
      }

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

  // function to return the GUID associated with a tag name
  EvernoteConnection.prototype._getTag = function(tagName) {
    for (var i = 0; i < this.tags.length ; i++) {
      if (this.tags[i].name == tagName) {
        return this.tags[i].guid;
      }
    }
  }

  // convert Evernote note content to plain text
  EvernoteConnection.prototype._stripFormatting = function(txt) {
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
  }

  // convert plain text to Evernote note format
  EvernoteConnection.prototype._addFormatting = function(txt) {
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

  // create a new note
  EvernoteConnection.prototype.createNote = function(title, content, callback) {
    if (title   === undefined) throw new Error('Title is required to create a note!');
    if (content === undefined) throw new Error('Content is required to create a note!');
    var _this = this;
    var note = new Note();
    note.title = title;
    note.content = this._addFormatting(content);
    note.tagGuids = [ this._getTag('markdown') ];
    this.noteStore.createNote(this.authenticationToken, note, function(note, err) {
      if (err) {
        console.error('Error creating note: '+title);
        console.error(err);
      } else {
        note.content = _this._addFormatting(cm.getValue()); // content not returned by API
        console.log('Created note '+note.guid+': '+note.title);
        console.log(note);
        _this.noteMap[note.guid] = _this._noteToMetadata(note);
        _this.versionCache[note.guid] = {};
        _this.versionCache[note.guid][note.updateSequenceNum] = note;
        if (callback) callback(note);
      }
    });
  }

  // update an existing note
  EvernoteConnection.prototype.updateNote = function(title, content, guid, callback) {
    if (guid    === undefined) throw new Error('GUID is required to update a note!');
    if (title   === undefined) throw new Error('Title is required to update a note!');
    if (content === undefined) throw new Error('Content is required to update a note!');

    var _this = this;
    var note = new Note();
    note.guid = guid;
    note.title = title;
    note.content = this._addFormatting(content);
    note.tagNames = ['markdown'];

    this.noteStore.updateNote(this.authenticationToken, note, function(note, err) {
      if (err) {
        console.error('Error updating note '+note.guid+': '+note.title);
        console.error(err);
      } else {
        note.content = _this._addFormatting(cm.getValue()); // content not returned by API
        console.log('Updated note '+note.guid+': '+note.title);
        console.log(note);
        _this.noteMap[note.guid] = _this._noteToMetadata(note);
        _this.versionCache[note.guid][note.updateSequenceNum] = note;
        if (callback) callback(note);
      }
    });
  }

  // function to fetch data
  EvernoteConnection.prototype.fetchData = function(callback) {
    var _this = this;
    _this._fetchNotebookData(function(){
      _this._fetchTagData(function(){
        _this._fetchNoteData(_this._markdownFilter(), 0,
          callback
        )
      })
    });
  }

  // function to fetch note content
  EvernoteConnection.prototype.fetchNoteContent = function(guid, callback) {
    var _this = this;

    // create a version cache entry for current guid if one doesn't existing
    if (this.versionCache[guid] === undefined) {
      this.versionCache[guid] = {};
    }

    // callback function
    var cb = function(note) {
      var n = _this.noteMap[guid];
      _this.versionCache[guid][n.updateSequenceNum] = new Note({
        guid:guid,
        notebookGuid:n.notebookGuid,
        title:n.title,
        updateSequenceNum:n.updateSequenceNum,
        updated:n.updated,
        content:note
      });
      if (callback)
        callback(_this._stripFormatting(note))
    }

    // actually fetch the note
    console.log('Fetching note: '+guid);
    this.noteStore.getNoteContent(
      this.authenticationToken,
      guid,
      cb,
      this._errorHandler
    );
  }

  // function to get a list of note versions
  EvernoteConnection.prototype.listNoteVersions = function(guid, callback) {
    console.log('Fetching note version list for '+guid)
    var cb = function(versions) {
      this.versionData = versions;
      var keys = [], updateTimes = [];
      for (var i = 0; i < versions.length; i++) {
        keys.push(versions[i].updateSequenceNum);
        updateTimes.push(versions[i].updated);
      }
      if (callback)
        callback(keys, updateTimes);
    }
    this.noteStore.listNoteVersions(
      this.authenticationToken,
      guid,
      cb,
      this._errorHandler
    );
  }

  // function to fetch a note version (with cache)
  EvernoteConnection.prototype.fetchNoteVersion = function(guid, version, callback) {
    var _this = this;

    // create a version cache entry for current guid if one doesn't existing
    if (this.versionCache[guid] === undefined) {
      this.versionCache[guid] = {};
    }

    // use cached version if available
    if (this.versionCache[guid][version]) {
      console.log('Using cached note version: '+guid+'['+version+']');
      var x = this.versionCache[guid][version];
      callback( this._stripFormatting(x.content), x );

    // otherwise fetch from note store
    } else {
      console.log('Fetching note version: '+guid+'['+version+']');
      this.noteStore.getNoteVersion(
        this.authenticationToken, // token
        guid,                     // guid of the note to fetch
        version,                  // version number to fetch
        false,                    // don't include resource data
        false,                    // don't include resource recognition data
        false,                    // don't include resource binary alternateData
        function (x) {
          _this.versionCache[guid][version] = x;
          if (callback) callback( _this._stripFormatting(x.content), x );
        }
      );
    }
  }

  // function to fetch a list of note versions
  EvernoteConnection.prototype.fetchNoteVersionList = function(guid, versions, callback, data, meta) {
    var _this = this;

    // initialize output lists
    if (data === undefined) data = [];
    if (meta === undefined) meta = [];

    // if done processing, run callback
    if (versions.length == 0) {
      callback(data, meta);

    // otherwise fetch current version and recurse on version list tail
    } else {
      this.fetchNoteVersion(guid, versions[0], function(x, m) {
        data = data.concat(x);
        meta = meta.concat(m);
        _this.fetchNoteVersionList(guid, versions.slice(1), callback, data, meta);
      })
    }
  }

  // return a map connecting guid's and notebooks
  EvernoteConnection.prototype._getNotebookMap = function() {
    if (this._notebookMap) return this._notebookMap;
    this._notebookMap = {};
    for (var i = 0; i < this.notebooks.length; i++) {
      this._notebookMap[ this.notebooks[i].guid ] = this.notebooks[i].name;
    }
    return this._notebookMap;
  }

  // return a list of note data
  EvernoteConnection.prototype.getNoteData = function() {
    if (this._noteData) return this._noteData;
    this._noteData = [];
    var lookup = this._getNotebookMap()
    for (var i = 0; i < this.notes.length; i++) {
      this._noteData.push({
        title : this.notes[i].title,
        notebook : lookup[ this.notes[i].notebookGuid ],
        guid : this.notes[i].guid
      })
    }
    return this._noteData;
  }

  // return the nested item
  return EvernoteConnection;
}();
