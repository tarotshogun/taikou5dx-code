# taikou5dx-code README

![Title](https://raw.githubusercontent.com/tarot-shogun/tarot-shogun/main/images/taikou5dx-code.png)

この拡張機能は「太閤立志伝V DX」のイベントソース作成を支援する拡張機能です。

## 機能

現状ではシンタックスハイライトのみを機能として有しています。
自動補完や静的解析機能は今後の開発予定のアイテムです。

### 開発予定の機能

今後の拡張機能として下記を予定しています。

- コード補完機能
- プロパティの情報表示機能
- スクリプトの静的解析機能
- スクリプトのフォーマット機能

バグフィックスや機能追加などプルリクエストは随時お待ちしております。

## 使い方

1. イベントスクリプトファイルを開きます

1. VS Codeの「言語モードの選択」から `taikou5dx` を選択してください

### 推奨設定

ワークスペースの設定に下記を追加することをお勧めします。

```json
{
  "settings": {
    "files.encoding": "shiftjis",
    "files.eol": "\r\n",
    "editor.insertSpaces": false,
    "files.associations": {
      "*.txt": "taikou5dx"
    }
  }
}
```

## 既知の課題

## リリースノート

### 0.1.0

イベントスクリプト用のシンタックスハイライト機能を追加
