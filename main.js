const { WebClient } = require('@slack/client');

const slack = new WebClient(process.env.SLACK_ACCESS_TOKEN);

slack.auth.test().then(console.log).catch(console.error);
