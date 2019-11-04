#!/usr/bin/env node

const path = require('path');
const meow = require('meow');
const fs = require('fs-extra');

const {
  print,
  debug,
  validateIronmanURL,
} = require('..');

const {
  usage,
  commands,
  examples,
  description,
  optionsServe,
  optionsGlobal,
  optionsArchive,
  optionsDownload,

  validCommandMap,
} = require('./help');

const completeHelp = `
${usage}
${commands}
${optionsGlobal}
${optionsDownload}
${optionsArchive}
${optionsServe}
${examples}
`.trim();

const cli = meow(completeHelp, {
  booleanDefault: true,
  inferType: true,
  description: description.trim(),
  flags: {
    help: {
      alias: 'h',
    },
    version: {
      alias: 'v',
    },
    verbose: {
      alias: 'V',
    },
    'dry-run': {
      alias: 'x',
    },
    port: {
      default: 8080,
      alias: 'p',
    },
    dir: {
      type: 'string',
      default: '%title%',
      alias: 'd',
    },
    'output-name': {
      type: 'string',
      default: '%title%.zip',
      alias: 'o',
    },
    'web-root': {
      type: 'string',
      default: '%title%/www',
      alias: 'w',
    },
  },
});

if (cli.flags.verbose) {
  if (typeof cli.flags.verbose === 'boolean') {
    debug.enable('*');
  } else {
    debug.enable(String(cli.flags.verbose));
  }
}

debug('cli')(cli);

if (cli.input.length < 2) {
  print.error('缺少 <指令> 或 <網址>');
  print.log(usage);
  process.exit(2);
}

if (cli.input.length > 2) {
  print.error('引數過多');
  print.log(usage);
  process.exit(2);
}

if (!validCommandMap.has(cli.input[0])) {
  print.error('無效的 <指令>');
  print.log(usage);
  print.log(commands);
  process.exit(2);
}

cli.command = validCommandMap.get(cli.input[0].toLocaleLowerCase());

if (!cli.command.startsWith('s')) {
  if (!validateIronmanURL(cli.input[1])) {
    print.error('無效的 <網址>');
    print.info('網址須符合 https://ithelp.ithome.com.tw/users/********/ironman/****');
    process.exit(2);
  }
  cli.url = cli.input[1];
} else {
  // serve / s
  if (!validateIronmanURL(cli.input[1])) {
    try {
      const url = new URL(cli.input[1], 'file:///');
      if (url.protocol.startsWith('http')) {
        print.error('無效的 <網址>');
        print.info('網址須符合 https://ithelp.ithome.com.tw/users/********/ironman/****');
        process.exit(2);
      }

      const p = path.resolve(path.normalize(cli.input[1]));
      debug('cli')('serve:p', p);
      if (!fs.existsSync(p)) {
        print.error('無效的 <路徑>');
        print.log(usage);
        print.log(commands);
        process.exit(2);
      }

      const pStat = fs.statSync(p);
      debug('cli')('serve:pStat', pStat);
      if (pStat.isFile()) {
        cli.serveType = 'file';
        cli[cli.serveType] = p;
      } else if (pStat.isDirectory()) {
        cli.serveType = 'dir';
        cli[cli.serveType] = p;
      } else {
        print.error('無效的 <路徑>');
        print.log(usage);
        print.log(commands);
        process.exit(2);
      }
    } catch (_) {
      print.error('無法解析的 <網址|路徑>');
      print.log(usage);
      print.log(commands);
      process.exit(2);
    }
  } else {
    cli.serveType = 'url';
    cli[cli.serveType] = cli.input[1];
  }
  debug('cli')('serveType', cli.serveType);
  debug('cli')('[serveType]', cli[cli.serveType]);
}

require('./commands')[cli.command](cli);
