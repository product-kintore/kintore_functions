const axios = require('axios');

// Replace with your actual Firebase Functions URL
const functionUrl = 'http://localhost:5001/product-kintore-dev/asia-northeast1/slackAuth';

// Replace with a valid Slack OAuth code (this will be a one-time use code)
const mockCode = 'your_test_code';

async function testSlackAuth() {
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

testSlackAuth();
