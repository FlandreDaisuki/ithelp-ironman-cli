const path = require('path') ;

const {
  debug,
  print,
  exportSeries,
  fetchSeriesInfo,
} = require('../..');

module.exports = async(cli) => {
  debug('archive')('--- start ---');

  print.progress('頁面下載中…');
  const seriesInfo = await fetchSeriesInfo(cli.url);
  const { dirName, outputName, dstPath } = await exportSeries(seriesInfo, cli);

  debug('archive')(cli);
  debug('archive')('dirName', dirName);
  debug('archive')('outputName', outputName);
  debug('archive')('dstPath', dstPath);

  print.success(`已存到 '${path.relative(process.cwd(), dstPath)}'`);

  debug('archive')('--- end ---');
};
