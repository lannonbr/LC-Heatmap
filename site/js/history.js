import { getWeek } from "date-fns"

let week = getWeek(new Date())

function calculateStats(streams, week) {
  let totalSeconds = streams.reduce((acc, curr) => acc + curr.length, 0)
  let totalMinutes = Math.floor(totalSeconds / 60)
  let totalHours = Math.floor(totalMinutes / 60)
  let totalDays = Math.floor(totalHours / 24)

  let amtStreamers = [...new Set(streams.map(stream => stream.streamer))].length

  let card = document.createElement("div")

  card.className = "card stats"

  card.innerHTML = `
    <h2 style="text-align: center">Statistics (${week})</h2>
    <ul class="flex">
      <li>${amtStreamers}<p>Streamers live this week</p></li>
      <li>${totalDays}<p>Total Days</p></li>
      <li>${totalHours.toLocaleString()}<p>Total Hours</p></li>
      <li>${totalMinutes.toLocaleString()}<p>Total Minutes</p></li>
      <li>${totalSeconds.toLocaleString()}<p>Total Seconds</p></li>
    </ul>
  `

  return card
}

new Promise(resolve => {
  let cards = []
  let done = 0

  for (let i = 0; i < week - 1; i++) {
    import(`/weeks/20w${(i + 1).toString().padStart(2, "0")}.js`)
      .then(f => {
        function takeSecond(acc, curr) {
          acc.push(...curr[1])
          return acc
        }

        let streams = Object.entries(f.default).reduce(takeSecond, [])

        console.log(streams)

        let comp = calculateStats(
          streams,
          `20w${(i + 1).toString().padStart(2, "0")}`
        )

        cards.push({ i, comp })
        done++

        console.log(done, week)

        if (done === week - 1) {
          resolve(cards)
        }
      })
      .catch(err => console.log(err, i))
  }
}).then(data => {
  data.sort((a, b) => b.i - a.i)

  for (let card of data) {
    document.getElementById("statsList").appendChild(card.comp)
  }
})
