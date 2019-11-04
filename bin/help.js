const $0 = Object.keys(require('../package.json').bin)[0];

const description = `
下載、打包 iT 邦幫忙鐵人賽 的命令列工具
`.trimRight();

const usage = `
使用方式：
  $ ${$0} [全域選項]
  $ ${$0} <指令> <網址> [選項]
`.trimRight();

const commands = `
指令：
  download, d  下載資料夾
  archive, a   打包成壓縮檔
  serve, s     自架伺服器觀看 <網址>
               <網址> 可以是資料夾或壓縮檔 <路徑>，但變數選項會無效
`.trimRight();

const optionsGlobal = `
全域選項：
  --help, -h     顯示說明
  --version, -v  顯示版本
  --verbose, -V  顯示更多，除錯用
  --dir, -d      目錄位置（預設：'%title%'）
                 可用變數有：
                   %title%（鐵人賽標題）
                   %user%（作者帳號）
                   %author%（作者名字）
`.trimRight();

const optionsDownload = `
下載選項：
  --dry-run, -x  不寫入硬碟，測試可用性
`.trimRight();

const optionsArchive = `
打包選項：
  --dry-run, -x      不寫入硬碟，測試可用性
  --output-name, -o  壓縮檔名稱（預設：'%title%.zip'），可用變數同 --dir
`.trimRight();

const optionsServe = `
自架選項：
  --port, -p      連接埠（預設：8080）
  --web-root, -w  頁面根目錄位置（預設：'%title%/www'），可用變數同 --dir
                  若使用 <路徑>，則變數無效
`.trimRight();

const examples = `
舉例：
  $ URL='https://ithelp.ithome.com.tw/users/12345678/ironman/1234'
  $ ${$0} d "$URL"
  $ ${$0} d "$URL" -d '[%author%] %title%'
  $ ${$0} a "$URL" -o '[%author%] %title%.zip' -d '第87屆鐵人賽'
  $ ${$0} s "$URL" -w '[%author%] %title%/public' -p 4321
`.trimRight();

const validCommandMap = new Map([...commands.matchAll(/^\s+(\b[a-z-]+,?\s+)*/img)]
  .map((m) => m[0].trim())
  .filter(Boolean)
  .flatMap((str) => {
    return str.split(',')
      .map((str) => str.trim())
      .map((str, idx, arr) => [str, arr[0]]);
  }));

module.exports = {
  usage,
  commands,
  examples,
  description,
  optionsServe,
  optionsGlobal,
  optionsArchive,
  optionsDownload,

  validCommandMap,
};
