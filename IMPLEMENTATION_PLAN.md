# Arduino Firmware Rewrite - Icarus Station

## Overview

Создание унифицированной прошивки Arduino для станции Icarus на базе ESP32 с полной поддержкой всех датчиков и передачей данных на бэкенд через Wi-Fi.

## Sensors Configuration

| Sensor | Type | Connection | Purpose |
|--------|------|------------|---------|
| DHT22 (AM2302) | Digital | GPIO 4 | Температура и влажность |
| BMP280 | I2C | SDA=21, SCL=22 | Атмосферное давление |
| MQ-2 | Analog | GPIO 34 | Детектор дыма/газа |
| MQ-7 | Analog | GPIO 35 | Детектор CO |

## Backend API Format

**Endpoint**: `/api/sensors` (POST)

**JSON Format**:
```json
{
  "temperature": 22.5,
  "humidity": 45.2,
  "pressure": 1013.25,
  "smoke": 15,
  "co": 8
}
```

---

## Implementation Phase

### 1. Delete Old Firmware Folder Files

**Target**: [Firmware](file:///d:/Icarus_station/Firmware)

Удалить все устаревшие файлы:
- `Firmware.ino` - старый код на базе ESP8266
- `DHT.cpp`, `DHT.h` - кастомные библиотеки (заменим на Adafruit)
- `ESP8266.cpp`, `ESP8266.h`, `ESP8266_common.h` - не нужны для ESP32
- Файлы лицензий

---

### 2. Create New Unified Arduino Firmware for ESP32

**Target**: [Icarus_Station_Unified.ino](file:///d:/Icarus_station/Firmware/Icarus_Station_Unified.ino)

**Основные компоненты**:

#### Libraries
```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <Adafruit_BMP280.h>
```

#### Configuration Constants
- Wi-Fi credentials (SSID, password)
- Backend server URL
- Sensor pins (DHT=4, MQ2=34, MQ7=35)
- Calibration constants для MQ датчиков
- Интервал отправки данных (10 секунд)

---

### 3. Implement Sensor Initialization Logic

**DHT22 Sensor**:
```cpp
DHT dht(DHTPIN, DHT22);
dht.begin();
```

**BMP280 Sensor**:
```cpp
Adafruit_BMP280 bmp;
if (!bmp.begin(0x76)) {
  Serial.println("BMP280 initialization failed!");
}
```

**MQ Sensors**:
```cpp
pinMode(MQ2_PIN, INPUT);
pinMode(MQ7_PIN, INPUT);
```

**Error Handling**:
- Проверка успешной инициализации каждого датчика
- Вывод сообщений об ошибках в Serial Monitor
- Продолжение работы при отказе отдельных датчиков

---

### 4. Implement Data Reading and Filtering

**DHT22 Reading**:
```cpp
float temperature = dht.readTemperature();
float humidity = dht.readHumidity();

// Validate readings
if (isnan(temperature) || isnan(humidity)) {
  Serial.println("DHT22 read error!");
  return;
}
```

**BMP280 Reading**:
```cpp
float pressure = bmp.readPressure() / 100.0F; // Convert to hPa
```

**MQ Sensors Reading with Filtering**:
```cpp
// Moving average filter (5-sample buffer)
int mq2_raw = analogRead(MQ2_PIN);
int mq7_raw = analogRead(MQ7_PIN);

// Add to circular buffer
mq2_buffer[buffer_index] = mq2_raw;
mq7_buffer[buffer_index] = mq7_raw;
buffer_index = (buffer_index + 1) % BUFFER_SIZE;

// Calculate average
int mq2_avg = calculateAverage(mq2_buffer);
int mq7_avg = calculateAverage(mq7_buffer);

// Convert to 0-100 scale with calibration
int smoke = map(mq2_avg, MQ2_MIN, MQ2_MAX, 0, 100);
int co = map(mq7_avg, MQ7_MIN, MQ7_MAX, 0, 100);

// Constrain values
smoke = constrain(smoke, 0, 100);
co = constrain(co, 0, 100);
```

---

### 5. Implement Wi-Fi Connectivity

**Connection Logic**:
```cpp
void connectWiFi() {
  Serial.print("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed!");
  }
}
```

**Auto-Reconnect**:
```cpp
void loop() {
  // Check Wi-Fi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
  }
  
  // Continue with sensor reading and data sending
}
```

---

### 6. Implement HTTP POST to Backend API

**JSON Payload Creation**:
```cpp
String createJSON(float temp, float hum, float press, int smoke, int co) {
  String json = "{";
  json += "\"temperature\":" + String(temp, 1) + ",";
  json += "\"humidity\":" + String(hum, 1) + ",";
  json += "\"pressure\":" + String(press, 2) + ",";
  json += "\"smoke\":" + String(smoke) + ",";
  json += "\"co\":" + String(co);
  json += "}";
  return json;
}
```

**HTTP POST Request**:
```cpp
void sendDataToBackend(String jsonData) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(jsonData);
    
    if (httpResponseCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      String response = http.getString();
      Serial.println(response);
    } else {
      Serial.print("Error sending POST: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi not connected. Cannot send data.");
  }
}
```

---

### 7. Add Proper Error Handling

**Sensor Read Errors**:
- Проверка `isnan()` для DHT22
- Проверка валидности значений BMP280
- Обработка аналоговых значений вне диапазона

**Network Errors**:
- Проверка статуса Wi-Fi перед отправкой
- Обработка HTTP ошибок (коды 4xx, 5xx)
- Retry logic с задержкой

**Serial Debugging**:
```cpp
void printSensorData(float temp, float hum, float press, int smoke, int co) {
  Serial.println("\n========== SENSOR DATA ==========");
  Serial.print("Temperature: "); Serial.print(temp); Serial.println(" °C");
  Serial.print("Humidity: "); Serial.print(hum); Serial.println(" %");
  Serial.print("Pressure: "); Serial.print(press); Serial.println(" hPa");
  Serial.print("Smoke (MQ-2): "); Serial.print(smoke); Serial.println(" %");
  Serial.print("CO (MQ-7): "); Serial.print(co); Serial.println(" %");
  Serial.println("=================================\n");
}
```

---

### 8. Add Calibration Constants

**Configuration Section**:
```cpp
// MQ-2 Calibration (smoke/gas sensor)
#define MQ2_MIN 0      // Minimum analog value (clean air)
#define MQ2_MAX 4095   // Maximum analog value (ESP32 12-bit ADC)

// MQ-7 Calibration (CO sensor)
#define MQ7_MIN 0      // Minimum analog value (clean air)
#define MQ7_MAX 4095   // Maximum analog value

// Moving average filter
#define BUFFER_SIZE 5

// Data sending interval
#define SEND_INTERVAL 10000  // 10 seconds in milliseconds
```

**Adjustable Parameters**:
- Пользователь может настроить `MQ2_MIN/MAX` и `MQ7_MIN/MAX` после калибровки
- Интервал отправки данных настраивается через `SEND_INTERVAL`

---

## Verification Phase

### 1. Verify Code Compiles Without Errors

**Arduino IDE Settings**:
- Board: ESP32 Dev Module
- Upload Speed: 115200
- Flash Frequency: 80MHz
- Partition Scheme: Default

**Compilation Test**:
```bash
# Open Arduino IDE
# File → Open → d:\Icarus_station\Firmware\Icarus_Station_Unified.ino
# Sketch → Verify/Compile
```

**Expected Result**: 
✅ Compilation successful, no errors or warnings

---

### 2. Document Testing Procedure for User

**Hardware Setup**:
1. Подключить ESP32 к компьютеру через USB
2. Подключить датчики:
   - DHT22 → GPIO 4 (+ VCC, GND)
   - BMP280 → I2C (SDA=21, SCL=22, VCC, GND)
   - MQ-2 → GPIO 34 (+ VCC, GND)
   - MQ-7 → GPIO 35 (+ VCC, GND)

**Software Setup**:
1. Установить Arduino IDE
2. Установить библиотеки:
   - DHT sensor library by Adafruit
   - Adafruit BMP280 Library
   - Adafruit Unified Sensor
3. Настроить Wi-Fi credentials в коде
4. Настроить URL бэкенд сервера

**Upload and Monitor**:
```bash
# Upload firmware
Sketch → Upload

# Open Serial Monitor
Tools → Serial Monitor (115200 baud)
```

**Expected Serial Output**:
```
Initializing sensors...
DHT22 initialized
BMP280 initialized
Connecting to WiFi...
WiFi connected!
IP address: 192.168.1.100

========== SENSOR DATA ==========
Temperature: 22.5 °C
Humidity: 45.2 %
Pressure: 1013.25 hPa
Smoke (MQ-2): 15 %
CO (MQ-7): 8 %
=================================

Sending data to backend...
HTTP Response code: 200
{"success": true, "message": "Sensor data received"}
```

**Testing Checklist**:
- [ ] Все датчики инициализируются успешно
- [ ] Wi-Fi подключается к сети
- [ ] Данные считываются каждые 10 секунд
- [ ] HTTP POST отправляется на бэкенд
- [ ] Бэкенд возвращает код 200
- [ ] При отключении Wi-Fi происходит автоматическое переподключение
- [ ] При остановке бэкенда ESP32 продолжает попытки отправки

---

### 3. Create Walkthrough Documentation

**Walkthrough будет включать**:
- Скриншоты Serial Monitor с выводом данных
- Примеры успешной отправки на бэкенд
- Демонстрацию обработки ошибок
- Результаты всех тестов из чеклиста

---

## Required Libraries

**Adafruit Libraries** (установить через Library Manager):
- DHT sensor library by Adafruit (v1.4.4+)
- Adafruit BMP280 Library (v2.6.6+)
- Adafruit Unified Sensor (v1.1.9+)

**Built-in ESP32 Libraries**:
- WiFi.h
- HTTPClient.h

---

## Implementation Notes

> [!NOTE]
> Код оптимизирован для ESP32 и использует:
> - 12-bit ADC (0-4095) для аналоговых датчиков
> - Wi-Fi библиотеку ESP32 (не ESP8266)
> - Стандартные библиотеки Adafruit
> - Moving average фильтр для стабильности показаний MQ датчиков
