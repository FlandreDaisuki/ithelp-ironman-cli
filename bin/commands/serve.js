const extract = require('extract-zip');
const fs = require('fs-extra') ;
const path = require('path') ;

const {
  debug,
  print,
  exportSeries,
  fetchSeriesInfo,
  replacePathVariable,
} = require('../..');

const serve = async(options) => {
  options.theme = '@vuepress/theme-default';

  const { build } = require('vuepress');

  const namespace = debug.disable();
  await build(options);
  debug.enable(namespace);
};

const launchServer = (root, port) => {
  // ref: https://developer.mozilla.org/docs/Learn/Server-side/Express_Nodejs/Introduction
  const http = require('http');

  http.createServer(function(request, response) {
    const reqPath = path.join(root, request.url);
    const indexPath = path.join(reqPath, 'index.html');
    if (!fs.existsSync(reqPath) && !fs.existsSync(indexPath)) {
      response.end('404 Not Found');
      return;
    }

    const pStat = fs.statSync(reqPath);
    if (pStat.isFile()) {
      response.end(fs.readFileSync(reqPath));
    } else {
      response.end(fs.readFileSync(indexPath));
    }

  }).listen(port);

  print.success(`伺服器已啟動 http://0.0.0.0:${port}/`);
};

module.exports = async(cli) => {
  debug('serve')('--- start ---');
  if (Object.prototype.hasOwnProperty.call(cli.flags, 'dryRun')) {
    print.warn('--dry-run 在 serve 指令中無效');
    Object.assign(cli.flags, { dryRun: false, x: false });
  }

  const serveOptions = {
    sourceDir: null,
    dest: null,
  };

  if (cli.serveType === 'url') {

    print.progress('頁面下載中…');
    const seriesInfo = await fetchSeriesInfo(cli.url);
    const { dirName } = await exportSeries(seriesInfo, cli);

    const [author, username] = seriesInfo.profileName.split(/[()\s]/g).filter(Boolean);
    const title = seriesInfo.seriesTitle;
    const webRoot = replacePathVariable(cli.flags.webRoot, { author, username, title });


    Object.assign(serveOptions, { sourceDir: dirName, dest: webRoot });

  } else if (cli.serveType === 'file') {

    if (!fs.existsSync(cli.file)) {
      print.error('找不到檔案 <路徑>', cli.file);
      process.exit(2);
    }

    const parsedPath = path.parse(cli.file);
    const relativeParsedPathName = path.relative(process.cwd(), parsedPath.name);

    serveOptions.sourceDir = cli.flags.dir;
    if ([/%title%/g, /%author%/g, /%user%/g].some((re) => re.test(cli.flags.dir))) {
      print.warn(`檔案 <路徑> 無法得知 --dir 的變數，使用 '${relativeParsedPathName}' 作為資料夾名稱`);
      serveOptions.sourceDir = relativeParsedPathName;
    }

    if ([/%title%/g, /%author%/g, /%user%/g].some((re) => re.test(cli.flags.webRoot))) {
      print.warn(`檔案 <路徑> 無法得知變數，使用 '${path.join(relativeParsedPathName, 'www')}' 作為頁面根目錄`);
      serveOptions.dest = path.join(relativeParsedPathName, 'www');
    }

    const extractPromise = new Promise((resolve, reject) => {
      return extract(cli.file, { dir: path.resolve(serveOptions.sourceDir) }, (err) => err ? reject(err) : resolve());
    });

    await extractPromise.catch((err) => {
      print.error('解壓縮失敗');
      debug('serve')('extract:err', err);
      process.exit(2);
    });

  } else if (cli.serveType === 'dir') {

    const relativePath = path.relative(process.cwd(), cli.dir);

    if ([/%title%/g, /%author%/g, /%user%/g].some((re) => re.test(cli.flags.dir))) {
      if (cli.flags.dir !== '%title%') {
        // 預設就不用警告了
        print.warn('資料夾 <路徑> 無法得知 --dir 的變數，故無效');
      }
    } else {
      print.warn('資料夾 <路徑> 跟 --dir 選項會產生歧義，故無效');
    }
    serveOptions.sourceDir = relativePath;

    if ([/%title%/g, /%author%/g, /%user%/g].some((re) => re.test(cli.flags.webRoot))) {
      print.warn(`資料夾 <路徑> 無法得知變數，使用 '${path.join(relativePath, 'www')}' 作為頁面根目錄`);
      serveOptions.dest = path.join(relativePath, 'www');
    } else {
      serveOptions.dest = path.join(relativePath, cli.flags.webRoot);
    }

    if (!fs.existsSync(relativePath)) {
      print.error('找不到資料夾 <路徑>', relativePath);
      process.exit(2);
    }

  } else {
    print.error('不可預期的錯誤');
    debug('serve')(cli);
  }

  debug('serve')('serveOptions', serveOptions);

  await serve(serveOptions);

  const clamp = (v, m, M) => Math.min(Math.max(v, m), M);
  if (!Number.isInteger(cli.flags.port) || clamp(cli.flags.port, 1024, 65535) !== cli.flags.port) {
    print.error('無效的連接埠（建議範圍：1024～65535）');
    process.exit(2);
  }

  launchServer(serveOptions.dest, cli.flags.port);

  debug('serve')('--- end ---');
};
