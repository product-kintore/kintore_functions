/**
 * HTTPS テストサーバー
 * 
 * このスクリプトは、自己署名証明書を使用してHTTPSサーバーを起動し、
 * Firebase Functionsエミュレーターへのプロキシとして機能します。
 * Slack認証のテストに使用します。
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cookieParser = require('cookie-parser');

// 設定
const config = {
  // HTTPSサーバーのポート
  httpsPort: 3443,
  
  // Firebase Functionsエミュレーターのアドレス
  functionsEmulatorHost: 'http://localhost:5001'
};

// 証明書の読み込み
const sslDir = path.join(__dirname, '..', '.ssl');
const options = {
  key: fs.readFileSync(path.join(sslDir, 'key.pem')),
  cert: fs.readFileSync(path.join(sslDir, 'cert.pem'))
};

// Expressアプリの作成
const app = express();

// Cookieパーサーの設定
app.use(cookieParser());

// リクエストロガー
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Firebase Functionsエミュレーターへのプロキシ
app.use('/product-kintore', createProxyMiddleware({
  target: config.functionsEmulatorHost,
  changeOrigin: true,
  pathRewrite: {
    '^/product-kintore': '/product-kintore'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Cookieの転送
    if (req.cookies) {
      const cookieString = Object.entries(req.cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
      
      if (cookieString) {
        proxyReq.setHeader('Cookie', cookieString);
      }
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Set-Cookieヘッダーの処理
    const setCookieHeader = proxyRes.headers['set-cookie'];
    if (setCookieHeader) {
      console.log('Set-Cookie from proxy:', setCookieHeader);
    }
  }
}));

// ルートパスのハンドラー
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Slack認証テスト</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        button { padding: 10px 15px; background: #4CAF50; color: white; border: none; cursor: pointer; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow: auto; }
      </style>
    </head>
    <body>
      <h1>Slack認証テスト</h1>
      <p>このページでは、Slack認証フローをテストできます。</p>
      
      <h2>テスト手順</h2>
      <ol>
        <li>「Slackでログイン」ボタンをクリックします</li>
        <li>Slackの認証画面が表示されます</li>
        <li>認証が完了すると、リダイレクトされます</li>
      </ol>
      
      <button onclick="window.location.href='/product-kintore/us-central1/slackLogin'">
        Slackでログイン
      </button>
      
      <h2>テスト結果</h2>
      <div id="result">
        <p>テスト結果がここに表示されます。</p>
      </div>
      
      <script>
        // URLパラメータを解析
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('t');
        const email = urlParams.get('e');
        const picture = urlParams.get('p');
        const name = urlParams.get('n');
        const userId = urlParams.get('u');
        
        // 結果の表示
        if (token) {
          document.getElementById('result').innerHTML = 
            '<p>認証成功！</p>' +
            '<pre>' +
            'トークン: ' + token + '\n' +
            'メール: ' + email + '\n' +
            '名前: ' + name + '\n' +
            'ユーザーID: ' + userId + '\n' +
            'プロフィール画像: ' + picture + '\n' +
            '</pre>';
        }
      </script>
    </body>
    </html>
  `);
});

// HTTPSサーバーの作成と起動
https.createServer(options, app).listen(config.httpsPort, () => {
  console.log(`HTTPS server running at https://localhost:${config.httpsPort}/`);
  console.log(`Proxying requests to ${config.functionsEmulatorHost}`);
  console.log('\nテスト手順:');
  console.log('1. ブラウザで https://localhost:3443/ にアクセス');
  console.log('2. 証明書の警告が表示されたら「詳細設定」→「localhost にアクセスする」をクリック');
  console.log('3. 「Slackでログイン」ボタンをクリックしてテストを開始');
});
