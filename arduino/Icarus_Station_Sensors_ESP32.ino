/*
 * Icarus Station - Environmental Monitoring System with WiFi (ESP32 Version)
 * 
 * Sensors:
 * - Temperature & Humidity: AHT20 (I2C) or DHT22
 * - CO2: MH-Z19B (HardwareSerial or SoftwareSerial)
 * - Oxygen (O2): ZE07-O2 (HardwareSerial or SoftwareSerial)
 * - Carbon Monoxide (CO): MQ-7 (Analog pin)
 * 
 * Display: OLED SSD1306 0.96" (I2C)
 * 
 * WiFi: Built-in ESP32 WiFi
 * 
 * Libraries required:
 * - Adafruit AHTX0 Library (for AHT20) OR DHT sensor library (for DHT22)
 * - Adafruit SSD1306
 * - Adafruit GFX Library
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * - ArduinoJson (optional)
 */

#include <Adafruit_AHTX0.h>
// #include <DHT.h>  // Uncomment if using DHT22
#include <HardwareSerial.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ==================== WIFI CONFIGURATION ====================
const char* ssid = "YOUR_WIFI_SSID";           // Change to your WiFi SSID
const char* password = "YOUR_WIFI_PASSWORD";   // Change to your WiFi password
const char* serverUrl = "http://192.168.1.100:5000";  // Change to your server IP and port

// ==================== PIN DEFINITIONS ====================
// For ESP32: SDA=21, SCL=22 (default I2C pins)

// AHT20 Temperature & Humidity Sensor (I2C) - RECOMMENDED
// OR DHT22 (uncomment if using DHT22):
// #define DHT_PIN 4
// #define DHT_TYPE DHT22

// MH-Z19B CO2 Sensor (HardwareSerial - ESP32 has multiple UARTs)
#define MH_Z19_RX 16
#define MH_Z19_TX 17
HardwareSerial mh_z19(1);  // Use UART1

// ZE07-O2 Oxygen Sensor (HardwareSerial)
#define ZE07_O2_RX 18
#define ZE07_O2_TX 19
HardwareSerial ze07_o2(2);  // Use UART2

// MQ-7 Carbon Monoxide Sensor
#define MQ7_PIN 34  // ADC1_CH6 on ESP32

// OLED Display (I2C)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

// ==================== SENSOR OBJECTS ====================
Adafruit_AHTX0 aht;
// DHT dht(DHT_PIN, DHT_TYPE);  // Uncomment if using DHT22
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ==================== DATA STRUCTURE ====================
struct SensorData {
  float temperature = 0.0;
  float humidity = 0.0;
  int co2 = 0;
  float oxygen = 0.0;
  int co = 0;
};

// ==================== FILTERING VARIABLES ====================
const int FILTER_SIZE = 5;
float tempBuffer[FILTER_SIZE] = {0};
float humBuffer[FILTER_SIZE] = {0};
int co2Buffer[FILTER_SIZE] = {0};
float o2Buffer[FILTER_SIZE] = {0};
int coBuffer[FILTER_SIZE] = {0};
int bufferIndex = 0;

// ==================== TIMING ====================
unsigned long lastUpdate = 0;
unsigned long lastWiFiSend = 0;
const unsigned long UPDATE_INTERVAL = 1000;  // 1 second for display
const unsigned long WIFI_SEND_INTERVAL = 5000;  // 5 seconds for server upload

// ==================== WIFI STATUS ====================
bool wifiConnected = false;

// ==================== SETUP ====================
void setup() {
  // Initialize Serial for debugging
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\nIcarus Station - Initializing...");
  
  // Initialize I2C
  Wire.begin();
  
  // Initialize AHT20
  if (!aht.begin()) {
    Serial.println("Could not find AHT20! Check wiring");
  } else {
    Serial.println("AHT20 initialized");
  }
  
  // Initialize DHT22 (if using instead of AHT20)
  // dht.begin();
  // Serial.println("DHT22 initialized");
  
  // Initialize MH-Z19B CO2 sensor (HardwareSerial)
  mh_z19.begin(9600, SERIAL_8N1, MH_Z19_RX, MH_Z19_TX);
  Serial.println("MH-Z19B initialized");
  
  // Initialize ZE07-O2 Oxygen sensor (HardwareSerial)
  ze07_o2.begin(9600, SERIAL_8N1, ZE07_O2_RX, ZE07_O2_TX);
  Serial.println("ZE07-O2 initialized");
  
  // Initialize OLED Display
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
  } else {
    display.display();
    delay(2000);
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(F("Icarus Station"));
    display.println(F("Connecting WiFi..."));
    display.display();
    Serial.println("OLED Display initialized");
  }
  
  // Connect to WiFi
  connectWiFi();
  
  // Warm-up delay for sensors
  delay(2000);
  
  Serial.println("System ready!");
}

// ==================== MAIN LOOP ====================
void loop() {
  unsigned long currentTime = millis();
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    if (currentTime - lastWiFiSend > 30000) {  // Try to reconnect every 30 seconds
      connectWiFi();
      lastWiFiSend = currentTime;
    }
  } else {
    wifiConnected = true;
  }
  
  // Update display every 1 second
  if (currentTime - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = currentTime;
    
    // Read all sensors
    SensorData data = readAllSensors();
    
    // Apply filtering
    data = applyFiltering(data);
    
    // Display on OLED
    displaySensorData(data);
    
    // Print to Serial for debugging
    printSensorData(data);
  }
  
  // Send data to server every 5 seconds
  if (wifiConnected && (currentTime - lastWiFiSend >= WIFI_SEND_INTERVAL)) {
    lastWiFiSend = currentTime;
    
    SensorData data = readAllSensors();
    data = applyFiltering(data);
    
    sendDataToServer(data);
  }
  
  delay(10);
}

// ==================== WIFI FUNCTIONS ====================

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println(F("WiFi Connected"));
    display.print(F("IP: "));
    display.println(WiFi.localIP());
    display.display();
    delay(2000);
  } else {
    wifiConnected = false;
    Serial.println("\nWiFi connection failed!");
    
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println(F("WiFi Failed"));
    display.display();
  }
}

void sendDataToServer(SensorData data) {
  if (!wifiConnected) {
    return;
  }
  
  HTTPClient http;
  
  String url = String(serverUrl) + "/api/telemetry/arduino";
  
  Serial.print("Sending data to server: ");
  Serial.println(url);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"temperature\":" + String(data.temperature, 2) + ",";
  jsonPayload += "\"humidity\":" + String(data.humidity, 2) + ",";
  jsonPayload += "\"co2\":" + String(data.co2) + ",";
  jsonPayload += "\"oxygen\":" + String(data.oxygen, 2) + ",";
  jsonPayload += "\"co\":" + String(data.co);
  jsonPayload += "}";
  
  Serial.println("Payload: " + jsonPayload);
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    
    String response = http.getString();
    Serial.println("Response: " + response);
    
    display.setCursor(0, 56);
    display.print(F("WiFi: OK"));
    display.display();
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
    
    display.setCursor(0, 56);
    display.print(F("WiFi: ERR"));
    display.display();
  }
  
  http.end();
}

// ==================== SENSOR READING FUNCTIONS ====================

float readTemperature() {
  sensors_event_t humidity, temp;
  if (aht.getEvent(&humidity, &temp)) {
    if (!isnan(temp.temperature)) {
      return temp.temperature;
    }
  }
  
  // If using DHT22:
  // float temp = dht.readTemperature();
  // if (!isnan(temp)) return temp;
  
  Serial.println("Failed to read temperature");
  return -999.0;
}

float readHumidity() {
  sensors_event_t humidity, temp;
  if (aht.getEvent(&humidity, &temp)) {
    if (!isnan(humidity.relative_humidity)) {
      return humidity.relative_humidity;
    }
  }
  
  // If using DHT22:
  // float hum = dht.readHumidity();
  // if (!isnan(hum)) return hum;
  
  Serial.println("Failed to read humidity");
  return -999.0;
}

int readCO2() {
  while (mh_z19.available()) {
    mh_z19.read();
  }
  
  byte cmd[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  byte response[9] = {0};
  
  for (int i = 0; i < 9; i++) {
    mh_z19.write(cmd[i]);
  }
  
  delay(100);
  
  int timeout = 0;
  while (mh_z19.available() < 9 && timeout < 100) {
    delay(10);
    timeout++;
  }
  
  if (mh_z19.available() >= 9) {
    for (int i = 0; i < 9; i++) {
      response[i] = mh_z19.read();
    }
    
    if (response[0] == 0xFF && response[1] == 0x86) {
      byte checksum = 0;
      for (int i = 1; i < 8; i++) {
        checksum += response[i];
      }
      checksum = 0xFF - checksum + 1;
      
      if (checksum == response[8]) {
        int co2 = (response[2] * 256) + response[3];
        if (co2 >= 0 && co2 <= 5000) {
          return co2;
        }
      }
    }
  }
  
  Serial.println("Failed to read CO2");
  return -1;
}

float readOxygen() {
  while (ze07_o2.available()) {
    ze07_o2.read();
  }
  
  byte cmd[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  byte response[9] = {0};
  
  for (int i = 0; i < 9; i++) {
    ze07_o2.write(cmd[i]);
  }
  
  delay(100);
  
  int timeout = 0;
  while (ze07_o2.available() < 9 && timeout < 100) {
    delay(10);
    timeout++;
  }
  
  if (ze07_o2.available() >= 9) {
    for (int i = 0; i < 9; i++) {
      response[i] = ze07_o2.read();
    }
    
    if (response[0] == 0xFF && response[1] == 0x86) {
      byte checksum = 0;
      for (int i = 1; i < 8; i++) {
        checksum += response[i];
      }
      checksum = 0xFF - checksum + 1;
      
      if (checksum == response[8]) {
        int o2_raw = (response[2] * 256) + response[3];
        float o2 = o2_raw / 100.0;
        if (o2 >= 0.0 && o2 <= 25.0) {
          return o2;
        }
      }
    }
  }
  
  Serial.println("Failed to read O2");
  return -1.0;
}

int readCO() {
  int sensorValue = analogRead(MQ7_PIN);
  float voltage = (sensorValue / 4095.0) * 3.3;  // ESP32 ADC is 12-bit (0-4095)
  
  int co_ppm = 0;
  if (voltage > 0.4) {
    co_ppm = (voltage - 0.4) * 200.0;
    if (co_ppm < 0) co_ppm = 0;
    if (co_ppm > 1000) co_ppm = 1000;
  }
  
  return co_ppm;
}

SensorData readAllSensors() {
  SensorData data;
  data.temperature = readTemperature();
  data.humidity = readHumidity();
  data.co2 = readCO2();
  data.oxygen = readOxygen();
  data.co = readCO();
  return data;
}

// ==================== FILTERING FUNCTIONS ====================

SensorData applyFiltering(SensorData newData) {
  SensorData filtered;
  
  if (newData.temperature > -900) {
    tempBuffer[bufferIndex] = newData.temperature;
  }
  if (newData.humidity > -900) {
    humBuffer[bufferIndex] = newData.humidity;
  }
  if (newData.co2 > 0) {
    co2Buffer[bufferIndex] = newData.co2;
  }
  if (newData.oxygen > 0) {
    o2Buffer[bufferIndex] = newData.oxygen;
  }
  if (newData.co >= 0) {
    coBuffer[bufferIndex] = newData.co;
  }
  
  float tempSum = 0, humSum = 0, o2Sum = 0;
  int co2Sum = 0, coSum = 0;
  int validCount = 0;
  
  for (int i = 0; i < FILTER_SIZE; i++) {
    if (tempBuffer[i] > -900) {
      tempSum += tempBuffer[i];
      validCount++;
    }
  }
  filtered.temperature = (validCount > 0) ? (tempSum / validCount) : newData.temperature;
  
  validCount = 0;
  for (int i = 0; i < FILTER_SIZE; i++) {
    if (humBuffer[i] > -900) {
      humSum += humBuffer[i];
      validCount++;
    }
  }
  filtered.humidity = (validCount > 0) ? (humSum / validCount) : newData.humidity;
  
  validCount = 0;
  for (int i = 0; i < FILTER_SIZE; i++) {
    if (co2Buffer[i] > 0) {
      co2Sum += co2Buffer[i];
      validCount++;
    }
  }
  filtered.co2 = (validCount > 0) ? (co2Sum / validCount) : newData.co2;
  
  validCount = 0;
  for (int i = 0; i < FILTER_SIZE; i++) {
    if (o2Buffer[i] > 0) {
      o2Sum += o2Buffer[i];
      validCount++;
    }
  }
  filtered.oxygen = (validCount > 0) ? (o2Sum / validCount) : newData.oxygen;
  
  validCount = 0;
  for (int i = 0; i < FILTER_SIZE; i++) {
    if (coBuffer[i] >= 0) {
      coSum += coBuffer[i];
      validCount++;
    }
  }
  filtered.co = (validCount > 0) ? (coSum / validCount) : newData.co;
  
  bufferIndex = (bufferIndex + 1) % FILTER_SIZE;
  
  return filtered;
}

// ==================== DISPLAY FUNCTIONS ====================

void displaySensorData(SensorData data) {
  display.clearDisplay();
  display.setCursor(0, 0);
  
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.println(F("Icarus Station"));
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
  
  display.setCursor(0, 12);
  display.print(F("Temп: "));
  if (data.temperature > -900) {
    display.print(data.temperature, 1);
    display.print(F("\xB0C"));
  } else {
    display.print(F("ERR"));
  }
  
  display.setCursor(0, 22);
  display.print(F("Vlazhn: "));
  if (data.humidity > -900) {
    display.print(data.humidity, 1);
    display.print(F("%"));
  } else {
    display.print(F("ERR"));
  }
  
  display.setCursor(0, 32);
  display.print(F("CO2: "));
  if (data.co2 > 0) {
    display.print(data.co2);
    display.print(F(" ppm"));
  } else {
    display.print(F("ERR"));
  }
  
  display.setCursor(0, 42);
  display.print(F("O2: "));
  if (data.oxygen > 0) {
    display.print(data.oxygen, 1);
    display.print(F("%"));
  } else {
    display.print(F("ERR"));
  }
  
  display.setCursor(0, 52);
  display.print(F("CO: "));
  if (data.co >= 0) {
    display.print(data.co);
  } else {
    display.print(F("ERR"));
  }
  
  display.display();
}

void printSensorData(SensorData data) {
  Serial.println("========== Sensor Readings ==========");
  Serial.print("Temperature: ");
  if (data.temperature > -900) {
    Serial.print(data.temperature, 1);
    Serial.println(" °C");
  } else {
    Serial.println("ERROR");
  }
  
  Serial.print("Humidity: ");
  if (data.humidity > -900) {
    Serial.print(data.humidity, 1);
    Serial.println(" %");
  } else {
    Serial.println("ERROR");
  }
  
  Serial.print("CO2: ");
  if (data.co2 > 0) {
    Serial.print(data.co2);
    Serial.println(" ppm");
  } else {
    Serial.println("ERROR");
  }
  
  Serial.print("Oxygen: ");
  if (data.oxygen > 0) {
    Serial.print(data.oxygen, 1);
    Serial.println(" %");
  } else {
    Serial.println("ERROR");
  }
  
  Serial.print("CO: ");
  if (data.co >= 0) {
    Serial.print(data.co);
    Serial.println(" ppm");
  } else {
    Serial.println("ERROR");
  }
  
  Serial.println("====================================");
  Serial.println();
}

