var readline = require('readline'),
rl = readline.createInterface(process.stdin, process.stdout);

rl.question('What is your favorite food? ', function(answer) {
  console.log('Oh, so your favorite food is ' + answer);
});

rl.write('Pizza');
