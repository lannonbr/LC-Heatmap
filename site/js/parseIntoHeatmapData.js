import {
  parse,
  startOfWeek,
  addWeeks,
  subDays,
  getUnixTime,
  getHours,
  getDay,
  getWeek,
  endOfWeek,
  addDays,
} from "date-fns"

let timeGrid = []
let streamers = {}
let stream

export default function(data, week) {
  timeGrid = []
  streamers = {}
  for (let i = 0; i < 7; i++) {
    timeGrid[i] = []
    timeGrid[i].length = 24
    timeGrid[i] = timeGrid[i].fill(0, 0, 24)

    for (let j = 0; j < 24; j++) {
      streamers[`${i}-${j}`] = []
    }
  }

  // Ex: Tue, Dec 24, 2019 12:00 PM -0500
  let timeFmt = "EEE, LLL d, yyyy h:mm bbb xx"

  let time = parse(`2020-01-01`, "yyyy-MM-dd", new Date())

  while (getWeek(time) !== week) {
    time = addWeeks(time, 1)
  }

  // Start the current time at the start of the week
  let currTimePointer = startOfWeek(time)

  for (stream of data) {
    const start = parse(stream.startTime, timeFmt, new Date())
    const end = parse(stream.endTime, timeFmt, new Date())

    if (getDay(start) === getDay(end)) {
      // Case 1: Days are equal, get from start hour till end hour
      let day = getDay(start)
      let endHour = getHours(end)
      fillArrs(day, getHours(start), endHour)
    } else {
      if (getUnixTime(start) < getUnixTime(currTimePointer)) {
        // Case 2: Days aren't equal, start is on prev week, print only hours during this week

        let endDay = getDay(end)

        // If the next day after startDay is not endDay, fill in all days inbetween
        if (getDay(addDays(start, 1)) !== endDay) {
          for (let d = 0; d < endDay; d++) {
            fillArrs(d, 0, 23)
          }
        }

        let endHour = getHours(end)

        fillArrs(endDay, 0, endHour)
      } else {
        if (getUnixTime(end) > getUnixTime(endOfWeek(currTimePointer))) {
          // Case 3: Days aren't equal, end is on next week, print only hours during this week
          let startDay = getDay(start)
          let endDay = getDay(end)

          // If the prev day before endDay is not startDay, fill in all days inbetween
          if (getDay(subDays(endDay, 1)) !== startDay) {
            for (let d = addDays(startDay, 1); d < 7; d++) {
              fillArrs(d, 0, 23)
            }
          }

          fillArrs(startDay, getHours(start), 23)
        } else {
          // Case 4: Days aren't equal, print hours of start hour till end hour across days
          let startDay = getDay(start)
          let endDay = getDay(end)

          fillArrs(startDay, getHours(start), 23)

          // If the next day after startDay is not endDay, fill in all days inbetween
          if (getDay(addDays(start, 1)) !== endDay) {
            for (let d = addDays(startDay, 1); d < endDay; d++) {
              fillArrs(d, 0, 23)
            }
          }

          let endHour = getHours(end)

          fillArrs(endDay, 0, endHour)
        }
      }
    }
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

function fillArrs(day, hourStart, hourEnd) {
  for (let i = hourStart; i <= hourEnd; i++) {
    timeGrid[day][i]++
    streamers[`${day}-${i}`].push(stream)
  }
}
