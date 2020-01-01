////////////////////////////
// SCROLL SYNCHRONIZATION //
////////////////////////////

/** 
 * Markdown scroll synchronization handler class
 * @param cm CodeMirror Instance
 * @param $el Rendered markdown container (wrapped in JQuery)
 * @param $toc Table of contents container (wrapped in JQuery)
 * 
 * This is a class to synchronize scroll positions between markdown source in
 * CodeMirror and a rendered markdown preview window.  It can also indicate
 * the preview window scroll location in the paired table of contents.  Either
 * the CodeMirror instance or the table of contents can be undefined.
 * 
 * When the table of contents scroll sync fires, the current li is given
 * the classes 'active' and 'visible', and parent li's are given the class
 * 'visible'
*/

class ScrollSync {

  constructor(cm, $el, $toc) {

    // attach inputs
    this.cm   = cm;   // CodeMirror instance
    this.$el  = $el;  // Rendered markdown container
    this.$toc = $toc; // Synchronized table of contents

    // line number lookup array
    this.lineMap = null;

    // heading location lookup array
    this.headingLookup = null;

    // counters for number of triggered scroll actions.  this lets the scrolled
    // window know that its scrolling was triggered by a user scroll in the other
    // window.  otherwise there is a circular dependency and the windows fight with
    // each other
    this.scrollState = {
      editorCount : 0,
      viewerCount : 0
    };

    // don't generate debugging data
    this.debug = false;

    // initial state is disabled so that sync is configured on first call
    this.enabled = false;

    // initialize scroll sync data
    this.refresh();

    // set up event handlers
    this.toggle();
  }

  // toggle state on/off
  toggle() {
    let _this = this;

    // clear any previous scroll handlers
    if (this.cm) {
      this.cm.off('scroll');
    }
    this.$el.off('scroll');
   
    // disable
    if (this.enabled) {
      this.enabled = false;

    // enable
    } else {
      this.enabled = true;

      // bind to CodeMirror scroll event: scroll preview window to editor location
      if (this.cm) {
        this.cm.on('scroll',
          _.debounce(
            function(){ _this.scrollTo(_this.visibleLines().top); },
            100,
            {maxWait:100}
          )
        );
      }

      // bind to rendered markdown scroll event: scroll editor window to preview location
      this.$el.on('scroll',
        _.debounce(
          function(){ _this.scrollFrom($(this).scrollTop()); },
          100,
          {maxWait:100}
        )
      );
    }
  }

  // refresh scroll sync information
  refresh() {
    var _this = this;
    var scrollTop = this.$el.scrollTop();

    // need to show preview window to get line positions
    var isHidden = !this.$el.is(':visible');
    if (isHidden) {
      this.$el.show();
    }

    // capture line numbers
    var lineRefs = this.$el.find('[data-sourcepos]:visible');
    var x = lineRefs.map(function(){ 
        var sourceRows = $(this).attr('data-sourcepos').split('-').map(a => parseInt(a.split(':')[0]));
        return sourceRows[0];
    }).toArray();
    var y = lineRefs.map(function(){ return $(this).position().top + scrollTop }).toArray();

    // interpolate/extrapolate to create a line number lookup array
    this.lineMap = this.interpolate(x, y, 1, this.cm ? this.cm.lastLine() : null);

    // capture heading locations
    this.headingLookup = [];
    let $h = this.$el.find('h2,h3,h4,h5,h6');
    let $t = _this.$toc.find('a');
    if ($t.length != $h.length) {
      throw new Error(`Heading length mismatch: ${$h.length} != ${$t.length}`);
    }
    $h.each(function(index){
      let matchingToc = $($t[index]);
      _this.headingLookup.push([
        $(this).position().top + _this.$el.scrollTop(),
        matchingToc
      ])
    });

    // hide preview window if it was previously hidden
    if (isHidden) {
      this.$el.hide();
    }

    // confirm that line numbers are properly sorted
    // note that elements from the same source line can have top positions that are out of order
    // due to span elements from the same source line that are different heights
    for (var i = 1; i < x.length; i++) {
      if (x[i] < x[i-1]) { // line numbers are out of order
        throw new Error(`line number vector failure: x[${i}] < x[${i-1}] --> ${x[i]} < ${x[i-1]}`)
      } else if (
          y[i] < y[i-1]     // top position of elements are out of order
          && x[i] != x[i-1] // elements are from different source lines
      ) {
        throw new Error(`line number vector failure: y[${i}] < y[${i-1}] --> ${y[i]} < ${y[i-1]}`)
      }
    }

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
  interpolate(x_in, y_in, xi, xf) {
    var out = [], x_vec = x_in.slice(), y_vec = y_in.slice(), x1, x2, y1, y2, m;
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
      if (this.cm)
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
