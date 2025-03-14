# 環境変数の優先順位と使用方法

## 現在の実装

現在のコードでは、環境変数を以下の優先順位で読み込んでいます：

```javascript
client_id: process.env.SLACK_CLIENT_ID || 
         (functions.config().slack && functions.config().slack.client_id) || 
         defineString("SLACK_CLIENT_ID").value(),
```

## 優先順位の説明

1. **`process.env.SLACK_CLIENT_ID`** (最優先)
   - ローカル開発環境で使用
   - `.env`ファイルから読み込まれる
   - 開発者がローカルテスト時に使用する想定

2. **`functions.config().slack.client_id`** (次点)
   - デプロイ環境（開発・本番）で使用
   - Firebase CLIで設定された環境変数
   - `firebase functions:config:set slack.client_id="xxx"`で設定

3. **`defineString("SLACK_CLIENT_ID").value()`** (最終フォールバック)
   - Firebase Functions v6以降で導入されたパラメータ機能
   - デプロイ時に設定ファイルから読み込まれる
   - CI/CDパイプラインでの設定に使用可能

## 環境別の推奨設定方法

### ローカル開発環境

1. `.env`ファイルを作成：
```
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
SLACK_SIGNING_SECRET=xxx
DEV_SLACK_SIGNING_SECRET=xxx
```

2. ローカルエミュレーターで設定：
```bash
firebase functions:config:set slack.client_id="xxx" slack.client_secret="xxx" --project=product-kintore-dev
firebase functions:config:get > .runtimeconfig.json
```

### 開発環境（product-kintore-dev）

```bash
firebase use development
firebase functions:config:set slack.client_id="xxx" slack.client_secret="xxx" slack.signing_secret="xxx"
```

### 本番環境（product-kintore）

```bash
firebase use default
firebase functions:config:set slack.client_id="xxx" slack.client_secret="xxx" slack.signing_secret="xxx"
```

## 注意事項

1. 機密情報（クライアントID/シークレット）はソースコードにハードコーディングしないでください
2. `.env`ファイルや`.runtimeconfig.json`はGitリポジトリにコミットしないでください
3. 本番環境の設定は権限のある管理者のみが行ってください
4. 環境変数の変更後は必ずデプロイまたはエミュレーターの再起動が必要です
