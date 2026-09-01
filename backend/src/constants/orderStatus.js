// Single source of truth for order status values and legal transitions.
// Previously this was duplicated (and inconsistent) across orderService.js's
// transition map, driverAppController.js's own hardcoded list, and
// cancelOrder's separate, looser check -- see SRS section 9 for the target
// lifecycle this maps to.

const ORDER_STATUSES = [
  'order_created',
  'queued',
  'driver_assigned',
  'going_to_filling_station',
  'water_filled',
  'on_the_way',
  'arrived',
  'delivered',
  'cancelled',
];

// 'cancelled' is reachable from every non-terminal status; listed
// explicitly per status (rather than a blanket rule) so the intent is
// visible at the call site and any future terminal status is opt-in, not
// accidental.
const STATUS_TRANSITIONS = {
  order_created: ['queued', 'cancelled'],
  queued: ['driver_assigned', 'cancelled'],
  driver_assigned: ['going_to_filling_station', 'cancelled'],
  going_to_filling_station: ['water_filled', 'cancelled'],
  water_filled: ['on_the_way', 'cancelled'],
  on_the_way: ['arrived', 'cancelled'],
  arrived: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

function canTransition(from, to) {
  return Array.isArray(STATUS_TRANSITIONS[from]) && STATUS_TRANSITIONS[from].includes(to);
}

// Orders can still be cancelled once a driver is en route but not after
// delivery/cancellation themselves -- used by cancelOrder, which previously
// had its own separate, looser rule than the transition map above.
function isCancellable(status) {
  return !['delivered', 'cancelled'].includes(status);
}

module.exports = { ORDER_STATUSES, STATUS_TRANSITIONS, canTransition, isCancellable };
