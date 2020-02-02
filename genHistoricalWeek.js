// Script to collect a historical week of streams

const fetch = require("node-fetch")
const dateFns = require("date-fns")
const fs = require("fs")

const AWS = require("aws-sdk")
AWS.config.update({ region: "us-east-1" })
const ddb = new AWS.DynamoDB({ apiVersion: "2012-08-10" })

require("dotenv").config()

const twitchClientID = process.env.CLIENT_ID
const team = process.env.TEAM_NAME

const week = dateFns.getWeek(new Date()) - 1

async function run() {
  let teamURL = `https://api.twitch.tv/kraken/teams/${team}`
  let resp = await fetch(teamURL, {
    headers: {
      Accept: "application/vnd.twitchtv.v5+json",
      "Client-ID": twitchClientID,
    },
  })
  let data = await resp.json()
  let members = data.users

  members = members.map(member => member.display_name)

  let time = dateFns.parse(`2020-01-01`, "yyyy-MM-dd", new Date())

  while (dateFns.getWeek(time) !== week) {
    time = dateFns.addWeeks(time, 1)
  }

  let start = dateFns.startOfWeek(time)
  let end = dateFns.addHours(dateFns.endOfWeek(time), 6)

  let startTime = dateFns.getUnixTime(start).toString()
  let endTime = dateFns.getUnixTime(end).toString()

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

  let fileName = `20w${week.toString().padStart(2, "0")}.js`

  fs.writeFileSync(
    `${__dirname}/site/weeks/${fileName}`,
    `export default ${JSON.stringify(allStreams)}`
  )
}

run()

function getStreams(queryResp) {
  if (queryResp.Items.length === 0) {
    return []
  }

  let datapoints = queryResp.Items.map(entry => ({
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

  streams = streams.map(stream => {
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
