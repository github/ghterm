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
  if(currentState == 'top') { // top level - cd'ing to a repo state
    for(i = 0; i <= ghRepos.length - 1; i++) {
      if(ghRepos[i].name == newState) {
        ghRepo = gh.repo(ghUser.username, ghRepos[i].name)
        setPs(ghRepos[i].name)
        currentState = 'repo'
        return nextTerm()
      }
    }
  } else if (currentState == 'repo') {
    if (newState == '..') {
      currentState = 'top'
      return nextTerm()
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

var ghBranches = null

// write a listing of the current state
function listCurrent() {
  if(currentState == 'top') {
    ghUser.allRepos(function (data) {
      ghRepos = data.repositories
      $("#message").text("Number of repos: " + ghRepos.length)
      writeRepos()
    });
  } else if(currentState == 'repo') {
    // TODO: list branches
    ghRepo.branches(function (data) {
      ghBranches = data.data
      $("#message").text("Number of branches: " + ghBranches.length)
      writeBranches()
    })
  } else {
    term.write("unknown state")
    nextTerm()
  }
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
  ghBranches.forEach(function (branch) {
    name = branch.ref.replace('refs/heads/', '')
    term.write("%c(@lightyellow)" + name)
    term.newLine()
  })
  nextTerm()
}

// list repositories
function writeRepos() {
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
  term.write(color + str + " ")
  rest = len - str.length
  for(j = 1; j <= rest; j++) {
    term.write(" ")
  }
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
  setPs(ghLogin)
  term.open()
}

var ghUser  = null
var ghLogin = null
var ghRepos = null
var ghRepo  = null
var ghBranches = null
var ghBranch   = null
var currentState = 'top'

$(function() {

  token = $("#token").attr("value")
  ghLogin = $("#login").attr("value")

  ghUser = gh.user(ghLogin);

  startTerminal()

})

