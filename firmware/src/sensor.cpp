// sensor.cpp
#include "sensor.h"
#include "config.h"
#include <Arduino.h>

// Define ultrasonic sensor pins if not defined in config.h
#ifndef TRIG_PIN
#define TRIG_PIN 26 // Change 23 to your actual trigger pin number
#endif

#ifndef ECHO_PIN
#define ECHO_PIN 27 // Change 22 to your actual echo pin number
#endif

DHT dht(DHTPIN, DHTTYPE);
float h;
float t;

/**
 * The function `initSensor()` initializes a sensor for measuring temperature and humidity.
 */
void initSensor() {
    dht.begin();

    // Init ultrasonic sensor
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
}

/**
 * The function `readSensorData_DHT_T` reads temperature data from a DHT sensor and returns the
 * temperature value.
 * 
 * @return The function `readSensorData_DHT_T` is returning the temperature read from the DHT sensor.
 */
float readSensorData_DHT_T() {
    if (isnan(t)) {
        Serial.println("Failed to read from DHT sensor!");
    }
    return dht.readTemperature();
}

/**
 * The function reads humidity sensor data from a DHT sensor and prints an error message if the data is
 * invalid.
 * 
 * @return The function `readSensorData_DHT_H()` is returning the humidity value read from the DHT
 * sensor using the `dht.readHumidity()` function.
 */
float readSensorData_DHT_H() {
    if (isnan(h)) {
        Serial.println("Failed to read from DHT sensor!");
    }
    return dht.readHumidity();
}

/**
 * The function `readSensorData_SoilMoisture` reads the soil moisture data from a sensor connected to a
 * specific pin.
 * 
 * @return The function `readSensorData_SoilMoisture()` is returning the analog reading from the pin
 * specified by `SOIL_MOISTURE_PIN`.
 */
int readSensorData_SoilMoisture() {
    return analogRead(SOIL_MOISTURE_PIN);
}



/**
 * @brief Reads distance from the ultrasonic sensor.
 * @param scale Scaling factor for the distance measurement.
 * @param offset Offset to add to the distance measurement.
 * @return Distance in centimeters, or -1 if no echo is received.
 */
float readUltrasonicCM(float scale, int offset) {
  long duration;
  float distance;

  // Send trigger pulse
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Read echo pulse (timeout 30ms ~ 5m range)
  duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) {
    Serial.println("Error: No echo received (timeout).");
    return -1;  // return -1 when no echo
  }

  // Calculate distance (cm)
  distance = duration * 0.034 / 2;
  return distance * scale + offset;
}

