const { WebClient, LogLevel } = require('@slack/client');

if (typeof process.env.SLACK_ACCESS_TOKEN !== 'string') {
  throw new Error('You must specify a SLACK_ACCESS_TOKEN environment variable to run this program');
}

// initialize a slack web API client
const slack = new WebClient(process.env.SLACK_ACCESS_TOKEN, { logLevel: LogLevel.DEBUG });

slack.on('rate_limited', (retrySec) => {
  console.log(`slack web API rate limit reached, pausing for ${retrySec} seconds`);
})

// gather info for all channels, groups, ims
const gatherConversationInfo = Promise.all([slack.channels.list(), slack.groups.list(), slack.im.list()])
  .then(([{ channels }, { groups }, { ims }]) => {
    console.log('gathered conversation lists');

    const channelInfos = Promise.all(channels.map(({ id }) => slack.channels.info({ channel: id })));
    const groupInfos = Promise.all(groups.map(({ id }) => slack.groups.info({ channel: id })));
    const imInfos = Promise.all(ims.map(({ id }) => slack.conversations.info({ channel: id })));

    return Promise.all([channelInfos, groupInfos, imInfos]);
  });

// report results
const tenMinutesInMs = /* 10 * 60 * */ 1000;
timeout(gatherConversationInfo, tenMinutesInMs)
  .then(([ channelInfoList, groupInfoList, imInfoList ]) => {
    console.log('completed');
    console.log(`number of channels: ${channelInfoList.length}`);
    console.log(`number of groups: ${groupInfoList.length}`);
    console.log(`number of ims: ${imInfoList.length}`);
  })
  .catch((error) => {
    if (error.message === 'timeout') {
      console.log('failed due to timeout');

      // accessing private state, don't try this at home.
      console.log('PQueue:', slack.requestQueue);
      console.log('PQueue _pendingCount:', slack.requestQueue._pendingCount);
      console.log('PQueue queue._queue:', slack.requestQueue.queue._queue);
      console.log('PQueue queue._queue.length:', slack.requestQueue.queue._queue.length);
    } else {
      console.error(error);
    }
  });

// Helpers

// returns a promise that rejects with an error if the original promise doesn't resolve within the specified time
// time is in milliseconds, rejection is an error with message 'timeout'
function timeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('timeout'));
    }, ms);
    promise.then(() => {
      clearTimeout(timer);
      resolve(promise);
    });
  });
}

