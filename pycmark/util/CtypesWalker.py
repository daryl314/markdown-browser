import ctypes
from collections import namedtuple

class CtypesWalker(object):
    State = namedtuple('State', ['pointers', 'depth', 'in_union'])

    def __init__(self, debug=False, struct=None, union=None, pointer=None):
        self.debug = debug
        self.structFn = struct if struct is not None else self.structHandler
        self.unionFn = union if union is not None else self.structHandler
        self.pointerFn = pointer if pointer is not None else self.pointerHandler

    def _recurse(self, x, state, **kwargs):
        if 'depth' not in kwargs:
            kwargs['depth'] = state.depth + 1
        return self._walk(x, state._replace(**kwargs))

    def walk(self, x, pointers=1):
        return self._walk(x, self.State(pointers=pointers, depth=0, in_union=False))

    def _walk(self, x, state):
        if x is None:
            return None
        elif isinstance(x, ctypes.Structure):
            return self.structFn(self, x, state)
        elif isinstance(x, ctypes.Union):
            return self.unionFn(self, x, state)
        elif isinstance(x, ctypes._Pointer):
            return self.pointerFn(self, x, self.pointerValue(x, state), state)
        elif isinstance(x, ctypes._CFuncPtr):
            return '{} -> {}'.format(x.argtypes, x.restype)
        elif isinstance(x, ctypes._SimpleCData):
            return x.value
        elif isinstance(x, ctypes.Array):
            return [y for y in x].__repr__()
        elif isinstance(x, int) or isinstance(x, long) or isinstance(x, float):
            return x
        elif isinstance(x, str):
            return x
        elif isinstance(x, list):
            return [self._recurse(e,state) for e in x]
        elif isinstance(x, tuple):
            return tuple([self._recurse(e,state) for e in x])
        else:
            raise RuntimeError("Unrecognized data type: {}".format(x.__class__))

    def pointerValue(self, p, state):
        if not p:
            return None
        elif not state.in_union and isinstance(p.contents, ctypes.c_char):
            return ctypes.cast(p, ctypes.c_char_p).value
        elif state.pointers > 0 and not state.in_union:
            return self._recurse(p.contents, state, pointers=state.pointers - 1)
        else:
            return p.__repr__()

    @staticmethod
    def pointerHandler(self, p, pc, state):
        if pc is None:
            return '*NULL'
        else:
            return pc

    @staticmethod
    def structHandler(self, x, state):
        out = {}
        for f,_ in x._fields_:
            if self.debug: print(' '*state.depth*4, ' -', f)
            out[f] = self._recurse(getattr(x,f), state, in_union=state.in_union or isinstance(x,ctypes.Union))
        return out

