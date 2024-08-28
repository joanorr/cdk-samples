import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as cognito from  'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import {Construct} from 'constructs';
import * as path from 'path';

const WEBSKATE101_CERTIFICATE_ARN_EXPORT_NAME = 'Webskate101CertArn';
const DOMAIN_NAME =  'webskate101.com';
const SUBDOMAIN_NAME = 'dynamodb-rest-api';

// To Do:
//   * GET Card ?method=(random|least_seen|...)
//   * PUT Card ?method=(correct-answer|incorrect-answer)


export class DynamoDbRestApi extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the DynamoDb tables
    const decksTable = new dynamodb.TableV2(this, 'Decks', {
      partitionKey: {name: 'username', type: dynamodb.AttributeType.STRING},
      sortKey: {name: 'uid', type: dynamodb.AttributeType.STRING},
    });
    const cardsTable = new dynamodb.TableV2(this, 'Cards', {
      partitionKey: {name: 'deck', type: dynamodb.AttributeType.STRING},
      sortKey: {name: 'uid', type: dynamodb.AttributeType.STRING},
    });

    const restApi = this.initRestApi();

    // Define the resources
    const decks = restApi.root.addResource('decks');
    const cards = restApi.root.addResource('cards');

    // Define the resource handlers

    const getDecksLambda = this.initLambda('GetDecks', 'get-decks', {
      decks_table_name: decksTable.tableName});
    this.addTablePermission(getDecksLambda, decksTable, ['dynamodb:Query']);
    this.registerLambdaHandler(decks, 'GET', getDecksLambda);

    const postDecksLambda = this.initLambda('PostDecks', 'post-decks', {
      decks_table_name: decksTable.tableName});
    this.addTablePermission(postDecksLambda, decksTable, ['dynamodb:PutItem']);
    this.registerLambdaHandler(decks, 'POST', postDecksLambda);

    const postCardsLambda = this.initLambda('PostCards', 'post-cards', {
      cards_table_name: cardsTable.tableName});
    this.addTablePermission(postCardsLambda, cardsTable, ['dynamodb:PutItem']);
    this.registerLambdaHandler(cards, 'POST', postCardsLambda);

    // Set up a DNS record to the API Gateway
    new route53.ARecord(this, 'ARecord', {
      zone: route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: DOMAIN_NAME,
      }),
      recordName: SUBDOMAIN_NAME,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.ApiGateway(restApi)),
      ttl: cdk.Duration.seconds(30),
    });
  }

  private initRestApi(): apigateway.RestApi {
    // The id for the Cognito user pool used for authentication
    const userPoolId = ssm.StringParameter.valueForStringParameter(
      this, '/cdk-samples/user-pool-id');

    return new apigateway.RestApi(this, 'RestApi', {
      cloudWatchRole: true,
      cloudWatchRoleRemovalPolicy: cdk.RemovalPolicy.DESTROY,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS // this is also the default
      },
      defaultMethodOptions: {
        authorizer: new apigateway.CognitoUserPoolsAuthorizer(this, 'Auth', {
          cognitoUserPools: [
            cognito.UserPool.fromUserPoolId(this, 'UserPool', userPoolId)
          ]
        }),
        authorizationType: apigateway.AuthorizationType.COGNITO
      },
      deploy: true,
      deployOptions: {
        stageName: 'dev',
        accessLogDestination: new apigateway.LogGroupLogDestination(
          new logs.LogGroup(this, "ApiGatewayAccessLogs"))
      },
      domainName: {
        certificate: certificatemanager.Certificate.fromCertificateArn(
          this, 'Certificate',
          cdk.Fn.importValue(WEBSKATE101_CERTIFICATE_ARN_EXPORT_NAME)),
        domainName: `${SUBDOMAIN_NAME}.${DOMAIN_NAME}`,
      },
      endpointConfiguration: {
        types: [ apigateway.EndpointType.REGIONAL ]
      }
    });
  }

  private initLambda(
    name: string,
    codeDir: string,
    environment: {[key: string]: string;}) {

    return new lambda.Function(this, name, {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', 'lambdas', 'dynamodb-rest-api', codeDir)),
      environment,
    });
  }

  private addTablePermission(
    fn: lambda.Function,
    table: dynamodb.TableV2,
    actions: string[]) {

    fn.addToRolePolicy(new iam.PolicyStatement({
      actions,
      effect: iam.Effect.ALLOW,
      resources: [table.tableArn]
    }));
  }

  private registerLambdaHandler(
    resource: apigateway.Resource,
    method: string,
    handler: lambda.Function): void {

    resource.addMethod(method, new apigateway.LambdaIntegration(handler));
  }

}
