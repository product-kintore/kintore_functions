# 環境変数の設定方法

このドキュメントでは、kintore_functionsプロジェクトで使用される環境変数の設定方法について説明します。

## 環境変数の優先順位

環境変数は以下の優先順位で読み込まれます：

1. プロセス環境変数（`process.env`）
2. Firebase Functions構成（`functions.config()`）
3. Firebase Functions Parameters（`defineString()`）

## 開発環境での設定方法

### ローカル開発環境

ローカル開発環境では、以下の方法で環境変数を設定できます：

1. `.env`ファイルを作成：
```
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
SLACK_SIGNING_SECRET=xxx
DEV_SLACK_CLIENT_ID=xxx
DEV_SLACK_CLIENT_SECRET=xxx
DEV_SLACK_SIGNING_SECRET=xxx
COOKIE_SECRET=xxxxxx  # Cookie署名用のシークレット
```

2. Firebase Functions構成を使用：
```bash
firebase functions:config:set slack.client_id="xxx" slack.client_secret="xxx" slack.signing_secret="xxx"
```

3. ローカルでFirebase Functions構成を使用するには：
```bash
firebase functions:config:get > .runtimeconfig.json
```

### 本番環境

本番環境では、Firebase Functionsの構成を使用して環境変数を設定します：

```bash
firebase functions:config:set --project=product-kintore slack.client_id="xxx" slack.client_secret="xxx" slack.signing_secret="xxx"
```

## 必要な環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| SLACK_CLIENT_ID | Slack APIのクライアントID | はい |
| SLACK_CLIENT_SECRET | Slack APIのクライアントシークレット | はい |
| SLACK_SIGNING_SECRET | SlackイベントAPIの署名シークレット | はい |
| DEV_SLACK_CLIENT_ID | 開発環境用のSlack APIクライアントID | 開発時のみ |
| DEV_SLACK_CLIENT_SECRET | 開発環境用のSlack APIクライアントシークレット | 開発時のみ |
| DEV_SLACK_SIGNING_SECRET | 開発環境用のSlackイベントAPI署名シークレット | 開発時のみ |
| COOKIE_SECRET | Cookie署名用のシークレット | はい |

## セキュリティに関する注意事項

- 環境変数には機密情報が含まれるため、`.env`ファイルや`.runtimeconfig.json`ファイルをGitリポジトリにコミットしないでください。
- これらのファイルは`.gitignore`に追加されていることを確認してください。
- 本番環境の秘密鍵は、Firebase Functionsの構成を使用して設定し、ソースコードには含めないでください。
