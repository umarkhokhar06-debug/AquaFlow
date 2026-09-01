// Fixed hourly delivery slots, 9am-7pm with a 1-2pm break. Server-side
// source of truth for validating `scheduledFor` -- the mobile app keeps its
// own copy for rendering the picker, but validation always lives here.
const BOOKABLE_START_HOURS = [9, 10, 11, 12, 14, 15, 16, 17, 18];

const SCHEDULING_WINDOW_DAYS = 30;

function isValidScheduleSlot(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;

  if (date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0) {
    return false;
  }
  if (!BOOKABLE_START_HOURS.includes(date.getHours())) {
    return false;
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + SCHEDULING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (date.getTime() < now.getTime() || date.getTime() > windowEnd.getTime()) {
    return false;
  }

  return true;
}

module.exports = { BOOKABLE_START_HOURS, SCHEDULING_WINDOW_DAYS, isValidScheduleSlot };
