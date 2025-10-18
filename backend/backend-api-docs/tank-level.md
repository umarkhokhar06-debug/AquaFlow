# Tank Level API

## Calibration

### Set Calibration

`POST /api/calibration`

**Body:**
```json
{
  "tank_depth": 100.0,
  "tank_full_distance": 20.0
}
```
- `tank_depth`: Maximum distance inside tank (when empty)
- `tank_full_distance`: Distance when tank is full

**Response:**
```json
{
  "success": true,
  "calibration": {
    "_id": "...",
    "tank_depth": 100.0,
    "tank_full_distance": 20.0,
    "createdAt": "..."
  }
}
```

### Get Calibration

`GET /api/calibration`

**Response:**
```json
{
  "success": true,
  "calibration": {
    "_id": "...",
    "tank_depth": 100.0,
    "tank_full_distance": 20.0,
    "createdAt": "..."
  }
}
```

---

## IoT Data

### Data Format

Incoming IoT data should include:
```json
{
  "humidity": 20.0,
  "temperature": 29.0,
  "distance": 23.0,
  "timestamp": "2025-10-02T00:18:03.000Z"
}
```

### How Tank Level is Calculated

```
tankLevel = ((tank_depth - distance) / (tank_depth - tank_full_distance)) * 100
```
- Clamped between 0 and 100
- Requires calibration to be set first

### Get Latest IoT Data

`GET /api/iot/latest`

**Response:**
```json
{
  "success": true,
  "data": {
    "humidity": 20.0,
    "temperature": 29.0,
    "tankLevel": 85.0,
    "timestamp": "2025-10-02T00:18:03.000Z",
    "receivedAt": "..."
  }
}
```

### Get All IoT Data

`GET /api/iot/all?page=1&limit=50`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "humidity": 20.0,
      "temperature": 29.0,
      "tankLevel": 85.0,
      "timestamp": "2025-10-02T00:18:03.000Z",
      "receivedAt": "..."
    }
    // ...
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```
