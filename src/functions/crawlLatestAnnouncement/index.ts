import { handlerPath } from '@libs/handler-resolver';

export default {
  memorySize: 256,
  handler: `${handlerPath(__dirname)}/handler.crawlLatestAnnouncement`,
  events: [],
};
