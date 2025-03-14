# Testing the Slack Authentication Function

## Local Testing with Firebase Emulator

1. Install dependencies:
   ```
   cd functions
   npm install
   ```

2. Set up environment variables:
   ```
   # Create a .env file
   echo "SLACK_CLIENT_ID=your_slack_client_id
   SLACK_CLIENT_SECRET=your_slack_client_secret
   DEV_SLACK_BOT_TOKEN=your_dev_slack_bot_token
   DEV_SLACK_SIGNING_SECRET=your_dev_slack_signing_secret" > .env
   
   # Or set Firebase Functions config
   firebase login
   firebase functions:config:set slack.client_id="your_slack_client_id" slack.client_secret="your_slack_client_secret"
   firebase functions:config:export > .runtimeconfig.json
   ```

3. Start the Firebase emulator:
   ```
   npm run serve
   ```

4. Test the function:
   - Automated tests: `npm test`
   - Manual testing: `node test/manual-test.js`

## Setting Up a Staging Environment

1. Create a new Firebase project for staging:
   ```
   firebase projects:create product-kintore-staging
   ```

2. Update .firebaserc to include the staging project:
   ```json
   {
     "projects": {
       "default": "product-kintore",
       "staging": "product-kintore-staging"
     }
   }
   ```

3. Deploy to staging:
   ```
   firebase use staging
   firebase deploy --only functions
   ```

4. Test the deployed function:
   ```
   # Update the function URL in test/manual-test.js
   const functionUrl = 'https://asia-northeast1-product-kintore-staging.cloudfunctions.net/slackAuth';
   
   # Run the test
   node test/manual-test.js
   ```

## CI/CD Pipeline Setup (Recommendation)

1. Create a GitHub Actions workflow file:
   ```yaml
   # .github/workflows/firebase-functions.yml
   name: Deploy Firebase Functions
   
   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]
   
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Use Node.js 16
           uses: actions/setup-node@v3
           with:
             node-version: 16
         - name: Install dependencies
           run: cd functions && npm ci
         - name: Run tests
           run: cd functions && npm test
     
     deploy-staging:
       needs: test
       if: github.event_name == 'pull_request'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Use Node.js 16
           uses: actions/setup-node@v3
           with:
             node-version: 16
         - name: Install dependencies
           run: cd functions && npm ci
         - name: Deploy to Firebase
           uses: FirebaseExtended/action-hosting-deploy@v0
           with:
             repoToken: '${{ secrets.GITHUB_TOKEN }}'
             firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_STAGING }}'
             projectId: product-kintore-staging
             channelId: pr-${{ github.event.number }}
     
     deploy-production:
       needs: test
       if: github.event_name == 'push' && github.ref == 'refs/heads/main'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Use Node.js 16
           uses: actions/setup-node@v3
           with:
             node-version: 16
         - name: Install dependencies
           run: cd functions && npm ci
         - name: Deploy to Firebase
           uses: FirebaseExtended/action-hosting-deploy@v0
           with:
             repoToken: '${{ secrets.GITHUB_TOKEN }}'
             firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT_PROD }}'
             projectId: product-kintore
             channelId: live
   ```

2. Set up GitHub repository secrets:
   - FIREBASE_SERVICE_ACCOUNT_STAGING: Service account key for staging project
   - FIREBASE_SERVICE_ACCOUNT_PROD: Service account key for production project

## Slack App Configuration

1. Update the Redirect URL in Slack App settings:
   - Development: `https://asia-northeast1-product-kintore-dev.cloudfunctions.net/slackAuth`
   - Staging: `https://asia-northeast1-product-kintore-staging.cloudfunctions.net/slackAuth`
   - Production: `https://asia-northeast1-product-kintore.cloudfunctions.net/slackAuth`

2. Verify OAuth scopes:
   - `openid`
   - `users:read`
   - `users:read.email`
