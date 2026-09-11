/*
  AabRahat -- Real ESP32 Tank Sensor Firmware (direct HTTP, production)
  -----------------------------------------------------------------------
  Board: ESP32 DevKit + HC-SR04 ultrasonic sensor + 4 status LEDs.

  Unlike the AWS IoT / MQTT firmware in firmware/src (which needs a
  per-device certificate), this sketch talks to the backend the same
  simple way the device simulator does: a plain HTTPS POST to
  POST /api/iot/data with { deviceId, distance }. No certificates to
  provision, no AWS setup -- just WiFi.

  WiFi: uses WiFiManager, same as the original firmware. Since this
  ESP32 has already been through the "AabRahat-Setup" captive portal
  once, it should reconnect to your saved network automatically on
  every boot without showing the portal again.

  This device is already registered on the backend as:
    deviceId:            AABRAHAT-ESP01
    owner:                tariqnisar123@gmail.com
    calibration.tank_depth:        213.36 cm  (7 ft sensor-to-bottom)
    calibration.tank_full_distance: 0 cm
    tankCapacityLiters:   15857  (10ft x 8ft x 7ft)

  If the sensor isn't mounted flush with the top of the tank, or the
  above measurements were rough estimates, ask to have the device's
  calibration corrected later -- no firmware change needed for that,
  it's a database value.

  Required Arduino Library (Library Manager):
    - WiFiManager (by tzapu)
  Board package:
    - "esp32" by Espressif Systems (Boards Manager)
  Board selection: any generic "ESP32 Dev Module" matches this DevKit.
*/

#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ---------------------------------------------------------------------------
// Identity + backend
// ---------------------------------------------------------------------------
#define DEVICE_ID        "AABRAHAT-ESP01"
#define BACKEND_HOST      "https://d27yn7i7dixdgk.cloudfront.net"
#define INGEST_PATH       "/api/iot/data"
#define PUBLISH_INTERVAL_MS  5000

// ---------------------------------------------------------------------------
// Pins (matches the populated board: HC-SR04 + 4 status LEDs, no LCD)
// ---------------------------------------------------------------------------
#define TRIG_PIN         5
#define ECHO_PIN         18

#define LED_POWER_PIN    2   // on whenever the ESP32 is powered/running
#define LED_SENSOR_PIN   4   // on when the ultrasonic sensor returns a valid reading
#define LED_WIFI_PIN     16  // on once WiFi is connected
#define LED_SERVER_PIN   17  // pulses briefly on every successful publish to the backend

float readUltrasonicCM() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout (~5m range)
  if (duration == 0) return -1;

  return duration * 0.034 / 2;
}

bool publishReading(float distanceCM) {
  WiFiClientSecure client;
  client.setInsecure(); // skip TLS cert validation -- simplest for a hobby device, data isn't sensitive

  HTTPClient http;
  String url = String(BACKEND_HOST) + INGEST_PATH;
  if (!http.begin(client, url)) {
    Serial.println("[HTTP] begin() failed");
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  String body = String("{\"deviceId\":\"") + DEVICE_ID + "\",\"distance\":" + String(distanceCM, 2) + "}";

  int code = http.POST(body);
  bool ok = (code == 200 || code == 201);

  if (ok) {
    Serial.print("[HTTP] Published OK, response: ");
    Serial.println(code);
  } else {
    Serial.print("[HTTP] Publish failed, code: ");
    Serial.print(code);
    Serial.print(", body: ");
    Serial.println(http.getString());
  }

  http.end();
  return ok;
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_POWER_PIN, OUTPUT);
  pinMode(LED_SENSOR_PIN, OUTPUT);
  pinMode(LED_WIFI_PIN, OUTPUT);
  pinMode(LED_SERVER_PIN, OUTPUT);

  digitalWrite(LED_POWER_PIN, HIGH);
  digitalWrite(LED_SENSOR_PIN, LOW);
  digitalWrite(LED_WIFI_PIN, LOW);
  digitalWrite(LED_SERVER_PIN, LOW);

  Serial.println("=== AabRahat Tank Sensor (real hardware, direct HTTP) ===");

  WiFiManager wm;
  Serial.println("[WIFI] Connecting (will reuse saved credentials if available)...");
  if (!wm.autoConnect("AabRahat-Setup")) {
    Serial.println("[WIFI] Failed to connect, restarting...");
    delay(3000);
    ESP.restart();
  }
  digitalWrite(LED_WIFI_PIN, HIGH);
  Serial.print("[WIFI] Connected. IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  static unsigned long lastPublish = 0;

  if (millis() - lastPublish >= PUBLISH_INTERVAL_MS) {
    lastPublish = millis();

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI] Lost connection, reconnecting...");
      digitalWrite(LED_WIFI_PIN, LOW);
      WiFi.reconnect();
      return;
    }
    digitalWrite(LED_WIFI_PIN, HIGH);

    float distance = readUltrasonicCM();
    bool sensorOK = (distance >= 0);
    digitalWrite(LED_SENSOR_PIN, sensorOK ? HIGH : LOW);

    if (!sensorOK) {
      Serial.println("[SENSOR] No echo received (timeout/out of range).");
      return;
    }

    Serial.print("[SENSOR] Distance: ");
    Serial.print(distance);
    Serial.println(" cm");

    bool published = publishReading(distance);
    digitalWrite(LED_SERVER_PIN, published ? HIGH : LOW);
  }
}
