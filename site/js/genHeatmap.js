import logos from "./data/logos.json"
import { formatStreamTime } from "./utils"
import format from "date-fns/format"

let sidebar

export function generateHeatmap(data) {
  // set the dimensions and margins of the graph
  var margin = { top: 20, right: 30, bottom: 20, left: 30 },
    width = 1280 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom

  let timezone = format(new Date(), "z")

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

  // Build Y scales and axis:
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
    .style("display", "none")

  //Read the data
  let tiles = svg
    .selectAll()
    .data(data, d => d.hour + ":" + d.day)
    .enter()
    .append("g")
    .on("click", d => {
      if (d.streamers.length > 0) {
        sidebar
          .transition(250)
            .style("opacity", 1)
            .style("display", "block")
        let html = `
          <button id="sidebarCloseButton" class="rounded shadow">X</button>
          <h2>${d.streamers.length} streamers</h2>
          <h3>${d.day} @ ${d.hour}:00 ${timezone}</h3>
          <ul>`
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

  // Add background
  tiles
    .append("rect")
    .attr("x", d => x(d.hour))
    .attr("y", d => y(d.day))
    .attr("class", d => (d.streamers.length > 0 ? "present" : ""))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", d => myColor(d.value))

  // Add number on tile if streamers > 0
  tiles
    .append("text")
    .text(d => d.streamers.length)
    .attr("x", d => x(d.hour) + (x.bandwidth()/2))
    .attr("y", d => y(d.day) + (y.bandwidth()/2) + 6)
    .style("text-anchor", "middle")
    .style("opacity", d => (d.streamers.length > 0 ? 1 : 0))
}

function closeSidebar() {
  sidebar
    .transition(250)
      .style("opacity", 0)
    .transition()
      .delay(250)
      .style("display", "none")

  document.body.className = ""
}
