# dreamwidth-js

The repo includes a simple xmlrpc client for dreamwidth.org + a
Google+ posts importer.

## Installation

(Node 6.9.x)

~~~
# npm -g i json dreamwidth-js
~~~

## How to post

### Auth

You need to add to `~/.netrc` an entry for dreamwidth.org, e.g.:

~~~
machine dreamwidth.org
  login john_doe
  password a6efa2902a81b8218a8d8fa59eb60229
~~~

where the password field is an md5 hashed string; you may get it from

~~~
$ printf a-very-strong-password | md5sum
a6efa2902a81b8218a8d8fa59eb60229  -
~~~

(**2020/05/01 update**: DW tries to 'modernise' its API. Today you
need to [generate](https://www.dreamwidth.org/manage/emailpost) an
"API key" first & md5 that key instead of your real password.)

To test the correctness of the entry, run:

~~~
$ dreamwidth-js login-test
{ friendgroups: [],
  usejournals: [],
  fullname: 'john_doe',
  userid: 123456789 }
~~~

### Posting raw HTML

~~~
$ dreamwidth-js help entry-post

  Usage: dreamwidth-js-entry-post [options] < file.html

  Options:

    -h, --help              output usage information
    -s, --subject <string>  entry title
    -d, --date <string>     YYYY-MM-DD HH:MM
    -t, --tags <string>     tags separated by commas
    --backdated             don't show up on people's friends lists
    --security <string>     private, friends, public
~~~

The util expects a raw html from the stdin. You may write your post in
markdown & feed the obtained html to the util:

~~~
$ kramdown readme.md | dreamwidth-js entry-post -s test
{ url: 'https://john_doe.dreamwidth.org/44474.html',
  itemid: 173,
  anum: 186 }
~~~

By default the post will be visible only to you; to make it public,
pass `--security public` option.

### Posting markdown

`entry-post-md` subcommand that expects github-compatible markdown w/
a valid front-matter:

~~~
$ dreamwidth-js entry-post-md
---
subject: On today's proceedings
tags: meeting, an exciting waste of time
security: public
---

## Agenda for Mon. budget meeting

It was a dark and stormy night; the rain fell in torrents
^D
{ anum: 194,
  url: 'https://john_doe.dreamwidth.org/363970.html',
  itemid: 1421 }
~~~

where each key in the YAML corresponds to an cmd arg of `entry-post`
(that `entry-post-md` invokes under the hood).


## Uploading an image

At the time of writing DW has an experimental file uploader w/ a
DOM-only interface. We can obtain a session cookie via xmlrpc & make a
POST request w/ a `multipart/form-data` payload & the aforementioned
cookie.

~~~
$ dreamwidth-js img-upload -u < cat.jpg
https://john_doe.dreamwidth.org/file/7623.jpg
~~~

(It uses file(1) for guessing the proper mime type.)

The session cookie is valid for 24 hours & will be updated
automatically when needed. It's stored at
`$XDG_CACHE_HOME/dreamwidth-js/session`.


## Google+ posts importer

G+ has a 'takeout' feature: it gives you a .tgz file w/ all your
posts. When you do this, make sure you've selected 'json' format.

~~~
$ ls -l
-rw-r--r-- 1 alex users 1009878 Jan 14 23:40 takeout-20170114T213645Z.tgz

$ mkdir 1 && cd 1
$ make -f `npm -g root`/dreamwidth-js/google-plus2html.mk TAR=../takeout-20170114T213645Z.tgz SECURITY=public
~~~

If you have a lot of posts, you may press Ctrl-C any time, the
makefile won't re-upload the same post twice (unless you delete
`Takeout` dir).


## FAQ

* Q: Will this also work w/ LiveJournal?

	I've no idea. Btw, you shouldn't use LiveJournal, for it's
	effectually a KGB-controlled company.


## License

MIT.
