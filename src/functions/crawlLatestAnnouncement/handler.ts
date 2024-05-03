import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  latestAnnouncementHumanPrompt,
  latestAnnouncementSystemPrompt,
} from '@llm/prompts';

import { APIGatewayEvent } from 'aws-lambda';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { scrapMainContent } from '@libs/scrapper';
import { z } from 'zod';

export const crawlLatestAnnouncement = async (e: APIGatewayEvent) => {
  const client = new DynamoDBClient({});
  const docClient = DynamoDBDocumentClient.from(client);

  const scanCommand = new ScanCommand({
    ProjectionExpression: 'id, announcementUrl',
    TableName: process.env.HOUSE_TABLE,
  });

  const { Items: houses } = await docClient.send(scanCommand);

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
  const parser = StructuredOutputParser.fromZodSchema(
    z
      .object({
        title: z.string().nullish().describe('최신 공지사항 제목'),
        createdAt: z.string().nullish().describe('최신 공지사항 날짜'),
      })
      .describe('최신 공지사항 정보')
  );
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

    let data = {};

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

    // @ts-ignore
    const { title = null, createdAt = null } = data;

    const updateCommand = new UpdateCommand({
      TableName: process.env.HOUSE_TABLE,
      Key: {
        id: house.id,
      },
      UpdateExpression: 'set latestAnnouncement = :latestAnnouncement',
      ExpressionAttributeValues: {
        ':latestAnnouncement': { title, createdAt },
      },
    });

    await docClient.send(updateCommand);
    console.log('Done', house.id, data);
  }

  // TODO: 함수 분리
  const updateCommand = new UpdateCommand({
    TableName: process.env.EXTRA_DATA_TABLE,
    Key: {
      name: 'updatedAt',
    },
    ExpressionAttributeNames: {
      '#val': 'value',
    },
    ExpressionAttributeValues: {
      ':value': Date.now(),
    },
    UpdateExpression: 'set #val = :value',
    ReturnValues: 'NONE',
  });
  await docClient.send(updateCommand);
};
