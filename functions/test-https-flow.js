/**
 * Slack認証フローのエンドツーエンドテスト
 * 
 * このスクリプトは、Slack認証フローの完全なテストを行います。
 * 1. slackLoginエンドポイントへのアクセス
 * 2. Cookieの設定と状態の保存
 * 3. slackAuthエンドポイントへのリダイレクト
 * 4. 認証トークンの取得と検証
 */

const axios = require('axios');
const https = require('https');
const { URL } = require('url');

// テスト設定
const config = {
  // ローカルテスト用URL
  localBaseUrl: 'http://localhost:5001/product-kintore-dev/us-central1',
  
  // トンネル経由のURL (HTTPS)
  tunnelBaseUrl: 'https://kintore-slack-test.loca.lt/product-kintore-dev/us-central1',
  
  // ステージング環境URL (HTTPS)
  stagingBaseUrl: 'https://us-central1-product-kintore-dev.cloudfunctions.net',
  
  // 本番環境URL (HTTPS)
  productionBaseUrl: 'https://us-central1-product-kintore.cloudfunctions.net',
  
  // テスト環境の選択 (local, tunnel, staging, production)
  environment: "tunnel"
};

// 使用するベースURL
const baseUrl = config[`${config.environment}BaseUrl`];

// HTTPSリクエスト用の設定
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // 自己署名証明書を許可（開発環境のみ）
  }),
  maxRedirects: 0, // リダイレクトを手動で処理
  validateStatus: status => status >= 200 && status < 400
});

// Cookieを保存するオブジェクト
let cookies = {};

/**
 * Cookieヘッダーを解析する
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = value;
    return cookies;
  }, {});
}

/**
 * slackLoginエンドポイントをテスト
 */
async function testSlackLogin() {
  console.log(`\n=== Testing slackLogin endpoint (${config.environment}) ===`);
  console.log(`URL: ${baseUrl}/slackLogin`);
  
  try {
    const response = await axiosInstance.get(`${baseUrl}/slackLogin`);
    
    console.log('Response status:', response.status);
    
    if (response.headers.location) {
      console.log('Redirect URL:', response.headers.location);
      
      // Slackの認証URLからstateパラメータを抽出
      const redirectUrl = new URL(response.headers.location);
      const state = redirectUrl.searchParams.get('state');
      console.log('State parameter:', state);
      
      // Cookieを保存
      if (response.headers['set-cookie']) {
        console.log('Set-Cookie:', response.headers['set-cookie']);
        cookies = parseCookies(response.headers['set-cookie'][0]);
        console.log('Parsed cookies:', cookies);
      }
      
      return {
        state,
        redirectUrl: response.headers.location
      };
    }
  } catch (error) {
    if (error.response) {
      console.log('Response status:', error.response.status);
      
      if (error.response.headers.location) {
        console.log('Redirect URL:', error.response.headers.location);
        
        // Slackの認証URLからstateパラメータを抽出
        const redirectUrl = new URL(error.response.headers.location);
        const state = redirectUrl.searchParams.get('state');
        console.log('State parameter:', state);
        
        // Cookieを保存
        if (error.response.headers['set-cookie']) {
          console.log('Set-Cookie:', error.response.headers['set-cookie']);
          cookies = parseCookies(error.response.headers['set-cookie'][0]);
          console.log('Parsed cookies:', cookies);
        }
        
        return {
          state,
          redirectUrl: error.response.headers.location
        };
      }
    } else {
      console.error('Error:', error.message);
    }
  }
  
  return null;
}

/**
 * slackAuthエンドポイントをテスト
 */
async function testSlackAuth(state) {
  console.log(`\n=== Testing slackAuth endpoint (${config.environment}) ===`);
  
  // テスト用のコード
  const mockCode = 'mock_test_code_123';
  
  const url = `${baseUrl}/slackAuth?code=${mockCode}&state=${state}`;
  console.log(`URL: ${url}`);
  
  // Cookieヘッダーを構築
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  
  try {
    const response = await axiosInstance.get(url, {
      headers: {
        'Cookie': cookieHeader
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.headers.location) {
      console.log('Redirect URL:', response.headers.location);
      
      // リダイレクトURLからパラメータを抽出
      const redirectUrl = new URL(response.headers.location);
      console.log('Custom token:', redirectUrl.searchParams.get('t'));
      console.log('Email:', redirectUrl.searchParams.get('e'));
      console.log('User ID:', redirectUrl.searchParams.get('u'));
      console.log('Name:', redirectUrl.searchParams.get('n'));
      console.log('Picture:', redirectUrl.searchParams.get('p'));
      
      return {
        success: true,
        redirectUrl: response.headers.location
      };
    }
  } catch (error) {
    if (error.response) {
      console.log('Response status:', error.response.status);
      
      if (error.response.headers.location) {
        console.log('Redirect URL:', error.response.headers.location);
        
        // リダイレクトURLからパラメータを抽出
        const redirectUrl = new URL(error.response.headers.location);
        console.log('Custom token:', redirectUrl.searchParams.get('t'));
        console.log('Email:', redirectUrl.searchParams.get('e'));
        console.log('User ID:', redirectUrl.searchParams.get('u'));
        console.log('Name:', redirectUrl.searchParams.get('n'));
        console.log('Picture:', redirectUrl.searchParams.get('p'));
        
        return {
          success: true,
          redirectUrl: error.response.headers.location
        };
      } else {
        console.log('Response body:', error.response.data);
      }
    } else {
      console.error('Error:', error.message);
    }
  }
  
  return { success: false };
}

/**
 * 完全なSlack認証フローをテスト
 */
async function testFullSlackAuthFlow() {
  console.log(`\n=== Testing Full Slack Auth Flow (${config.environment}) ===`);
  
  // 1. slackLoginエンドポイントをテスト
  const loginResult = await testSlackLogin();
  
  if (!loginResult) {
    console.error('Failed to test slackLogin endpoint');
    return;
  }
  
  // 2. slackAuthエンドポイントをテスト
  const authResult = await testSlackAuth(loginResult.state);
  
  if (authResult.success) {
    console.log('\n✅ Full Slack Auth Flow Test Completed Successfully!');
  } else {
    console.error('\n❌ Full Slack Auth Flow Test Failed!');
  }
}

// テストを実行
console.log(`Starting Slack Auth Flow Tests in ${config.environment.toUpperCase()} environment`);
console.log(`Base URL: ${baseUrl}`);
testFullSlackAuthFlow();
