/*
 * Icarus Station - Environmental Monitoring System
 * Arduino UNO/Nano compatible code
 * 
 * Sensors:
 * - Temperature & Humidity: DHT22 (Digital pin 2)
 * - Atmospheric Pressure: BMP280 (I2C)
 * - Smoke/Gas: MQ-2 (Analog pin A0)
 * - Carbon Monoxide (CO): MQ-7 (Analog pin A1)
 * 
 * Libraries required:
 * - DHT sensor library by Adafruit
 * - Adafruit BMP280 Library
 */

#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP280.h>

// ==================== PIN DEFINITIONS ====================
// DHT22 Temperature & Humidity Sensor
#define DHT_PIN 2
#define DHT_TYPE DHT22

// MQ-2 Smoke/Gas Sensor
#define MQ2_PIN A0

// MQ-7 Carbon Monoxide Sensor
#define MQ7_PIN A1



// ==================== CALIBRATION CONSTANTS ====================
// MQ-2 calibration (adjust based on your sensor)
const int MQ2_THRESHOLD_MIN = 100;   // Minimum ADC value
const int MQ2_THRESHOLD_MAX = 900;   // Maximum ADC value

// MQ-7 calibration (adjust based on your sensor)
const int MQ7_THRESHOLD_MIN = 100;
const int MQ7_THRESHOLD_MAX = 900;

// ==================== SENSOR OBJECTS ====================
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_BMP280 bmp;

// ==================== DATA STRUCTURE ====================
struct SensorData {
  float temperature = 0.0;  // °C
  float humidity = 0.0;     // %
  float pressure = 0.0;     // hPa
  int smoke = 0;            // 0-100%
  int co = 0;               // 0-100%
};

// ==================== FILTERING VARIABLES ====================
const int FILTER_SIZE = 5;
float tempBuffer[FILTER_SIZE] = {0};
float humBuffer[FILTER_SIZE] = {0};
float pressBuffer[FILTER_SIZE] = {0};
int smokeBuffer[FILTER_SIZE] = {0};
int coBuffer[FILTER_SIZE] = {0};
int bufferIndex = 0;

// ==================== TIMING ====================
unsigned long lastUpdate = 0;
const unsigned long UPDATE_INTERVAL = 10000;  // 10 seconds

// ==================== SETUP ====================
void setup() {
  // Initialize Serial for debugging
  Serial.begin(9600);
  Serial.println("Icarus Station - Initializing...");
  
  // Initialize DHT22
  dht.begin();
  Serial.println("DHT22 initialized");
  
  // Initialize BMP280
  if (!bmp.begin(0x76)) {  // Try address 0x76 first
    if (!bmp.begin(0x77)) {  // Try address 0x77
      Serial.println("Could not find BMP280 sensor!");
    } else {
      Serial.println("BMP280 initialized at 0x77");
    }
  } else {
    Serial.println("BMP280 initialized at 0x76");
  }
  
  // BMP280 settings
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                  Adafruit_BMP280::SAMPLING_X2,
                  Adafruit_BMP280::SAMPLING_X16,
                  Adafruit_BMP280::FILTER_X16,
                  Adafruit_BMP280::STANDBY_MS_500);
  

  
  // Warm-up delay for sensors
  delay(2000);
  
  Serial.println("System ready!");
}

// ==================== MAIN LOOP ====================
void loop() {
  unsigned long currentTime = millis();
  
  // Update every 10 seconds
  if (currentTime - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = currentTime;
    
    // Read all sensors
    SensorData data = readAllSensors();
    
    // Apply filtering
    data = applyFiltering(data);
    

    
    // Print to Serial for debugging
    printSensorData(data);
  }
  
  delay(10); // Small delay to prevent watchdog issues
}

// ==================== SENSOR READING FUNCTIONS ====================

/**
 * Read temperature from DHT22
 */
float readTemperature() {
  float temp = dht.readTemperature();
  
  if (isnan(temp)) {
    Serial.println("Failed to read temperature from DHT22");
    return -999.0; // Error value
  }
  
  return temp;
}

/**
 * Read humidity from DHT22
 */
float readHumidity() {
  float hum = dht.readHumidity();
  
  if (isnan(hum)) {
    Serial.println("Failed to read humidity from DHT22");
    return -999.0; // Error value
  }
  
  return hum;
}

/**
 * Read atmospheric pressure from BMP280
 */
float readPressure() {
  float pressure = bmp.readPressure() / 100.0F; // Convert Pa to hPa
  
  if (isnan(pressure) || pressure < 300.0 || pressure > 1100.0) {
    Serial.println("Failed to read pressure from BMP280");
    return -999.0; // Error value
  }
  
  return pressure;
}

/**
 * Read smoke/gas level from MQ-2
 * Returns 0-100% based on calibration thresholds
 */
int readSmoke() {
  int sensorValue = analogRead(MQ2_PIN);
  
  // Map ADC value (0-1023) to percentage (0-100)
  int smokeLevel = map(sensorValue, MQ2_THRESHOLD_MIN, MQ2_THRESHOLD_MAX, 0, 100);
  
  // Constrain to 0-100 range
  smokeLevel = constrain(smokeLevel, 0, 100);
  
  return smokeLevel;
}

/**
 * Read CO level from MQ-7
 * Returns 0-100% based on calibration thresholds
 */
int readCO() {
  int sensorValue = analogRead(MQ7_PIN);
  
  // Map ADC value (0-1023) to percentage (0-100)
  int coLevel = map(sensorValue, MQ7_THRESHOLD_MIN, MQ7_THRESHOLD_MAX, 0, 100);
  
  // Constrain to 0-100 range
  coLevel = constrain(coLevel, 0, 100);
  
  return coLevel;
}

/**
 * Read all sensors and return SensorData structure
 */
SensorData readAllSensors() {
  SensorData data;
  
  data.temperature = readTemperature();
  data.humidity = readHumidity();
  data.pressure = readPressure();
  data.smoke = readSmoke();
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
  if (newData.pressure > -900) {
    pressBuffer[bufferIndex] = newData.pressure;
  }
  smokeBuffer[bufferIndex] = newData.smoke;
  coBuffer[bufferIndex] = newData.co;
  
  // Calculate averages
  float tempSum = 0, humSum = 0, pressSum = 0;
  int smokeSum = 0, coSum = 0;
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
    if (pressBuffer[i] > -900) {
      pressSum += pressBuffer[i];
      validCount++;
    }
  }
  filtered.pressure = (validCount > 0) ? (pressSum / validCount) : newData.pressure;
  
  for (int i = 0; i < FILTER_SIZE; i++) {
    smokeSum += smokeBuffer[i];
    coSum += coBuffer[i];
  }
  filtered.smoke = smokeSum / FILTER_SIZE;
  filtered.co = coSum / FILTER_SIZE;
  
  // Update buffer index
  bufferIndex = (bufferIndex + 1) % FILTER_SIZE;
  
  return filtered;
}

// ==================== SERIAL OUTPUT FUNCTIONS ====================

/**
 * Print sensor data to Serial monitor
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
  
  Serial.print("Pressure: ");
  if (data.pressure > -900) {
    Serial.print(data.pressure, 1);
    Serial.println(" hPa");
  } else {
    Serial.println("ERROR");
  }
  
  Serial.print("Smoke: ");
  Serial.print(data.smoke);
  Serial.println(" %");
  
  Serial.print("CO: ");
  Serial.print(data.co);
  Serial.println(" %");
  
  Serial.println("====================================");
  Serial.println();
}
