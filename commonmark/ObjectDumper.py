import ctypes

def toObject(x, pointers=1):
    if x is None:
        return None
    elif isinstance(x, ctypes.Structure) or isinstance(x, ctypes.Union):
        return dict([(f,toObject(getattr(x,f),pointers=pointers)) for f,_ in x._fields_])
    elif isinstance(x, ctypes._Pointer):
        if not x:
            return '*NULL'
        elif isinstance(x.contents, ctypes.c_char):
            return ctypes.cast(x, ctypes.c_char_p).value
        elif pointers > 0:
            return toObject(x.contents, pointers=pointers-1)
        else:
            return x.__repr__()
    elif isinstance(x, ctypes._CFuncPtr):
        return '{} -> {}'.format(x.argtypes, x.restype)
    elif isinstance(x, ctypes._SimpleCData):
        return x.value
    elif isinstance(x,int) or isinstance(x,long) or isinstance(x,float):
        return x
    elif isinstance(x,str):
        return x
    elif isinstance(x,list):
        return [toObject(e,pointers=pointers) for e in x]
    elif isinstance(x,tuple):
        return tuple([toObject(e,pointers=pointers) for e in x])
    else:
        raise RuntimeError("Unrecognized data type: {}".format(x.__class__))