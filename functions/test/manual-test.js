const axios = require('axios');

// Firebase Functions URL for local testing
const functionUrl = 'http://localhost:5001/product-kintore-dev/asia-northeast1/slackAuth';

// Mock Slack OAuth code for testing
const mockCode = 'mock_test_code_123';

// Create a mock implementation for testing without actual API calls
async function testWithMocks() {
  console.log('Starting mock test for slackAuth function...');
  console.log(`Testing with URL: ${functionUrl}?code=${mockCode}`);
  
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
  console.log(`Testing with URL: ${functionUrl}?code=${mockCode}`);
  
  try {
    // This will redirect, so we'll catch the error
    await axios.get(`${functionUrl}?code=${mockCode}`);
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

// Run both tests
testWithMocks();

// Run the real API test with the emulator
testSlackAuth();
