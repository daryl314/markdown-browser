# Markdown Editor Instructions #

[toc]

## Editor Usage ##

- Start proxy server by running `./proxy.py`
- Open editor with Evernote back-end by browsing to <http://localhost:8080/>.
- Open editor with local markdown file by browsing to <http://localhost:8080/?instructions.md>.
  Specify root directory with <http://localhost:8080/?mode=file&file=instructions.md&location=.>
- Open editor with offline connection with <http://localhost:8080/?mode=offline&location=syncData>
- Open synchronizer status report with <http://localhost:8080/?mode=syncReport&location=syncData>
- Open validation report by browsing to <http://localhost:8080/validation/validate.html>

## Markdown Syntax ##

### Lists: ###

```NoLanguage
Ordered list:
1. Item 1
2. Item 2
  1. Item 2.1

Unordered list (3 possible bullets):
* Item 1
+ Item 2
  - Item 2.1

    Paragraph text that is
    included in the list item
    (double newline to clear)
```

### Block text: ###

Note that code blocks are 3+ backtick or tilde characters.  To nest, use more
fence characters in the outer block.

````NoLanguage
 > This is a block
 > quote

```Language
for (var i = 0; i < 10; i++) {
  // this is a block of code
}
```

    # lines indented by 4+ spaces are also
    # treated as blocks of code

````

### Headings: ###

```NoLanguage
This is a horizontal rule (can use -, *, or _)
---

This is an H1
=============

This is an H2
-------------

## This is also an H2 ##

### This is an H3 (closing hashes optional)
```

### Tables: ###

Leading and trailing pipes are optional

```NoLanguage
| Heading 1 | Centered Column | Right Column |
|-----------|:---------------:|-------------:|
| Cell 1.1  | Cell 1.2        | Cell 1.3     |
| Cell 2.1  | Cell 2.2        | Cell 2.3     |
```

### Links and Images ###

```NoLanguage
Inline links:
[Inline link](https://www.google.com)
[Inline link with title](https://www.google.com "Google.com")
![alt text](/icon.png "Icon image title text")

Reference-style links:
[Reference link][1]
[Image link][logo]

Reference link definitions:
[1]: www.google.com
[logo]: /icon.png
```

### Inline styles ###

Escape characters with a backspace.

```NoLanguage
* Inline <b>html</b>
* Inline __bold__ or **bold**
* Inline _italics_ or *italics*
* Inline ~~strikethrough~~
* Inline <https://google.com> autolink
* Inline `code`
```

## Markdown Extensions ##

```NoLanguage
* \\( INLINE LATEX \\)
* $$ BLOCK LATEX $$
```
