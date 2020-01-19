const { parse, startOfWeek, differenceInSeconds } = require("date-fns")

const streamData = require("./data.json")
const genHeatmapData = require("./heatmap")
const logos = require("./logos.json")

let timeFmt = "EEE, LLL d, yyyy h:mm bbb xx"

const streams = Object.entries(streamData)
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

let heatmapData = genHeatmapData(streams)

generateHeatmap(heatmapData)
getMaxStreamPoint(heatmapData)

document
  .getElementById("heatmapSubmitButton")
  .addEventListener("click", filterHeatmap)

document.getElementById("username").value = ""

calculateStats(streams)

document
  .getElementById("username")
  .addEventListener("keydown", e => e.key === "Enter" && filterHeatmap())

setTimeframe()

function filterHeatmap() {
  let streamers = document.getElementById("username").value

  let streamersArr = streamers.split(",").map(s => s.toLowerCase())

  let selectedStreams =
    streamers !== ""
      ? streams.filter(entry =>
          streamersArr.includes(entry.streamer.toLowerCase())
        )
      : streams

  document.getElementById("my_dataviz").innerHTML = ""
  ;[...document.getElementsByClassName("tooltip")].forEach(d => d.remove())

  heatmapData = genHeatmapData(selectedStreams)

  generateHeatmap(heatmapData)
  getMaxStreamPoint(heatmapData)

  calculateStats(selectedStreams)
}

function setTimeframe() {
  let start = moment().startOf("week")
  let end = moment().endOf("week")

  document.getElementById("time_range").innerText = `Timeframe: ${start.format(
    "ll"
  )} - ${end.format("ll")}`
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

  var div = d3
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
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", function(d) {
      return myColor(d.value)
    })
    .on("mouseover", function(d) {
      if (d.streamers.length > 0) {
        div.transition(250).style("opacity", 1)
        let html = `<h2>${d.streamers.length} streamers on ${d.day} @ ${d.hour}:00</h2><ul>`
        d.streamers.forEach(s => {
          html += `<li><img src="${
            logos.filter(l => l.name === s)[0].logo
          }"/>${s}</li>`
        })
        html += "</ul>"
        div.html(html)
      }
    })
    .on("mouseout", function(d) {
      div.transition(250).style("opacity", 0)
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
