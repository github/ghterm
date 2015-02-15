**NOTE: This repository is no longer supported or updated by GitHub. If you wish to continue to develop this code yourself, we recommend you fork it.**

# GitHub Terminal

This is an example application written to demonstrate what is possible with the new GitHub [Git Data API][api] and GitHub OAuth2 services. This app allows you to login as your GitHub user and edit and commit groups of files through a virtual terminal.  With this you could contribute meaningfully to a project using just Javascript in the browser - no Git or editor needs to be installed locally.

[api]: http://developer.github.com/v3/git/

# Features

Currently, you can:

* List all the projects you have read and write access to.
* `cd` into any project and branch and `ls` as if it were a directory.
* Edit any file in a project you have write access to.
* Commit your edited files directly to your GitHub branch.
* View status of changed files with `status` and unstage them with `unstage` command.
* View the commit log of any branch with `log` command.

# Screenshots

![list projects](https://img.skitch.com/20110615-1i4r8dub96267e7fdswhuqcerx.png)

Here we can see a listing of my projects, in this case with a filter on the string 'git-'. Private repositories are listed in orange.

![list tree](https://img.skitch.com/20110615-rq4ccy7gg49nrm25rp2j1swkdg.png)

You can `cd` into a project and a branch, then an `ls` will show you the project tree.

# Libraries Used

* Ace JS Editor (http://ace.ajax.org/)
* Termlib (http://www.masswerk.at/termlib/)
* GitHub-API JS Library (https://github.com/fitzgen/github-api) (hacked to death)

# Contributing

If you want to fix or change something, please fork on GitHub, push your change to a branch named after your change and send me a pull request.

Some ideas of things to do are in the TODO file.

# License

MIT, see LICENCE file

