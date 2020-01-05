const parse = require("date-fns/parse")
const startOfWeek = require("date-fns/startOfWeek")
const differenceInSeconds = require("date-fns/differenceInSeconds")
const addHours = require("date-fns/addHours")
const addWeeks = require("date-fns/addWeeks")
const subMinutes = require("date-fns/subMinutes")
const startOfHour = require("date-fns/startOfHour")
const getUnixTime = require("date-fns/getUnixTime")
const getHours = require("date-fns/getHours")
const getDay = require("date-fns/getDay")
const isEqual = require("date-fns/isEqual")

module.exports = function(data) {
  const streams = data

  let timeGrid = []

  for (let i = 0; i < 7; i++) {
    timeGrid[i] = []
    timeGrid[i].length = 24
    timeGrid[i] = timeGrid[i].fill(0, 0, 24)
  }

  // Ex: Tue, Dec 24, 2019 12:00 PM -0500
  let timeFmt = "EEE, LLL d, yyyy h:mm bbb xx"

  // Start the current time at the start of the week
  let currTimePointer = startOfWeek(new Date())

  let endOfWeek = subMinutes(startOfWeek(addWeeks(new Date(), 1)), 5)

  let streamers = {}

  while (differenceInSeconds(endOfWeek, currTimePointer) > 0) {
    const currUnix = getUnixTime(currTimePointer)
    const currHour = getHours(currTimePointer)
    const currDay = getDay(currTimePointer)

    const streamsInHour = streams.filter(stream => {
      const start = parse(stream.startTime, timeFmt, new Date())
      const end = parse(stream.endTime, timeFmt, new Date())

      const endBarrier = isEqual(startOfHour(end), end)
        ? end
        : startOfHour(addHours(end, 1))

      const startUnix = getUnixTime(startOfHour(start))
      const endUnix = getUnixTime(endBarrier)

      return startUnix <= currUnix && currUnix < endUnix
    })

    if (streamsInHour) {
      timeGrid[currDay][currHour] += streamsInHour.length
      streamers[`${currDay}-${currHour}`] = streamsInHour.map(s => s.streamer)
    }

    // add an hour
    currTimePointer = addHours(currTimePointer, 1)
  }

  let actualData = []

  let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  timeGrid.forEach((day, i) => {
    day.forEach((val, j) => {
      actualData.push({
        day: days[i],
        hour: j,
        value: val,
        streamers: streamers[`${i}-${j}`],
      })
    })
  })

  // return the array of data
  return actualData
}
