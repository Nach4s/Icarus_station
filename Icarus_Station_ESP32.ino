/*
 * Icarus Station - ESP32 Sensor Monitoring System
 * 
 * Описание: Система мониторинга окружающей среды с датчиками:
 * - AM2302 (DHT22) - температура и влажность
 * - BMP280 - атмосферное давление
 * - MQ-2 - детектор дыма и газа
 * - MQ-7 - детектор угарного газа (CO)
 * 
 * Данные отправляются на сервер каждые 10 секунд через HTTP POST
 */

// ============================================
// ПОДКЛЮЧЕНИЕ БИБЛИОТЕК
// ============================================
#include <WiFi.h>           // Библиотека для работы с Wi-Fi
#include <HTTPClient.h>     // Библиотека для HTTP запросов
#include <DHT.h>            // Библиотека для DHT22 (AM2302)
#include <Wire.h>           // Библиотека для I2C
#include <Adafruit_BMP280.h> // Библиотека для BMP280

// ============================================
// НАСТРОЙКИ WI-FI
// ============================================
const char* ssid = "YOUR_WIFI_SSID";        // Замените на имя вашей Wi-Fi сети
const char* password = "YOUR_WIFI_PASSWORD"; // Замените на пароль вашей Wi-Fi сети

// ============================================
// НАСТРОЙКИ СЕРВЕРА
// ============================================
const char* serverUrl = "http://YOUR_SERVER_IP:PORT/api/sensors"; // URL вашего сервера

// ============================================
// ПИНЫ ПОДКЛЮЧЕНИЯ ДАТЧИКОВ
// ============================================
#define DHTPIN 4          // Пин для DHT22 (AM2302)
#define MQ2_PIN 34        // Аналоговый пин для MQ-2 (ADC1_CH6)
#define MQ7_PIN 35        // Аналоговый пин для MQ-7 (ADC1_CH7)

// ============================================
// НАСТРОЙКИ ДАТЧИКОВ
// ============================================
#define DHTTYPE DHT22     // Тип датчика DHT22 (AM2302)

// Калибровочные значения для MQ датчиков
#define MQ2_THRESHOLD 1000  // Пороговое значение для MQ-2 (0-4095)
#define MQ7_THRESHOLD 1000  // Пороговое значение для MQ-7 (0-4095)

// ============================================
// ИНИЦИАЛИЗАЦИЯ ОБЪЕКТОВ ДАТЧИКОВ
// ============================================
DHT dht(DHTPIN, DHTTYPE);           // Объект для DHT22
Adafruit_BMP280 bmp;                 // Объект для BMP280

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================
unsigned long previousMillis = 0;    // Время последнего измерения
const long interval = 10000;         // Интервал между измерениями (10 секунд)

// ============================================
// ФУНКЦИЯ SETUP - ВЫПОЛНЯЕТСЯ ОДИН РАЗ ПРИ ЗАПУСКЕ
// ============================================
void setup() {
  // Инициализация Serial для отладки
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=================================");
  Serial.println("Icarus Station - Запуск системы");
  Serial.println("=================================\n");

  // ----------------------------------------
  // Инициализация DHT22 (AM2302)
  // ----------------------------------------
  Serial.println("Инициализация DHT22...");
  dht.begin();
  Serial.println("✓ DHT22 инициализирован");

  // ----------------------------------------
  // Инициализация BMP280
  // ----------------------------------------
  Serial.println("Инициализация BMP280...");
  if (!bmp.begin(0x76)) {  // Адрес I2C: 0x76 или 0x77
    Serial.println("✗ Ошибка: BMP280 не найден!");
    Serial.println("  Проверьте подключение I2C (SDA=21, SCL=22)");
    while (1) delay(10); // Остановка программы
  }
  
  // Настройка параметров BMP280
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,     // Режим работы
                  Adafruit_BMP280::SAMPLING_X2,     // Температура (oversampling x2)
                  Adafruit_BMP280::SAMPLING_X16,    // Давление (oversampling x16)
                  Adafruit_BMP280::FILTER_X16,      // Фильтрация
                  Adafruit_BMP280::STANDBY_MS_500); // Время ожидания
  Serial.println("✓ BMP280 инициализирован");

  // ----------------------------------------
  // Настройка аналоговых пинов для MQ датчиков
  // ----------------------------------------
  Serial.println("Настройка MQ датчиков...");
  pinMode(MQ2_PIN, INPUT);
  pinMode(MQ7_PIN, INPUT);
  
  // Настройка разрешения АЦП (12 бит = 0-4095)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db); // Диапазон 0-3.3V
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
  // Подключение к Wi-Fi
  // ----------------------------------------
  Serial.println("Подключение к Wi-Fi...");
  Serial.print("SSID: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ Wi-Fi подключен!");
    Serial.print("IP адрес: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ Не удалось подключиться к Wi-Fi");
    Serial.println("  Система продолжит работу без отправки данных");
  }

  Serial.println("\n=================================");
  Serial.println("Система готова к работе!");
  Serial.println("=================================\n");
}

// ============================================
// ФУНКЦИЯ LOOP - ВЫПОЛНЯЕТСЯ ПОСТОЯННО
// ============================================
void loop() {
  unsigned long currentMillis = millis();

  // Проверка интервала времени (10 секунд)
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // ----------------------------------------
    // Чтение данных с датчиков
    // ----------------------------------------
    Serial.println("\n--- Чтение датчиков ---");
    
    // Чтение DHT22 (температура и влажность)
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    // Чтение BMP280 (давление)
    float pressure = bmp.readPressure() / 100.0F; // Конвертация в hPa
    
    // Чтение MQ-2 (дым/газ)
    int mq2_raw = analogRead(MQ2_PIN);
    int mq2_level = map(mq2_raw, 0, MQ2_THRESHOLD, 0, 100);
    mq2_level = constrain(mq2_level, 0, 100); // Ограничение 0-100
    
    // Чтение MQ-7 (угарный газ CO)
    int mq7_raw = analogRead(MQ7_PIN);
    int mq7_level = map(mq7_raw, 0, MQ7_THRESHOLD, 0, 100);
    mq7_level = constrain(mq7_level, 0, 100); // Ограничение 0-100

    // ----------------------------------------
    // Проверка корректности данных DHT22
    // ----------------------------------------
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("✗ Ошибка чтения DHT22!");
      temperature = -999;
      humidity = -999;
    }

    // ----------------------------------------
    // Вывод данных в Serial Monitor
    // ----------------------------------------
    Serial.println("\n╔════════════════════════════════════╗");
    Serial.println("║     ДАННЫЕ ДАТЧИКОВ ICARUS         ║");
    Serial.println("╠════════════════════════════════════╣");
    Serial.print("║ Температура:    ");
    Serial.print(temperature);
    Serial.println(" °C");
    Serial.print("║ Влажность:      ");
    Serial.print(humidity);
    Serial.println(" %");
    Serial.print("║ Давление:       ");
    Serial.print(pressure);
    Serial.println(" hPa");
    Serial.println("╠════════════════════════════════════╣");
    Serial.print("║ MQ-2 (газ/дым): ");
    Serial.print(mq2_level);
    Serial.print(" % (raw: ");
    Serial.print(mq2_raw);
    Serial.println(")");
    Serial.print("║ MQ-7 (CO):      ");
    Serial.print(mq7_level);
    Serial.print(" % (raw: ");
    Serial.print(mq7_raw);
    Serial.println(")");
    Serial.println("╚════════════════════════════════════╝\n");

    // ----------------------------------------
    // Отправка данных на сервер
    // ----------------------------------------
    if (WiFi.status() == WL_CONNECTED) {
      sendDataToServer(temperature, humidity, pressure, mq7_level, mq2_level);
    } else {
      Serial.println("⚠ Wi-Fi не подключен. Попытка переподключения...");
      WiFi.reconnect();
    }
  }
}

// ============================================
// ФУНКЦИЯ ОТПРАВКИ ДАННЫХ НА СЕРВЕР
// ============================================
void sendDataToServer(float temp, float hum, float press, int co, int gas) {
  HTTPClient http;
  
  Serial.println("--- Отправка данных на сервер ---");
  
  // Начало HTTP соединения
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Формирование JSON строки
  String jsonPayload = "{";
  jsonPayload += "\"temperature\":" + String(temp, 2) + ",";
  jsonPayload += "\"humidity\":" + String(hum, 2) + ",";
  jsonPayload += "\"pressure\":" + String(press, 2) + ",";
  jsonPayload += "\"co\":" + String(co) + ",";
  jsonPayload += "\"gas\":" + String(gas);
  jsonPayload += "}";
  
  Serial.print("JSON: ");
  Serial.println(jsonPayload);
  
  // Отправка POST запроса
  int httpResponseCode = http.POST(jsonPayload);
  
  // Обработка ответа
  if (httpResponseCode > 0) {
    Serial.print("✓ HTTP Response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.print("Ответ сервера: ");
    Serial.println(response);
  } else {
    Serial.print("✗ Ошибка отправки: ");
    Serial.println(httpResponseCode);
    Serial.println("  Проверьте URL сервера и доступность");
  }
  
  // Закрытие соединения
  http.end();
  Serial.println("--- Отправка завершена ---\n");
}
