var md_test = "[source of this content](https://raw.githubusercontent.com/divtxt/gfm-test/master/README.md)\n\
\n\
This is a test paragraph with some **bold** text, some _italic_ text, some **bold and _italic_ text**, some words_with_underlines, and some\n\
\\\\(inline latex\\\\).\n\
\n\
```\n\
here is some code\n\
    with space indented text\n\
```\n\
## Latex Test ##\n\
\n\
```\n\
This is some code with apparent *bold* text\n\
and another line...\n\
```\n\
\n\
$$\n\
\\vec{x_1} +\n\
\\vec{x_2}\n\
$$\n\
\n\
Or within a line: $$\\vec{x_3}$$ ...\n\
\n\
This is a paragraph with a <a href='test'>Test</a> hyperlink embedded in it\n\
and some \\\\(\\vec{latex}\\\\) embedded in it\n\
\n\
Or a paragraph with the\n\
<a href='test'>Test</a>\n\
Hyperlink on a separate line\n\
\n\
* This is a **bold** entry\n\
* in a list\n\
\n\
";

// github flavored markdown test text
// https://raw.githubusercontent.com/divtxt/gfm-test/master/README.md

var gfm_test = "\n\
\n\
GitHub Flavored Markdown\n\
================================\n\
\n\
*View the [source of this content](https://raw.githubusercontent.com/divtxt/gfm-test/master/README.md).*\n\
\n\
Let's get the whole \"linebreak\" thing out of the way. The next paragraph contains two phrases separated by a single newline character:\n\
\n\
Roses are red\n\
Violets are blue\n\
\n\
--------\n\
\n\
Local image with title: ![Remote image](pages.jpg)\n\
\n\
--------\n\
\n\
The next paragraph has the same phrases, but now they are separated by two spaces and a newline character:\n\
\n\
Roses are red\n\
Violets are blue\n\
\n\
Oh, and one thing I cannot stand is the mangling of words with multiple underscores in them like perform_complicated_task or do_this_and_do_that_and_another_thing.\n\
\n\
A bit of the GitHub spice\n\
-------------------------\n\
\n\
In addition to the changes in the previous section, certain references are auto-linked:\n\
\n\
* SHA: be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2\n\
* User@SHA ref: mojombo@be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2\n\
* User/Project@SHA: mojombo/god@be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2\n\
* \#Num: #1\n\
* User/#Num: mojombo#1\n\
* User/Project#Num: mojombo/god#1\n\
\n\
These are dangerous goodies though, and we need to make sure email addresses don't get mangled:\n\
\n\
My email addy is tom@github.com.\n\
\n\
Math is hard, let's go shopping\n\
-------------------------------\n\
\n\
In first grade I learned that 5 > 3 and 2 < 7. Maybe some arrows. 1 -> 2 -> 3. 9 <- 8 <- 7.\n\
\n\
Triangles man! a^2 + b^2 = c^2\n\
\n\
We all like making lists\n\
------------------------\n\
\n\
The above header should be an H2 tag. Now, for a list of fruits:\n\
\n\
* Red Apples\n\
* Purple Grapes\n\
* Green Kiwifruits\n\
\n\
Let's get crazy:\n\
\n\
1.  This is a list item with two paragraphs. Lorem ipsum dolor\n\
    sit amet, consectetuer adipiscing elit. Aliquam hendrerit\n\
    mi posuere lectus.\n\
\n\
    Vestibulum enim wisi, viverra nec, fringilla in, laoreet\n\
    vitae, risus. Donec sit amet nisl. Aliquam semper ipsum\n\
    sit amet velit.\n\
\n\
2.  Suspendisse id sem consectetuer libero luctus adipiscing.\n\
\n\
What about some code **in** a list? That's insane, right?\n\
\n\
1. In Ruby you can map like this:\n\
\n\
        ['a', 'b'].map { |x| x.uppercase }\n\
\n\
2. In Rails, you can do a shortcut:\n\
\n\
        ['a', 'b'].map(&:uppercase)\n\
\n\
Some people seem to like definition lists\n\
\n\
<dl>\n\
  <dt>Lower cost</dt>\n\
  <dd>The new version of this product costs significantly less than the previous one!</dd>\n\
  <dt>Easier to use</dt>\n\
  <dd>We've changed the product so that it's much easier to use!</dd>\n\
</dl>\n\
\n\
I am a robot\n\
------------\n\
\n\
Maybe you want to print `robot` to the console 1000 times. Why not?\n\
\n\
    def robot_invasion\n\
      puts(\"robot \" * 1000)\n\
    end\n\
\n\
You see, that was formatted as code because it's been indented by four spaces.\n\
\n\
How about we throw some angle braces and ampersands in there?\n\
\n\
    <div class=\"footer\">\n\
        &copy; 2004 Foo Corporation\n\
    </div>\n\
\n\
Set in stone\n\
------------\n\
\n\
Preformatted blocks are useful for ASCII art:\n\
\n\
<pre>\n\
             ,-.\n\
    ,     ,-.   ,-.\n\
   / \   (   )-(   )\n\
   \ |  ,.>-(   )-<\n\
    \|,' (   )-(   )\n\
     Y ___`-'   `-'\n\
     |/__/   `-'\n\
     |\n\
     |\n\
     |    -hrr-\n\
  ___|_____________\n\
</pre>\n\
\n\
Playing the blame game\n\
----------------------\n\
\n\
If you need to blame someone, the best way to do so is by quoting them:\n\
\n\
> I, at any rate, am convinced that He does not throw dice.\n\
\n\
Or perhaps someone a little less eloquent:\n\
\n\
> I wish you'd have given me this written question ahead of time so I\n\
> could plan for it... I'm sure something will pop into my head here in\n\
> the midst of this press conference, with all the pressure of trying to\n\
> come up with answer, but it hadn't yet...\n\
>\n\
> I don't want to sound like\n\
> I have made no mistakes. I'm confident I have. I just haven't - you\n\
> just put me under the spot here, and maybe I'm not as quick on my feet\n\
> as I should be in coming up with one.\n\
\n\
Table for two\n\
-------------\n\
\n\
<table>\n\
  <tr>\n\
    <th>ID</th><th>Name</th><th>Rank</th>\n\
  </tr>\n\
  <tr>\n\
    <td>1</td><td>Tom Preston-Werner</td><td>Awesome</td>\n\
  </tr>\n\
  <tr>\n\
    <td>2</td><td>Albert Einstein</td><td>Nearly as awesome</td>\n\
  </tr>\n\
</table>\n\
\n\
Crazy linking action\n\
--------------------\n\
\n\
I get 10 times more traffic from [Google] [1] than from\n\
[Yahoo] [2] or [MSN] [3].\n\
\n\
  [1]: http://google.com/        \"Google\"\n\
  [2]: http://search.yahoo.com/  \"Yahoo Search\"\n\
  [3]: http://search.msn.com/    \"MSN Search\"\n\
\n\
\n\
GFM Tests\n\
---------\n\
\n\
Multiple underscores in words:\n\
wow_great_stuff\n\
do_this_and_do_that_and_another_thing.\n\
\n\
\n\
URL autolinking: http://example.com\n\
\n\
\n\
Strikethrough: ~~Mistaken text.~~\n\
\n\
\n\
Fenced code blocks:\n\
\n\
```\n\
function test() {\n\
  console.log(\"notice the blank line before this function?\");\n\
}\n\
```\n\
\n\
\n\
Syntax highlighting:\n\
\n\
```ruby\n\
require 'redcarpet'\n\
markdown = Redcarpet.new(\"Hello World!\")\n\
puts markdown.to_html\n\
```\n\
\n\
\n\
Tables:\n\
\n\
You can create tables by assembling a list of words and dividing them with hyphens - (for the first row), and then separating each column with a pipe `|`:\n\
\n\
First Header  | Second Header\n\
------------- | -------------\n\
Content Cell  | Content Cell\n\
Content Cell  | Content Cell\n\
\n\
For aesthetic purposes, you can also add extra pipes on the ends:\n\
\n\
| First Header  | Second Header |\n\
| ------------- | ------------- |\n\
| Content Cell  | Content Cell  |\n\
| Content Cell  | Content Cell  |\n\
\n\
Note that the dashes at the top don't need to match the length of the header text exactly:\n\
\n\
| Name | Description          |\n\
| ------------- | ----------- |\n\
| Help      | Display the help window.|\n\
| Close     | Closes a window     |\n\
\n\
You can also include inline Markdown such as links, bold, italics, or strikethrough:\n\
\n\
| Name | Description          |\n\
| ------------- | ----------- |\n\
| Help      | ~~Display the~~ help window.|\n\
| Close     | _Closes_ a window     |\n\
\n\
Finally, by including colons : within the header row, you can define text to be left-aligned, right-aligned, or center-aligned:\n\
\n\
| Left-Aligned  | Center Aligned  | Right Aligned |\n\
| :------------ |:---------------:| -----:|\n\
| col 3 is      | some wordy text | $1600 |\n\
| col 2 is      | centered        |   $12 |\n\
| zebra stripes | are neat        |    $1 |\n\
\n\
A colon on the left-most side indicates a left-aligned column; a colon on the right-most side indicates a right-aligned column; a colon on both sides indicates a center-aligned column.\n\
";
