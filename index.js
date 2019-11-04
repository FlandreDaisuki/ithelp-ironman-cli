const path = require('path') ;
const chalk = require('chalk') ;
const fs = require('fs-extra') ;
const archiver = require('archiver');
const filenamify = require('filenamify');
const fetch = require('node-fetch');
const cheerio = require('cheerio') ;
const Turndown = require('turndown');
const turndownTransformer = new Turndown({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});
turndownTransformer.use(require('turndown-plugin-gfm').gfm);

const debug = require('debug');

const sanitizeFilename = (name) => filenamify(name, { replacement: '-', maxLength: 250 });
const sanitizeMarkdownLink = (path) => path.replace(/[!'()* ]/g, (c) => ('%' + c.charCodeAt(0).toString(16)));
const replacePathVariable = (name, { author, username, title }) => {
  return [name]
    .map((n) => n.replace(/%title%/g, title))
    .map((n) => n.replace(/%author%/g, author))
    .map((n) => n.replace(/%user%/g, username))
    .map((n) => path.normalize(n))[0];
};
const replaceFilenameVariable = (name, { author, username, title }) => {
  return sanitizeFilename(replacePathVariable(name, { author, username, title }));
};

const print = (() => {
  // ref: https://github.com/parcel-bundler/parcel/blob/v2/packages/reporters/cli/src/emoji.js
  const supportsEmoji = process.platform !== 'win32' || process.env.TERM === 'xterm-256color';

  return {
    log: (...args) => console.log.call(console, chalk.whiteBright(args.join(' '))),
    info: (...args) => console.info.call(console, chalk.blueBright([supportsEmoji ? 'ℹ️' : 'ℹ', '', ...args].join(' '))),
    warn: (...args) => console.warn.call(console, chalk.yellowBright([supportsEmoji ? '⚠️' : '‼', '', ...args].join(' '))),
    error: (...args) => console.error.call(console, chalk.redBright([supportsEmoji ? '🚨' : '×', '', ...args].join(' '))),
    success: (...args) => console.log.call(console, chalk.greenBright([supportsEmoji ? '✨' : '√', '', ...args].join(' '))),
    progress: (...args) => console.log.call(console, chalk.cyanBright([supportsEmoji ? '⏳' : '∞', '', ...args].join(' '))),
  };
})();

const validateIronmanURL = (url) => /^https:\/\/ithelp[.]ithome[.]com[.]tw\/users\/\d+\/ironman\/\d+$/.test(url);

const createReadmeMarkdown = (seriesInfo) => {
  const {
    profileName,
    seriesTitle,
    seriesGroup,
    seriesDescription,
    seriesPageURL,
    articlePageInfoList,
  } = seriesInfo;

  const articleLinks = articlePageInfoList
    .map(({ title }) => `1. [${title}](${sanitizeMarkdownLink(title)}.md)`)
    .join('\n');
  return `
# ${seriesTitle}

* 作者：${profileName}
* 來源：${seriesPageURL}
* 參賽組別：\`${seriesGroup}\`

${seriesDescription}

## 目錄

${articleLinks}
`.trim() + '\n'; // with trailing line
};

const fetchArticlePageInfo = async(articleInfo) => {
  debug('fetchArticlePageInfo')('--- start ---');
  debug('fetchArticlePageInfo')('articleInfo.href', articleInfo.href);
  const resp = await fetch(articleInfo.href).catch((error) => {
    print.error('fetch 失敗', error);
    debug('fetchArticlePageInfo')('fetch 失敗', error);
  });

  if (!resp) {
    return;
  }

  if (!resp.ok) {
    print.error('回應有錯誤', resp.status);
    debug('fetchArticlePageInfo')('resp', resp);
    return;
  }

  const html = await resp.text();
  const $ = cheerio.load(html);

  const articleTitle = $('.ir-article__title').text().trim();
  const articleTime = $('.ir-article-info__time').text().trim();
  const yamlFrontmatter = `
  ---
  title: '${articleTitle}'
  lang: zh-TW
  meta:
    - name: last-modified
      content: ${articleTime}
  ---`.trim().replace(/^\s\s/gm, '');
  const articleMarkdown = `${yamlFrontmatter}\n\n# ${articleTitle}\n\n` +
    turndownTransformer.turndown($('.qa-markdown').html());

  debug('fetchArticlePageInfo')('--- end ---');
  return Object.assign(articleInfo, {
    markdown: articleMarkdown,
  });
};

const fetchSeriesPageInfo = async(seriesPageURL, option) => {
  debug('fetchSeriesPageInfo')('--- start ---');
  const opt = Object.assign({
    articleOnly: false,
  }, option);
  debug('fetchSeriesPageInfo')('seriesPageURL', seriesPageURL);

  const resp = await fetch(seriesPageURL).catch((error) => {
    print.error('fetch 失敗', error);
    debug('fetchSeriesPageInfo')('fetch 失敗', error);
  });

  if (!resp) {
    return;
  }

  if (!resp.ok) {
    print.error('回應有錯誤', resp.status);
    debug('fetchSeriesPageInfo')('resp', resp);
    return;
  }

  const result = { seriesPageURL };
  const html = await resp.text();
  const $ = cheerio.load(html);

  if (!opt.articleOnly) {
    const profileName = $('.profile-header__name').text().trim();
    const $seriesInfoEl = $('.ir-profile-series');
    const seriesGroup = $seriesInfoEl.find('.group__badge').text().trim();
    const seriesTitle = sanitizeFilename($seriesInfoEl.find('.qa-list__title').text().trim().slice(0, -3));
    const seriesDescription = $seriesInfoEl.find('.qa-list__description').text().trim();

    Object.assign(result, { profileName, seriesGroup, seriesTitle, seriesDescription });
  }

  const articleInfoList = $('.qa-list__title-link').toArray().map((el) => {
    const title = sanitizeFilename($(el).text().trim());
    const href = el.attribs.href.trim();
    return { title, href };
  });

  debug('fetchSeriesPageInfo')('--- end ---');
  return Object.assign(result, { articleInfoList });
};

// type ArticlePageInfo = {
//   title: String
//   href: String
//   markdown: String
// }
//
// type SeriesInfo = {
//   seriesPageURL: String,
//   profileName: String,
//   seriesGroup: String,
//   seriesTitle: String,
//   seriesDescription: String,
//   articlePageInfoList: ArticlePageInfo[]
// }
//
// fetchSeriesInfo :: URL -> SeriesInfo
const fetchSeriesInfo = async(seriesPageURL) => {
  debug('fetchSeriesInfo')('--- start ---');
  const seriesPageInfoPromiseList = ['', '?page=2', '?page=3'].map((search) => {
    const option = { articleOnly: Boolean(search) };
    return fetchSeriesPageInfo(seriesPageURL + search, option);
  });

  debug('fetchSeriesInfo')('seriesPageInfoPromiseList', seriesPageInfoPromiseList);

  const seriesInfo = await Promise.all(seriesPageInfoPromiseList)
    .then((seriesPageInfoList) => seriesPageInfoList.filter(Boolean)
      .reduce((prev, curr) => {
        prev.articleInfoList.push(...curr.articleInfoList);
        return prev;
      }))
    .catch(print.error);

  debug('fetchSeriesInfo')('seriesInfo', seriesInfo);

  const { articleInfoList } = seriesInfo;
  delete seriesInfo.articleInfoList;

  const articlePageInfoList = await Promise.all(articleInfoList.map(fetchArticlePageInfo).filter(Boolean))
    .catch(print.error);

  debug('fetchSeriesInfo')('articlePageInfoList', articlePageInfoList);
  debug('fetchSeriesInfo')('--- end ---');
  return Object.assign(seriesInfo, { articlePageInfoList });
};



const exportSeries = async(seriesInfo, cli) => {
  const opt = Object.assign({}, cli);
  const [author, username] = seriesInfo.profileName.split(/[()\s]/g).filter(Boolean);
  const title = seriesInfo.seriesTitle;
  const dirName = replacePathVariable(opt.flags.dir, { author, username, title });
  const outputName = replaceFilenameVariable(opt.flags.outputName, { author, username, title });

  if (!opt.flags.dryRun) {
    await fs.mkdirp(dirName);
    const readmeMarkdown = createReadmeMarkdown(seriesInfo);

    if (opt.command !== 'archive') {
      // opt.command === 'download'|'serve'
      const underProjectDir = (filename) => path.join(dirName, filename);
      fs.writeFileSync(underProjectDir('README.md'), readmeMarkdown);
      seriesInfo.articlePageInfoList.forEach(async(articlePageInfo) => {
        const { markdown, title } = articlePageInfo;
        fs.writeFileSync(underProjectDir(`${title}.md`), markdown);
      });
    } else {
      // opt.command === 'archive'
      const output = fs.createWriteStream(outputName)
        .on('close', () => {
          // console.log(archive.pointer() + ' total bytes');
          // console.log('archiver has been finalized and the output file descriptor has closed.');
        })
        .on('end', () => {
          print.success('壓縮完成');
        });

      const archive = archiver('zip', { zlib: { level: 9 } })
        .on('warning', (err) => {
          if (err.code === 'ENOENT') {
            print.warn(err);
          } else {
            throw err;
          }
        })
        .on('error', (err) => {
          print.error(err);
          throw err;
        });

      archive.pipe(output);

      archive.append(Buffer.from(readmeMarkdown), { name: 'README.md' });
      const writeStreamPromiseList = seriesInfo.articlePageInfoList.map(async(articlePageInfo) => {
        const { markdown, title } = articlePageInfo;
        archive.append(Buffer.from(markdown), { name: `${title}.md` });
      });
      await Promise.all(writeStreamPromiseList);

      await archive.finalize();
    }
  }

  const result = { dirName };
  if (opt.command === 'archive') {
    const src = path.resolve(outputName);
    const dst = path.resolve(path.join(dirName, outputName));
    if (src !== dst) {
      fs.moveSync(src, dst, { overwrite: true });
    }
    Object.assign(result, { outputName, dstPath: dst });
  }

  return result;
};

module.exports = {
  debug,
  print,
  exportSeries,
  fetchSeriesInfo,
  validateIronmanURL,
  replacePathVariable,
  replaceFilenameVariable,
};
