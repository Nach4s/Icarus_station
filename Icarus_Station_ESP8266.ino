/*
 * Icarus Station - ESP8266 Sensor Monitoring System
 *
 * Description: Environmental monitoring system with sensors:
 * - AM2302 (DHT22) - Temperature and Humidity
 * - BMP280 - Atmospheric Pressure
 * - MQ-2 - Smoke and Gas Detector
 * - MQ-7 - Carbon Monoxide (CO) Detector
 *
 * Data is sent to server every 10 seconds via HTTP POST
 *
 * IMPORTANT: Uses ESP8266 (NodeMCU/Wemos D1 Mini)
 */

// ============================================
// LIBRARIES
// ============================================
#include <Adafruit_BMP280.h>   // BMP280 library
#include <DHT.h>               // DHT22 (AM2302) library
#include <ESP8266HTTPClient.h> // HTTP client library
#include <ESP8266WiFi.h>       // WiFi library for ESP8266
#include <WiFiClient.h>        // WiFi client
#include <Wire.h>              // I2C library


// ============================================
// WIFI SETTINGS
// ============================================
const char *ssid = "YOUR_WIFI_SSID"; // Replace with your WiFi network name
const char *password = "YOUR_WIFI_PASSWORD"; // Replace with your WiFi password

// ============================================
// SERVER SETTINGS
// ============================================
const char *serverUrl =
    "http://YOUR_SERVER_IP:5000/api/sensors"; // Your server URL

// ============================================
// SENSOR PIN CONFIGURATION (ESP8266)
// ============================================
#define DHTPIN D4  // DHT22 pin (GPIO2 = D4)
#define MQ2_PIN A0 // Analog pin for MQ-2 (only ADC on ESP8266)
// MQ-7 connected via multiplexer or second ESP

// I2C: SDA = D2 (GPIO4), SCL = D1 (GPIO5) - standard for ESP8266

// ============================================
// SENSOR SETTINGS
// ============================================
#define DHTTYPE DHT22 // DHT22 sensor type (AM2302)

// Calibration values for MQ sensors (ESP8266 ADC: 0-1023)
const int MQ2_THRESHOLD_MIN = 100; // Minimum ADC value for MQ-2
const int MQ2_THRESHOLD_MAX = 900; // Maximum ADC value for MQ-2
const int MQ7_THRESHOLD_MIN = 100; // Minimum ADC value for MQ-7
const int MQ7_THRESHOLD_MAX = 900; // Maximum ADC value for MQ-7

// ============================================
// SENSOR OBJECTS INITIALIZATION
// ============================================
DHT dht(DHTPIN, DHTTYPE); // DHT22 object
Adafruit_BMP280 bmp;      // BMP280 object
WiFiClient wifiClient;    // WiFi client for HTTP

// ============================================
// GLOBAL VARIABLES
// ============================================
unsigned long previousMillis = 0; // Last measurement time
const long interval = 10000;      // Interval between measurements (10 seconds)
bool bmpInitialized = false;      // BMP280 initialization flag

// Buffer for MQ reading averaging
const int BUFFER_SIZE = 5;
int mq2_buffer[BUFFER_SIZE];
int buffer_index = 0;
bool bufferFilled = false;

// ============================================
// SETUP FUNCTION - RUNS ONCE AT STARTUP
// ============================================
void setup() {
  // Initialize Serial for debugging
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=================================");
  Serial.println("Icarus Station - ESP8266");
  Serial.println("=================================\n");

  // ----------------------------------------
  // Initialize DHT22 (AM2302)
  // ----------------------------------------
  Serial.println("Initializing DHT22...");
  dht.begin();
  Serial.println("[OK] DHT22 initialized");

  // ----------------------------------------
  // Initialize I2C and BMP280
  // ----------------------------------------
  Serial.println("Initializing BMP280...");
  Wire.begin(D2, D1); // SDA = D2, SCL = D1

  if (!bmp.begin(0x76)) { // I2C address: 0x76 or 0x77
    Serial.println("[ERROR] BMP280 not found!");
    Serial.println("  Check I2C connection");
    Serial.println("  Continuing without BMP280...");
    bmpInitialized = false;
  } else {
    // Configure BMP280 parameters
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL, Adafruit_BMP280::SAMPLING_X2,
                    Adafruit_BMP280::SAMPLING_X16, Adafruit_BMP280::FILTER_X16,
                    Adafruit_BMP280::STANDBY_MS_500);
    Serial.println("[OK] BMP280 initialized");
    bmpInitialized = true;
  }

  // ----------------------------------------
  // Configure analog pin for MQ sensor
  // ----------------------------------------
  Serial.println("Configuring MQ sensors...");
  // ESP8266 has only one ADC pin (A0)
  // For two MQ sensors you can use a multiplexer
  // or alternate readings
  Serial.println("[OK] MQ-2 configured on A0");

  // Initialize buffer
  for (int i = 0; i < BUFFER_SIZE; i++) {
    mq2_buffer[i] = 0;
  }

  // ----------------------------------------
  // Warm up MQ sensors
  // ----------------------------------------
  Serial.println("\nWarming up MQ sensors (20 sec)...");
  for (int i = 20; i > 0; i--) {
    Serial.print("Remaining: ");
    Serial.print(i);
    Serial.println(" sec");
    delay(1000);
  }
  Serial.println("[OK] Warm-up complete\n");

  // ----------------------------------------
  // Connect to WiFi
  // ----------------------------------------
  Serial.println("Connecting to WiFi...");
  Serial.print("SSID: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[ERROR] Could not connect to WiFi");
    Serial.println("  System will continue without data transmission");
  }

  Serial.println("\n=================================");
  Serial.println("System ready!");
  Serial.println("=================================\n");
}

// ============================================
// LOOP FUNCTION - RUNS CONTINUOUSLY
// ============================================
void loop() {
  unsigned long currentMillis = millis();

  // Check time interval (10 seconds)
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // ----------------------------------------
    // Read sensor data
    // ----------------------------------------
    Serial.println("\n--- Reading sensors ---");

    // Read DHT22 (temperature and humidity)
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    // Read BMP280 (pressure)
    float pressure = 0;
    if (bmpInitialized) {
      pressure = bmp.readPressure() / 100.0F; // Convert to hPa
    }

    // Read MQ-2 (smoke/gas) with averaging
    int mq2_raw = analogRead(MQ2_PIN);
    mq2_buffer[buffer_index] = mq2_raw;
    buffer_index = (buffer_index + 1) % BUFFER_SIZE;
    if (buffer_index == 0)
      bufferFilled = true;

    // Calculate average
    int mq2_avg = 0;
    int count = bufferFilled ? BUFFER_SIZE : buffer_index;
    for (int i = 0; i < count; i++) {
      mq2_avg += mq2_buffer[i];
    }
    mq2_avg = mq2_avg / count;

    // Convert to percentage (0-100)
    int mq2_level = map(mq2_avg, MQ2_THRESHOLD_MIN, MQ2_THRESHOLD_MAX, 0, 100);
    mq2_level = constrain(mq2_level, 0, 100);

    // For MQ-7: if no second ADC, use emulation or second ESP
    // In this example using derived value from MQ-2 or 0
    int mq7_level = 0; // Replace with real reading if available

    // ----------------------------------------
    // Validate DHT22 data
    // ----------------------------------------
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("[ERROR] DHT22 read failed!");
      temperature = -999;
      humidity = -999;
    }

    // ----------------------------------------
    // Output data to Serial Monitor
    // ----------------------------------------
    Serial.println("\n+====================================+");
    Serial.println("|     ICARUS SENSOR DATA             |");
    Serial.println("+====================================+");
    Serial.print("| Temperature:    ");
    Serial.print(temperature);
    Serial.println(" C");
    Serial.print("| Humidity:       ");
    Serial.print(humidity);
    Serial.println(" %");
    Serial.print("| Pressure:       ");
    Serial.print(pressure);
    Serial.println(" hPa");
    Serial.println("+------------------------------------+");
    Serial.print("| MQ-2 (gas/smoke): ");
    Serial.print(mq2_level);
    Serial.print(" % (raw: ");
    Serial.print(mq2_raw);
    Serial.println(")");
    Serial.print("| MQ-7 (CO):        ");
    Serial.print(mq7_level);
    Serial.println(" %");
    Serial.println("+====================================+\n");

    // ----------------------------------------
    // Send data to server
    // ----------------------------------------
    if (WiFi.status() == WL_CONNECTED) {
      sendDataToServer(temperature, humidity, pressure, mq2_level, mq7_level);
    } else {
      Serial.println("[WARNING] WiFi not connected. Attempting reconnect...");
      WiFi.reconnect();
    }
  }
}

// ============================================
// FUNCTION TO SEND DATA TO SERVER
// ============================================
void sendDataToServer(float temp, float hum, float press, int smoke, int co) {
  HTTPClient http;

  Serial.println("--- Sending data to server ---");

  // Begin HTTP connection
  http.begin(wifiClient, serverUrl);
  http.addHeader("Content-Type", "application/json");

  // Build JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"temperature\":" + String(temp, 2) + ",";
  jsonPayload += "\"humidity\":" + String(hum, 2) + ",";
  jsonPayload += "\"pressure\":" + String(press, 2) + ",";
  jsonPayload += "\"smoke\":" + String(smoke) + ",";
  jsonPayload += "\"co\":" + String(co);
  jsonPayload += "}";

  Serial.print("JSON: ");
  Serial.println(jsonPayload);

  // Send POST request
  int httpResponseCode = http.POST(jsonPayload);

  // Handle response
  if (httpResponseCode > 0) {
    Serial.print("[OK] HTTP Response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.print("Server response: ");
    Serial.println(response);
  } else {
    Serial.print("[ERROR] Send failed: ");
    Serial.println(httpResponseCode);
    Serial.println("  Check server URL and availability");
  }

  // Close connection
  http.end();
  Serial.println("--- Send complete ---\n");
}
