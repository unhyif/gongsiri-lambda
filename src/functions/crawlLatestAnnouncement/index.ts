import { handlerPath } from '@libs/handler-resolver';

export default {
  memorySize: 1024,
  timeout: 600,
  handler: `${handlerPath(__dirname)}/handler.crawlLatestAnnouncement`,
  events: [{ schedule: 'cron(0 0-9 ? * MON-FRI *)' }],
};
