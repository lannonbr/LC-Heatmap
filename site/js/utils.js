import {
  parse,
  getWeek,
  getDay,
  addWeeks,
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns"

export function calculateStats(streams) {
  let totalSeconds = streams.reduce((acc, curr) => acc + curr.length, 0)
  let totalMinutes = Math.floor(totalSeconds / 60)
  let totalHours = Math.floor(totalMinutes / 60)
  let totalDays = Math.floor(totalHours / 24)

  let amtStreamers = [...new Set(streams.map(stream => stream.streamer))].length

  document.getElementById("stats").innerHTML = `
    <h2 style="text-align: center">Statistics</h2>
    <ul class="flex">
      <li>${amtStreamers}<p>Streamers live this week</p></li>
      <li>${totalDays}<p>Total Days</p></li>
      <li>${totalHours.toLocaleString()}<p>Total Hours</p></li>
      <li>${totalMinutes.toLocaleString()}<p>Total Minutes</p></li>
      <li>${totalSeconds.toLocaleString()}<p>Total Seconds</p></li>
    </ul>
  `
}

export function setTimeframe(week) {
  let time = parse(`2020-01-01`, "yyyy-MM-dd", new Date())

  while (getWeek(time) !== week) {
    time = addWeeks(time, 1)
  }

  let start = startOfWeek(time)
  let end = endOfWeek(time)

  document.getElementById("time_range").innerText = `Timeframe: ${format(
    start,
    "LLL d, yyyy"
  )} - ${format(end, "LLL d, yyyy")}`
}

export function getMaxStreamPoint(data) {
  let max = data.reduce(
    (acc, point) => {
      if (+point.value >= +acc.value) {
        acc = point
      }
      return acc
    },
    {
      day: "",
      hour: -1,
      value: -1,
    }
  )

  let time = max.day

  if (max.hour === "0") {
    time += " 12:00 AM"
  } else if (max.hour === "12") {
    time += " 12:00 PM"
  } else {
    time += " " + (+max.hour % 12)

    if (+max.hour < 12) {
      time += ":00 AM"
    } else {
      time += ":00 PM"
    }
  }

  document.getElementById(
    "max_stream_point"
  ).innerText = `Latest peak of max streams at once: ${max.value} at ${time}`
}

export function formatStreamTime(stream) {
  let timeFmt = "EEE, LLL d, yyyy h:mm bbb xx"

  const parsedStart = parse(stream.startTime, timeFmt, new Date())
  const parsedEnd = parse(stream.endTime, timeFmt, new Date())
  const formattedStart = format(parsedStart, "eee, h:mm aaaa")

  let endFormat = "h:mm aaaa"

  if (getDay(parsedStart) !== getDay(parsedEnd)) {
    endFormat = "eee, " + endFormat
  }

  const formattedEnd = format(parsedEnd, endFormat)

  return `${formattedStart} - ${formattedEnd}`
}
