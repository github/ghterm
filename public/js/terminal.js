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
  // default handler + exit
  this.newLine();
  if (this.lineBuffer.search(/^\s*open\s*(.*?)$/i) == 0) {
    this.type('OPEN: '+this.lineBuffer);
    this.newLine();
  }
  else if (this.lineBuffer.search(/^\s*help\s*$/i) == 0) {
    this.clear();
    this.write(help);
  }
  else if (this.lineBuffer != '') {
    this.type('You typed: '+this.lineBuffer);
    this.newLine();
  }
  this.prompt();
}

// Open the Terminal

function startTerminal() {
  term = new Terminal(
    {
      x: 550,
      y: 180,
      cols: 80,
      rows: 30,
      termDiv: 'termDiv',
      initHandler: termInitHandler,
      handler: termHandler
    }
  );
  term.open();
}

window.onload=startTerminal;

