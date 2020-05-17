// Script to collect any streams over the last 7 days of time

const fetch = require("node-fetch")
const dateFns = require("date-fns")

const AWS = require("aws-sdk")
AWS.config.update({ region: "us-east-1" })
const ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" })

const { getTwitchAccessToken } = require("@jlengstorf/get-twitch-oauth")

require("dotenv").config()

const twitchClientID = process.env.CLIENT_ID
const twitchClientSecret = process.env.CLIENT_SECRET
const team = process.env.TEAM_NAME

async function run() {
  const { access_token } = await getTwitchAccessToken({
    client_id: twitchClientID,
    client_secret: twitchClientSecret,
  })

  let teamURL = `https://api.twitch.tv/kraken/teams/${team}`
  let resp = await fetch(teamURL, {
    headers: {
      Accept: "application/vnd.twitchtv.v5+json",
      "Client-ID": twitchClientID,
      Authorization: `OAuth ${access_token}`,
    },
  })
  let data = await resp.json()
  let members = data.users

  members = members.map((member) => member.display_name)

  let startTime = dateFns
    .getUnixTime(dateFns.subWeeks(new Date(), 1))
    .toString()
  let endTime = dateFns.getUnixTime(new Date()).toString()

  let allStreams = {}

  for (let member of members) {
    let queryResp = await ddb
      .query({
        TableName: "LiveCodersStreamPoints",
        ProjectionExpression: "username, #t",
        KeyConditionExpression: "username = :u and #t BETWEEN :start AND :end",
        ExpressionAttributeNames: {
          "#t": "timestamp",
        },
        ExpressionAttributeValues: {
          ":start": { N: startTime },
          ":end": { N: endTime },
          ":u": { S: member },
        },
      })
      .promise()

    let memberStreams = getStreams(queryResp)

    if (memberStreams.length > 0) {
      allStreams[member] = memberStreams
    }
  }

  console.log(JSON.stringify(allStreams))
}

run()

function getStreams(queryResp) {
  if (queryResp.Items.length === 0) {
    return []
  }

  let datapoints = queryResp.Items.map((entry) => ({
    username: entry.username.S,
    timestamp: +entry.timestamp.N,
  }))

  datapoints.sort((a, b) => a.timestamp - b.timestamp)

  let startTime = datapoints[0].timestamp

  datapoints[0].timeSinceLast = 0

  for (let i = 1; i < datapoints.length; i++) {
    datapoints[i].timeSinceLast = datapoints[i].timestamp - startTime
    startTime = datapoints[i].timestamp
  }

  let gapPeriod = 60 * 31

  let streams = []

  let start = datapoints[0]

  for (let i = 1; i < datapoints.length; i++) {
    if (datapoints[i].timeSinceLast > gapPeriod) {
      streams.push([start, datapoints[i - 1]])
      if (i + 1 >= datapoints.length) {
        break
      } else {
        start = datapoints[i + 1]
      }
    } else if (i === datapoints.length - 1) {
      streams.push([start, datapoints[i]])
    }
  }

  streams = streams.map((stream) => {
    let s = dateFns.subMinutes(dateFns.fromUnixTime(stream[0].timestamp), 5)
    let e = dateFns.addMinutes(dateFns.fromUnixTime(stream[1].timestamp), 5)

    return {
      streamer: stream[0].username,
      startTime: dateFns.format(s, "EEE, LLL d, yyyy h:mm bbb xx"),
      endTime: dateFns.format(e, "EEE, LLL d, yyyy h:mm bbb xx"),
      length: dateFns.getUnixTime(e) - dateFns.getUnixTime(s),
    }
  })

  return streams
}
