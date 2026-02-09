/*
 * Baiterek Station - ESP8266 Sensor Monitoring
 *
 * Hardware: NodeMCU / Wemos D1 Mini + Multiplexer (CD4051)
 * Sensors: DHT22, BMP280, MQ-2, MQ-7
 *
 * WIRING:
 * D4  - DHT22 DATA
 * D5  - MUX S0
 * D6  - MUX S1
 * D7  - MUX S2
 * A0  - MUX Output (analog)
 * SDA - BMP280 SDA (default D2)
 * SCL - BMP280 SCL (default D1)
 *
 * MUX Channels:
 * Channel 0 - MQ-2 (Smoke/Gas)
 * Channel 1 - MQ-7 (CO)
 */

#include <Adafruit_BMP280.h>
#include <DHT.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>


// ============================================
// CONFIGURATION
// ============================================
const char *ssid = "Network";
const char *password = "123456789";
const char *serverUrl = "http://192.168.0.100:5000/api/sensors";

// ============================================
// PIN DEFINITIONS
// ============================================
#define DHT_PIN D4
#define MUX_S0 D5
#define MUX_S1 D6
#define MUX_S2 D7

// ============================================
// SENSOR OBJECTS
// ============================================
DHT dht(DHT_PIN, DHT22);
Adafruit_BMP280 bmp;
WiFiClient wifiClient;

// ============================================
// TIMING
// ============================================
unsigned long previousMillis = 0;
const long interval = 10000; // 10 seconds
bool bmpInitialized = false;

// ============================================
// MULTIPLEXER CHANNEL READ
// ============================================
int readMuxChannel(int channel) {
  digitalWrite(MUX_S0, channel & 0x01);
  digitalWrite(MUX_S1, (channel >> 1) & 0x01);
  digitalWrite(MUX_S2, (channel >> 2) & 0x01);
  delay(10); // Stabilization delay
  return analogRead(A0);
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("\n=================================");
  Serial.println("Baiterek Station - ESP8266");
  Serial.println("=================================\n");

  // Initialize MUX pins
  pinMode(MUX_S0, OUTPUT);
  pinMode(MUX_S1, OUTPUT);
  pinMode(MUX_S2, OUTPUT);
  Serial.println("[OK] Multiplexer configured");

  // Initialize DHT22
  dht.begin();
  Serial.println("[OK] DHT22 initialized");

  // Initialize BMP280
  if (!bmp.begin(0x76)) {
    Serial.println("[WARNING] BMP280 not found!");
    bmpInitialized = false;
  } else {
    bmpInitialized = true;
    Serial.println("[OK] BMP280 initialized");
  }

  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] WiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[ERROR] WiFi connection failed!");
  }

  // Warm-up MQ sensors
  Serial.println("\nWarming up MQ sensors (20s)...");
  delay(20000);

  Serial.println("\n=================================");
  Serial.println("System ready!");
  Serial.println("=================================\n");
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Read sensors
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    float pres = bmpInitialized ? bmp.readPressure() / 100.0 : 0;

    // Read MQ sensors via multiplexer
    int smoke = map(readMuxChannel(0), 0, 1023, 0, 100);
    int co = map(readMuxChannel(1), 0, 1023, 0, 100);
    smoke = constrain(smoke, 0, 100);
    co = constrain(co, 0, 100);

    // Validate DHT data
    if (isnan(temp))
      temp = -999;
    if (isnan(hum))
      hum = -999;

    // Debug output
    Serial.println("\n+====================================+");
    Serial.println("|     SENSOR DATA                    |");
    Serial.println("+====================================+");
    Serial.printf("| Temperature: %.1f C\n", temp);
    Serial.printf("| Humidity:    %.1f %%\n", hum);
    Serial.printf("| Pressure:    %.1f hPa\n", pres);
    Serial.printf("| Smoke (MQ-2): %d %%\n", smoke);
    Serial.printf("| CO (MQ-7):    %d %%\n", co);
    Serial.println("+====================================+");

    // Build JSON
    String json = "{\"temperature\":" + String(temp, 2) +
                  ",\"humidity\":" + String(hum, 2) +
                  ",\"pressure\":" + String(pres, 2) +
                  ",\"smoke\":" + String(smoke) + ",\"co\":" + String(co) + "}";

    // Send to server
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(wifiClient, serverUrl);
      http.addHeader("Content-Type", "application/json");

      int httpCode = http.POST(json);

      if (httpCode > 0) {
        Serial.printf("[OK] HTTP %d\n", httpCode);
      } else {
        Serial.printf("[ERROR] HTTP failed: %s\n",
                      http.errorToString(httpCode).c_str());
      }

      http.end();
    } else {
      Serial.println("[WARNING] WiFi disconnected, reconnecting...");
      WiFi.reconnect();
    }
  }
}
