#! /usr/bin/env python3

from http.server import BaseHTTPRequestHandler, HTTPServer
from os import curdir, sep, path
import subprocess
import http.client as httplib
import os
import json

# mime types associted with file extensions
mimeMap = {
    ".html"     : 'text/html',
    ".jpg"      : 'image/jpg',
    ".gif"      : 'image/gif',
    ".js"       : 'application/javascript',
    ".json"     : 'application/json',
    ".css"      : 'text/css',
    ".md"       : 'text/plain',
    ".ico"      : 'image/x-icon',
    ".woff"     : 'application/font-woff',
    ".woff2"    : 'application/font-woff',
    ".wasm"     : 'application/wasm',
}

# forbidden file write extensions
forbiddenExtensions = [
    'js',
    'css',
    'html'
]


###################################
## Class to handle HTTP requests ##
###################################

class S(BaseHTTPRequestHandler):

    def isProxied(self):
        """Return true if request needs to be proxied"""
        return self.path.startswith('/@proxy-http/') or self.path.startswith('/@proxy-https/')

    def _getServer(self):
        """Return the server to use for connections or requests"""
        return self.path.split('/')[2] if self.isProxied() else 'localhost'

    def _getURL(self):
        """Return the requested URL without the proxy component"""
        return '/' + '/'.join(self.path.split('/')[3:]) if self.isProxied() else self.path

    def _getConnection(self):
        """Return HTTP or HTTPS connection object as appropriate"""
        return httplib.HTTPSConnection(self._getServer()) if self.path.startswith("/@proxy-https/") else httplib.HTTPConnection(self._getServer())

    def _sendData(self, data, mimeType, gzip=False):
        """Send specified data as a response"""
        self.send_response(200)
        self.send_header('Content-Type', mimeType)
        if gzip:
            self.send_header('Content-Encoding', 'gzip')
        self.end_headers()
        self.wfile.write(data)        

    def _makeRequest(self, method, url, body=None, headers=None):
        """Make a request from another server"""
        conn = self._getConnection()
        print('  - Making proxied '+method+' to '+url+' on '+self._getServer()+' with '+conn.__class__.__name__)
        conn.request(method, url, body, headers)
        response = conn.getresponse()

        self.send_response(response.status)
        for k,v in response.getheaders():
            self.send_header(k, v)
        self.end_headers()

        self.wfile.write(response.read())

    def do_GET(self):
        """Handler for GET requests"""
        
        # strip off any query string
        self.path = self.path.split('?')[0]
        
        # default to index.html
        if self.path == '/':
            self.path = '/index.html'
        
        # remap proxied requests
        if self.isProxied():
            print('  - GET proxied: '+self._getURL())
            self.request('GET', self._getURL())
            
        # remap directory listing requests
        elif self.path.startswith('/@ls/'):
            searchString = self.path[5:]
            extension = searchString.split('*')[1]
            location = os.path.dirname(searchString) if len(os.path.dirname(searchString)) > 0 else '.'
            res = []
            for directory,subdirectories,files in os.walk(location, followlinks=True):
                res = res + [ directory+'/'+f for f in files if f.endswith(extension) ]
            self._sendData(json.dumps(res), 'application/json')

        # otherwise return a local file
        else:
            try:
                gzip = self.path.endswith('.gz')
                fileName = curdir + sep + self.path.replace('%20', ' ')
                ext = path.splitext(self.path[:-3] if gzip else self.path)[1]
                if os.path.isfile(fileName):
                    if ext in mimeMap:
                        mime = mimeMap[ext]
                    else:
                        mime = subprocess.check_output(["file", '--mime-type', fileName]).rstrip().split(b' ')[-1]
                        print('  - Detected mime type for {}: {}'.format(self.path, mime))
                    f = open(fileName, 'rb')
                    self._sendData(f.read(), mime, gzip=gzip)
                    f.close()
                elif os.path.isfile(fileName + '.gz') and ext in mimeMap:
                    f = open(fileName + '.gz', 'rb')
                    self._sendData(f.read(), mimeMap[ext], gzip=True)
                    f.close()
                else:
                    self.send_error(404,'File Not Found: %s' % fileName)
            except IOError:
                self.send_error(404,'File Not Found: %s' % self.path)

    def do_HEAD(self):
        """Handler for HEAD requests"""
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()

    def do_POST(self):
        """Handler for POST requests"""
        data_string = self.rfile.read(int(self.headers['Content-Length']))
        data_repr = repr(data_string)
        if len(data_repr) > 1000:
            data_repr = data_repr[:1000] + '...'
        print("  - POST data: " + data_repr)
        # post to URL @FILE exports to a local file
        if self._getURL().startswith('/@writer/'):
            outFile = self._getURL()[9:]
            if os.path.exists(os.path.dirname(outFile)) == False:
                if self.headers.dict.get('x-mkdir','false') == 'true':
                    os.makedirs(os.path.dirname(outFile))
                else:
                    self.send_error(403,'Output directory does not exist: %s' % os.path.dirname(outFile))
                    return
            if outFile.split('.')[-1] in forbiddenExtensions:
                self.send_error(403,'Invalid output file: %s' % outFile)
            else:
                with open(outFile, 'w') as handle:
                    handle.write(data_string)
                    print("  - Wrote to file: "+outFile)
                    self.send_response(201, message="Created file: "+outFile)
        # otherwise pass on POST request
        else:
            headers = {
                "Content-type" : self.headers['Content-type'],
                "Accept"       : self.headers['Accept']
            }
            self._makeRequest("POST", self._getURL(), data_string, headers)


##############################
## Set everything in motion ##
##############################

def run(server_class=HTTPServer, handler_class=S, port=8080):
    server_address = ('127.0.0.1', port)
    httpd = server_class(server_address, handler_class)
    print('Starting httpd on port '+str(port)+'...')
    httpd.serve_forever()

if __name__ == "__main__":
    from sys import argv

    if len(argv) == 2:
        run(port=int(argv[1]))
    else:
        run()
