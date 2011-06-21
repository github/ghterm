var term;

var help = [
  '%+r github terminal help %-r',
  '',
  '= Navigating =============================================',
  '',
  '  ls (<filter>)   %c(@tan)see your context.',
  '  cd <dir>        %c(@tan)change your context.',
  '  browse          %c(@tan)open the current context in github if possible',
  '',
  '= Editing and Committing =================================',
  '',
  '  log             %c(@tan)view a commit log when in a branch',
  '  edit <file>     %c(@tan)edit a file, which is staged after the edit',
  '  status          %c(@tan)see which files are staged for the next commit',
  '  unstage <file>  %c(@tan)remove a change from your staging area',
  '  commit <msg>    %c(@tan)commit your staged changes to the current branch',
  '',
  '  help            %c(@tan)to see this page.',
  ' '
];


function termInitHandler() {
  this.prompt();
}


function termHandler() {
  var parser = new Parser();
  parser.parseLine(this);
  var command = this.argv[this.argc++];
  var message = this.argv.slice(1, this.argv.length).join(' ')

  this.newLine()

  if (command == null) {
    // blank line
  } else if (command == 'help') {
    this.clear()
    help.forEach(function(line) {
      term.write(line + '%n')
    })
    nextTerm()
  } else if (command == 'ls') {
    listCurrent(message)
  } else if (command == 'cd') {
    changeState(message)
  } else if (command == 'log') {
    runLog(this.argv)
  } else if (command == 'status') {
    runStatus()
  } else if (command == 'browse') {
    runBrowse()
  } else if (command == 'test') {
    runTest()
  } else if (command == 'commit') {
    runCommit(message)
  } else if (command == 'unstage') {
    var path = this.argv[this.argc++];
    runUnstage(path)
  } else if ((command == 'edit') || (command == 'vim') || (command == 'emacs')) {
    var fileName = this.argv[this.argc++];
    startEditor(fileName, command)
  } else {
    nextTerm(command + " not a command. type 'help' for commands")
  }
}

// sets up env for feature dev
var commandStack = []
var commandTimer = 500
function runTest() {
  commandStack = []
  commandStack.push("listCurrent()")
  commandStack.push("changeState('github')")
  commandStack.push("listCurrent()")
  commandStack.push("changeState('dagnav')")
  commandStack.push("listCurrent()")
  commandStack.push("startEditor('config.ru')")
  commandStack.push("editor.getSession().setValue('hey new content')")
  commandStack.push("stopEditor()")
  commandStack.push("changeState('config')")
  commandStack.push("listCurrent()")
  commandStack.push("startEditor('shotgun.rb')")
  commandStack.push("editor.getSession().setValue('hey more new content')")
  commandStack.push("stopEditor()")
  commandStack.push("changeState('..')")
  setTimeout("runNext()", commandTimer)
}
function runNext() {
  if(cmd = commandStack.shift()) {
    eval(cmd)
    setTimeout("runNext()", commandTimer)
  }
}
// -- sets up env for feature dev --

var pollTimer = 30000
function checkUser() {
  ghUser.show(function(resp) {
    $('#ratelimit').text("API Limit: " + resp.meta["X-RateLimit-Remaining"] + ' / ' + resp.meta["X-RateLimit-Limit"])
    $('#avatar').html("<img src='" + resp.data.avatar_url + "'>")
    setTimeout("checkUser()", pollTimer)
  })
}

function dedupeStage(path) {
  if(ghStage.length > 0) {
    var newStage = []
    var paths = {}
    ghStage.forEach(function(entry) {
      if(!paths[entry.path]) {
        paths[entry.path] = true
        newStage.push(entry)
      }
    })
    ghStage = newStage
  }
}

function runUnstage(path) {
  if(ghStage.length > 0) {
    var newStage = []
    ghStage.forEach(function(entry) {
      if(entry.path != path) {
        newStage.push(entry)
      } else {
        term.write("Removed " + path + '%n')
      }
    })
    ghStage = newStage
  }
  nextTerm()
}

function runStatus() {
  if(ghStage.length > 0) {
    term.write("Parent Commit: %c(@indianred)" + ghStageCommit + "%n")
    ghStage.forEach(function(entry) {
      writePadded('@lightblue', 'M', 2)
      writePadded('@lightyellow', entry.sha.substring(0, 10), 10)
      writePadded('@cornflowerblue', entry.path, 50)
      term.newLine()
    })
  } else {
    term.write("Nothing modified")
  }
  nextTerm()
}

function runCommit(message) {

  if(ghStage.length <= 0) {
    return nextTerm("Nothing staged for commit%n")
  }
  if(ghStageCommit != ghCommit.sha) {
    return nextTerm("Stage commit is mismatched%n")
  }
  if(message.length <= 0) {
    return nextTerm("Please provide a commit message%n")
  }

  term.write("Base Tree:                   %c(@khaki)" + ghCommit.cache.commit.tree.sha + '%n')
  tr = {}
  tr.base_tree = ghCommit.cache.commit.tree.sha
  tr.tree = ghStage
  term.write("Writing the new tree...")
  var tree = ghRepo.tree()
  tree.write(tr, function(resp) {
    cm = {}
    cm.tree = resp.sha
    cm.message = message
    cm.parents = [ghStageCommit]
    addNewObject('tree', resp)
    term.write(" tree %c(@lightyellow)" + resp.sha + "%n")
    term.write("Committing files...  ")
    var commit = ghRepo.commit()
    commit.write(cm, function(resp) {
      addNewObject('commit', resp)
      term.write(" commit %c(@lightyellow)" + resp.sha + "%n")
      term.write("Updating branch...")
      var ref = ghRepo.ref(ghBranch.ref, ghBranch.object.sha)
      ref.update(resp.sha, function(resp) {
        nextTerm("           %c(@lightblue)Branch Updated")
        ghBranch.object.sha = resp.object.sha
        ghStage = []
        ghStageCommit = resp.object.sha
        ghCommit = ghRepo.commit(ghBranch.object.sha)
      })
    })
  })
}

function changeState(newState) {
  if (newState.search('/') >= 0) {
    if(currentState == 'top') { 
      // do i really need to authenticate this? no.
      userRepo = newState.split('/')
      ghRepo = gh.repo(userRepo[0], userRepo[1])
      pushState('repo', userRepo)
      return nextTerm()
    }

    newState.split("/").forEach(function(dir) {
      changeState(dir)
    })
    return false
  }
  if (newState == '..') {
    if(currentState == 'path') {
      ghPath.pop()
    }
    popState()
    return nextTerm()
  }
  if(currentState == 'top') { // top level - cd'ing to a repo state
    loadRepos(function() {
      for(i = 0; i <= ghRepos.length - 1; i++) {
        if(ghRepos[i].name == newState) {
          ghRepo = gh.repo(ghRepos[i].owner.login, ghRepos[i].name)
          pushState('repo', ghRepo.repo)
          return nextTerm()
        }
      }
    })
    return true
  } else if (currentState == 'repo') {
    if(!ghBranches) {
      return nextTerm("%c(@indianred)No context%n")
    }
    for(i = 0; i <= ghBranches.length - 1; i++) {
      var name = ghBranches[i].ref.replace('refs/heads/', '')
      if(name == newState) {
        ghBranch = ghBranches[i]
        if(ghBranch.object.sha != ghStageCommit) {
          term.write("%c(@indianred)New Stage%n")
          ghStageCommit = ghBranch.object.sha
          ghStage = []
        }
        pushState('branch', name)
        return nextTerm()
      }
    }
  } else if ((currentState == 'branch') || (currentState == 'path')) {
    var subtree = getCurrentSubtree(false)
    for(i = 0; i <= subtree.tree.length - 1; i++) {
      var name = subtree.tree[i].path;
      if(name == newState) {
        ghPath.push(name)
        pushState('path', name)
        return nextTerm()
      }
    }
  }
  nextTerm("unknown state: " + newState)
}

function runLog(log) {
  if(currentState == 'branch' || currentState == 'path') {
    // show commits
    ghCommit = gh.commit(ghRepo.user, ghRepo.repo, ghBranch.object.sha)
    ghCommit.list(function(resp) {
      commits = resp.data
      commits.forEach(function(commit) {
        writePadded("@green",  commit.sha.substring(0, 8), 8)
        writePadded("@cornflowerblue",   commit.commit.author.date.substring(5, 10), 5)
        writePadded("@lightblue",   commit.commit.author.email, 10)
        writePadded("@wheat", commit.commit.message.split("\n").shift(), 50)
        term.newLine()
      })
      nextTerm()
    })
  } else {
    nextTerm("ERR: you must cd to the branch of a repo first")
  }
}

function sortRepos() {
  ghRepos.sort(function(a, b) {
    if(!a.pushed_at)
      return -1
    a = Date.parse(a.pushed_at)
    b = Date.parse(b.pushed_at)
    return a - b
  })
  if(ghRepos.length > 0) {
    var newRepos = []
    var paths = {}
    ghRepos.forEach(function(entry) {
      if(!paths[entry.url]) {
        paths[entry.url] = true
        newRepos.push(entry)
      }
    })
    ghRepos = newRepos
  }
  $("#message").text("Number of repos: " + ghRepos.length)
}

function loadRepos(callback) {
  if(ghRepos)
    return callback.call()

  ghUser.allRepos(function (data) {
    ghRepos = data.repositories
    ghUser.orgs(function(orgs) {
      orgs.data.forEach(function(org) {
        ghUser.orgRepos(org.login, function(resp)  {
          ghRepos = ghRepos.concat(resp.data)
          sortRepos()
        })
      })
    })

    if(callback)
      callback.call()
  });
}

// write a listing of the current state
function listCurrent(filter) {
  if(currentState == 'top') {
    loadRepos(function() {
      writeRepos(filter)
    })
  } else if(currentState == 'repo') {
    ghRepo.branches(function (data) {
      ghBranches = data.data
      $("#message").text("Number of branches: " + ghBranches.length)
      writeBranches()
    })
  } else if(currentState == 'branch') {
    ghCommit = gh.commit(ghRepo.user, ghRepo.repo, ghBranch.object.sha)
    ghCommit.show(function(resp) {
      data = resp.data
      ghCommit.cache = data
      showCommit()
      ghCommit.subTree = {}
      showTree(data.commit.tree.sha, '/')
    })
  } else if(currentState == 'path') {
    // use data from ghPath to get a tree sha from treecache
    showCommit()
    sha = findTreeSha(getCurrentDir(), true)
    showTree(sha, currentPath())
  } else {
    term.write("unknown state")
    nextTerm()
  }
}

function runBrowse() {
  if(currentState == 'top') {
    window.open(github_url)
  } else if(currentState == 'repo') {
    url = github_url + ghRepo.user + '/' + ghRepo.repo
    window.open(url)
  } else if(currentState == 'branch') {
    name = ghBranch.ref.replace('refs/heads/', '')
    url = github_url + ghRepo.user + '/' + ghRepo.repo + '/tree/' + name
    window.open(url)
  } else if(currentState == 'path') {
    url = github_url + ghRepo.user + '/' + ghRepo.repo + '/tree/' + name + currentPath()
    window.open(url)
  } else {
    term.write("unknown state")
  }
  nextTerm()
}

function findStagedSha(path) {
  for(var i=0; i < ghStage.length; i++) {
    var entry = ghStage[i]
    if(entry.path == path) {
      return entry.sha
    }
  }
  return false
}

function getCurrentDir() {
  var tmpPath = ghPath.slice()
  return tmpPath.pop()
}

function findTreeSha(path, pop) {
  var subtree = getCurrentSubtree(pop)
  for(i = 0; i <= subtree.tree.length - 1; i++) {
    var tree = subtree.tree[i]
    if(tree.path == path) {
      return tree.sha
    }
  }
}

function getCurrentSubtree(pop) {
  var tmpPath = ghPath.slice()
  if(pop)
    path = tmpPath.pop()
  relPath = '/' + tmpPath.join('/')
  return ghCommit.subTree[relPath]
}

function currentPath() {
  return "/" + ghPath.join('/')
}

function treePath() {
  if(ghPath.length > 0) {
    return ghPath.join('/') + '/'
  } else {
    return ''
  }
}

function showCommit() {
  data = ghCommit.cache
  term.write("commit : %c(@lightyellow)" + data.sha + '%n')
  term.write("tree   : %c(@lightyellow)" + data.commit.tree.sha + '%n')
  term.write("author : " + data.commit.author.name + '%n')
  term.write("date   : %c(@indianred)" + data.commit.author.date + '%n')
  term.write("path   : " + currentPath() + '%n')
  term.write('%n')
}

function showTree(sha, path) {
  var tree = ghRepo.tree(sha)
  tree.show(function(resp) {
    data = resp.data
    ghCommit.subTree[path] = data
    data.tree.forEach(function(entry) { 
      if(entry.type == 'tree') {
        color = '@lightskyblue'
        writePadded(color, entry.path, 68)
      } else {
        color = '@lemonchiffon'
        writePadded(color, entry.path, 57)
        color = '@lightcyan'
        writePadded(color, entry.size + '', 10)
      }
      term.write(entry.sha.substring(0, 10) + "%n")
    })
    nextTerm()
  })
}


function nextTerm(line) {
  if(line){
    term.write(line)
  }
  term.newLine()
  term.prompt()
}

// list branches
function writeBranches() {
  if(!ghBranches)
    return false
  ghBranches.forEach(function (branch) {
    name = branch.ref.replace('refs/heads/', '')
    term.write("%c(@lightyellow)" + name)
    term.newLine()
  })
  nextTerm()
}

// list repositories
function writeRepos(filter) {
  if(!ghRepos)
    return false

  displayNum = 23

  var displayEm = []
  ghRepos.forEach(function (repo) {
    if((repo.name.search(filter) >= 0) || (repo.owner.login.search(filter) >= 0))
      displayEm.unshift(repo)
  })
  displayEm.slice(0, displayNum).forEach(function (repo) {
    if(repo.private) {
      writePadded("@khaki", repo.name, 40)
    } else {
      writePadded("@skyblue", repo.name, 40)
    }
    writePadded("@wheat", repo.owner.login, 10)
    writePadded("@lightgrey", repo.description, 20)
    if(repo.pushed_at) {
      writePadded("@indianred", repo.pushed_at.substring(5, 10), 5)
    }
    term.newLine()
  })
  if(displayEm.length > displayNum) {
    term.write("and " +  (displayEm.length - displayNum) + " more...%n")
  }
  nextTerm()
}

function writePadded(color, str, len) {
  if(!str)
    str = ''
  if (str.length > len) {
    str = str.substring(0, len - 2) + '..'
  }
  if(color) {
    color = "%c(" + color + ")"
  }
  term.write(color + str + " ")
  rest = len - str.length
  for(j = 1; j <= rest; j++) {
    term.write(" ")
  }
}

function pushState(state, desc) {
  stateStack.push([state, desc])
  currentState = state
  setPs(desc + "[" + state + "]")
}

function popState() {
  if(stateStack.length <= 1) {
    term.write("%c(@indianred)ERR: at the top")
    return false
  }
  stateStack.pop()
  arr = stateStack[stateStack.length - 1]
  state = arr[0]
  desc = arr[1]
  currentState = state
  setPs(desc + "[" + state + "]")
}

function setPs(str) {
  lastPs = str.substr(0, 20) + ' $'
  term.ps = lastPs
}

function resetPs(str) {
  term.ps = lastPs
}

function startEditor(fileName, type) {
  lastEditPath = treePath() + fileName
  var sha = findStagedSha(lastEditPath)
  if(!sha) { sha = findTreeSha(fileName, false) }
  if(sha) {
    var blob = ghRepo.blob(sha)
    blob.show(function(resp) {
      b = resp.data
      if (b.content) {
        content = blob.decode(b.content)
        term.close()
        TermGlobals.keylock = true
        $("#termDiv").hide()
        $("#editor").show()
        editor = ace.edit("editorDiv")
        editor.getSession().setValue(content)
        editor.gotoLine(1)
        if(type == 'vim') {
          vim = require("ace/keyboard/keybinding/vim").Vim;
          editor.setKeyboardHandler(vim)
        }
        if(type == 'emacs') {
          emacs = require("ace/keyboard/keybinding/emacs").Emacs;
          editor.setKeyboardHandler(emacs)
        }
      }
      nextTerm()
    })
  } else {
    nextTerm("%c(@indianred)" + fileName + " is not a file in this context")
  }
}

function stopEditor() {
  $("#editor").hide()
  $("#termDiv").show()

  content = editor.getSession().getValue()
  var blob = ghRepo.blob()
  blob.write(content, function(resp) {
    addNewObject('blob', resp)
    ghStage.unshift({'path': lastEditPath, 'type': 'blob', 'sha': resp.sha, 'mode': '100644'})
    dedupeStage()
    term.write("File '" + lastEditPath + "' saved %c(@lightyellow)(" + resp['sha'] + ")")
    term.prompt()
  })

  TermGlobals.keylock = false
  term.open()
  resetPs()
}

function addNewObject(type, data) {
  newObjects.unshift([type, data, ghRepo.user, ghRepo.repo])
  newObjects = newObjects.slice(0, 10)

  $('#newObjects').empty()
  $('#newObjects').append("<h3><a href='#'>New Objects</a></h3>")
  var list = $("<ul>")
  newObjects.forEach(function(obj) {
    if(obj[0] == 'commit') {
      url = github_url + obj[2] + "/" + obj[3] + "/" + obj[0] + "/" + obj[1].sha
    } else {
      url = '#'
    }
    list.append("<li><span><a href='" + url + "'><code>" + obj[1].sha.substring(0, 10) + "</code></a> &nbsp;  " +  obj[0] + "</span></li>")
  })
  $('#newObjects').append(list)
}

// Open the Terminal

function startTerminal() {
  term = new Terminal(
    {
      cols: 80,
      rows: 27,
      termDiv: 'termDiv',
      initHandler: termInitHandler,
      handler: termHandler
    }
  )
  pushState('top', ghLogin)
  term.open()
}

var ghUser  = null
var ghLogin = null
var ghRepos = null
var ghRepo  = null
var ghBranches = null
var ghBranch   = null
var ghCommit = null
var ghStage = []
var ghStageCommit = null
var ghPath = []
var lastEditPath = ''

var newObjects = []

var currentState = 'top'
var stateStack = []
var lastPs = null

var editor = null
var github_url = "https://github.com/"

$(function() {
  $("#editDone").click(function() {
    stopEditor()
  })

  $("#prompter").click(function() {
    term.prompt()
  })

  $("#helper").click(function() {
    term.clear()
    help.forEach(function(line) {
      term.write(line + '%n')
    })
    term.prompt()
  })

  token = $("#token").attr("value")
  ghLogin = $("#login").attr("value")

  ghUser = gh.user(ghLogin)
  gh.authenticate(token)

  loadRepos()
  checkUser()
  startTerminal()
})

