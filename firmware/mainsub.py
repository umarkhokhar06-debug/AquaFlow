import paho.mqtt.client as mqtt
import ssl
import os
import logging


# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

# AWS IoT Core endpoint
AWS_IOT_ENDPOINT = "a3aap03cjx0go8-ats.iot.us-east-1.amazonaws.com"
PORT = 8883

# Certificate paths
CA_PATH = "secret/AmazonRootCA1.pem"
CERT_PATH = "secret/1fccffa823e5aec071612de1eda2bffee97c13571825deacfcfb58f2705a5901-certificate.pem.crt"
KEY_PATH = "secret/1fccffa823e5aec071612de1eda2bffee97c13571825deacfcfb58f2705a5901-private.pem.key"

TOPIC = "TankerManagement/pub"

# Check cert files exist
for path, name in [(CA_PATH, "CA certificate"), (CERT_PATH, "Device certificate"), (KEY_PATH, "Private key")]:
    if not os.path.isfile(path):
        logging.error(f"{name} not found at path: {path}")
        raise FileNotFoundError(f"{name} not found at path: {path}")
    else:
        logging.debug(f"{name} found at path: {path}")

# Callbacks
def on_connect(client, userdata, flags, reasonCode, properties=None):
    logging.info(f"Connected with reasonCode: {reasonCode}")
    result, mid = client.subscribe(TOPIC)
    logging.info(f"Subscribe result: {result}, message id: {mid}")
    logging.info(f"Subscribed to topic: {TOPIC}")

def on_message(client, userdata, msg):
    logging.info(f"Message received on {msg.topic}: {msg.payload.decode()}")

def on_subscribe(client, userdata, mid, granted_qos, properties=None):
    logging.debug(f"Subscribed: mid={mid}, granted_qos={granted_qos}")

def on_disconnect(client, userdata, reasonCode, properties=None):
    logging.warning(f"Disconnected with reasonCode: {reasonCode}")

def on_log(client, userdata, level, buf):
    logging.debug(f"MQTT Log: {buf}")


# Init client
client = mqtt.Client(client_id="TankerManagement_subscriber")
client.on_connect = on_connect
client.on_message = on_message
client.on_subscribe = on_subscribe
client.on_disconnect = on_disconnect
client.on_log = on_log

# Configure TLS
logging.debug("Configuring TLS...")
client.tls_set(
    ca_certs=CA_PATH,
    certfile=CERT_PATH,
    keyfile=KEY_PATH,
    cert_reqs=ssl.CERT_REQUIRED,
    tls_version=ssl.PROTOCOL_TLSv1_2,
    ciphers=None
)

# Connect and loop forever
logging.info(f"Connecting to {AWS_IOT_ENDPOINT}:{PORT}")
client.connect(AWS_IOT_ENDPOINT, PORT, keepalive=60)
logging.info("Starting MQTT loop...")
client.loop_forever()
