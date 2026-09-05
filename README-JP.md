# Quick Commander

[English](README.md) | 日本語

よく利用するVSCodeコマンドをExplorerサイドバーに一覧表示し、クリック1回で実行できるVSCode拡張機能です。

コマンドパレット（`Cmd+Shift+P`）は「コマンド名を覚えている」ことが前提ですが、
Quick Commanderは**コマンド名の昇順に並んだ一覧から選ぶ**ことで、コマンドの発見性と実行速度を高めます。

## 内蔵コマンド

初期状態では以下の3つのコマンドを内蔵しています（**コマンド名の昇順**で表示されます）。

| # | コマンド名 | コマンドID | 説明 |
| --- | --- | --- | --- |
| 1 | Duplicate As Workspace in New Window | `workbench.action.duplicateWorkspaceInNewWindow` | 現在のワークスペースを新しいウィンドウで複製する |
| 2 | Merge All Windows | `workbench.action.mergeAllWindowTabs` | すべてのウィンドウを1つにまとめる（**macOS専用**） |
| 3 | Open Integrated Browser | `workbench.action.browser.open` | 統合ブラウザを開く |

コマンドの追加は `quickCommander.customCommands` 設定から行えます。

### 利用可否について

現在の環境で利用できないコマンドは、既定では一覧に表示されません。

| コマンド | 前提条件 |
| --- | --- |
| Merge All Windows | macOSかつ `window.nativeTabs` が有効であること |
| Open Integrated Browser | 統合ブラウザを搭載したバージョンのVSCode（1.136以降で確認） |

`quickCommander.showUnavailableCommands` を有効にすると、利用できないコマンドも警告アイコン付きで表示されます。

## 機能

| 機能 | 説明 |
| --- | --- |
| コマンド一覧 | コマンド名の昇順のフラットな一覧。クリックで即実行 |
| Favorites | ★ を付けたコマンドを最上位に表示（コマンド名の昇順） |
| Recently Used | 直近に実行したコマンドを**実行が新しい順**で表示 |
| クイック検索 | ビューヘッダーの `$(search)` からQuickPickで絞り込み実行 |
| カスタムコマンド | 設定から任意のコマンドを一覧に追加 |
| カテゴリ表示 | `groupByCategory` を有効にするとカテゴリごとのグルーピング表示に切替 |
| コマンドIDコピー | 右クリックメニューからコマンドIDをクリップボードへコピー |

### 並び順の仕様

| 対象 | 並び順 |
| --- | --- |
| メインのコマンド一覧 | コマンド名の昇順 |
| Favorites | コマンド名の昇順 |
| Recently Used | 実行が新しい順（履歴という性質上、名前順にはしません） |
| クイック検索（QuickPick） | コマンド名の昇順 |
| カテゴリ表示時のカテゴリ内 | コマンド名の昇順 |

昇順の比較はロケール `en` 固定・大文字小文字を区別しない・数字は自然順（`Item 2` → `Item 10`）です。

## 設定

| 設定キー | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `quickCommander.groupByCategory` | boolean | `false` | カテゴリごとにグルーピング表示する |
| `quickCommander.visibleCategories` | string[] | 全カテゴリ | 一覧に表示するカテゴリ |
| `quickCommander.customCommands` | object[] | `[]` | 一覧に追加するコマンド |
| `quickCommander.historyLimit` | number | `10` | Recently Used に保持する件数 |
| `quickCommander.showUnavailableCommands` | boolean | `false` | 利用できないコマンドも表示する |
| `quickCommander.showFavoritesSection` | boolean | `true` | Favorites セクションを表示する |
| `quickCommander.showRecentSection` | boolean | `true` | Recently Used セクションを表示する |

### カスタムコマンドの追加例

```jsonc
{
  "quickCommander.customCommands": [
    {
      "id": "workbench.action.terminal.new",
      "label": "Create New Terminal",
      "category": "custom",
      "description": "Open a new terminal",
      "icon": "terminal"
    },
    {
      "id": "workbench.action.toggleZenMode",
      "label": "Toggle Zen Mode",
      "icon": "screen-full"
    }
  ]
}
```

| プロパティ | 必須 | 説明 |
| --- | --- | --- |
| `id` | ○ | VSCodeのコマンドID |
| `label` | ○ | 一覧に表示する名前（この名前で昇順に並びます） |
| `category` | | `browser` / `workspace` / `window` / `custom`（既定: `custom`） |
| `description` | | ツールチップに表示する補足説明 |
| `icon` | | [ThemeIcon](https://code.visualstudio.com/api/references/icons-in-labels) のID |
| `args` | | コマンド実行時に渡す引数 |

## 開発

```bash
# 依存関係のインストール
npm install

# TypeScriptをコンパイル
npm run compile

# Watch モードでコンパイル
npm run watch

# テスト
npm test

# カバレッジ付きテスト
npm run test:coverage

# VSIXパッケージを作成
npx vsce package
```

F5キーでExtension Development Hostを起動して動作確認できます。

## ライセンス

ISC
