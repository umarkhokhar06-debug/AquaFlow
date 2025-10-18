import paho.mqtt.client as mqtt
import ssl
import time
import json
import os
import logging


# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG to see all MQTT logs
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("TankerMonitor")

# Enable detailed MQTT debug logging
def on_log(client, userdata, level, buf):
    logger.debug(f"MQTT log: {buf}")

# AWS IoT Core endpoint
AWS_IOT_ENDPOINT = "a3aap03cjx0go8-ats.iot.us-east-1.amazonaws.com"
PORT = 8883

# Certificate paths (download from AWS IoT console)
CA_PATH = "crt/AmazonRootCA1.pem"
CERT_PATH = "crt/e7d328f3fae76a829f35f14ff1c14dcb2432a984bd72a0a51c6db03d35136bbf-certificate.pem.crt"
KEY_PATH = "crt/e7d328f3fae76a829f35f14ff1c14dcb2432a984bd72a0a51c6db03d35136bbf-private.pem.key"

TOPIC = "TankerManagement/pub"

# Check if certificate files exist
for path, name in [(CA_PATH, "CA certificate"), (CERT_PATH, "Device certificate"), (KEY_PATH, "Private key")]:
    if not os.path.isfile(path):
        logger.error(f"{name} not found at path: {path}")
        raise FileNotFoundError(f"{name} not found at path: {path}")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info(f"Connected to AWS IoT Core with result code: {rc}")
        logger.info(f"Published initial message to topic '{TOPIC}'")
    else:
        logger.error(f"Failed to connect, return code: {rc}")

def on_message(client, userdata, msg):
    logger.info(f"Message received on topic '{msg.topic}': {msg.payload.decode()}")

client = mqtt.Client(client_id="TankerManagement-sim")
client.on_connect = on_connect
client.on_message = on_message
client.on_log = on_log

# Configure TLS/SSL
client.tls_set(ca_certs=CA_PATH,
               certfile=CERT_PATH,
               keyfile=KEY_PATH,
               cert_reqs=ssl.CERT_REQUIRED,
               tls_version=ssl.PROTOCOL_TLSv1_2,
               ciphers=None)

try:
    client.connect(AWS_IOT_ENDPOINT, PORT, keepalive=60)
    client.loop_start()

    while True:
        try:
            humidity = float(input("Enter humidity: "))
            temperature = float(input("Enter temperature: "))
            distance = float(input("Enter distance: "))
        except ValueError:
            logger.error("Invalid input. Please enter numeric values.")
            continue

        message = {
            "humidity": humidity,
            "temperature": temperature,
            "distance": distance,
            "timestamp": time.ctime() + "\n"
        }
        payload = json.dumps(message)
        result = client.publish(TOPIC, payload)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"Published message to topic '{TOPIC}': {payload}")
        else:
            logger.error(f"Failed to publish message, error code: {result.rc}")
        input("Press Enter to send another message...")
except Exception as e:
    logger.exception(f"Exception occurred: {e}")
