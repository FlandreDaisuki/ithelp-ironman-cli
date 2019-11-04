const fs = require('fs');
const { print } = require('..');
const pkg = require('../package.json');

const errorExit = (msg) => {
  print.error(msg);
  process.exit(1);
};

const checkChangeLog = () => {
  const text = fs.readFileSync('CHANGELOG', 'utf8');
  const versionRe = new RegExp(`^${pkg.version}$`, 'm');
  if (!versionRe.test(text)) {
    errorExit('忘記寫 CHANGELOG 啦啦啦');
  }
};


checkChangeLog();
