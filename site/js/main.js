import { parse, startOfWeek, differenceInSeconds, getWeek } from "date-fns"

import streamData from "./data/data.json"
import genHeatmapData from "./parseIntoHeatmapData"
import { calculateStats, setTimeframe, getMaxStreamPoint } from "./utils"
import { generateHeatmap } from "./genHeatmap"

let timeFmt = "EEE, LLL d, yyyy h:mm bbb xx"

function takeSecond(acc, curr) {
  acc.push(...curr[1])
  return acc
}

const initStreams = Object.entries(streamData)
  .reduce(takeSecond, [])
  .filter(
    stream =>
      differenceInSeconds(
        parse(stream.endTime, timeFmt, new Date()),
        startOfWeek(new Date())
      ) > 0
  )

let currentWeek = getWeek(new Date())

let state = {
  streams: [],
  heatmap: [],
  week: currentWeek,
  [`20w${currentWeek.toString().padStart(2, "0")}-raw`]: initStreams,
  [`20w${currentWeek.toString().padStart(2, "0")}-heatmap`]: genHeatmapData(
    initStreams,
    currentWeek
  ),
}

state.streams = state[`20w${currentWeek.toString().padStart(2, "0")}-raw`]
state.heatmap = state[`20w${currentWeek.toString().padStart(2, "0")}-heatmap`]

// Disable going to next week by default
document.getElementById("nextWeek").setAttribute("disabled", true)
document.getElementById("currWeek").setAttribute("disabled", true)

document.getElementById("currWeek").onclick = () => findData(0) // go to current week
document.getElementById("prevWeek").onclick = () => findData(-1) // go back one week
document.getElementById("nextWeek").onclick = () => findData(1) // go forward one week

render()

document
  .getElementById("heatmapSubmitButton")
  .addEventListener("click", filterHeatmap)

document.getElementById("user_filter").value = ""

document
  .getElementById("user_filter")
  .addEventListener("keydown", e => e.key === "Enter" && filterHeatmap())

function findData(dir) {
  if (dir === 0) {
    state.week = currentWeek
  } else {
    state.week += dir
  }

  document.body.className = ""

  if (state.week === currentWeek) {
    document.getElementById("nextWeek").setAttribute("disabled", true)
    document.getElementById("currWeek").setAttribute("disabled", true)
    document.getElementById("prevWeek").removeAttribute("disabled")
  } else if (state.week === 1) {
    document.getElementById("prevWeek").setAttribute("disabled", true)
  } else {
    document.getElementById("nextWeek").removeAttribute("disabled")
    document.getElementById("currWeek").removeAttribute("disabled")
    document.getElementById("prevWeek").removeAttribute("disabled")
  }

  let identRaw = `20w${state.week.toString().padStart(2, "0")}-raw`
  let identHeatmap = `20w${state.week.toString().padStart(2, "0")}-heatmap`

  // week cached in state
  if (state[identRaw]) {
    state.streams = state[identRaw]
    state.heatmap = state[identHeatmap]
    render()
  } else {
    import(`./weeks/${identRaw.slice(0, -4)}.js`)
      .then(dataset => {
        let streams = Object.entries(dataset.default).reduce(takeSecond, [])

        let heatmapData = genHeatmapData(streams, state.week)

        state.streams = streams
        state.heatmap = heatmapData
        state[identRaw] = streams
        state[identHeatmap] = heatmapData
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

  generateHeatmap(state.heatmap)
  getMaxStreamPoint(state.heatmap)

  calculateStats(state.streams)
  setTimeframe(state.week)
}

function filterHeatmap() {
  let streamers = document.getElementById("user_filter").value

  let streamersArr = streamers.split(",").map(s => s.toLowerCase())

  let selectedStreams =
    streamers !== ""
      ? state.streams.filter(entry =>
          streamersArr.includes(entry.streamer.toLowerCase())
        )
      : state.streams

  document.getElementById("my_dataviz").innerHTML = ""
  document.getElementsByClassName("tooltip")[0].remove()

  let heatmapData = genHeatmapData(selectedStreams, state.week)

  generateHeatmap(heatmapData)
  getMaxStreamPoint(heatmapData)

  calculateStats(selectedStreams)
}
