# Location Tracking (Frontend Integration)

## Overview
This document describes frontend changes required to support real-time driver location tracking for both customers and drivers via socket events.

## Socket Events
- **Event:** `driver-location-update`
- **Payload:**
  ```json
  {
    "type": "driver-location-update",
    "data": {
      "driverId": "<driverId>",
      "location": {
        "latitude": <number>,
        "longitude": <number>,
        "lastUpdated": "<ISO timestamp>"
      },
      "timestamp": "<ISO timestamp>"
    }
  }
  ```

## Frontend Changes
### For Driver App
- Listen for `driver-location-update` in the driver's socket room (`driver-<driverId>`).
- Update driver's map/location UI in real-time.
- Optionally, allow driver to see their own location history.

### For Customer App
- Listen for `driver-location-update` in the customer's socket room (`customer-<customerId>`).
- Show driver's current location on map during active order.
- Optionally, show ETA and route if available.

### For Admin Dashboard
- Continue listening for `driver-location-update` in `admin-room`.
- Show all active drivers' locations on the dashboard map.

## Example Usage
```js
socket.on('driver-location-update', (payload) => {
  // payload.data.driverId
  // payload.data.location.latitude, payload.data.location.longitude
  // Update map or UI accordingly
});
```

## Notes
- Location updates are only sent to customers with an active order assigned to the driver.
- Ensure socket authentication is implemented for secure room joining.
- Handle disconnects and reconnections gracefully.

---
For backend details, see `socketService.js` and related controllers.
