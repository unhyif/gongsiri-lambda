import type { AWS } from '@serverless/typescript';

import crawlLatestAnnouncement from '@functions/crawlLatestAnnouncement';

const serverlessConfiguration: AWS = {
  useDotenv: true,
  service: 'gongsiri-lambda',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-dotenv-plugin'],
  provider: {
    name: 'aws',
    region: 'ap-northeast-2',
    runtime: 'nodejs20.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:PutItem',
              'dynamodb:Get*',
              'dynamodb:Scan*',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
            ],
            Resource: '${env:HOUSE_TABLE_ARN}',
          },
        ],
      },
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
  },
  // import the function via paths
  functions: { crawlLatestAnnouncement },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
  resources: {
    Resources: {
      HouseTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'N' }],
          BillingMode: 'PAY_PER_REQUEST',
          KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          TableName: '${env:HOUSE_TABLE}',
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
