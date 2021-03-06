from collections import namedtuple
import sys
import json
import base64
import keyword

# running python 3?
PY3 = sys.version_info[0] == 3

# allowed primitives
if not PY3:
    PRIMITIVES = {str, unicode, int, long, float, bool}
else:
    PRIMITIVES = {bytes, str, int, float, bool}

# prefix for JSON serialization
JSON_PREFIX = '{"TypedTree": '

class TypedTree(object):
    """
    TypedTree is an extension of collections.namedtuple that enforces immutability

    Members must be one of:
        - another TypedTree
        - a primitive (string, bytes, boolean, number)
        - a tuple of acceptable members
    """
    _constructors = {}

    class TT(object):

        def __repr__(self):
            return self._repr(self)

        def __eq__(self, other):
            return isinstance(other, TypedTree.TT) \
                   and self._fields == other._fields \
                   and all([a == b for a, b in zip(self, other)])

        def _toobject(self):
            """Convert to an object representation that can be serialized/deserialized"""
            def convert(x):
                if isinstance(x, TypedTree.TT):
                    return {
                        't': x._tag,
                        'k': convert(tuple(x._fields)),
                        'v': convert(tuple(x)),
                        'b': [k for k, v in zip(x._fields, x) if isinstance(v, bytes)]
                    }
                elif isinstance(x, tuple):
                    return [convert(el) for el in x]
                elif isinstance(x, bytes):
                    return base64.b64encode(x)
                else:
                    return x
            return convert(self)

        def _tojson(self, **kwargs):
            return JSON_PREFIX + json.dumps(self._toobject(), **kwargs) + '}'

        @classmethod
        def _repr(T, x, i=1, ts=4):
            if isinstance(x, TypedTree.TT):
                if all([TypedTree._isPrimitive(e) or (isinstance(e,tuple) and len(e) == 0) for e in x]):
                    return x._tag + '(' + ', '.join(['{}={}'.format(k,v.__repr__()) for k,v in zip(x._fields,x)]) + ')'
                elif len(x._fields) == 1:
                    return '{}({}={})'.format(x._tag, x._fields[0], T._repr(x[0],i=i,ts=ts))
                else:
                    inner = [' '*ts*i + k + '=' + T._repr(v,i=i+1,ts=ts) for k,v in zip(x._fields,x)]
                    return x._tag + '(\n' + ',\n'.join(inner) + ')'
            elif isinstance(x, tuple):
                return '(' + ','.join(['\n' + ' '*ts*i + T._repr(e, i=i+1, ts=ts) for e in x]) + ')'
            else:
                assert TypedTree._isPrimitive(x)
                return x.__repr__()

    @classmethod
    def _fromjson(cls, x):
        def fromObject(o):
            type_name = str(o['t'])  # TypedTree type name as a string
            entries = {}
            for k, v in zip(o['k'], o['v']):
                if k in o['b']:
                    v = base64.b64decode(v)
                entries[str(k)] = v
            return cls.Build(type_name, **entries)
        if cls._isSeralizedData(x):
            return json.loads(x[len(JSON_PREFIX):-1], object_hook=fromObject)
        else:
            raise ValueError("Not a serialized TypedTree!")

    @classmethod
    def _convertArg(T, a):
        if T._isPrimitive(a) or isinstance(a, T.TT):
            return a
        elif hasattr(a, '__iter__'):
            return tuple([T._convertArg(x) for x in a])
        else:
            raise RuntimeError("Invalid value type: {}".format(a))

    @staticmethod
    def _isSeralizedData(x):
        return x.startswith(JSON_PREFIX) and x.endswith('}')

    @staticmethod
    def _isPrimitive(x):
        return x is None or any([isinstance(x,t) for t in PRIMITIVES])

    @staticmethod
    def _sanitize(x, encoding='utf-8'):
        if isinstance(x, bytes) and not isinstance(x, str):
            x = x.decode(encoding)
        if keyword.iskeyword(x) or x == 'None':
            return x + '_'
        else:
            return x

    @classmethod
    def GenerateConstructor(T, tag, keys):
        key = (tag, tuple(keys))
        if key not in T._constructors:
            class Inner(namedtuple(tag, keys)):
                def __new__(self, **kwargs):  # modifying behavior of an immutable class so need a __new__ method
                    if not isinstance(tag, str):
                        raise ValueError("TypedTree type name not a string: {}".format(tag))
                    self._tag = tag
                    return super(Inner,self).__new__(self, **dict([(k,T._convertArg(v)) for k,v in kwargs.items()]))
            T._constructors[key] = type(tag, (T.TT,Inner), {})  # type name, super-types, namespace dictionary
        return T._constructors[key]

    @classmethod
    def Build(Class, tag, **kwargs):
        args = dict([(Class._sanitize(k),v) for k,v in kwargs.items()])
        return Class.GenerateConstructor(Class._sanitize(tag), sorted(args.keys()))(**args)