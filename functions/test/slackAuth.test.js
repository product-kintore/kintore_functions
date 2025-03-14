const test = require('firebase-functions-test')();
const myFunctions = require('../index');
const slackAuthWrapped = test.wrap(myFunctions.slackAuth);

// Mock axios for API calls
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    post: jest.fn().mockResolvedValue({
      data: {
        access_token: 'mock_bot_token',
        authed_user: {
          access_token: 'mock_user_token'
        }
      }
    }),
    get: jest.fn().mockImplementation((url) => {
      if (url.includes('openid.connect.userInfo')) {
        return Promise.resolve({
          data: {
            sub: 'mock_user_id',
            email: 'mock_email@example.com',
            picture: 'mock_picture_url'
          }
        });
      } else if (url.includes('users.info')) {
        return Promise.resolve({
          data: {
            user: {
              profile: {
                display_name: 'Mock User'
              }
            }
          }
        });
      }
    })
  })
}));

// Mock admin.auth().createCustomToken
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  instanceId: jest.fn().mockReturnValue({
    app: {
      options: {
        projectId: 'product-kintore-dev'
      }
    }
  }),
  auth: jest.fn().mockReturnValue({
    createCustomToken: jest.fn().mockResolvedValue('mock_custom_token')
  })
}));

describe('slackAuth', () => {
  it('should redirect with custom token on success', async () => {
    const req = {
      query: {
        code: 'mock_auth_code'
      }
    };
    
    const res = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn()
    };
    
    await slackAuthWrapped(req, res);
    
    expect(res.redirect).toHaveBeenCalledWith(
      303,
      expect.stringContaining('t=mock_custom_token')
    );
  });
  
  it('should return 500 on error', async () => {
    // Mock axios to throw an error
    require('axios').create.mockReturnValueOnce({
      post: jest.fn().mockRejectedValue(new Error('Mock error'))
    });
    
    const req = {
      query: {
        code: 'invalid_code'
      }
    };
    
    const res = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn()
    };
    
    await slackAuthWrapped(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.end).toHaveBeenCalled();
  });
});
