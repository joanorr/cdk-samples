import boto3
import json
import os
from urllib.parse import parse_qs
import uuid

DECKS_TABLE_NAME = os.environ['decks_table_name']


def handler(event, context):
  dynamodb = boto3.resource('dynamodb')
  table = dynamodb.Table(DECKS_TABLE_NAME)

  username = event['requestContext']['authorizer']['claims']['cognito:username']
  body_dict = parse_qs(event['body'])
  deck_name = body_dict['name'][0]

  new_deck = {
    'username': username,
    'uid': str(uuid.uuid4()),
    'deck_name': deck_name,
  }

  table.put_item(Item=new_deck)

  return {
    'statusCode': 200,
    'headers': {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    'body': json.dumps({
      'deck': new_deck
    }),
  }