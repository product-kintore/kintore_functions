
const { WebClient } = require('@slack/web-api');
const { Firestore } = require('@google-cloud/firestore');
const { createEventAdapter } = require('@slack/events-api');
const functions = require('firebase-functions');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const firestore = new Firestore();
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);

// URLの正規表現
const urlPattern = /<(https?:\/\/[^\s]+)>/g;

const fetchPageTitle = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    return $('title').text();
  } catch (error) {
    console.error(`Error fetching title for URL: ${url}`, error);
    return null;
  }
};

function extractContent(tag) {
  const regex = /<([^>]+)>/;
  const match = tag.match(regex);
  return match ? match[1] : null;
}

slackEvents.on('message', async (event) => {
  console.log("message event")
  const webClient = new WebClient(process.env.SLACK_BOT_TOKEN);

  console.log(event);
  const channelId = event.channel;
  // if (channelId == "C0336LF8HEG" || channelId == "C01FY636KD5") await iikijiRecorder(event); // #bot-test or #1_いい記事系
  if (channelId == "C01FY636KD5") await iikijiRecorder(event); // #bot-test or #1_いい記事系
  if (channelId == "C0336LF8HEG" || channelId == "C01H2PN9ETA") await moyamoyaRecorder(event); // #bot-test or #3_モヤモヤ
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
    return; // URLが含まれていない場合、何もしない
  }

  console.log("URL含まれてる");
  const messagesRef = firestore.collection('articles');
  const url = extractContent(urls[0]);
  const pageTitle = await fetchPageTitle(url);
  const messageData = {
    url: url,
    title: pageTitle,
    message: text,
    ts: event.ts,
    slackMessageUrl: `https://product-kintore.slack.com/archives/${event.channel}/p{ts.replace('.', '')}`,
  };

  await messagesRef.add(messageData);

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
          "url":  `https://product-kintore.slack.com/archives/${event.channel}/p${ts.replace('.', '')}`,
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

  console.log(await axios.post(notionEndpoint, post_data, {headers: headers}));  
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
      console.log("親あり！");
      const parentData = parentDoc.data();
      const newComment = {
        comment: text,
        commented: user,
        createdAt: createdAt,
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


exports.slackApp = functions.region('asia-northeast1').https.onRequest(async (req, res) => {
  console.log('Received a request');
  slackEvents.requestListener()(req, res);
});

