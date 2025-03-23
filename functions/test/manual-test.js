const axios = require('axios');

// Firebase Functions URL for local testing
const functionUrl = 'http://127.0.0.1:5001/product-kintore/us-central1/slackAuth';

// Mock Slack OAuth code for testing
const mockCode = 'mock_test_code_123';
const mockState = 'mock_state_123';

// テストのためのcookieを設定
function setCookie(name, value) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

// Create a mock implementation for testing without actual API calls
async function testWithMocks() {
  console.log('Starting mock test for slackAuth function...');
  console.log(`Testing with URL: ${functionUrl}?code=${mockCode}&state=${mockState}`);
  
  // Mock successful response with redirect
  const mockRedirectUrl = 'https://product-kintore-dev.web.app/?t=mock_custom_token&e=test@example.com&p=https://avatar.url/img.jpg&n=Test%20User&u=U12345678';
  
  console.log('Simulating successful authentication flow...');
  console.log('Redirect URL:', mockRedirectUrl);
  
  const params = new URL(mockRedirectUrl).searchParams;
  console.log('Custom token:', params.get('t'));
  console.log('Email:', params.get('e'));
  console.log('User ID:', params.get('u'));
  console.log('Name:', params.get('n'));
  console.log('Picture:', params.get('p'));
  
  console.log('Mock test completed successfully!');
}

// Actual test with real API call
async function testSlackAuth() {
  console.log('Starting real API test for slackAuth function...');
  console.log(`Testing with URL: ${functionUrl}?code=${mockCode}&state=${mockState}`);
  
  try {
    // cookieを設定してリクエストを送信
    await axios.get(`${functionUrl}?code=${mockCode}&state=${mockState}`, {
      headers: {
        'Cookie': setCookie('slackAuthState', mockState)
      },
      // Use localhost instead of ::1
      proxy: false,
      baseURL: 'http://127.0.0.1:5001'
    });
  } catch (error) {
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response headers:', error.response.headers);
      
      // Check if there's a redirect
      if (error.response.status === 303) {
        console.log('Redirect URL:', error.response.headers.location);
        const params = new URL(error.response.headers.location).searchParams;
        console.log('Custom token:', params.get('t'));
        console.log('Email:', params.get('e'));
        console.log('User ID:', params.get('u'));
        console.log('Name:', params.get('n'));
        console.log('Picture:', params.get('p'));
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Test the slackLogin endpoint
async function testSlackLogin() {
  const loginUrl = 'http://127.0.0.1:5001/product-kintore/us-central1/slackLogin';
  console.log('Testing slackLogin endpoint...');
  
  try {
    const response = await axios.get(loginUrl, {
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400,
      // Use localhost instead of ::1
      proxy: false,
      baseURL: 'http://127.0.0.1:5001'
    });
    
    console.log('Response status:', response.status);
    console.log('Redirect URL:', response.headers.location);
    console.log('Set-Cookie:', response.headers['set-cookie']);
    
    // Extract state from redirect URL
    const redirectUrl = new URL(response.headers.location);
    const state = redirectUrl.searchParams.get('state');
    console.log('State parameter:', state);
    
  } catch (error) {
    if (error.response) {
      console.log('Response status:', error.response.status);
      if (error.response.headers.location) {
        console.log('Redirect URL:', error.response.headers.location);
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run tests
console.log('=== Running Slack Authentication Tests ===');
testWithMocks();
console.log('\n=== Testing slackLogin Endpoint ===');
testSlackLogin();
console.log('\n=== Testing slackAuth Endpoint ===');
testSlackAuth();
