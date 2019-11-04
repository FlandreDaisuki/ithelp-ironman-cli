# ithelp-ironman-cli

台灣 iT 邦幫忙鐵人賽已經超過十屆了，每年都會有非常好的技術文章。

我希望可以打包起來複習或放進平板裡閱讀。

## 安裝

```shell
npm i -g ithelp-ironman-cli
# or
yarn global add ithelp-ironman-cli
```

## 使用

```text
$ ithelp-ironman -h

  下載、打包 iT 邦幫忙鐵人賽 的命令列工具

  使用方式：
    $ ithelp-ironman [全域選項]
    $ ithelp-ironman <指令> <網址> [選項]

  指令：
    download, d  下載資料夾
    archive, a   打包成壓縮檔
    serve, s     自架伺服器觀看 <網址>
                 <網址> 可以是資料夾或壓縮檔 <路徑>，但變數選項會無效

  全域選項：
    --help, -h     顯示說明
    --version, -v  顯示版本
    --verbose, -V  顯示更多，除錯用
    --dir, -d      目錄位置（預設：'%title%'）
                   可用變數有：
                     %title%（鐵人賽標題）
                     %user%（作者帳號）
                     %author%（作者名字）

  下載選項：
    --dry-run, -x  不寫入硬碟，測試可用性

  打包選項：
    --dry-run, -x      不寫入硬碟，測試可用性
    --output-name, -o  壓縮檔名稱（預設：'%title%.zip'），可用變數同 --dir

  自架選項：
    --port, -p      連接埠（預設：8080）
    --web-root, -w  頁面根目錄位置（預設：'%title%/www'），可用變數同 --dir
                    若使用 <路徑>，則變數無效

  舉例：
    $ URL='https://ithelp.ithome.com.tw/users/12345678/ironman/1234'
    $ ithelp-ironman d "$URL"
    $ ithelp-ironman d "$URL" -d '[%author%] %title%'
    $ ithelp-ironman a "$URL" -o '[%author%] %title%.zip' -d '第87屆鐵人賽'
    $ ithelp-ironman s "$URL" -w '[%author%] %title%/public' -p 4321
```

## 授權

The MIT License (MIT)

Copyright (c) 2019 FlandreDaisuki
