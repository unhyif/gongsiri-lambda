import { handlerPath } from '@libs/handler-resolver';

export default {
  memorySize: 1024,
  timeout: 480,
  handler: `${handlerPath(__dirname)}/handler.crawlLatestAnnouncement`,
  events: [{ schedule: 'cron(0/90 0-9 ? * MON-FRI *)' }],
  maximumRetryAttempts: 0,
};
