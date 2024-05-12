import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  ScanCommandOutput,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  formatAnnouncementCreatedAt,
  formatAnnouncementTitle,
} from '@utils/string';
import {
  latestAnnouncementHumanPrompt,
  latestAnnouncementSystemPrompt,
} from '@llm/prompts';

import { APIGatewayEvent } from 'aws-lambda';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { House } from '@/types/house';
import { ListResponse } from '@/types/database';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { scrapMainContent } from '@utils/scrapper';
import { z } from 'zod';

type Answer = z.infer<typeof answerSchema>;

const answerSchema = z
  .object({
    title: z.string().nullish().describe('최신 공지사항 제목'),
    createdAt: z.string().nullish().describe('최신 공지사항 날짜'),
  })
  .describe('최신 공지사항 정보');

export const crawlLatestAnnouncement = async (e: APIGatewayEvent) => {
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);

  const scanCommand = new ScanCommand({
    TableName: process.env.HOUSE_TABLE,
    FilterExpression: 'isCrawlable = :value',
    ExpressionAttributeValues: {
      ':value': true,
    },
    ProjectionExpression: 'id, announcementUrl',
  });

  const { Items: houses } = (await docClient.send(
    scanCommand
  )) as unknown as ListResponse<
    ScanCommandOutput,
    Pick<House, 'id' | 'announcementUrl'>
  >;

  // TODO: temperature 확인
  const model = new ChatOpenAI({
    temperature: 0,
    cache: true,
    maxRetries: 3,
  });
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', latestAnnouncementSystemPrompt],
    ['human', latestAnnouncementHumanPrompt],
  ]);
  const parser = StructuredOutputParser.fromZodSchema(answerSchema);
  // const fixParser = OutputFixingParser.fromLLM(model, parser);

  const documentChain = await createStuffDocumentsChain({
    llm: model,
    prompt,
    outputParser: parser,
  });

  const splitter = RecursiveCharacterTextSplitter.fromLanguage('html', {
    chunkSize: 5000,
  });
  const embeddings = new OpenAIEmbeddings();

  for (const house of houses) {
    const html = house.announcementUrl
      ? (await scrapMainContent(house.announcementUrl)) ?? ''
      : '';

    const splittedDocs = await splitter.createDocuments([html]);
    const vectorstore = await MemoryVectorStore.fromDocuments(
      splittedDocs,
      embeddings
    );
    const retriever = vectorstore.asRetriever();

    const retrievalChain = await createRetrievalChain({
      combineDocsChain: documentChain,
      retriever,
    });

    let data: Answer = {};

    try {
      const { answer } = await retrievalChain.invoke({
        input: '',
        format_instructions: parser.getFormatInstructions(),
      });
      data = answer;
      // TODO
    } catch (e) {
      console.log('Error', house.id, e);
    }

    const { title, createdAt } = data;

    const latestAnnouncement = {
      title: title ? formatAnnouncementTitle(title) : null,
      createdAt: createdAt ? formatAnnouncementCreatedAt(createdAt) : null,
    };

    const updateCommand = new UpdateCommand({
      TableName: process.env.HOUSE_TABLE,
      Key: {
        id: house.id,
      },
      UpdateExpression: 'set latestAnnouncement = :latestAnnouncement',
      ExpressionAttributeValues: {
        ':latestAnnouncement': latestAnnouncement,
      },
      ReturnValues: 'NONE',
    });

    await docClient.send(updateCommand);
    console.log('Ok', house.id, latestAnnouncement);
  }

  // TODO: 함수 분리
  const updateCommand = new UpdateCommand({
    TableName: process.env.EXTRA_DATA_TABLE,
    Key: {
      name: 'updatedAt',
    },
    UpdateExpression: 'set #value = :value',
    ExpressionAttributeNames: {
      '#value': 'value',
    },
    ExpressionAttributeValues: {
      ':value': Date.now(),
    },
    ReturnValues: 'NONE',
  });

  await docClient.send(updateCommand);
};
