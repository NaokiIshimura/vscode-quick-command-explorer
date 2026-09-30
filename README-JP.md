# Quick Command Explorer

[English](README.md) | 日本語

よく利用するVSCodeコマンドをExplorerサイドバーに一覧表示し、クリック1回で実行できるVSCode拡張機能です。

コマンドパレット（`Cmd+Shift+P`）は「コマンド名を覚えている」ことが前提ですが、
Quick Command Explorerは**コマンド名の昇順に並んだ一覧から選ぶ**ことで、コマンドの発見性と実行速度を高めます。

## 内蔵コマンド

初期状態では以下の6つのコマンドを内蔵しています。カテゴリごとにグルーピングされ、カテゴリ内は**コマンド名の昇順**で表示されます。

| カテゴリ | コマンド名 | コマンドID | 説明 |
| --- | --- | --- | --- |
| Workspace | Duplicate As Workspace in New Window | `workbench.action.duplicateWorkspaceInNewWindow` | 現在のワークスペースを新しいウィンドウで複製する |
| Window | Merge All Windows | `workbench.action.mergeAllWindowTabs` | すべてのウィンドウを1つにまとめる（**macOS専用**） |
| Integrated Browser | Open Integrated Browser | `workbench.action.browser.open` | 統合ブラウザを開く |
| Integrated Browser | Open Integrated Browser on the Right | `quickCommander.openIntegratedBrowserOnTheRight` | 統合ブラウザを開き、右側のエディタグループへ移動する |
| Repository | Open Repository on GitHub | `quickCommander.openRepositoryOnGitHub` | 開いているリポジトリのリモートのページを外部ブラウザで開く |
| Repository | Open Repository on GitHub in Integrated Browser | `quickCommander.openRepositoryOnGitHubInIntegratedBrowser` | 同じページを統合ブラウザで開く |

コマンドの追加は `quickCommander.customCommands` 設定から行えます。

### Open Integrated Browser on the Right について

このコマンドはVSCode組み込みのコマンドではなく、本拡張機能が提供するコマンドです。

統合ブラウザはアクティブなエディタグループで開くため、そのままでは開いていたコードが
隠れてしまいます。そこで、開いた直後に `workbench.action.moveEditorToRightGroup` を
実行し、左にコード・右にブラウザという分割状態にします。

### Open Repository on GitHub について

この2つのコマンドはVSCode組み込みのコマンドではなく、本拡張機能が提供するコマンドです。

VSCode組み込みのGit拡張から、現在のウィンドウで開いているリポジトリのリモートを取得し、
リモートURLをhttps形式に変換して開きます。開き先は外部ブラウザ、
`in Integrated Browser` の方は統合ブラウザです。

| 項目 | 挙動 |
| --- | --- |
| リポジトリ | ウィンドウで最初に開かれているリポジトリ |
| リモート | `origin`、無ければURLを持つ最初のリモート |
| URL | SSH形式（`git@github.com:owner/repo.git`）とスキーム形式（`https://` / `ssh://` / `git://`）のいずれも `https://host/owner/repo` に変換します |

Git拡張が無効な場合、リポジトリを開いていない場合、リモートが未設定の場合、
リモートURLを変換できない場合は、ページを開かずに警告を表示します。

### 利用可否について

現在の環境で利用できないコマンドは、既定では一覧に表示されません。

| コマンド | 前提条件 |
| --- | --- |
| Merge All Windows | macOSかつ `window.nativeTabs` が有効であること |
| Open Integrated Browser | 統合ブラウザを搭載したバージョンのVSCode（1.136以降で確認） |
| Open Integrated Browser on the Right | 上と同じ、加えて `workbench.action.moveEditorToRightGroup` が利用できること |
| Open Repository on GitHub in Integrated Browser | 上と同じ（`workbench.action.browser.open` にURLを渡すため） |

`quickCommander.showUnavailableCommands` を有効にすると、利用できないコマンドも警告アイコン付きで表示されます。

## 機能

| 機能 | 説明 |
| --- | --- |
| コマンド一覧 | カテゴリ（Workspace → Window → Integrated Browser → Repository → Custom）ごとにグルーピング表示。クリックで即実行 |
| Favorites | ★ を付けたコマンドを最上位に表示（コマンド名の昇順）。起動直後は折りたたみ状態 |
| クイック検索 | ビューヘッダーの `$(search)` からQuickPickで絞り込み実行 |
| カスタムコマンド | 設定から任意のコマンドを一覧に追加 |
| フラット表示 | `groupByCategory` を無効にするとコマンド名の昇順のフラットな一覧に切替 |
| コマンドIDコピー | 右クリックメニューからコマンドIDをクリップボードへコピー |

### 並び順の仕様

| 対象 | 並び順 |
| --- | --- |
| カテゴリ | Workspace → Window → Integrated Browser → Repository → Custom |
| カテゴリ内 | コマンド名の昇順 |
| フラット表示（`groupByCategory` 無効時） | コマンド名の昇順 |
| Favorites | コマンド名の昇順 |
| クイック検索（QuickPick） | コマンド名の昇順 |

昇順の比較はロケール `en` 固定・大文字小文字を区別しない・数字は自然順（`Item 2` → `Item 10`）です。

## 設定

| 設定キー | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `quickCommander.groupByCategory` | boolean | `true` | カテゴリごとにグルーピング表示する |
| `quickCommander.visibleCategories` | string[] | 全カテゴリ | 一覧に表示するカテゴリ |
| `quickCommander.customCommands` | object[] | `[]` | 一覧に追加するコマンド |
| `quickCommander.showUnavailableCommands` | boolean | `false` | 利用できないコマンドも表示する |
| `quickCommander.showFavoritesSection` | boolean | `true` | Favorites セクションを表示する |

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
| `category` | | `workspace` / `window` / `integratedBrowser` / `repository` / `custom`（既定: `custom`） |
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
