/*
 * Icarus Station - Unified Environmental Monitoring System
 * Arduino UNO/Nano + ESP8266 Wi-Fi Module
 *
 * Описание: Система мониторинга окружающей среды с датчиками:
 * - AM2302 (DHT22) - температура и влажность
 * - BMP280 - атмосферное давление
 * - MQ-2 - детектор дыма и газа
 * - MQ-7 - детектор угарного газа (CO)
 *
 * Особенности:
 * - Moving average фильтр для всех датчиков (5 измерений)
 * - ESP8266 Wi-Fi модуль для отправки данных
 * - Обработка ошибок датчиков
 * - Отправка данных на сервер каждые 10 секунд через HTTP POST
 *
 * Подключение ESP8266:
 * - ESP8266 TX → Arduino RX (pin 10 через SoftwareSerial)
 * - ESP8266 RX → Arduino TX (pin 11 через SoftwareSerial)
 * - ESP8266 VCC → 3.3V
 * - ESP8266 GND → GND
 *
 * Автор: Icarus Station Team
 * Версия: 2.0 (Unified ESP8266)
 */

// ============================================
// ПОДКЛЮЧЕНИЕ БИБЛИОТЕК
// ============================================
#include <Adafruit_BMP280.h>
#include <DHT.h>
#include <SoftwareSerial.h>
#include <Wire.h>

// ============================================
// НАСТРОЙКИ WI-FI
// ============================================
const char *WIFI_SSID = "Iphone(Шынгыс)"; // Замените на имя вашей Wi-Fi сети
const char *WIFI_PASSWORD = "123456789";  // Замените на пароль вашей Wi-Fi сети

// ============================================
// НАСТРОЙКИ СЕРВЕРА
// ============================================
const char *SERVER_HOST = "172.20.10.3";  // IP адрес сервера
const int SERVER_PORT = 5000;             // Порт сервера
const char *SERVER_PATH = "/api/sensors"; // Путь к API

// ============================================
// ПИНЫ ПОДКЛЮЧЕНИЯ ДАТЧИКОВ
// ============================================
#define DHT_PIN 2  // Пин для DHT22 (AM2302)
#define MQ2_PIN A0 // Аналоговый пин для MQ-2
#define MQ7_PIN A1 // Аналоговый пин для MQ-7

// Пины для ESP8266 (SoftwareSerial)
#define ESP_RX 10 // Arduino TX → ESP8266 RX
#define ESP_TX 11 // Arduino RX ← ESP8266 TX

// ============================================
// НАСТРОЙКИ ДАТЧИКОВ
// ============================================
#define DHT_TYPE DHT22 // Тип датчика DHT22 (AM2302)

// Калибровочные значения для MQ датчиков (Arduino ADC: 0-1023)
const int MQ2_MIN = 100; // Минимальное значение АЦП для MQ-2 (чистый воздух)
const int MQ2_MAX = 900; // Максимальное значение АЦП для MQ-2
const int MQ7_MIN = 100; // Минимальное значение АЦП для MQ-7 (чистый воздух)
const int MQ7_MAX = 900; // Максимальное значение АЦП для MQ-7

// Настройки фильтрации
#define FILTER_SIZE 5 // Размер буфера для moving average фильтра

// Интервал отправки данных
#define SEND_INTERVAL 10000 // 10 секунд в миллисекундах

// ============================================
// ИНИЦИАЛИЗАЦИЯ ОБЪЕКТОВ
// ============================================
DHT dht(DHT_PIN, DHT_TYPE);             // Объект для DHT22
Adafruit_BMP280 bmp;                    // Объект для BMP280
SoftwareSerial esp8266(ESP_TX, ESP_RX); // Объект для ESP8266

// ============================================
// СТРУКТУРА ДАННЫХ
// ============================================
struct SensorData {
  float temperature = 0.0; // °C
  float humidity = 0.0;    // %
  float pressure = 0.0;    // hPa
  int smoke = 0;           // 0-100%
  int co = 0;              // 0-100%
};

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================
unsigned long previousMillis = 0; // Время последнего измерения

// Буферы для moving average фильтра
float tempBuffer[FILTER_SIZE] = {0};
float humBuffer[FILTER_SIZE] = {0};
float pressBuffer[FILTER_SIZE] = {0};
int smokeBuffer[FILTER_SIZE] = {0};
int coBuffer[FILTER_SIZE] = {0};
int bufferIndex = 0;

// Статус инициализации
bool dht_ok = false;
bool bmp_ok = false;
bool esp_ok = false;

// ============================================
// ФУНКЦИЯ: Отправка AT команды ESP8266
// ============================================
bool sendATCommand(String command, String expected, unsigned long timeout) {
  esp8266.println(command);

  unsigned long startTime = millis();
  String response = "";

  while (millis() - startTime < timeout) {
    while (esp8266.available()) {
      char c = esp8266.read();
      response += c;
    }

    if (response.indexOf(expected) != -1) {
      return true;
    }
  }

  return false;
}

// ============================================
// ФУНКЦИЯ: Инициализация ESP8266
// ============================================
bool initESP8266() {
  Serial.println("Инициализация ESP8266...");

  // Сброс модуля
  if (!sendATCommand("AT+RST", "OK", 5000)) {
    Serial.println("✗ Ошибка сброса ESP8266");
    return false;
  }
  delay(2000);

  // Проверка связи
  if (!sendATCommand("AT", "OK", 1000)) {
    Serial.println("✗ ESP8266 не отвечает");
    return false;
  }
  Serial.println("✓ ESP8266 отвечает");

  // Режим станции (STA)
  if (!sendATCommand("AT+CWMODE=1", "OK", 2000)) {
    Serial.println("✗ Ошибка установки режима");
    return false;
  }
  Serial.println("✓ Режим станции установлен");

  // Подключение к Wi-Fi
  Serial.print("Подключение к Wi-Fi: ");
  Serial.println(WIFI_SSID);

  String connectCmd = "AT+CWJAP=\"";
  connectCmd += WIFI_SSID;
  connectCmd += "\",\"";
  connectCmd += WIFI_PASSWORD;
  connectCmd += "\"";

  if (!sendATCommand(connectCmd, "OK", 15000)) {
    Serial.println("✗ Ошибка подключения к Wi-Fi");
    return false;
  }
  Serial.println("✓ Wi-Fi подключен");

  // Получение IP адреса
  esp8266.println("AT+CIFSR");
  delay(2000);
  Serial.println("IP адрес:");
  while (esp8266.available()) {
    Serial.write(esp8266.read());
  }

  return true;
}

// ============================================
// ФУНКЦИЯ SETUP - ВЫПОЛНЯЕТСЯ ОДИН РАЗ ПРИ ЗАПУСКЕ
// ============================================
void setup() {
  // Инициализация Serial для отладки
  Serial.begin(9600);
  delay(1000);
  Serial.println("\n\n=================================");
  Serial.println("Icarus Station - Запуск системы");
  Serial.println("Версия: 2.0 (Arduino + ESP8266)");
  Serial.println("=================================\n");

  // ----------------------------------------
  // Инициализация ESP8266
  // ----------------------------------------
  esp8266.begin(9600);
  esp_ok = initESP8266();

  if (!esp_ok) {
    Serial.println("⚠ Система продолжит работу без Wi-Fi");
  }

  // ----------------------------------------
  // Инициализация DHT22 (AM2302)
  // ----------------------------------------
  Serial.println("\nИнициализация DHT22...");
  dht.begin();
  delay(2000); // Задержка для стабилизации

  // Проверка работоспособности DHT22
  float test_temp = dht.readTemperature();
  if (!isnan(test_temp)) {
    dht_ok = true;
    Serial.println("✓ DHT22 инициализирован");
  } else {
    Serial.println("✗ Ошибка: DHT22 не отвечает!");
    Serial.println("  Проверьте подключение к pin 2");
  }

  // ----------------------------------------
  // Инициализация BMP280
  // ----------------------------------------
  Serial.println("Инициализация BMP280...");
  if (bmp.begin(0x76)) { // Адрес I2C: 0x76 или 0x77
    bmp_ok = true;

    // Настройка параметров BMP280
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL, Adafruit_BMP280::SAMPLING_X2,
                    Adafruit_BMP280::SAMPLING_X16, Adafruit_BMP280::FILTER_X16,
                    Adafruit_BMP280::STANDBY_MS_500);
    Serial.println("✓ BMP280 инициализирован");
  } else if (bmp.begin(0x77)) {
    bmp_ok = true;
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL, Adafruit_BMP280::SAMPLING_X2,
                    Adafruit_BMP280::SAMPLING_X16, Adafruit_BMP280::FILTER_X16,
                    Adafruit_BMP280::STANDBY_MS_500);
    Serial.println("✓ BMP280 инициализирован (0x77)");
  } else {
    Serial.println("✗ Ошибка: BMP280 не найден!");
    Serial.println("  Проверьте подключение I2C (SDA=A4, SCL=A5)");
  }

  // ----------------------------------------
  // Настройка аналоговых пинов для MQ датчиков
  // ----------------------------------------
  Serial.println("Настройка MQ датчиков...");
  pinMode(MQ2_PIN, INPUT);
  pinMode(MQ7_PIN, INPUT);
  Serial.println("✓ MQ-2 и MQ-7 настроены");

  // ----------------------------------------
  // Прогрев MQ датчиков
  // ----------------------------------------
  Serial.println("\nПрогрев MQ датчиков (30 сек)...");
  Serial.println("MQ-7 требует прогрева для стабильных показаний");
  for (int i = 30; i > 0; i--) {
    Serial.print("Осталось: ");
    Serial.print(i);
    Serial.println(" сек");
    delay(1000);
  }
  Serial.println("✓ Прогрев завершен\n");

  // ----------------------------------------
  // Итоговый статус
  // ----------------------------------------
  Serial.println("=================================");
  Serial.println("Статус инициализации:");
  Serial.print("DHT22:   ");
  Serial.println(dht_ok ? "✓ OK" : "✗ FAIL");
  Serial.print("BMP280:  ");
  Serial.println(bmp_ok ? "✓ OK" : "✗ FAIL");
  Serial.print("ESP8266: ");
  Serial.println(esp_ok ? "✓ OK" : "✗ FAIL");
  Serial.println("=================================");
  Serial.println("Система готова к работе!");
  Serial.println("=================================\n");
}

// ============================================
// ФУНКЦИЯ: Чтение всех датчиков
// ============================================
SensorData readAllSensors() {
  SensorData data;

  // Чтение DHT22
  if (dht_ok) {
    data.temperature = dht.readTemperature();
    data.humidity = dht.readHumidity();

    if (isnan(data.temperature) || isnan(data.humidity)) {
      Serial.println("✗ Ошибка чтения DHT22!");
      data.temperature = -999;
      data.humidity = -999;
    }
  } else {
    data.temperature = -999;
    data.humidity = -999;
  }

  // Чтение BMP280
  if (bmp_ok) {
    data.pressure = bmp.readPressure() / 100.0F; // Конвертация в hPa

    if (data.pressure < 300 || data.pressure > 1100) {
      Serial.println("✗ Ошибка чтения BMP280!");
      data.pressure = -999;
    }
  } else {
    data.pressure = -999;
  }

  // Чтение MQ-2 (дым/газ)
  int mq2_raw = analogRead(MQ2_PIN);
  data.smoke = map(mq2_raw, MQ2_MIN, MQ2_MAX, 0, 100);
  data.smoke = constrain(data.smoke, 0, 100);

  // Чтение MQ-7 (CO)
  int mq7_raw = analogRead(MQ7_PIN);
  data.co = map(mq7_raw, MQ7_MIN, MQ7_MAX, 0, 100);
  data.co = constrain(data.co, 0, 100);

  return data;
}

// ============================================
// ФУНКЦИЯ: Применение фильтрации
// ============================================
SensorData applyFiltering(SensorData newData) {
  SensorData filtered;

  // Добавление новых значений в буферы
  if (newData.temperature > -900) {
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

  // Расчет средних значений
  float tempSum = 0, humSum = 0, pressSum = 0;
  int smokeSum = 0, coSum = 0;
  int validCount = 0;

  // Температура
  for (int i = 0; i < FILTER_SIZE; i++) {
    if (tempBuffer[i] > -900) {
      tempSum += tempBuffer[i];
      validCount++;
    }
  }
  filtered.temperature =
      (validCount > 0) ? (tempSum / validCount) : newData.temperature;

  // Влажность
  validCount = 0;
  for (int i = 0; i < FILTER_SIZE; i++) {
    if (humBuffer[i] > -900) {
      humSum += humBuffer[i];
      validCount++;
    }
  }
  filtered.humidity =
      (validCount > 0) ? (humSum / validCount) : newData.humidity;

  // Давление
  validCount = 0;
  for (int i = 0; i < FILTER_SIZE; i++) {
    if (pressBuffer[i] > -900) {
      pressSum += pressBuffer[i];
      validCount++;
    }
  }
  filtered.pressure =
      (validCount > 0) ? (pressSum / validCount) : newData.pressure;

  // MQ датчики
  for (int i = 0; i < FILTER_SIZE; i++) {
    smokeSum += smokeBuffer[i];
    coSum += coBuffer[i];
  }
  filtered.smoke = smokeSum / FILTER_SIZE;
  filtered.co = coSum / FILTER_SIZE;

  // Обновление индекса буфера
  bufferIndex = (bufferIndex + 1) % FILTER_SIZE;

  return filtered;
}

// ============================================
// ФУНКЦИЯ: Вывод данных в Serial
// ============================================
void printSensorData(SensorData data) {
  Serial.println("\n========== ДАННЫЕ ДАТЧИКОВ ==========");

  Serial.print("Температура:    ");
  if (data.temperature > -900) {
    Serial.print(data.temperature, 1);
    Serial.println(" °C");
  } else {
    Serial.println("ERROR");
  }

  Serial.print("Влажность:      ");
  if (data.humidity > -900) {
    Serial.print(data.humidity, 1);
    Serial.println(" %");
  } else {
    Serial.println("ERROR");
  }

  Serial.print("Давление:       ");
  if (data.pressure > -900) {
    Serial.print(data.pressure, 1);
    Serial.println(" hPa");
  } else {
    Serial.println("ERROR");
  }

  Serial.print("MQ-2 (газ/дым): ");
  Serial.print(data.smoke);
  Serial.println(" %");

  Serial.print("MQ-7 (CO):      ");
  Serial.print(data.co);
  Serial.println(" %");

  Serial.println("=====================================\n");
}

// ============================================
// ФУНКЦИЯ: Отправка данных на сервер
// ============================================
void sendDataToServer(SensorData data) {
  if (!esp_ok) {
    Serial.println("⚠ ESP8266 не инициализирован");
    return;
  }

  Serial.println("--- Отправка данных на сервер ---");

  // Формирование JSON строки
  String jsonData = "{";
  jsonData += "\"temperature\":" + String(data.temperature, 2) + ",";
  jsonData += "\"humidity\":" + String(data.humidity, 2) + ",";
  jsonData += "\"pressure\":" + String(data.pressure, 2) + ",";
  jsonData += "\"smoke\":" + String(data.smoke) + ",";
  jsonData += "\"co\":" + String(data.co);
  jsonData += "}";

  Serial.print("JSON: ");
  Serial.println(jsonData);

  // Формирование HTTP запроса
  String httpRequest = "POST ";
  httpRequest += SERVER_PATH;
  httpRequest += " HTTP/1.1\r\n";
  httpRequest += "Host: ";
  httpRequest += SERVER_HOST;
  httpRequest += "\r\n";
  httpRequest += "Content-Type: application/json\r\n";
  httpRequest += "Content-Length: ";
  httpRequest += String(jsonData.length());
  httpRequest += "\r\n\r\n";
  httpRequest += jsonData;

  // Установка TCP соединения
  String connectCmd = "AT+CIPSTART=\"TCP\",\"";
  connectCmd += SERVER_HOST;
  connectCmd += "\",";
  connectCmd += String(SERVER_PORT);

  if (!sendATCommand(connectCmd, "OK", 5000)) {
    Serial.println("✗ Ошибка подключения к серверу");
    return;
  }

  // Отправка данных
  String sendCmd = "AT+CIPSEND=";
  sendCmd += String(httpRequest.length());

  if (!sendATCommand(sendCmd, ">", 2000)) {
    Serial.println("✗ Ошибка отправки команды CIPSEND");
    return;
  }

  // Отправка HTTP запроса
  esp8266.print(httpRequest);
  delay(2000);

  // Чтение ответа
  Serial.println("Ответ сервера:");
  while (esp8266.available()) {
    String response = esp8266.readString();
    Serial.println(response);

    if (response.indexOf("200 OK") != -1) {
      Serial.println("✓ Данные успешно отправлены");
    }
  }

  // Закрытие соединения
  sendATCommand("AT+CIPCLOSE", "OK", 1000);

  Serial.println("--- Отправка завершена ---\n");
}

// ============================================
// ФУНКЦИЯ LOOP - ВЫПОЛНЯЕТСЯ ПОСТОЯННО
// ============================================
void loop() {
  unsigned long currentMillis = millis();

  // Проверка интервала времени (10 секунд)
  if (currentMillis - previousMillis >= SEND_INTERVAL) {
    previousMillis = currentMillis;

    // Чтение данных с датчиков
    Serial.println("--- Чтение датчиков ---");
    SensorData rawData = readAllSensors();

    // Применение фильтрации
    SensorData filteredData = applyFiltering(rawData);

    // Вывод данных в Serial Monitor
    printSensorData(filteredData);

    // Отправка данных на сервер
    if (esp_ok) {
      sendDataToServer(filteredData);
    } else {
      Serial.println("⚠ Отправка невозможна: ESP8266 не подключен\n");
    }
  }

  delay(10); // Небольшая задержка для стабильности
}
