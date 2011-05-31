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

  this.newLine();

  if (command == null) {
    // blank line
  } else if (command == 'help') {
    this.clear();
    this.write(help);
    this.newLine();
    this.prompt();
  } else if (command == 'ls') {
    listCurrent(this)
  } else {
    this.write(command + " not a command. type 'help' for commands")
    this.newLine();
    this.prompt();
  }

}

// write a listing of the current state
function listCurrent() {
  if(currentState == 0) {
    ghUser.allRepos(function (data) {
      ghRepos = data.repositories
      $("#message").text("Number of repos: " + ghRepos.length)
      writeRepos()
    });
  } else {
    term.write("unknown state")
  }
}

function writeRepos() {
  listed = 0
  // list repositories
  for(i = 0; i <= ghRepos.length - 1; i++) {
    if(listed > 2) {
      term.newLine()
      listed = 0
    }
    name = ghRepos[i].name
    writePadded("%c(@lightblue)", name, 25)
    listed += 1
  }
  term.newLine();
  term.prompt();
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
  term.ps = ghLogin + " $"
  term.open()
}

var ghUser  = null
var ghLogin = null
var ghRepos = null
var currentState = 0

$(function() {

  token = $("#token").attr("value")
  ghLogin = $("#login").attr("value")

  ghUser = gh.user(ghLogin);

  startTerminal()

})

