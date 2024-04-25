import {
  ValidatedEventAPIGatewayProxyEvent,
  formatJSONResponse,
} from '@libs/api-gateway';

import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { middyfy } from '@libs/lambda';
import schema from './schema';

const hello: ValidatedEventAPIGatewayProxyEvent<
  typeof schema
> = async event => {
  const { message } = event.body;

  const model = new ChatOpenAI({ temperature: 0, cache: true, maxRetries: 3 });
  const parser = new StringOutputParser();
  const chain = model.pipe(parser);

  const res = await chain.invoke(message);

  return formatJSONResponse({
    data: `${res}`,
    updatedAt: Date.now(),
  });
};

export const main = middyfy(hello);
