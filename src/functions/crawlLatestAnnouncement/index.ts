import { handlerPath } from '@utils/handler-resolver';

export default {
  memorySize: 1024,
  timeout: 480,
  handler: `${handlerPath(__dirname)}/handler.crawlLatestAnnouncement`,
  events: [{ schedule: 'cron(0 0-9/3 ? * MON-FRI *)' }],
  maximumRetryAttempts: 0,
};
