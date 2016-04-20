#!/bin/sh
''''which python2 >/dev/null 2>&1 && exec python2 "$0" "$@" # '''
''''which python  >/dev/null 2>&1 && exec python  "$0" "$@" # '''
''''exec echo "Error: python2 executable not found!"        # '''
# ^^^ ensure that python2 is running

from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import SocketServer
from os import curdir, sep, path
import httplib

# mime types associted with file extensions
mimeMap = {
    ".html" : 'text/html',
    ".jpg"  : 'image/jpg',
    ".gif"  : 'image/gif',
    ".js"   : 'application/javascript',
    ".css"  : 'text/css',
    ".md"   : 'text/plain'
}

class S(BaseHTTPRequestHandler):

    def isProxied(self):
        return self.path.startswith('/proxy-http/') or self.path.startswith('/proxy-https/')

    def _getServer(self):
        return self.path.split('/')[2] if self.isProxied() else 'localhost'

    def _getURL(self):
        return '/' + '/'.join(self.path.split('/')[3:]) if self.isProxied() else self.path

    def _getConnection(self):
        return httplib.HTTPSConnection(self._getServer()) if self.path.startswith("/proxy-https/") else httplib.HTTPConnection(self._getServer())

    def _makeRequest(self, method, url, body=None, headers=None):
        print(method+' to '+url+' on '+self._getServer())
        conn = self._getConnection()
        conn.request(method, url, body, headers)
        response = conn.getresponse()

        self.send_response(response.status)
        for k,v in response.getheaders():
            self.send_header(k, v)
        self.end_headers()

        self.wfile.write(response.read())

    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()

    def do_GET(self):

        # remap proxied requests
        if self.isProxied():
            self.request('GET', self._getURL())

        else:
            try:
                ext = path.splitext(self.path)[1]
                if ext in mimeMap:
                    f = open(curdir + sep + self.path.replace('%20', ' '))
                    self.send_response(200)
                    self.send_header('Content-type',mimeMap[ext])
                    self.end_headers()
                    self.wfile.write(f.read())
                    f.close()
                return
            except IOError:
                self.send_error(404,'File Not Found: %s' % self.path)

    def do_HEAD(self):
        self._set_headers()

    def do_POST(self):
        data_string = self.rfile.read(int(self.headers['Content-Length']))
        print("POST data: " + repr(data_string))

        headers = {
            "Content-type"  : "application/x-thrift",
            "Accept"        : "application/x-thrift"}

        self._makeRequest("POST", self._getURL(), data_string, headers)

def run(server_class=HTTPServer, handler_class=S, port=8080):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print('Starting httpd on port '+str(port)+'...')
    httpd.serve_forever()

if __name__ == "__main__":
    from sys import argv

if len(argv) == 2:
    run(port=int(argv[1]))
else:
    run()
