/*
 * Icarus Station - Environmental Monitoring System (AHT20 Version)
 * Arduino UNO/Nano compatible code
 * 
 * Sensors:
 * - Temperature & Humidity: AHT20 (I2C)
 * - CO2: MH-Z19B (SoftwareSerial: RX=3, TX=4)
 * - Oxygen (O2): ZE07-O2 (SoftwareSerial: RX=5, TX=6)
 * - Carbon Monoxide (CO): MQ-7 (Analog pin A0)
 * 
 * Display: OLED SSD1306 0.96" (I2C: SDA=A4, SCL=A5)
 * 
 * Libraries required:
 * - Adafruit AHTX0 Library
 * - Adafruit SSD1306
 * - Adafruit GFX Library
 * - SoftwareSerial (built-in)
 */

#include <Adafruit_AHTX0.h>
#include <SoftwareSerial.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ==================== PIN DEFINITIONS ====================
// AHT20 Temperature & Humidity Sensor (I2C)

// MH-Z19B CO2 Sensor (SoftwareSerial)
#define MH_Z19_RX 3
#define MH_Z19_TX 4

// ZE07-O2 Oxygen Sensor (SoftwareSerial)
#define ZE07_O2_RX 5
#define ZE07_O2_TX 6

// MQ-7 Carbon Monoxide Sensor
#define MQ7_PIN A0

// OLED Display (I2C)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

// ==================== SENSOR OBJECTS ====================
Adafruit_AHTX0 aht;
SoftwareSerial mh_z19(MH_Z19_RX, MH_Z19_TX);  // CO2 sensor
SoftwareSerial ze07_o2(ZE07_O2_RX, ZE07_O2_TX);  // O2 sensor
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
const unsigned long UPDATE_INTERVAL = 1000;  // 1 second

// ==================== SETUP ====================
void setup() {
  // Initialize Serial for debugging
  Serial.begin(9600);
  Serial.println("Icarus Station - Initializing...");
  
  // Initialize I2C
  Wire.begin();
  
  // Initialize AHT20
  if (!aht.begin()) {
    Serial.println("Could not find AHT20! Check wiring");
    while (1) delay(10);
  }
  Serial.println("AHT20 initialized");
  
  // Initialize MH-Z19B CO2 sensor
  mh_z19.begin(9600);
  Serial.println("MH-Z19B initialized");
  
  // Initialize ZE07-O2 Oxygen sensor
  ze07_o2.begin(9600);
  Serial.println("ZE07-O2 initialized");
  
  // Initialize OLED Display
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;); // Don't proceed, loop forever
  }
  display.display();
  delay(2000);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(F("Icarus Station"));
  display.println(F("Initializing..."));
  display.display();
  delay(1000);
  display.clearDisplay();
  Serial.println("OLED Display initialized");
  
  // Warm-up delay for sensors
  delay(2000);
  
  Serial.println("System ready!");
}

// ==================== MAIN LOOP ====================
void loop() {
  unsigned long currentTime = millis();
  
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
  
  delay(10); // Small delay to prevent watchdog issues
}

// ==================== SENSOR READING FUNCTIONS ====================

/**
 * Read temperature and humidity from AHT20
 */
float readTemperature() {
  sensors_event_t humidity, temp;
  aht.getEvent(&humidity, &temp);
  
  if (isnan(temp.temperature)) {
    Serial.println("Failed to read temperature from AHT20");
    return -999.0; // Error value
  }
  
  return temp.temperature;
}

float readHumidity() {
  sensors_event_t humidity, temp;
  aht.getEvent(&humidity, &temp);
  
  if (isnan(humidity.relative_humidity)) {
    Serial.println("Failed to read humidity from AHT20");
    return -999.0; // Error value
  }
  
  return humidity.relative_humidity;
}

/**
 * Read CO2 concentration from MH-Z19B
 * Protocol: 9 bytes command, response in ppm
 */
int readCO2() {
  // Clear serial buffer first
  while (mh_z19.available()) {
    mh_z19.read();
  }
  
  byte cmd[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  byte response[9] = {0};
  
  // Send command
  for (int i = 0; i < 9; i++) {
    mh_z19.write(cmd[i]);
  }
  
  // Wait for response
  delay(100);
  
  // Read response
  int timeout = 0;
  while (mh_z19.available() < 9 && timeout < 100) {
    delay(10);
    timeout++;
  }
  
  if (mh_z19.available() >= 9) {
    for (int i = 0; i < 9; i++) {
      response[i] = mh_z19.read();
    }
    
    // Validate response (check header and checksum)
    if (response[0] == 0xFF && response[1] == 0x86) {
      // Calculate checksum
      byte checksum = 0;
      for (int i = 1; i < 8; i++) {
        checksum += response[i];
      }
      checksum = 0xFF - checksum + 1;
      
      if (checksum == response[8]) {
        // Extract CO2 value (high byte * 256 + low byte)
        int co2 = (response[2] * 256) + response[3];
        // Validate range (CO2 should be 0-5000 ppm typically)
        if (co2 >= 0 && co2 <= 5000) {
          return co2;
        }
      }
    }
  }
  
  Serial.println("Failed to read CO2 from MH-Z19B");
  return -1; // Error value
}

/**
 * Read Oxygen concentration from ZE07-O2
 * Protocol: 9 bytes, O2 value in response
 * Note: ZE07-O2 may use different protocol - adjust if needed
 */
float readOxygen() {
  // Clear serial buffer first
  while (ze07_o2.available()) {
    ze07_o2.read();
  }
  
  byte cmd[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};
  byte response[9] = {0};
  
  // Send command
  for (int i = 0; i < 9; i++) {
    ze07_o2.write(cmd[i]);
  }
  
  // Wait for response
  delay(100);
  
  // Read response
  int timeout = 0;
  while (ze07_o2.available() < 9 && timeout < 100) {
    delay(10);
    timeout++;
  }
  
  if (ze07_o2.available() >= 9) {
    for (int i = 0; i < 9; i++) {
      response[i] = ze07_o2.read();
    }
    
    // Validate response
    if (response[0] == 0xFF && response[1] == 0x86) {
      // Calculate checksum
      byte checksum = 0;
      for (int i = 1; i < 8; i++) {
        checksum += response[i];
      }
      checksum = 0xFF - checksum + 1;
      
      if (checksum == response[8]) {
        // Extract O2 value (high byte * 256 + low byte) / 100.0
        int o2_raw = (response[2] * 256) + response[3];
        float o2 = o2_raw / 100.0;
        // Validate range (O2 should be 0-25% typically)
        if (o2 >= 0.0 && o2 <= 25.0) {
          return o2;
        }
      }
    }
  }
  
  Serial.println("Failed to read O2 from ZE07-O2");
  return -1.0; // Error value
}

/**
 * Read Carbon Monoxide from MQ-7
 * Analog reading, needs calibration
 */
int readCO() {
  int sensorValue = analogRead(MQ7_PIN);
  
  // MQ-7 calibration (this is a basic conversion, needs calibration for accurate readings)
  // Formula: ppm = (sensorValue / 1024.0) * 5.0 * 200.0
  // This is approximate - actual calibration depends on sensor characteristics
  float voltage = (sensorValue / 1024.0) * 5.0;
  
  // MQ-7 sensitivity curve approximation
  // For more accuracy, use lookup table or polynomial based on datasheet
  int co_ppm = 0;
  if (voltage > 0.4) {
    // Simplified conversion (needs calibration with known CO concentrations)
    co_ppm = (voltage - 0.4) * 200.0;  // Rough approximation
    if (co_ppm < 0) co_ppm = 0;
    if (co_ppm > 1000) co_ppm = 1000;  // Limit to reasonable range
  }
  
  return co_ppm;
}

/**
 * Read all sensors and return SensorData structure
 */
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

/**
 * Apply moving average filter to sensor readings
 */
SensorData applyFiltering(SensorData newData) {
  SensorData filtered;
  
  // Add new values to buffers
  if (newData.temperature > -900) {  // Valid reading
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
  
  // Calculate averages
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
  
  // Update buffer index
  bufferIndex = (bufferIndex + 1) % FILTER_SIZE;
  
  return filtered;
}

// ==================== DISPLAY FUNCTIONS ====================

/**
 * Display sensor data on OLED screen
 */
void displaySensorData(SensorData data) {
  display.clearDisplay();
  display.setCursor(0, 0);
  
  // Header
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.println(F("Icarus Station"));
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);
  
  // Temperature
  display.setCursor(0, 12);
  display.print(F("Temп: "));
  if (data.temperature > -900) {
    display.print(data.temperature, 1);
    display.print(F("\xB0"));  // Degree symbol
    display.print(F("C"));
  } else {
    display.print(F("ERR"));
  }
  
  // Humidity
  display.setCursor(0, 22);
  display.print(F("Vlazhn: "));
  if (data.humidity > -900) {
    display.print(data.humidity, 1);
    display.print(F("%"));
  } else {
    display.print(F("ERR"));
  }
  
  // CO2
  display.setCursor(0, 32);
  display.print(F("CO2: "));
  if (data.co2 > 0) {
    display.print(data.co2);
    display.print(F(" ppm"));
  } else {
    display.print(F("ERR"));
  }
  
  // Oxygen
  display.setCursor(0, 42);
  display.print(F("O2: "));
  if (data.oxygen > 0) {
    display.print(data.oxygen, 1);
    display.print(F("%"));
  } else {
    display.print(F("ERR"));
  }
  
  // CO
  display.setCursor(0, 52);
  display.print(F("CO: "));
  if (data.co >= 0) {
    display.print(data.co);
    display.print(F(" ppm"));
  } else {
    display.print(F("ERR"));
  }
  
  display.display();
}

/**
 * Print sensor data to Serial monitor (for debugging)
 */
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

