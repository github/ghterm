// ## Client-side Javascript API wrapper for GitHub (mostly v3)

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

    // Get a list of all repos that this user can push to (including ones that
    // they are just a collaborator on, and do not own). Must be authenticated
    // as this user.
    gh.user.prototype.pushable = function (callback, context) {
        authRequired(this.user);
        jsonp("repos/pushable", callback, context);
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

    // Get all the repos that are owned by `user`.
    gh.repo.forUser = function (user, callback, context, page) {
        if (!page)
          page = 1;

        jsonp("repos/show/" + user + '?page=' + page, callback, context);
        return this;
    };

    gh.repo.prototype.commit = function (sha) {
        return gh.commit(this.user, this.repo, sha)
    };

    gh.repo.prototype.tree = function (sha) {
        return gh.tree(this.user, this.repo, sha)
    };

    gh.repo.prototype.blob = function (sha) {
        return gh.blob(this.user, this.repo, sha)
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

    // ### Blobs

    gh.blob = function (user, repo, sha) {
        if ( !(this instanceof gh.blob) )
            return new gh.blob(user, repo, sha);
        this.user = user;
        this.repo = repo;
        this.sha = sha;
    };

    gh.blob.prototype.show = withV3Api(function (callback, context) {
        jsonp("repos/" + this.user + "/" + this.repo + "/git/blobs/" + this.sha, 
          callback, context);
        return this;
    });

    gh.blob.prototype.decode = function (data) {
      return Base64.decode(data)
    }

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


}(window));

var Base64 = {
  // private property
  _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

  // public method for encoding
  encode : function (input) {
      var output = "";
      var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
      var i = 0;

      input = Base64._utf8_encode(input);

      while (i < input.length) {

          chr1 = input.charCodeAt(i++);
          chr2 = input.charCodeAt(i++);
          chr3 = input.charCodeAt(i++);

          enc1 = chr1 >> 2;
          enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
          enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
          enc4 = chr3 & 63;

          if (isNaN(chr2)) {
              enc3 = enc4 = 64;
          } else if (isNaN(chr3)) {
              enc4 = 64;
          }

          output = output +
          this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
          this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

      }

      return output;
  },

  // public method for decoding
  decode : function (input) {
      var output = "";
      var chr1, chr2, chr3;
      var enc1, enc2, enc3, enc4;
      var i = 0;

      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

      while (i < input.length) {

          enc1 = this._keyStr.indexOf(input.charAt(i++));
          enc2 = this._keyStr.indexOf(input.charAt(i++));
          enc3 = this._keyStr.indexOf(input.charAt(i++));
          enc4 = this._keyStr.indexOf(input.charAt(i++));

          chr1 = (enc1 << 2) | (enc2 >> 4);
          chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
          chr3 = ((enc3 & 3) << 6) | enc4;

          output = output + String.fromCharCode(chr1);

          if (enc3 != 64) {
              output = output + String.fromCharCode(chr2);
          }
          if (enc4 != 64) {
              output = output + String.fromCharCode(chr3);
          }

      }

      output = Base64._utf8_decode(output);

      return output;

  },

  // private method for UTF-8 encoding
  _utf8_encode : function (string) {
      string = string.replace(/\r\n/g,"\n");
      var utftext = "";

      for (var n = 0; n < string.length; n++) {

          var c = string.charCodeAt(n);

          if (c < 128) {
              utftext += String.fromCharCode(c);
          }
          else if((c > 127) && (c < 2048)) {
              utftext += String.fromCharCode((c >> 6) | 192);
              utftext += String.fromCharCode((c & 63) | 128);
          }
          else {
              utftext += String.fromCharCode((c >> 12) | 224);
              utftext += String.fromCharCode(((c >> 6) & 63) | 128);
              utftext += String.fromCharCode((c & 63) | 128);
          }

      }

      return utftext;
  },

  // private method for UTF-8 decoding
  _utf8_decode : function (utftext) {
      var string = "";
      var i = 0;
      var c = c1 = c2 = 0;

      while ( i < utftext.length ) {

          c = utftext.charCodeAt(i);

          if (c < 128) {
              string += String.fromCharCode(c);
              i++;
          }
          else if((c > 191) && (c < 224)) {
              c2 = utftext.charCodeAt(i+1);
              string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
              i += 2;
          }
          else {
              c2 = utftext.charCodeAt(i+1);
              c3 = utftext.charCodeAt(i+2);
              string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
              i += 3;
          }

      }

      return string;
  }
}

