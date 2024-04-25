import { handlerPath } from '@libs/handler-resolver';

export default {
  memorySize: 128,
  handler: `${handlerPath(__dirname)}/handler.getHouseList`,
  events: [
    {
      http: {
        method: 'get',
        path: '/houses',
      },
    },
  ],
};
