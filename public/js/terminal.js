var term;

var help = [
  '%+r github terminal help %-r',
  '',
  ' * type "ls"            to see your context.',
  ' * type "cd <dir>"      to change your context.',
  ' * type "help"          to see this page.',
  ' '
];


function termInitHandler() {
  // output a start up screen
  this.write(
    [
      '              ****           github terminal            ****',
      '%c()%n'
    ]
  );
  // and leave with prompt
  this.prompt();
}

function termHandler() {
  var parser = new Parser();
  parser.parseLine(this);
  var command = this.argv[this.argc++];

  this.newLine()

  if (command == null) {
    // blank line
  } else if (command == 'help') {
    this.clear()
    nextTerm(help)
  } else if (command == 'ls') {
    listCurrent(this)
  } else if (command == 'cd') {
    var newState = this.argv[this.argc++];
    changeState(newState)
  } else if (command == 'log') {
    runLog(this.argv)
  } else {
    nextTerm(command + " not a command. type 'help' for commands")
  }
}

function changeState(newState) {
  if (newState == '..') {
    if(currentState == 'path') {
      ghPath.pop()
    }
    popState()
    return nextTerm()
  }
  if(currentState == 'top') { // top level - cd'ing to a repo state
    for(i = 0; i <= ghRepos.length - 1; i++) {
      if(ghRepos[i].name == newState) {
        ghRepo = gh.repo(ghUser.username, ghRepos[i].name)
        pushState('repo', ghRepo.repo)
        return nextTerm()
      }
    }
  } else if (currentState == 'repo') {
    for(i = 0; i <= ghBranches.length - 1; i++) {
      var name = ghBranches[i].ref.replace('refs/heads/', '')
      if(name == newState) {
        ghBranch = ghBranches[i]
        pushState('branch', name)
        return nextTerm()
      }
    }
  } else if ((currentState == 'branch') || (currentState == 'path')) {
    var subtree = getCurrentSubtree()
    console.log(subtree)
    for(i = 0; i <= subtree.count - 1; i++) {
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
  if(currentState == 'branch') {
    // show commits
  } else {
    nextTerm("ERR: you must cd to the branch of a repo first")
  }
}

// write a listing of the current state
function listCurrent() {
  if(currentState == 'top') {
    ghUser.allRepos(function (data) {
      ghRepos = data.repositories
      $("#message").text("Number of repos: " + ghRepos.length)
      writeRepos()
    });
  } else if(currentState == 'repo') {
    ghRepo.branches(function (data) {
      ghBranches = data.data
      $("#message").text("Number of branches: " + ghBranches.length)
      writeBranches()
    })
  } else if(currentState == 'branch') {
    ghCommit = gh.commit(ghRepo.user, ghRepo.repo, ghBranch.sha)
    ghCommit.show(function(resp) {
      data = resp.data
      ghCommit.cache = data
      showCommit()
      ghCommit.subTree = {}
      showTree(data.tree, '/')
    })
  } else if(currentState == 'path') {
    // use data from ghPath to get a tree sha from treecache
    showCommit()
    sha = findTreeSha(getCurrentDir())
    showTree(sha, currentPath())
  } else {
    term.write("unknown state")
    nextTerm()
  }
}

function getCurrentDir() {
  var tmpPath = ghPath.slice()
  return tmpPath.pop()
}

function findTreeSha(path) {
  var subtree = getCurrentSubtree()
  console.log("FindTreeSha:" + path)
  console.log(subtree)
  for(i = 0; i <= subtree.count - 1; i++) {
    var tree = subtree.tree[i]
    if(tree.path == path) {
      return tree.sha
    }
  }
}

function getCurrentSubtree() {
  var tmpPath = ghPath.slice()
  path = tmpPath.pop()
  relPath = tmpPath.join('/')
  if(relPath == '')
    relPath = '/'
  return ghCommit.subTree[relPath]
}

function currentPath() {
  return "/" + ghPath.join('/')
}

function showCommit() {
  data = ghCommit.cache
  term.write("commit : " + data.sha + '%n')
  term.write("tree   : " + data.tree + '%n')
  term.write("author : " + data.author.name + '%n')
  term.write("date   : %c(@indianred)" + data.author.date + '%n')
  term.write("path   : " + currentPath() + '%n')
  term.write('%n')
}

function showTree(sha, path) {
  console.log(path)
  console.log(sha)
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
function writeRepos() {
  if(!ghRepos)
    return false
  ghRepos.forEach(function (repo) {
    term.write("%c(@lightblue)" + repo.name)
    term.newLine()
  })
  nextTerm()
}


function writePadded(color, str, len) {
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
  term.ps = str.substr(0, 20) + ' $'
}
// Open the Terminal

function startTerminal() {
  term = new Terminal(
    {
      cols: 80,
      rows: 30,
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
var ghPath = []

var currentState = 'top'
var stateStack = []

$(function() {

  token = $("#token").attr("value")
  ghLogin = $("#login").attr("value")

  ghUser = gh.user(ghLogin);

  startTerminal()

})

