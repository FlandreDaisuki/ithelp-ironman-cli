const {
  debug,
  print,
  exportSeries,
  fetchSeriesInfo,
} = require('../..');

module.exports = async(cli) => {
  debug('download')('--- start ---');

  print.progress('頁面下載中…');
  const seriesInfo = await fetchSeriesInfo(cli.url);
  const { dirName } = await exportSeries(seriesInfo, cli);

  debug('download')(cli);
  debug('download')('seriesInfo', seriesInfo);

  print.success(`已存到 '${dirName}'`);

  debug('download')('--- end ---');
};
