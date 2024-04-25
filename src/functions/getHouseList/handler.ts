import { APIGatewayEvent } from 'aws-lambda';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { formatJSONResponse } from '@libs/api-gateway';

export const getHouseList = async (e: APIGatewayEvent) => {
  const model = new ChatOpenAI({ temperature: 0, cache: true, maxRetries: 3 });
  const parser = new StringOutputParser();
  const chain = model.pipe(parser);

  const res = await chain.invoke('Hi');

  return formatJSONResponse({
    data: `${res}`,
    updatedAt: Date.now(),
  });
};
