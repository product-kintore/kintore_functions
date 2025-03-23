
const { WebClient } = require('@slack/web-api');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { createEventAdapter } = require('@slack/events-api');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const firestore = new Firestore();
admin.initializeApp();
const projectId = admin.instanceId().app.options.projectId;
const isDev = projectId != "product-kintore";
const slackEvents = createEventAdapter(isDev ? process.env.DEV_SLACK_SIGNING_SECRET : process.env.SLACK_SIGNING_SECRET);

const urlPattern = /<(https?:\/\/[^\s]+)>/g;
const fetchPageTitle = async (url) => {
  try {
    const response = await axios.get(url, { timeout : 10000 });
    const $ = cheerio.load(response.data);
    return $('title').text();
  } catch (error) {
    console.error(`Error fetching title for URL: ${url}`, error);
    return null;
  }
};

slackEvents.on('team_join', async (event) => {
  const webClient = new WebClient(isDev ? process.env.DEV_SLACK_BOT_TOKEN : process.env.SLACK_BOT_TOKEN);
  try {
    await webClient.chat.postMessage({
      channel: event.user.id,
      text: ":tada: プロダクト筋トレへようこそ\nここは「プロダクトづくりに関する知識を広げ、深め、身につける」を目的に、「他者から学び合う」コミュニティです。\nぜひ、みなさんで知見の交換をして良いプロダクトをつくっていきましょう！\n\n:eyes: どんな人がいるの？ // TBD: URLを貼る \n:eyes: まず何をすればいいの？ #0_自己紹介 に自己紹介を投稿してみてください！ // TBD: 新しいフローを案内したいのでURLをはる\n:eyes: 困った時は？\n #投書箱 か #2_雑談 もしくは <@D01GCTQH0AW>に 声をかけてください！",
    });

    const response = await webClient.users.info({
      user: event.user.id,
    });

    const timestamp = FieldValue.serverTimestamp();
    await firestore.collection('users').doc(event.user.id).set({
      id: event.user.id,
      name: event.user.name,
      email: response.user.profile.email,
      created_at: timestamp,
      updated_at: timestamp,
    });
  }
  catch (error) {
    console.error(error);
  }
});

slackEvents.on('message', async (event) => {
  console.log(event);

  const channelId = event.channel;
  if (channelId == "C0336LF8HEG" || channelId == "C01FY636KD5") await iikijiRecorder(event); // #bot-test or #1_いい記事系
  // if (channelId == "C01FY636KD5") await iikijiRecorder(event); // #bot-test or #1_いい記事系
  // if (channelId == "C0336LF8HEG" || channelId == "C01H2PN9ETA") await moyamoyaRecorder(event); // #bot-test or #3_モヤモヤ
  if (channelId == "C01H2PN9ETA") await moyamoyaRecorder(event); // #3_モヤモヤ
});

slackEvents.on('reaction_added', async (event) => {
  // 自己紹介チャンネル以外でリアクションされたときは無視する
  if (event.item.channel !== 'C05G11EHUP7' && event.item.channel !== 'C01H2P2M8F2') {
    return;
  }

  const webClient = new WebClient(isDev ? process.env.DEV_SLACK_BOT_TOKEN : process.env.SLACK_BOT_TOKEN);
  try {
    const snapshot = await firestore.collection('users')
      .where('latest_slack_thread', '==', event.item.ts)
      .get();

    if (snapshot.empty) {
      console.log('リアクションに一致する自己紹介はありませんでした');
      return;
    }  

    snapshot.forEach(async doc => {
      const userData = doc.data();
      await webClient.chat.postMessage({
        channel : userData.id,
        text    : `あなたの自己紹介にリアクションがありました:${event.reaction}:`
      });
      console.log(`ID: ${userData.id}, Name: ${userData.name}`);
    });
  } 
  catch (error) {
    console.error(error);
  }
});

async function iikijiRecorder(event) {
  if (event.thread_ts != undefined) {
    console.log("スレッド");
    const threadRef = firestore.collection('article_thread_replies').doc(event.thread_ts);
    try {
      await threadRef.set({
        user: event.user,
        text: event.text,
        ts: event.ts,
      });
    } catch (err) {
      console.log(`Error: ${JSON.stringify(err)}`)
    } 
    return;
  }

  const text = String(event.text);
  const urls = text.match(urlPattern);

  if (!urls) {
    console.log("URL含まれてない");
    return; 
  }

  const url = extractContent(urls[0]);
  const pageTitle = await fetchPageTitle(url);

  var notionEndpoint = 'https://api.notion.com/v1/pages';
  var notion_token = 'secret_G2WfIJxYjdQqui6kRWqz9AhEfkELojwTFOEMb9wywhE';
  var database_id = 'e05f4508812f4648963ad6934f6be159';
  var headers = {
    'Content-Type' : 'application/json',
    'Authorization': 'Bearer ' + notion_token,
    'Notion-Version': '2022-06-28',
  };

  var post_data = {
    'parent': {'database_id': database_id},
    'properties': {
      "title": {
          "title": [
              {
                  "type": "text",
                  "text": {
                      "content": pageTitle
                  }
              }
          ]
      },
      "link": {
          "url": url
      },
      "slackMessageUrl": {
          "url":  `https://product-kintore.slack.com/archives/${event.channel}/p${event.ts.replace('.', '')}`,
      },
      "Property": {
          "rich_text": [
              {
                  "text": {
                      "content": text
                  }
              }
          ]
      },
    },
  };

  await axios.post(notionEndpoint, post_data, {headers: headers});  

  const messagesRef = firestore.collection('articles');
  const messageData = {
    url: url,
    title: pageTitle,
    message: text,
    ts: event.ts,
    slackMessageUrl: `https://product-kintore.slack.com/archives/${event.channel}/p${event.ts.replace('.', '')}`,
  };
  await messagesRef.add(messageData);
}

async function moyamoyaRecorder(event) {
  const { text, ts, user, thread_ts, permalink } = event;
  const createdAt = new Date(parseFloat(ts) * 1000);

  if (event.thread_ts != undefined) {
    console.log("スレッド");
    // スレッドでの返信の場合、親スレッドのcommentに追加する
    const parentDocRef = firestore.collection('moyamoya').doc(thread_ts);
    const parentDoc = await parentDocRef.get();
    if (parentDoc.exists) {
      const parentData = parentDoc.data();
      const newComment = {
        comment: text,
        commented: user,
        createdAt: createdAt.toString(),
      };
      let comments = parentData.comments || [];
      comments.push(newComment);
      await parentDocRef.update({ comments });
    } else {
      console.log("親なし子");
    }
    return;
  }

  const title = text.substring(0, 20);
  const data = {
    moyamoya: text,
    createdAt: createdAt,
    moyamoyaUser: user,
    title: title,
    ts: ts,
    slackMessageUrl: `https://product-kintore.slack.com/archives/${event.channel}/p${ts.replace('.', '')}`,
  };
  console.log(data)
  await firestore.collection('moyamoya').doc(ts).set(data);
}

function extractContent(tag) {
  const regex = /<([^>]+)>/;
  const match = tag.match(regex);
  return match ? match[1] : null;
}

exports.slackApp = functions.https.onRequest(async (req, res) => {
  console.log('Received a request');
  slackEvents.requestListener()(req, res);
});

exports.postNewComer = functions.https.onRequest(async (req, res) => {
  let text = "今週、新しく参加してくださった方を紹介します:tada::tada:あたたかくお迎えしましょう:muscle: \n";
  text += "--------------\n";

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  try {
    const snapshot = await firestore.collection('users')
      .where('created_at', '>', oneWeekAgo)
      .get();

    if (snapshot.empty) {
      console.log('今週の参加者はいなかったよ');
      return;
    }  

    snapshot.forEach(doc => {
      const userData = doc.data();
      text += `<https://product-kintore.web.app/profile/${userData.profile}|${userData.name}さん><@${userData.id}>\n`; // TBD: urlは適当
      if(userData.company != undefined) text += `　　所属は${userData.company}\n`;
      if(userData.role!= undefined) text += `　　役割は${userData.role}\n`;
      if(userData.interested_activities != undefined) text += `興味がある活動は${userData.interested_activities.title}\n`;
    });
  } 
  catch (error) {
    console.error(error);
  }

  const webClient = new WebClient(isDev ? process.env.DEV_SLACK_BOT_TOKEN : process.env.SLACK_BOT_TOKEN);
  try {
    await webClient.chat.postMessage({
      channel: isDev ? "C05G11EHUP7" : "C01H2P2M8F2",
      text: text,
    });
  }
  catch (error) {
    console.error(error);
  }

  response.send("ok");
});

const slackAPIBaseURL = "https://slack.com/api";
const contentType = "application/x-www-form-urlencoded";

exports.slackAuth = functions.https.onRequest(async (req, res) => {
  cookieParser()(req, res, async () => {
    try {
      // CSRF保護のためのstateパラメータをチェック
      const receivedState = req.query.state;
      const expectedState = req.cookies && req.cookies['slackAuthState'];
      
      if (!receivedState || !expectedState || receivedState !== expectedState) {
        console.error('CSRF protection: Invalid state parameter');
        res.status(403).send('セキュリティエラー: 不正なリクエストです');
        return;
      }

      // codeパラメータが存在するか確認
      if (!req.query.code) {
        console.error('No code parameter provided');
        res.status(400).send('Authorization code is required');
        return;
      }

      const data = await connect(req.query.code);
      const userInfo = await fetchUserInfo(data.userToken);
      const userId = userInfo.sub;
      const email = userInfo.email;
      const picture = userInfo.picture;
      const name = await fetchDisplayName(data.botToken, userId);

      const customToken = await admin.auth().createCustomToken(userId);

      const url = new URL("https://product-kintore-dev.web.app/");
      url.search = `t=${customToken}&e=${email}&p=${picture}&n=${name}&u=${userId}`;
      res.redirect(303, url.toString());
      return;
    } catch (err) {
      console.error('Slack認証エラー:', err);
      // エラーの種類に基づいて異なるレスポンスを返す
      if (err.response && err.response.status) {
        console.error(`Slack API error: ${err.response.status} - ${err.response.data}`);
        res.status(502).send('外部サービスとの通信エラー');
      } else {
        res.status(500).send('内部サーバーエラー');
      }
      return;
    }
  });
});

const connect = async (code) => {
  try {
    const client = axios.create({
      baseURL: slackAPIBaseURL,
      headers: {
        "Content-Type": contentType,
      },
      timeout: 10000, // タイムアウト設定を追加
    });
    
    const res = await client.post("/oauth.v2.access", {
      client_id: process.env.SLACK_CLIENT_ID || (functions.config().slack && functions.config().slack.client_id),
      client_secret: process.env.SLACK_CLIENT_SECRET || (functions.config().slack && functions.config().slack.client_secret),
      code,
    });
    
    if (!res.data || !res.data.access_token || !res.data.authed_user || !res.data.authed_user.access_token) {
      throw new Error('Slack OAuth response is invalid');
    }
    
    return {
      botToken: res.data.access_token,
      userToken: res.data.authed_user.access_token,
    };
  } catch (error) {
    console.error('Slack OAuth接続エラー:', error);
    throw error; // 上位の関数でキャッチできるようにエラーを再スロー
  }
};

const fetchUserInfo = async (accessToken) => {
  try {
    const client = axios.create({
      baseURL: slackAPIBaseURL,
      headers: {
        "Content-Type": contentType,
        "Authorization": `Bearer ${accessToken}`,
      },
      timeout: 10000, // タイムアウト設定を追加
    });
    
    const res = await client.get("/openid.connect.userInfo");
    
    if (!res.data || !res.data.sub) {
      throw new Error('User info response is invalid');
    }
    
    return res.data;
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    throw error;
  }
};

const fetchDisplayName = async (accessToken, userId) => {
  try {
    const client = axios.create({
      baseURL: slackAPIBaseURL,
      headers: {
        "Content-Type": contentType,
        "Authorization": `Bearer ${accessToken}`,
      },
      timeout: 10000, // タイムアウト設定を追加
    });
    
    const res = await client.get("/users.info" + `?user=${userId}`);
    
    if (!res.data || !res.data.user || !res.data.user.profile || !res.data.user.profile.display_name) {
      // display_nameが取得できない場合、real_nameかnameを代替として使用
      if (res.data && res.data.user && res.data.user.profile) {
// 新しい関数を追加
exports.slackLogin = functions.https.onRequest(async (req, res) => {
  cookieParser()(req, res, async () => {
    try {
      // CSRF保護のためのランダムなstate値を生成
      const state = crypto.randomBytes(16).toString('hex');
      
      // Cookieにstate値を保存（5分間有効）
      res.cookie('slackAuthState', state, { 
        maxAge: 300000, // 5分間
        httpOnly: true,
        secure: !isDev, // 開発環境以外ではセキュアCookieを使用
        sameSite: 'lax'
      });
      
      // Slack OAuthの認証URLを生成
      const slackClientId = process.env.SLACK_CLIENT_ID || 
        (functions.config().slack && functions.config().slack.client_id);
        
      const redirectUri = isDev 
        ? 'http://localhost:5001/product-kintore/us-central1/slackAuth'
        : 'https://us-central1-product-kintore.cloudfunctions.net/slackAuth';
      
      const scope = 'openid,profile,email';
      const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${slackClientId}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
      
      // Slack認証ページにリダイレクト
      res.redirect(303, slackAuthUrl);
    } catch (err) {
      console.error('Slackログイン開始エラー:', err);
      res.status(500).send('内部サーバーエラー');
    }
  });
});

        return res.data.user.profile.real_name || res.data.user.name || 'Unknown User';
      }
      throw new Error('Display name could not be retrieved');
    }
    
    return res.data.user.profile.display_name;
  } catch (error) {
    console.error('表示名取得エラー:', error);
    throw error;
  }
};
