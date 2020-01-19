// Script to get logo / avatar URLs of members from Twitch

const fetch = require("node-fetch")

require("dotenv").config()

const twitchClientID = process.env.CLIENT_ID
const team = process.env.TEAM_NAME

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

  members = members.map(member => ({
    name: member.display_name,
    logo: member.logo,
  }))

  console.log(JSON.stringify(members))
}

run()
