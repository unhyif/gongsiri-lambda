import crawlLatestAnnouncement from '@functions/crawlLatestAnnouncement';
import type { AWS } from '@serverless/typescript';

const serverlessConfiguration: AWS = {
  useDotenv: true,
  service: 'gongsiri-lambda',
  plugins: ['serverless-dotenv-plugin'],
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
              'dynamodb:GetItem',
              'dynamodb:Scan',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
            ],
            Resource: ['${env:HOUSE_TABLE_ARN}', '${env:EXTRA_DATA_TABLE_ARN}'],
          },
        ],
      },
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
  },
  functions: {
    crawlLatestAnnouncement,
  },
  package: {
    individually: true,
    patterns: ['!node_modules/**'],
  },
  resources: {
    Resources: {
      HouseTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${env:HOUSE_TABLE}',
          KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
          AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'N' }],
          BillingMode: 'PAY_PER_REQUEST',
        },
      },
      ExtraDataTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${env:EXTRA_DATA_TABLE}',
          KeySchema: [{ AttributeName: 'name', KeyType: 'HASH' }],
          AttributeDefinitions: [{ AttributeName: 'name', AttributeType: 'S' }],
          BillingMode: 'PAY_PER_REQUEST',
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
