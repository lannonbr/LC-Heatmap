const streamData = require("./data.json")
const genHeatmapData = require("./heatmap")

const streams = Object.entries(streamData).reduce((acc, curr) => {
  acc.push(...curr[1])
  return acc
}, [])

let heatmapData = genHeatmapData(streams)

generateHeatmap(heatmapData)
getMaxStreamPoint(heatmapData)

document.getElementById("heatmapSubmitButton").addEventListener("click", () => {
  let streamers = document
    .getElementById("username")
    .value.split(",")
    .map(s => s.toLowerCase())

  let filteredStreams = streams.filter(entry =>
    streamers.includes(entry.streamer.toLowerCase())
  )

  document.getElementById("my_dataviz").innerHTML = ""
  ;[...document.getElementsByClassName("tooltip")].forEach(d => d.remove())

  heatmapData = genHeatmapData(filteredStreams)

  generateHeatmap(heatmapData)
  getMaxStreamPoint(heatmapData)
})

setTimeframe()

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
    if (+point.value > +max.value) {
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

  time += " UTC"

  document.getElementById(
    "max_stream_point"
  ).innerText = `Max Streams at once: ${max.value} at ${time}`
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
    .attr("class", "tooltip")
    .style("opacity", 0)

  //Read the data
  svg
    .selectAll()
    .data(data, function(d) {
      return d.hour + ":" + d.day
    })
    .enter()
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
        let html = `<h2>${d.streamers.length} streamers on ${d.day} @ ${d.hour}:00 UTC</h2><ul>`
        d.streamers.forEach(s => {
          html += `<li>${s}</li>`
        })
        html += "</ul>"
        div.html(html)
      }
    })
    .on("mouseout", function(d) {
      div.transition(250).style("opacity", 0)
    })
}
