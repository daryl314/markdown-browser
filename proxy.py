#!/usr/bin/env python2

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
    ".css"  : 'text/css'
}

class S(BaseHTTPRequestHandler):

    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()

    def do_GET(self):

        # remap root request to evernote.html
        if self.path=="/":
            self.path="/evernote.html"

        try:
            ext = path.splitext(self.path)[1]
            if ext in mimeMap:
                f = open(curdir + sep + self.path)
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
        print "POST data: " + repr(data_string)

        headers = {
            "Content-type"  : "application/x-thrift",
            "Accept"        : "application/x-thrift"}
        conn = httplib.HTTPSConnection("www.evernote.com")
        conn.request("POST", "/shard/s2/notestore", data_string, headers)
        response = conn.getresponse()

        self.send_response(response.status)
        for k,v in response.getheaders():
            self.send_header(k, v)
        self.end_headers()

        self.wfile.write(response.read())
        return

def run(server_class=HTTPServer, handler_class=S, port=8080):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print 'Starting httpd on port '+str(port)+'...'
    httpd.serve_forever()

if __name__ == "__main__":
    from sys import argv

if len(argv) == 2:
    run(port=int(argv[1]))
else:
    run()
