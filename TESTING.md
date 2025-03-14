# Firebase Functions Testing Guide

## Local Testing Setup

### Prerequisites
- Node.js 16 (required for Firebase Functions)
- Firebase CLI (v11.30.0 or compatible with Node.js 16)
- Firebase Functions SDK v6.3.2

### Environment Setup
1. Install Node.js 16 using nvm:
   ```
   nvm install 16
   nvm use 16
   ```

2. Install Firebase CLI:
   ```
   npm install -g firebase-tools@11.30.0
   ```

3. Install dependencies:
   ```
   cd functions
   npm install
   ```

### Environment Variables
Create a `.env` file in the `functions` directory with the following variables for local testing:
```
SLACK_CLIENT_ID=dummy_client_id
SLACK_CLIENT_SECRET=dummy_client_secret
SLACK_SIGNING_SECRET=dummy_signing_secret
DEV_SLACK_SIGNING_SECRET=dummy_dev_signing_secret
```

### Running the Emulator
1. Start the Firebase emulator:
   ```
   cd functions
   nvm use 16
   firebase emulators:start --only functions
   ```

2. Test the slackAuth function:
   ```
   node test/manual-test.js
   ```

## Testing the Slack Authentication Flow

### Manual Testing
The `test/manual-test.js` script provides two testing methods:
1. Mock test - Tests the flow without making actual API calls
2. Real API test - Tests the actual API endpoint in the emulator

### Expected Results
A successful test should show:
- Redirect to the frontend URL with parameters
- Custom token in the URL parameters
- User information (email, name, picture, user ID)

## Troubleshooting

### Common Issues
1. **404 Error**: Function not found
   - Check that function syntax matches Firebase Functions v6.3.2 requirements
   - Ensure function is exported correctly in index.js

2. **Firebase Admin SDK Errors**
   - Ensure admin.initializeApp() is called only once
   - For local testing, use a mock implementation that doesn't require authentication

3. **Node.js Version Mismatch**
   - Ensure Node.js 16 is used for both npm install and running the emulator
   - Check package.json engines field is set to "node": "16"
