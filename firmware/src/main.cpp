#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include <GxEPD2_BW.h>
#include <Fonts/FreeSans9pt7b.h>
#include <Fonts/FreeSans12pt7b.h>
#include <Fonts/FreeSansBold9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>
#include <Fonts/FreeSansBold24pt7b.h>

#if __has_include("nostrand_config.h")
#include "nostrand_config.h"
#else
#include "nostrand_config.example.h"
#warning "Using placeholder config; copy nostrand_config.example.h to nostrand_config.h before flashing."
#endif

namespace Pins {
constexpr int EPD_SCK = 12;
constexpr int EPD_MOSI = 11;
constexpr int EPD_RST = 47;
constexpr int EPD_DC = 46;
constexpr int EPD_CS = 45;
constexpr int EPD_BUSY = 48;
constexpr int EPD_POWER = 7;
}  // namespace Pins

constexpr int MAX_TRAINS = 4;
constexpr unsigned long WIFI_TIMEOUT_MS = 15UL * 1000UL;

struct Train {
  char route[2] = "";
  char destination[40] = "";
  int minutes = 0;
};

struct Weather {
  bool available = false;
  int temperatureF = 0;
  int highF = 0;
  int lowF = 0;
  int precipitationChance = 0;
  char condition[24] = "";
};

struct Dashboard {
  char station[24] = "Nostrand Av";
  char direction[24] = "Manhattan";
  char updated[16] = "";
  Train trains[MAX_TRAINS];
  size_t trainCount = 0;
  Weather weather;
};

GxEPD2_BW<GxEPD2_579_GDEY0579T93, GxEPD2_579_GDEY0579T93::HEIGHT> display(
    GxEPD2_579_GDEY0579T93(Pins::EPD_CS, Pins::EPD_DC, Pins::EPD_RST, Pins::EPD_BUSY));

Dashboard dashboard;
unsigned int refreshCount = 0;
unsigned long lastAttemptAt = 0;

String clippedUpper(const char* value, size_t maxLength) {
  String text(value);
  text.toUpperCase();
  if (text.length() > maxLength) text = text.substring(0, maxLength - 1) + ".";
  return text;
}

void drawCenteredText(const String& text, int16_t centerX, int16_t baselineY) {
  int16_t x1, y1;
  uint16_t width, height;
  display.getTextBounds(text, 0, baselineY, &x1, &y1, &width, &height);
  display.setCursor(centerX - static_cast<int16_t>(width / 2), baselineY);
  display.print(text);
}

void drawHeader(const Dashboard& data) {
  display.fillRect(0, 0, display.width(), 56, GxEPD_BLACK);
  display.setTextColor(GxEPD_WHITE);

  display.setFont(&FreeSansBold18pt7b);
  display.setCursor(16, 38);
  display.print(clippedUpper(data.station, 21));

  display.setFont(&FreeSansBold9pt7b);
  display.setCursor(258, 35);
  display.print("TO ");
  display.print(clippedUpper(data.direction, 14));

  display.drawFastVLine(506, 8, 40, GxEPD_WHITE);
  if (data.weather.available) {
    display.setFont(&FreeSansBold18pt7b);
    display.setCursor(526, 38);
    display.printf("%dF", data.weather.temperatureF);

    display.setFont(&FreeSansBold9pt7b);
    display.setCursor(610, 24);
    display.print(clippedUpper(data.weather.condition, 17));
    display.setFont(&FreeSans9pt7b);
    display.setCursor(610, 43);
    display.printf("H%d  L%d", data.weather.highF, data.weather.lowF);
  } else {
    display.setFont(&FreeSansBold12pt7b);
    display.setCursor(532, 36);
    display.print("WEATHER --");
  }
}

void drawTrainRow(const Train& train, int index) {
  constexpr int rowHeight = 44;
  const int top = 56 + index * rowHeight;
  const int centerY = top + rowHeight / 2;

  display.setTextColor(GxEPD_BLACK);
  display.drawFastHLine(0, top, display.width(), GxEPD_BLACK);
  display.fillCircle(34, centerY, 17, GxEPD_BLACK);

  display.setTextColor(GxEPD_WHITE);
  display.setFont(&FreeSansBold12pt7b);
  drawCenteredText(train.route, 34, centerY + 8);

  display.setTextColor(GxEPD_BLACK);
  if (train.minutes == 0) {
    display.setFont(&FreeSansBold18pt7b);
    display.setCursor(70, centerY + 11);
    display.print("NOW");
  } else {
    display.setFont(&FreeSansBold24pt7b);
    display.setCursor(72, centerY + 15);
    display.print(min(train.minutes, 99));
    display.setFont(&FreeSansBold9pt7b);
    display.setCursor(train.minutes < 10 ? 111 : 137, centerY + 8);
    display.print(train.minutes > 99 ? "+ MIN" : "MIN");
  }

  display.drawFastVLine(174, top + 7, rowHeight - 14, GxEPD_BLACK);
  display.setFont(&FreeSansBold12pt7b);
  display.setCursor(194, centerY + 8);
  display.print(clippedUpper(train.destination, 38));
}

void drawDashboard(const Dashboard& data) {
  display.fillScreen(GxEPD_WHITE);
  display.setTextWrap(false);
  drawHeader(data);

  if (data.trainCount == 0) {
    display.setTextColor(GxEPD_BLACK);
    display.setFont(&FreeSansBold18pt7b);
    drawCenteredText("NO TRAINS REPORTED", display.width() / 2, 145);
  } else {
    for (size_t index = 0; index < data.trainCount; ++index) {
      drawTrainRow(data.trains[index], static_cast<int>(index));
    }
  }

  constexpr int footerTop = 232;
  display.fillRect(0, footerTop, display.width(), 40, GxEPD_BLACK);
  display.setTextColor(GxEPD_WHITE);
  display.setFont(&FreeSansBold9pt7b);
  display.setCursor(14, 258);
  display.print("UPDATED ");
  display.print(clippedUpper(data.updated, 12));

  display.setFont(&FreeSans9pt7b);
  display.setCursor(250, 258);
  display.print("LIVE MTA ARRIVALS");

  if (data.weather.available) {
    display.setCursor(617, 258);
    display.printf("RAIN %d%%", data.weather.precipitationChance);
  }
}

void drawBootError(const char* heading, const char* detail) {
  display.fillScreen(GxEPD_WHITE);
  display.setTextColor(GxEPD_BLACK);
  display.setFont(&FreeSansBold18pt7b);
  drawCenteredText(heading, display.width() / 2, 112);
  display.setFont(&FreeSans12pt7b);
  drawCenteredText(detail, display.width() / 2, 154);
  display.setFont(&FreeSans9pt7b);
  drawCenteredText("See Serial Monitor at 115200 baud", display.width() / 2, 194);
}

template <typename DrawFunction>
void updateDisplay(DrawFunction draw, bool fullRefresh) {
  if (fullRefresh) {
    display.setFullWindow();
  } else {
    display.setPartialWindow(0, 0, display.width(), display.height());
  }

  display.firstPage();
  do {
    draw();
  } while (display.nextPage());
  display.powerOff();
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("Connecting to Wi-Fi %s", WIFI_SSID);

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_TIMEOUT_MS) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi connection timed out");
    return false;
  }

  Serial.print("Wi-Fi connected; IP: ");
  Serial.println(WiFi.localIP());
  return true;
}

bool parseDashboard(HTTPClient& http, Dashboard& output) {
  JsonDocument document;
  const DeserializationError error = deserializeJson(document, http.getStream());
  if (error) {
    Serial.printf("JSON parse failed: %s\n", error.c_str());
    return false;
  }
  if (document["version"].as<int>() != 1) {
    Serial.println("Unsupported display API version");
    return false;
  }

  Dashboard parsed;
  strlcpy(parsed.station, document["station"]["name"] | "Nostrand Av", sizeof(parsed.station));
  strlcpy(parsed.direction, document["station"]["direction"] | "Manhattan", sizeof(parsed.direction));
  strlcpy(parsed.updated, document["updated"] | "--", sizeof(parsed.updated));

  const JsonArray trains = document["trains"].as<JsonArray>();
  for (JsonObject train : trains) {
    if (parsed.trainCount == MAX_TRAINS) break;
    Train& target = parsed.trains[parsed.trainCount++];
    strlcpy(target.route, train["route"] | "?", sizeof(target.route));
    strlcpy(target.destination, train["destination"] | "Manhattan", sizeof(target.destination));
    target.minutes = max(0, train["minutes"].as<int>());
  }

  const JsonVariant weather = document["weather"];
  if (!weather.isNull()) {
    parsed.weather.available = true;
    parsed.weather.temperatureF = weather["temperatureF"] | 0;
    parsed.weather.highF = weather["highF"] | 0;
    parsed.weather.lowF = weather["lowF"] | 0;
    parsed.weather.precipitationChance = weather["precipitationChance"] | 0;
    strlcpy(parsed.weather.condition, weather["condition"] | "Unknown", sizeof(parsed.weather.condition));
  }

  output = parsed;
  return true;
}

template <typename Client>
bool fetchWithClient(Client& client, const String& url, Dashboard& output) {
  HTTPClient http;
  http.setConnectTimeout(8000);
  http.setTimeout(10000);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  if (!http.begin(client, url)) {
    Serial.println("Could not start HTTP request");
    return false;
  }

  const int status = http.GET();
  if (status != HTTP_CODE_OK) {
    Serial.printf("Display API returned HTTP %d\n", status);
    http.end();
    return false;
  }

  const bool parsed = parseDashboard(http, output);
  http.end();
  return parsed;
}

bool fetchDashboard(Dashboard& output) {
  String url(API_BASE_URL);
  while (url.endsWith("/")) url.remove(url.length() - 1);
  url += "/api/display";
  Serial.printf("GET %s\n", url.c_str());

  if (url.startsWith("https://")) {
    WiFiClientSecure client;
    // The payload is public transit/weather data. A pinned CA can replace this
    // for deployments that need strict server identity verification.
    client.setInsecure();
    return fetchWithClient(client, url, output);
  }

  WiFiClient client;
  return fetchWithClient(client, url, output);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nNostrand train display starting");

  pinMode(Pins::EPD_POWER, OUTPUT);
  digitalWrite(Pins::EPD_POWER, HIGH);
  SPI.begin(Pins::EPD_SCK, -1, Pins::EPD_MOSI, Pins::EPD_CS);
  display.init(115200, true, 2, false);
  display.setRotation(DISPLAY_ROTATION);

  if (!connectWifi()) {
    updateDisplay([] { drawBootError("WI-FI NOT CONNECTED", "Check nostrand_config.h"); }, true);
    lastAttemptAt = millis();
    return;
  }

  if (fetchDashboard(dashboard)) {
    updateDisplay([] { drawDashboard(dashboard); }, true);
    refreshCount = 1;
  } else {
    updateDisplay([] { drawBootError("DATA UNAVAILABLE", "Could not reach /api/display"); }, true);
  }
  lastAttemptAt = millis();
}

void loop() {
  if (millis() - lastAttemptAt < REFRESH_INTERVAL_MS) {
    delay(100);
    return;
  }
  lastAttemptAt = millis();

  if (!connectWifi()) return;

  Dashboard next;
  if (!fetchDashboard(next)) {
    Serial.println("Keeping the last successful screen");
    return;
  }

  dashboard = next;
  const bool fullRefresh = refreshCount % max(1U, FULL_REFRESH_EVERY) == 0;
  updateDisplay([] { drawDashboard(dashboard); }, fullRefresh);
  ++refreshCount;
}
