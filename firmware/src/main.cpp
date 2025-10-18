// main.cpp
#include <Arduino.h>
#include <WiFiManager.h>
#include "aws_iot.h"
#include "sensor.h"
#include "secrets.h"
#include "config.h"

/**
 * The function `connectWifi` attempts to connect to WiFi using WiFiManager and restarts the ESP if
 * connection fails.
 * if connection fails. Connect to ESP32_XXXXX network and configure WiFi.
 */
void connectWifi() {
    WiFiManager wm;
    Serial.print("Connecting to Wifi ");
    if (!wm.autoConnect()) {
        Serial.println("Failed to connect, restarting...");
        delay(3000);
        ESP.restart();
    }
    Serial.println("Connected.");
}

void setup() {
    Serial.begin(115200);
    connectWifi();
    connectAWS();
    initSensor();
    NTPConnect();
}

void loop() {
    
    static unsigned long lastPublish = 0;
    const unsigned long publishInterval = 5000; // 5 seconds

    // Serial.println("[LOOP] --- New loop iteration ---");
    // Serial.print("[MEM] Free heap (start): ");
    ESP.getFreeHeap();

    // Maintain MQTT connection and call client.loop() as often as possible
    clientLoop();
    if (!clientIsConnected()) {
        Serial.println("[AWS] MQTT not connected, reconnecting...");
        connectAWS();
        extern WiFiClientSecure net;
        extern PubSubClient client;
        Serial.print("[AWS] MQTT client state: ");
        Serial.println(client.state());
    }

    // Only publish at intervals
    if (millis() - lastPublish >= publishInterval) {
        Serial.println("[SENSOR] Reading sensors...");
        float distance = readUltrasonicCM(1.0, 0);
        // Skip DHT for now
        float temp = 0;
        float hum = 0;
        int soil = readSensorData_SoilMoisture();
        Serial.print("[SENSOR] Distance: "); Serial.println(distance);
        Serial.print("[SENSOR] Temperature: "); Serial.println(temp);
        Serial.print("[SENSOR] Humidity: "); Serial.println(hum);
        Serial.print("[SENSOR] Soil Moisture: "); Serial.println(soil);

        if (clientIsConnected()) {
            Serial.println("[AWS] Publishing message to AWS IoT...");
            if (publishMessage(hum, temp, distance)) {
                Serial.println("[AWS] Message published.");
            } else {
                Serial.println("[AWS] Message publish failed.");
            }
        } else {
            Serial.println("[AWS] Not connected, skipping publish.");
        }
        lastPublish = millis();
    }

    // Short delay to yield to WiFi/MQTT stack
    delay(10);

    // Serial.print("[MEM] Free heap (end): ");
    ESP.getFreeHeap();
}
