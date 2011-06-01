// ## Client-side Javascript API wrapper for GitHub
//
// Tries to map one-to-one with the GitHub API V2, but in a Javascripty manner.

(function (globals) {

    // Before we implement the API methods, we will define all of our private
    // variables and helper functions with one `var` statement.
    var

    // The username and authentication token of the library's user.
    authToken,

    // To save keystrokes when we make JSONP calls to the HTTP API, we will keep
    // track of the root from which all V2 urls extend.
    apiRoot  = "http://github.dev/api/v2/json/",
    api3Root = "http://api.github.dev/",

    // Send a JSONP request to the Github API that calls `callback` with
    // the `context` argument as `this`.
    //
    // The `url` parameter is concatenated with the apiRoot, for the reasons
    // mentioned above. The way that we are supporting non-global, anonymous
    // functions is by sticking them in the globally exposed
    // `gh.__jsonp_callbacks` object with a "unique" `id` that is the current
    // time in milliseconds. Once the callback is called, it is deleted from the
    // object to prevent memory leaks.
    jsonp = function (url, callback, context) {
        var id = +new Date,
        script = document.createElement("script");

        while (gh.__jsonp_callbacks[id] !== undefined)
            id += Math.random(); // Avoid slight possibility of id clashes.

        gh.__jsonp_callbacks[id] = function () {
            delete gh.__jsonp_callbacks[id];
            callback.apply(context, arguments);
        };

        var prefix = "?";
        if (url.indexOf("?") >= 0)
            prefix = "&";

        url += prefix + "callback=" + encodeURIComponent("gh.__jsonp_callbacks[" + id + "]");
        if (authToken) {
            url += "&access_token=" + authToken;
        }
        script.setAttribute("src", apiRoot + url);

        document.getElementsByTagName('head')[0].appendChild(script);
    },

    // Send an HTTP POST. Unfortunately, it isn't possible to support a callback
    // with the resulting data. (Please prove me wrong if you can!)
    //
    // This is implemented with a hack to get around the cross-domain
    // restrictions on ajax calls. Basically, a form is created that will POST
    // to the GitHub API URL, stuck inside an iframe so that it won't redirect
    // this page, and then submitted.
    post = function (url, vals) {
        var
        form = document.createElement("form"),
        iframe = document.createElement("iframe"),
        doc = iframe.contentDocument !== undefined ?
            iframe.contentDocument :
            iframe.contentWindow.document,
        key, field;
        vals = vals || {};

        form.setAttribute("method", "post");
        form.setAttribute("action", apiRoot + url);
        for (key in vals) {
            if (vals.hasOwnProperty(key)) {
                field = document.createElement("input");
                field.type = "hidden";
                field.value = encodeURIComponent(vals[key]);
                form.appendChild(field);
            }
        }

        iframe.setAttribute("style", "display: none;");
        doc.body.appendChild(form);
        document.body.appendChild(iframe);
        form.submit();
    },

    // This helper function will throw a TypeError if the library user is not
    // properly authenticated. Otherwise, it silently returns.
    authRequired = function (username) {
        if (!authToken) {
            throw new TypeError("gh: Must be authenticated to do that.");
        }
    },

    // Convert an object to a url parameter string.
    //
    //     paramify({foo:1, bar:3}) -> "foo=1&bar=3".
    paramify = function (params) {
        var str = "", key;
        for (key in params) if (params.hasOwnProperty(key))
            str += key + "=" + params[key] + "&";
        return str.replace(/&$/, "");
    },

    // Get around how the GH team haven't migrated all the API to version 2, and
    // how gists use a different api root.
    withTempApiRoot = function (tempApiRoot, fn) {
        return function () {
            var oldRoot = apiRoot;
            apiRoot = tempApiRoot;
            fn.apply(this, arguments);
            apiRoot = oldRoot;
        };
    },

    withV3Api = function (fn) {
        return function () {
            var oldRoot = apiRoot;
            apiRoot = api3Root;
            fn.apply(this, arguments);
            apiRoot = oldRoot;
        };
    },

    // Expose the global `gh` variable, through which every API method is
    // accessed, but keep a local variable around so we can reference it easily.
    gh = globals.gh = {};

    // Psuedo private home for JSONP callbacks (which are required to be global
    // by the nature of JSONP, as discussed earlier).
    gh.__jsonp_callbacks = {};

    // Authenticate as a user. Does not try to validate at any point; that job
    // is up to each individual method, which calls `authRequired` as needed.
    gh.authenticate = function (token) {
        authToken = token;
        return this;
    };

    // ### Users

    // The constructor for user objects. Just creating an instance of a user
    // doesn't fetch any data from GitHub, you need to get explicit about what
    // you want to do that.
    //
    //     var huddlej = gh.user("huddlej");
    gh.user = function (username) {
        if ( !(this instanceof gh.user)) {
            return new gh.user(username);
        }
        this.username = username;
    };

    // Show basic user info; you can get more info if you are authenticated as
    // this user.
    //
    //    gh.user("fitzgen").show(function (data) {
    //        console.log(data.user);
    //    });
    gh.user.prototype.show = function (callback, context) {
        jsonp("user/show/" + this.username, callback, context);
        return this;
    };

    // Update a user's info. You must be authenticated as this user for this to
    // succeed.
    //
    //     TODO: example
    gh.user.prototype.update = function (params) {
        authRequired(this.username);
        var key, postData = {
            access_token: authToken
        };
        for (key in params) {
            if (params.hasOwnProperty(key)) {
                postData["values["+key+"]"] = encodeURIComponent(params[key]);
            }
        }
        post("user/show/" + this.username, postData);
        return this;
    };

    // Get a list of who this user is following.
    //
    //     TODO: example
    gh.user.prototype.following = function (callback, context) {
        jsonp("user/show/" + this.username + "/following", callback, context);
    };

    // Find out what other users are following this user.
    //
    //     TODO: example
    gh.user.prototype.followers = function (callback, context) {
        jsonp("user/show/" + this.username + "/followers", callback, context);
    };

    // Make this user follow some other user. You must be authenticated as this
    // user for this to succeed.
    //
    //     TODO: example
    gh.user.prototype.follow = function (user) {
        authRequired.call(this);
        post("user/follow/" + user);
        return this;
    };

    // Make this user quit following the given `user`. You must be authenticated
    // as this user to succeed.
    //
    //     TODO: example
    gh.user.prototype.unfollow = function (user) {
        authRequired.call(this);
        post("user/unfollow/" + user);
        return this;
    };

    // Get a list of repositories that this user is watching.
    //
    //     TODO: example
    gh.user.prototype.watching = function (callback, context) {
        jsonp("repos/watched/" + this.username, callback, context);
        return this;
    };

    // Get a list of this user's repositories, 30 per page
    //
    //     gh.user("fitzgen").repos(function (data) {
    //         data.repositories.forEach(function (repo) {
    //             ...
    //         });
    //     });
    gh.user.prototype.repos = function (callback, context, page) {
        gh.repo.forUser(this.username, callback, context, page);
        return this;
    };

    // Get a list of all repos for this user.
    //
    //     gh.user("fitzgen").allRepos(function (data) {
    //          alert(data.repositories.length);
    //     });
    gh.user.prototype.allRepos = function (callback, context) {
        var repos = [],
            username = this.username,
            page = 1;

        function exitCallback () {
            callback.call(context, { repositories: repos });
        }

        function pageLoop (data) {
            if (data.repositories.length == 0) {
                exitCallback();
            } else {
                repos = repos.concat(data.repositories);
                page += 1;
                gh.repo.forUser(username, pageLoop, context, page);
            }
        }

        gh.repo.forUser(username, pageLoop, context, page);

        return this;
    };

    // Make this user fork the repo that lives at
    // http://github.com/user/repo. You must be authenticated as this user for
    // this to succeed.
    //
    //     gh.user("fitzgen").forkRepo("brianleroux", "wtfjs");
    gh.user.prototype.forkRepo = function (user, repo) {
        authRequired(this.username);
        post("repos/fork/" + user + "/" + repo);
        return this;
    };

    // Get a list of all repos that this user can push to (including ones that
    // they are just a collaborator on, and do not own). Must be authenticated
    // as this user.
    gh.user.prototype.pushable = function (callback, context) {
        authRequired(authUsername);
        jsonp("repos/pushable", callback, context);
    };

    gh.user.prototype.publicGists = withTempApiRoot(
        "http://gist.github.com/api/v1/json/gists/",
        function (callback, context) {
            jsonp(this.username, callback, context);
            return this;
        }
    );

    // Search users for `query`.
    gh.user.search = function (query, callback, context) {
        jsonp("user/search/" + query, callback, context);
        return this;
    };

    // ### Repositories

    // This is the base constructor for creating repo objects. Note that this
    // won't actually hit the GitHub API until you specify what data you want,
    // or what action you wish to take via a prototype method.
    gh.repo = function (user, repo) {
        if ( !(this instanceof gh.repo)) {
            return new gh.repo(user, repo);
        }
        this.repo = repo;
        this.user = user;
    };

    // Get basic information on this repo.
    //
    //     gh.repo("schacon", "grit").show(function (data) {
    //         console.log(data.repository.description);
    //     });
    gh.repo.prototype.show = function (callback, context) {
        jsonp("repos/show/" + this.user + "/" + this.repo, callback, context);
        return this;
    };

    // Update the information for this repo. Must be authenticated as the
    // repository owner. Params can include:
    //
    //   * description
    //   * homepage
    //   * has_wiki
    //   * has_issues
    //   * has_downloads
    gh.repo.prototype.update = function (params) {
        authRequired(this.user);
        var key, postData = {
            access_token: authToken
        };
        for (key in params) {
            if (params.hasOwnProperty(key)) {
                postData["values["+key+"]"] = encodeURIComponent(params[key]);
            }
        }
        post("repos/show/" + this.user + "/" + this.repo, postData);
        return this;
    };

    // Get all tags for this repo.
    gh.repo.prototype.tags = function (callback, context) {
        jsonp("repos/show/" + this.user + "/" + this.repo + "/tags",
              callback,
              context);
        return this;
    };

    // Gather line count information on the language(s) used in this repo.
    gh.repo.prototype.languages = function (callback, context) {
        jsonp("/repos/show/" + this.user + "/" + this.repo + "/languages",
              callback,
              context);
        return this;
    };

    // Gather data on all the forks of this repo.
    gh.repo.prototype.network = function (callback, context) {
        jsonp("repos/show/" + this.user + "/" + this.repo + "/network",
              callback,
              context);
        return this;
    };

    // All users who have contributed to this repo. Pass `true` to showAnon if you
    // want to see the non-github contributors.
    gh.repo.prototype.contributors = function (callback, context, showAnon) {
        var url = "repos/show/" + this.user + "/" + this.repo + "/contributors";
        if (showAnon)
            url += "/anon";
        jsonp(url,
              callback,
              context);
        return this;
    };

    // Get all of the collaborators for this repo.
    gh.repo.prototype.collaborators = function (callback, context) {
        jsonp("repos/show/" + this.user + "/" + this.repo + "/collaborators",
              callback,
              context);
        return this;
    };

    // Add a collaborator to this project. Must be authenticated.
    gh.repo.prototype.addCollaborator = function (collaborator) {
        authRequired(this.user);
        post("repos/collaborators/" + this.repo + "/add/" + collaborator);
        return this;
    };

    // Remove a collaborator from this project. Must be authenticated.
    gh.repo.prototype.removeCollaborator = function (collaborator) {
        authRequired(this.user);
        post("repos/collaborators/" + this.repo + "/remove/" + collaborator);
        return this;
    };

    // Make this repository private. Authentication required.
    gh.repo.prototype.setPrivate = function () {
        authRequired(this.user);
        post("repo/set/private/" + this.repo);
        return this;
    };

    // Make this repository public. Authentication required.
    gh.repo.prototype.setPublic = function () {
        authRequired(this.user);
        post("repo/set/public/" + this.repo);
        return this;
    };

    // Search for repositories. `opts` may include `start_page` or `language`,
    // which must be capitalized.
    gh.repo.search = function (query, opts, callback, context) {
        var url = "repos/search/" + query.replace(" ", "+");
        if (typeof opts === "function") {
            opts = {};
            callback = arguments[1];
            context = arguments[2];
        }
        url += "?" + paramify(opts);
        return this;
    };

    // Get all the repos that are owned by `user`.
    gh.repo.forUser = function (user, callback, context, page) {
        if (!page)
          page = 1;

        jsonp("repos/show/" + user + '?page=' + page, callback, context);
        return this;
    };

    // Create a repository. Must be authenticated.
    gh.repo.create = function (name, opts) {
        authRequired(authUsername);
        opts.name = name;
        post("repos/create", opts);
        return this;
    };

    // Delete a repository. Must be authenticated.
    gh.repo.del = function (name) {
        authRequired(authUsername);
        post("repos/delete/" + name);
        return this;
    };

    gh.repo.prototype.commit = function (sha) {
        return gh.commit(this.user, this.repo, sha)
    };

    gh.repo.prototype.tree = function (sha) {
        return gh.tree(this.user, this.repo, sha)
    };


    gh.repo.prototype.branches = withV3Api(function (callback, context) {
        jsonp("repos/" + this.user + "/" + this.repo + "/git/refs/heads", callback, context);
        return this;
    });

    // ### Commits

    gh.commit = function (user, repo, sha) {
        if ( !(this instanceof gh.commit) )
            return new gh.commit(user, repo, sha);
        this.user = user;
        this.repo = repo;
        this.sha = sha;
    };

    gh.commit.prototype.show = withV3Api(function (callback, context) {
        jsonp("repos/" + this.user + "/" + this.repo + "/git/commits/" + this.sha, 
          callback, context);
        return this;
    });

    gh.commit.prototype.list = withV3Api(function (callback, context) {
        jsonp("repos/" + this.user + "/" + this.repo + "/git/commits?start=" + this.sha, 
          callback, context);
        return this;
    });

    // ### Trees

    gh.tree = function (user, repo, sha) {
        if ( !(this instanceof gh.tree) )
            return new gh.tree(user, repo, sha);
        this.user = user;
        this.repo = repo;
        this.sha = sha;
    };

    gh.tree.prototype.show = withV3Api(function (callback, context) {
        jsonp("repos/" + this.user + "/" + this.repo + "/git/trees/" + this.sha, 
          callback, context);
        return this;
    });


    // ### Pull Requests

    gh.pulls = function(user, repo) {
        if (!(this instanceof gh.pulls)) {
            return new gh.pulls(user, repo);
        }
        this.user = user;
        this.repo = repo;
    };

    // Get all pull requests for the repo
    //
    //     gh.pulls("fitzgen", "github-api").allPulls(function (data) {
    //         data.pulls.forEach(function (pull) {
    //             console.log("Title: " + pull.title);
    //         });
    //     });
    gh.pulls.prototype.allPulls = function (callback, context) {
        jsonp("pulls/" + this.user + "/" + this.repo, callback, context);
        return this;
    };

    // Get pull requests filtered by state. `state` can be "open" or "closed".
    //
    //     gh.pulls("fitzgen", "github-api").forState("closed", function (data) {
    //         data.pulls.forEach(function (pull) {
    //             console.log("Title: " + pull.title + " State: " + pull.state);
    //         });
    //     });
    gh.pulls.prototype.forState = function (state, callback, context) {
        jsonp("pulls/" + this.user + "/" + this.repo + "/" + state, callback, context);
        return this;
    };

    // Get pull requests by number
    //
    // Important: This call returns a single object called "pull" instead of multiple "pulls" objects!
    //
    //     gh.pulls("fitzgen", "github-api").forNumber("1", function (data) {
    //         console.log("Title: " + data.pull.title + " Number: " + data.pull.number);
    //     });
    gh.pulls.prototype.forNumber = function (number, callback, context) {
        jsonp("pulls/" + this.user + "/" + this.repo + "/" + number, callback, context);
        return this;
    };

    //TODO: Creating a Pull Request


}(window));
