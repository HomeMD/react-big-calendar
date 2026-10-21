import sortBy from 'lodash/sortBy'
import { accessor as get } from './accessors'

class Event {
  constructor(data, { startAccessor, endAccessor, slotMetrics }) {
    const {
      start,
      startDate,
      end,
      endDate,
      top,
      height,
    } = slotMetrics.getRange(get(data, startAccessor), get(data, endAccessor))

    this.start = start
    this.end = end
    this.startMs = +startDate
    this.endMs = +endDate
    this.top = top
    this.height = height
    this.data = data
  }
}

/**
 * Return true if event a and b overlap in time. Events that only touch
 * (one ends exactly when the other starts) don't overlap.
 */
function overlaps(a, b) {
  return a.start < b.end && b.start < a.end
}

/**
 * Lay out a cluster of transitively overlapping events side by side: each
 * event takes the first column that is free when it starts, and then
 * stretches right over any columns that stay free for its whole duration.
 */
function layoutCluster(cluster) {
  const columnEnds = []
  cluster.forEach(event => {
    let column = columnEnds.findIndex(end => end <= event.start)
    if (column === -1) column = columnEnds.length
    columnEnds[column] = event.end
    event.column = column
  })

  const columnWidth = 100 / columnEnds.length
  cluster.forEach(event => {
    let span = 1
    while (
      event.column + span < columnEnds.length &&
      !cluster.some(
        other => other.column === event.column + span && overlaps(other, event)
      )
    ) {
      span++
    }
    event.xOffset = event.column * columnWidth
    event.width = span * columnWidth
  })
}

function getStyledEvents({ events, ...props }) {
  const proxies = sortBy(events.map(event => new Event(event, props)), [
    'start',
    e => -e.end,
  ])

  // Split the events into clusters, where every event overlaps at least one
  // other event of its cluster. Comparing against the furthest end seen so
  // far (not just the first event's) keeps chains like 9:30-9:50, 9:45-10:15,
  // 9:50-10:20 in one cluster, so the last one can't cover the middle one.
  let cluster = []
  let clusterEnd = -Infinity
  proxies.forEach(event => {
    if (event.start >= clusterEnd) {
      layoutCluster(cluster)
      cluster = []
    }
    cluster.push(event)
    clusterEnd = Math.max(clusterEnd, event.end)
  })
  layoutCluster(cluster)

  // Return the original events, along with their styles.
  return proxies.map(event => ({
    event: event.data,
    style: {
      top: event.top,
      height: event.height,
      width: event.width,
      xOffset: event.xOffset,
    },
  }))
}

export { getStyledEvents }
