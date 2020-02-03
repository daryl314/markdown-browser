//////////////////////////////
// SELF-REPORTING CONTAINER //
//////////////////////////////

/**
 * Class representing a typed Object with self-reporting behavior
 */
class ObjectContainer {
  /**
   * Instantiate an ObjectContainer
   * @param {string} name - Type name of object
   * @param {Object} [data={}] - (Optional) initial data
   */
  constructor(name, data={}) {
    this.__name__ = name;
    Object.keys(data).forEach(key => {
      this[key] = data[key];
    })
  }

  /**
   * Convert to YAML representation
   * @param {number} [indent=4] - (Optional) number of spaces to indent
   * @return {string} YAML string representation of object
   */
  toYAML(indent=4) {
    return this._toYAML(indent).join('\n')    
  }

  /**
   * Helper function for YAML generation
   * @private
   * @param {number} indent - indentation level
   */
  _toYAML(indent) {
    let attr   = [];  // list of primitive properties
    let nested = [];  // list of nested list or object properties

    // iterate over keys and values in properties
    Object.keys(this).forEach(k => {
      let v = this[k];

      // process a nested object and add to nested list
      if (v instanceof ObjectContainer) {
        let data = v._toYAML(indent);
        nested = nested.concat([k+':'].concat(data.map(x => ' '.repeat(indent) + x)));
      
      // process a nested array and add to nested list
      } else if (v instanceof ArrayContainer) {
        let data = v._toYAML(indent, false);
        nested = nested.concat([k+':'].concat(data.map(x => ' '.repeat(indent) + x)));
      } else if (v instanceof TypedArrayContainer) {
        let data = v._toYAML(indent, false);
        nested = nested.concat([k+': !'+v[0]].concat(data.map(x => ' '.repeat(indent) + x)));

      // process a primitive and add to attr list.  skip object type name.
      } else if (k !== '__name__') {
        attr.push(`${k}: ${JSON.stringify(v)}`);
      }
    });

    // return YAML.  flatten into single line if there are no nested items
    if (nested.length == 0) {
      return [`!${this.__name__} { ${attr.join(', ')} }`]
    } else {
      return ['!'+this.__name__].concat(attr).concat(nested);
    }
  }
}

/**
 * Class representing a typed Array with self-reporting behavior
 */
class TypedArrayContainer extends Array {
  /**
   * Instantiate a TypedArrayContainer
   * @param {string} name - Type name of array
   */
  constructor(name) {
    super();
    this.push(name);
  }

  /**
   * Convert to YAML representation
   * @param {number} [indent=4] - (Optional) number of spaces to indent
   */
  toYAML(indent=4) {
    return this._toYAML(indent).join('\n')
  }

  /**
   * Helper function for YAML generation
   * @private
   * @param {number} indent - number of spaces to indent
   * @param {*} withType - include array type in output?
   */
  _toYAML(indent, withType=true) {

    // initialize output array with type if requested
    let out = withType ? ['!'+this[0]] : [];

    // process non-type entries
    this.slice(1).forEach(x => {
      if (x instanceof ObjectContainer || x instanceof ArrayContainer) {
        let data = x._toYAML(indent);
        out = out.concat([`- ${data[0]}`].concat(data.slice(1).map(x => ' '.repeat(indent) + x)));
      } else {
        out.push(`- ${JSON.stringify(x)}`);
      }
    });

    // return list of processed entries
    return out
  }
}

/**
 * Class representing an untyped Array with self-reporting behavior
 */
class ArrayContainer extends Array {
  /**
   * Instantiate an ArrayContainer
   * @param {string} name - Type name of array
   */
  constructor() {
    super();
  }

  /**
   * Convert to YAML representation
   * @param {number} [indent=4] - (Optional) number of spaces to indent
   */
  toYAML(indent=4) {
    return this._toYAML(indent).join('\n')
  }

  /**
   * Helper function for YAML generation
   * @private
   * @param {number} indent - number of spaces to indent
   */
  _toYAML(indent) {

    // initialize output array
    let out = [];

    // process non-type entries
    this.forEach(x => {
      if (x instanceof ObjectContainer || x instanceof ArrayContainer) {
        let data = x._toYAML(indent);
        out = out.concat([`- ${data[0]}`].concat(data.slice(1).map(x => ' '.repeat(indent) + x)));
      } else {
        out.push(`- ${JSON.stringify(x)}`);
      }
    });

    // return list of processed entries
    return out
  }
}
