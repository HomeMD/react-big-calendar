'use strict'

exports.__esModule = true
exports.getStyledEvents = undefined

var _sortBy = require('lodash/sortBy')

var _sortBy2 = _interopRequireDefault(_sortBy)

var _accessors = require('./accessors')

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj }
}

function _objectWithoutProperties(obj, keys) {
  var target = {}
  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue
    target[i] = obj[i]
  }
  return target
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function')
  }
}

var Event = function Event(data, _ref) {
  var startAccessor = _ref.startAccessor,
    endAccessor = _ref.endAccessor,
    slotMetrics = _ref.slotMetrics

  _classCallCheck(this, Event)

  var _slotMetrics$getRange = slotMetrics.getRange(
      (0, _accessors.accessor)(data, startAccessor),
      (0, _accessors.accessor)(data, endAccessor)
    ),
    start = _slotMetrics$getRange.start,
    startDate = _slotMetrics$getRange.startDate,
    end = _slotMetrics$getRange.end,
    endDate = _slotMetrics$getRange.endDate,
    top = _slotMetrics$getRange.top,
    height = _slotMetrics$getRange.height

  this.start = start
  this.end = end
  this.startMs = +startDate
  this.endMs = +endDate
  this.top = top
  this.height = height
  this.data = data
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
  var columnEnds = []
  cluster.forEach(function(event) {
    var column = columnEnds.findIndex(function(end) {
      return end <= event.start
    })
    if (column === -1) column = columnEnds.length
    columnEnds[column] = event.end
    event.column = column
  })

  var columnWidth = 100 / columnEnds.length
  cluster.forEach(function(event) {
    var span = 1
    while (
      event.column + span < columnEnds.length &&
      !cluster.some(function(other) {
        return other.column === event.column + span && overlaps(other, event)
      })
    ) {
      span++
    }
    event.xOffset = event.column * columnWidth
    event.width = span * columnWidth
  })
}

function getStyledEvents(_ref2) {
  var events = _ref2.events,
    props = _objectWithoutProperties(_ref2, ['events'])

  var proxies = (0, _sortBy2.default)(
    events.map(function(event) {
      return new Event(event, props)
    }),
    [
      'start',
      function(e) {
        return -e.end
      },
    ]
  )

  // Split the events into clusters, where every event overlaps at least one
  // other event of its cluster. Comparing against the furthest end seen so
  // far (not just the first event's) keeps chains like 9:30-9:50, 9:45-10:15,
  // 9:50-10:20 in one cluster, so the last one can't cover the middle one.
  var cluster = []
  var clusterEnd = -Infinity
  proxies.forEach(function(event) {
    if (event.start >= clusterEnd) {
      layoutCluster(cluster)
      cluster = []
    }
    cluster.push(event)
    clusterEnd = Math.max(clusterEnd, event.end)
  })
  layoutCluster(cluster)

  // Return the original events, along with their styles.
  return proxies.map(function(event) {
    return {
      event: event.data,
      style: {
        top: event.top,
        height: event.height,
        width: event.width,
        xOffset: event.xOffset,
      },
    }
  })
}

exports.getStyledEvents = getStyledEvents
