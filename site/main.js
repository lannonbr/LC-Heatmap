import {
  parse,
  startOfWeek,
  endOfWeek,
  differenceInSeconds,
  format,
  getDay,
  getWeek,
  addWeeks,
} from "date-fns"

import streamData from "./data.json"
import genHeatmapData from "./heatmap"
import logos from "./logos.json"

let timeFmt = "EEE, LLL d, yyyy h:mm bbb xx"

let sidebar

const initStreams = Object.entries(streamData)
  .reduce((acc, curr) => {
    acc.push(...curr[1])
    return acc
  }, [])
  .filter(
    stream =>
      differenceInSeconds(
        parse(stream.endTime, timeFmt, new Date()),
        startOfWeek(new Date())
      ) > 0
  )

let currentWeek = getWeek(new Date())

let state = {
  streams: initStreams,
  week: currentWeek,
  [`20w${currentWeek.toString().padStart(2, "0")}`]: initStreams,
}

// Disable going to next week by default
document.getElementById("nextWeek").setAttribute("disabled", true)
document.getElementById("currWeek").setAttribute("disabled", true)

document.getElementById("currWeek").onclick = () => {
  state.week = currentWeek
  state.streams = state[`20w${currentWeek.toString().padStart(2, "0")}`]
  document.getElementById("nextWeek").setAttribute("disabled", true)
  document.getElementById("currWeek").setAttribute("disabled", true)
  render()
}

document.getElementById("prevWeek").onclick = () => {
  state.week--
  findData()
}

document.getElementById("nextWeek").onclick = () => {
  state.week++
  findData()
}

render()

document
  .getElementById("heatmapSubmitButton")
  .addEventListener("click", filterHeatmap)

document.getElementById("username").value = ""

document
  .getElementById("username")
  .addEventListener("keydown", e => e.key === "Enter" && filterHeatmap())

function findData() {
  if (state.week === currentWeek) {
    document.getElementById("nextWeek").setAttribute("disabled", true)
    document.getElementById("currWeek").setAttribute("disabled", true)
  } else if (state.week === 1) {
    document.getElementById("prevWeek").setAttribute("disabled", true)
  } else {
    document.getElementById("nextWeek").removeAttribute("disabled")
    document.getElementById("currWeek").removeAttribute("disabled")
    document.getElementById("prevWeek").removeAttribute("disabled")
  }

  let ident = `20w${state.week.toString().padStart(2, "0")}`

  // week cached in state
  if (state[ident]) {
    state.streams = state[ident]
    render()
  } else {
    import(`./${ident}.js`)
      .then(dataset => {
        let streams = Object.entries(dataset.default).reduce((acc, curr) => {
          acc.push(...curr[1])
          return acc
        }, [])

        state.streams = streams
        state.ident = streams
        console.log(state.streams)
        render()
      })
      .catch(err => {
        console.log(err)
        console.log("That week doesn't exist")
      })
  }
}

function render() {
  document.getElementById("my_dataviz").innerHTML = ""
  if (document.getElementsByClassName("tooltip").length > 0) {
    document.getElementsByClassName("tooltip")[0].remove()
  }

  let heatmapData = genHeatmapData(state.streams, state.week)

  generateHeatmap(heatmapData)
  getMaxStreamPoint(heatmapData)

  calculateStats(state.streams)
  setTimeframe(state.week)
}

function filterHeatmap() {
  let streamers = document.getElementById("username").value

  let streamersArr = streamers.split(",").map(s => s.toLowerCase())

  let selectedStreams =
    streamers !== ""
      ? state.streams.filter(entry =>
          streamersArr.includes(entry.streamer.toLowerCase())
        )
      : state.streams

  document.getElementById("my_dataviz").innerHTML = ""
  document.getElementsByClassName("tooltip")[0].remove()

  let heatmapData = genHeatmapData(selectedStreams)

  generateHeatmap(heatmapData)
  getMaxStreamPoint(heatmapData)

  calculateStats(selectedStreams)
}

function setTimeframe(week) {
  let time = parse(`2020-01-01`, "yyyy-MM-dd", new Date())

  while (getWeek(time) !== week) {
    time = addWeeks(time, 1)
  }

  let start = startOfWeek(time)
  let end = endOfWeek(time)

  // let start = moment().startOf("week")
  // let end = moment().endOf("week")

  document.getElementById("time_range").innerText = `Timeframe: ${format(
    start,
    "LLL d, yyyy"
  )} - ${format(end, "LLL d, yyyy")}`
}

function getMaxStreamPoint(data) {
  let max = {
    day: "",
    hour: -1,
    value: -1,
  }

  data.forEach(point => {
    if (+point.value >= +max.value) {
      max = point
    }
  })

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

function generateHeatmap(data) {
  // set the dimensions and margins of the graph
  var margin = { top: 20, right: 30, bottom: 20, left: 30 },
    width = 1280 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom

  // append the svg object to the body of the page
  var svg = d3
    .select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

  // Labels of row and columns
  var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].reverse()
  var hours = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
  ]

  // Build X scales and axis:
  var x = d3
    .scaleBand()
    .range([0, width])
    .domain(hours)
    .padding(0.01)
  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))

  // Build X scales and axis:
  var y = d3
    .scaleBand()
    .range([height, 0])
    .domain(days)
    .padding(0.01)
  svg.append("g").call(d3.axisLeft(y))

  // Build color scale
  var myColor = d3
    .scaleLinear()
    .range(["white", "#69b3a2"])
    .domain([0, Math.max(...data.map(d => d.value))])

  sidebar = d3
    .select("body")
    .append("div")
    .attr("class", "card tooltip")
    .style("opacity", 0)

  //Read the data
  let tiles = svg
    .selectAll()
    .data(data, function(d) {
      return d.hour + ":" + d.day
    })
    .enter()
    .append("g")

  // Add background
  tiles
    .append("rect")
    .attr("x", function(d) {
      return x(d.hour)
    })
    .attr("y", function(d) {
      return y(d.day)
    })
    .attr("class", function(d) {
      return d.streamers.length > 0 ? "present" : ""
    })
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", function(d) {
      return myColor(d.value)
    })
    .on("click", function(d) {
      if (d.streamers.length > 0) {
        sidebar.transition(250).style("opacity", 1)
        let html = `<button id="sidebarCloseButton">X</button><h2>${d.streamers.length} streamers on ${d.day} @ ${d.hour}:00</h2><ul>`
        d.streamers.forEach(s => {
          html += `<li><img src="${
            logos.filter(l => l.name === s.streamer)[0].logo
          }"/>${s.streamer}<br/>${formatStreamTime(s)}</li>`
        })
        html += "</ul>"
        sidebar.html(html)
        document.body.className = "sidebarOpen"
        document.getElementById("sidebarCloseButton").onclick = () => {
          closeSidebar()
        }
      }
    })

  // Add number on tile if streamers > 0
  tiles
    .append("text")
    .text(function(d) {
      return d.streamers.length
    })
    .attr("x", function(d) {
      return x(d.hour) + 22
    })
    .attr("y", function(d) {
      return y(d.day) + 34
    })
    .style("opacity", function(d) {
      return d.streamers.length > 0 ? 1 : 0
    })
}

function closeSidebar() {
  sidebar.transition(250).style("opacity", 0)
  document.body.className = ""
}

function formatStreamTime(stream) {
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

function calculateStats(streams) {
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
