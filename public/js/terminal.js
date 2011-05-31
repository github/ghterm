var term;

var help = [
  '%+r github terminal help %-r',
  '',
  ' * type "open <file>"   to edit a file.',
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
  } else if (command == 'ls') {
    listCurrent(this)
  } else {
    this.write(command + " not a command. type 'help' for commands")
  }

  this.newLine();
  this.prompt();
}

// write a listing of the current state
function listCurrent(term) {
  if(currentState == 0) {
    listed = 0
    // list repositories
    for(i = 0; i <= ghRepos.length - 1; i++) {
      if(listed > 2) {
        term.newLine()
        listed = 0
      }
      name = ghRepos[i].name
      if (name.length > 25) {
        name = name.substring(0, 23) + '..'
      }
      term.write(name + " ")
      rest = 25 - name.length
      for(j = 1; j <= rest; j++) {
        term.write(" ")
      }
      listed += 1
    }
  } else {
    term.write("unknown state")
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

ghUser  = null
ghLogin = null
ghRepos = null
currentState = 0

$(function() {

  token = $("#token").attr("value")
  ghLogin = $("#login").attr("value")

  startTerminal()

  var ghUser = gh.user(ghLogin);
  ghUser.repos(function (data) {
    ghRepos = data.repositories;
    $("#message").text("Number of repos: " + ghRepos.length);
  });
})

