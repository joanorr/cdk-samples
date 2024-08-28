import boto3
from boto3.dynamodb.conditions import Key
import json
import os

DECKS_TABLE_NAME = os.environ['decks_table_name']


def handler(event, context):
  dynamodb = boto3.resource('dynamodb')
  table = dynamodb.Table(DECKS_TABLE_NAME)

  username = event['requestContext']['authorizer']['claims']['cognito:username']
  query_results = table.query(KeyConditionExpression=Key('username').eq(username))

  return {
    'statusCode': 200,
    'headers': {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    'body': json.dumps({
      'decks': query_results,
    }),
  }