#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>

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
#endif

namespace Pins {
constexpr int EPD_SCK = 12;
constexpr int EPD_MOSI = 11;
constexpr int EPD_RST = 47;
constexpr int EPD_DC = 46;
constexpr int EPD_CS = 45;
constexpr int EPD_BUSY = 48;
constexpr int EPD_POWER = 7;
constexpr int ROTARY_DOWN = 4;
}  // namespace Pins

constexpr int MAX_TRAINS = 4;
constexpr unsigned long BUTTON_DEBOUNCE_MS = 40;

namespace Layout {
constexpr int TRAIN_WIDTH = 528;
constexpr int HEADER_HEIGHT = 52;
constexpr int TRAIN_ROW_HEIGHT = 55;
constexpr int WEATHER_X = 540;
constexpr int WEATHER_Y = 8;
constexpr int WEATHER_WIDTH = 244;
constexpr int WEATHER_HEIGHT = 256;
constexpr int WEATHER_CENTER_X = WEATHER_X + WEATHER_WIDTH / 2;
}  // namespace Layout

struct Train {
  char route[2] = "";
  int minutes = 0;
};

struct Weather {
  bool available = false;
  int temperatureF = 0;
  int highF = 0;
  int lowF = 0;
  int precipitationChance = 0;
  int weatherCode = 0;
  char condition[24] = "";
};

struct Dashboard {
  char station[24] = "Nostrand Ave";
  char direction[24] = "Manhattan";
  char updated[16] = "";
  bool stale = false;
  Train trains[MAX_TRAINS];
  size_t trainCount = 0;
  Weather weather;
};

GxEPD2_BW<GxEPD2_579_GDEY0579T93, GxEPD2_579_GDEY0579T93::HEIGHT> display(
    GxEPD2_579_GDEY0579T93(Pins::EPD_CS, Pins::EPD_DC, Pins::EPD_RST, Pins::EPD_BUSY));

Dashboard dashboard;
unsigned int refreshCount = 0;
unsigned long lastAttemptAt = 0;
int rawDownState = HIGH;
int stableDownState = HIGH;
unsigned long downStateChangedAt = 0;

bool manualRefreshPressed() {
  const int currentState = digitalRead(Pins::ROTARY_DOWN);
  if (currentState != rawDownState) {
    rawDownState = currentState;
    downStateChangedAt = millis();
  }

  if (currentState != stableDownState &&
      millis() - downStateChangedAt >= BUTTON_DEBOUNCE_MS) {
    stableDownState = currentState;
    return stableDownState == LOW;
  }

  return false;
}

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

void drawThickLine(int x1, int y1, int x2, int y2, int thickness = 2) {
  for (int offset = 0; offset < thickness; ++offset) {
    const int delta = offset - thickness / 2;
    display.drawLine(x1 + delta, y1, x2 + delta, y2, GxEPD_BLACK);
    display.drawLine(x1, y1 + delta, x2, y2 + delta, GxEPD_BLACK);
  }
}

void drawSun(int centerX, int centerY, int radius) {
  display.fillCircle(centerX, centerY, radius, GxEPD_BLACK);
  for (int angle = 0; angle < 360; angle += 45) {
    const float radians = angle * PI / 180.0f;
    const int innerX = centerX + cos(radians) * (radius + 7);
    const int innerY = centerY + sin(radians) * (radius + 7);
    const int outerX = centerX + cos(radians) * (radius + 18);
    const int outerY = centerY + sin(radians) * (radius + 18);
    drawThickLine(innerX, innerY, outerX, outerY, angle % 90 == 0 ? 3 : 2);
  }
}

void drawCloud(int centerX, int centerY) {
  display.fillCircle(centerX - 25, centerY + 1, 17, GxEPD_BLACK);
  display.fillCircle(centerX, centerY - 10, 24, GxEPD_BLACK);
  display.fillCircle(centerX + 28, centerY + 2, 18, GxEPD_BLACK);
  display.fillRoundRect(centerX - 43, centerY, 89, 25, 10, GxEPD_BLACK);
}

void drawStar(int centerX, int centerY, int outerRadius, int innerRadius) {
  for (int point = 0; point < 5; ++point) {
    const float outerAngle = -PI / 2.0f + point * 2.0f * PI / 5.0f;
    const float previousInnerAngle = outerAngle - PI / 5.0f;
    const float nextInnerAngle = outerAngle + PI / 5.0f;
    display.fillTriangle(
        centerX + cos(outerAngle) * outerRadius,
        centerY + sin(outerAngle) * outerRadius,
        centerX + cos(previousInnerAngle) * innerRadius,
        centerY + sin(previousInnerAngle) * innerRadius,
        centerX + cos(nextInnerAngle) * innerRadius,
        centerY + sin(nextInnerAngle) * innerRadius,
        GxEPD_BLACK);
  }
  display.fillCircle(centerX, centerY, innerRadius + 1, GxEPD_BLACK);
}

void drawWeatherIcon(int weatherCode, int centerX, int centerY) {
  if (weatherCode == 0) {
    drawSun(centerX, centerY, 20);
    return;
  }
  if (weatherCode <= 2) {
    drawSun(centerX - 25, centerY - 15, 13);
    drawCloud(centerX + 9, centerY + 5);
    return;
  }
  if (weatherCode == 3) {
    drawCloud(centerX, centerY);
    return;
  }
  if (weatherCode == 45 || weatherCode == 48) {
    for (int offset = -24; offset <= 24; offset += 16) {
      display.fillRoundRect(centerX - 42, centerY + offset, 84, 5, 2, GxEPD_BLACK);
    }
    return;
  }

  drawCloud(centerX, centerY - 12);
  if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) {
    for (int xOffset = -26; xOffset <= 26; xOffset += 26) {
      const int x = centerX + xOffset;
      const int y = centerY + 29 + (xOffset == 0 ? 7 : 0);
      drawThickLine(x - 5, y, x + 5, y, 2);
      drawThickLine(x, y - 5, x, y + 5, 2);
    }
  } else if (weatherCode >= 95) {
    display.fillTriangle(centerX + 2, centerY + 14, centerX - 10, centerY + 39,
                         centerX + 4, centerY + 35, GxEPD_BLACK);
    display.fillTriangle(centerX + 4, centerY + 29, centerX + 15, centerY + 27,
                         centerX - 1, centerY + 50, GxEPD_BLACK);
  } else {
    for (int xOffset = -27; xOffset <= 27; xOffset += 27) {
      drawThickLine(centerX + xOffset + 5, centerY + 18,
                    centerX + xOffset - 3, centerY + 36, 3);
    }
  }
}

void drawTrainHeader(const Dashboard& data) {
  display.fillRect(0, 0, Layout::TRAIN_WIDTH, Layout::HEADER_HEIGHT, GxEPD_BLACK);
  display.setTextColor(GxEPD_WHITE);

  display.setFont(&FreeSansBold18pt7b);
  display.setCursor(16, 36);
  display.print(clippedUpper(data.station, 16));

  display.setFont(&FreeSansBold9pt7b);
  display.setCursor(320, 33);
  display.print("TO ");
  display.print(clippedUpper(data.direction, 14));
}

void drawWeatherPanel(const Dashboard& data) {
  const int x = Layout::WEATHER_X;
  const int y = Layout::WEATHER_Y;
  const int width = Layout::WEATHER_WIDTH;
  const int height = Layout::WEATHER_HEIGHT;
  for (int inset = 0; inset < 3; ++inset) {
    display.drawRect(x + inset, y + inset, width - inset * 2, height - inset * 2, GxEPD_BLACK);
  }

  display.setTextColor(GxEPD_BLACK);
  if (!data.weather.available) {
    display.setFont(&FreeSansBold12pt7b);
    drawCenteredText("WEATHER --", Layout::WEATHER_CENTER_X, y + 126);
    return;
  }

  display.setFont(&FreeSansBold24pt7b);
  display.setCursor(x + 14, y + 56);
  display.printf("%dF", data.weather.temperatureF);

  display.setFont(&FreeSansBold9pt7b);
  drawCenteredText(clippedUpper(data.weather.condition, 20), Layout::WEATHER_CENTER_X, y + 88);
  drawWeatherIcon(data.weather.weatherCode, Layout::WEATHER_CENTER_X, y + 144);

  display.drawFastHLine(x + 12, y + 200, width - 24, GxEPD_BLACK);
  display.setFont(&FreeSansBold12pt7b);
  drawCenteredText(
      String("H ") + data.weather.highF + "  L " + data.weather.lowF,
      x + 68, y + 224);
  drawCenteredText(
      String("RAIN ") + data.weather.precipitationChance + "%",
      x + 180, y + 224);

  display.setFont(&FreeSans9pt7b);
  display.setCursor(x + 14, y + 248);
  display.print(data.stale ? "STALE " : "UPDATED ");
  display.print(clippedUpper(data.updated, 12));
}

void drawRouteSymbol(const Train& train, int centerY) {
  constexpr int centerX = 44;
  if (strcmp(train.route, "A") == 0) {
    drawStar(centerX, centerY, 24, 11);
  } else {
    display.fillCircle(centerX, centerY, 21, GxEPD_BLACK);
  }

  display.setTextColor(GxEPD_WHITE);
  display.setFont(&FreeSansBold12pt7b);
  drawCenteredText(train.route, centerX, centerY + 8);
}

void drawCountdown(const Train& train, int centerY, int earliestMinutes, int latestMinutes) {
  constexpr int earliestCenterX = 148;
  constexpr int latestCenterX = 464;
  const int minuteRange = latestMinutes - earliestMinutes;
  const int countdownCenterX = minuteRange > 0
      ? earliestCenterX + (train.minutes - earliestMinutes) *
            (latestCenterX - earliestCenterX) / minuteRange
      : earliestCenterX;
  display.setTextColor(GxEPD_BLACK);

  if (train.minutes == 0) {
    display.setFont(&FreeSansBold18pt7b);
    drawCenteredText("Arriving", countdownCenterX, centerY + 12);
    return;
  }

  const String minutes = train.minutes > 99 ? "99+" : String(train.minutes);
  int16_t x1, y1;
  uint16_t minutesWidth, minutesHeight, labelWidth, labelHeight;
  display.setFont(&FreeSansBold24pt7b);
  display.getTextBounds(minutes, 0, centerY + 16, &x1, &y1, &minutesWidth, &minutesHeight);
  display.setFont(&FreeSansBold12pt7b);
  display.getTextBounds("MIN", 0, centerY + 9, &x1, &y1, &labelWidth, &labelHeight);

  constexpr int gap = 12;
  const int totalWidth = minutesWidth + gap + labelWidth;
  const int startX = countdownCenterX - totalWidth / 2;
  display.setFont(&FreeSansBold24pt7b);
  display.setCursor(startX, centerY + 16);
  display.print(minutes);
  display.setFont(&FreeSansBold12pt7b);
  display.setCursor(startX + minutesWidth + gap, centerY + 9);
  display.print("MIN");
}

void drawTrainRow(const Train& train, int index, int earliestMinutes, int latestMinutes) {
  const int top = Layout::HEADER_HEIGHT + index * Layout::TRAIN_ROW_HEIGHT;
  const int centerY = top + Layout::TRAIN_ROW_HEIGHT / 2;

  display.setTextColor(GxEPD_BLACK);
  display.drawFastHLine(0, top, Layout::TRAIN_WIDTH, GxEPD_BLACK);
  drawRouteSymbol(train, centerY);
  drawCountdown(train, centerY, earliestMinutes, latestMinutes);
}

void drawDashboard(const Dashboard& data) {
  display.fillScreen(GxEPD_WHITE);
  display.setTextWrap(false);
  drawTrainHeader(data);
  drawWeatherPanel(data);

  if (data.trainCount == 0) {
    display.setTextColor(GxEPD_BLACK);
    display.setFont(&FreeSansBold18pt7b);
    drawCenteredText("NO TRAINS REPORTED", Layout::TRAIN_WIDTH / 2, 152);
  } else {
    int earliestMinutes = data.trains[0].minutes;
    int latestMinutes = data.trains[0].minutes;
    for (size_t index = 1; index < data.trainCount; ++index) {
      earliestMinutes = min(earliestMinutes, data.trains[index].minutes);
      latestMinutes = max(latestMinutes, data.trains[index].minutes);
    }

    for (size_t index = 0; index < data.trainCount; ++index) {
      drawTrainRow(
          data.trains[index], static_cast<int>(index), earliestMinutes, latestMinutes);
    }
  }
  display.drawFastHLine(0, display.height() - 1, Layout::TRAIN_WIDTH, GxEPD_BLACK);
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

void drawWifiSetup() {
  display.fillScreen(GxEPD_WHITE);
  display.setTextColor(GxEPD_BLACK);
  display.setFont(&FreeSansBold18pt7b);
  drawCenteredText("SET UP WI-FI", display.width() / 2, 86);
  display.setFont(&FreeSans12pt7b);
  drawCenteredText("Join the Nostrand-Display network on your phone", display.width() / 2, 132);
  drawCenteredText("Then choose your home Wi-Fi in the setup page", display.width() / 2, 168);
  display.setFont(&FreeSans9pt7b);
  drawCenteredText("The setup network closes automatically after 5 minutes", display.width() / 2, 211);
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

void onConfigPortalStarted(WiFiManager*) {
  Serial.println("Wi-Fi setup portal started: Nostrand-Display");
  updateDisplay([] { drawWifiSetup(); }, true);
}

bool connectWifi(bool allowConfigPortal) {
  if (WiFi.status() == WL_CONNECTED) return true;

  WiFi.mode(WIFI_STA);
  if (!allowConfigPortal) {
    Serial.println("Wi-Fi disconnected; attempting saved network reconnect");
    WiFi.reconnect();
    const unsigned long startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000UL) {
      delay(250);
    }
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Wi-Fi reconnect failed; keeping the current screen");
      return false;
    }
    WiFi.setSleep(false);
    Serial.print("Wi-Fi reconnected; IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  WiFiManager manager;
  manager.setConnectTimeout(20);
  manager.setConfigPortalTimeout(300);
  manager.setAPCallback(onConfigPortalStarted);

  if (!manager.autoConnect("Nostrand-Display")) {
    Serial.println("Wi-Fi setup timed out");
    return false;
  }

  WiFi.setSleep(false);
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
  strlcpy(parsed.station, document["station"]["name"] | "Nostrand Ave", sizeof(parsed.station));
  strlcpy(parsed.direction, document["station"]["direction"] | "Manhattan", sizeof(parsed.direction));
  strlcpy(parsed.updated, document["updated"] | "--", sizeof(parsed.updated));
  parsed.stale = document["stale"] | false;

  if (!document["trains"].is<JsonArray>()) {
    Serial.println("Display payload is missing its trains array");
    return false;
  }
  const JsonArray trains = document["trains"].as<JsonArray>();
  for (JsonObject train : trains) {
    if (parsed.trainCount == MAX_TRAINS) break;
    const char* route = train["route"] | "";
    if ((strcmp(route, "A") != 0 && strcmp(route, "C") != 0) ||
        !train["minutes"].is<int>()) {
      Serial.println("Skipping malformed train entry");
      continue;
    }
    const int minutes = train["minutes"].as<int>();
    if (minutes < 0) {
      Serial.println("Skipping train with a negative countdown");
      continue;
    }
    Train& target = parsed.trains[parsed.trainCount++];
    strlcpy(target.route, route, sizeof(target.route));
    target.minutes = minutes;
  }

  const JsonVariant weather = document["weather"];
  if (!weather.isNull() &&
      weather["temperatureF"].is<int>() &&
      weather["highF"].is<int>() &&
      weather["lowF"].is<int>() &&
      weather["precipitationChance"].is<int>() &&
      weather["weatherCode"].is<int>() &&
      weather["condition"].is<const char*>()) {
    const int precipitationChance = weather["precipitationChance"].as<int>();
    if (precipitationChance < 0 || precipitationChance > 100) {
      Serial.println("Ignoring weather with an invalid precipitation chance");
    } else {
      parsed.weather.available = true;
      parsed.weather.temperatureF = weather["temperatureF"] | 0;
      parsed.weather.highF = weather["highF"] | 0;
      parsed.weather.lowF = weather["lowF"] | 0;
      parsed.weather.precipitationChance = precipitationChance;
      parsed.weather.weatherCode = weather["weatherCode"] | 0;
      strlcpy(parsed.weather.condition, weather["condition"] | "Unknown",
              sizeof(parsed.weather.condition));
    }
  } else if (!weather.isNull()) {
    Serial.println("Ignoring malformed weather data");
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
    client.setCACert(API_ROOT_CA);
    return fetchWithClient(client, url, output);
  }

  WiFiClient client;
  return fetchWithClient(client, url, output);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\nNostrand train display starting");

  pinMode(Pins::ROTARY_DOWN, INPUT_PULLUP);
  rawDownState = digitalRead(Pins::ROTARY_DOWN);
  stableDownState = rawDownState;

  pinMode(Pins::EPD_POWER, OUTPUT);
  digitalWrite(Pins::EPD_POWER, HIGH);
  SPI.begin(Pins::EPD_SCK, -1, Pins::EPD_MOSI, Pins::EPD_CS);
  display.init(115200, true, 2, false);
  display.setRotation(DISPLAY_ROTATION);

  if (!connectWifi(true)) {
    updateDisplay([] { drawBootError("WI-FI NOT CONNECTED", "Press RST to try setup again"); }, true);
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
  const bool manualRefresh = manualRefreshPressed();
  if (!manualRefresh && millis() - lastAttemptAt < REFRESH_INTERVAL_MS) {
    delay(25);
    return;
  }
  if (manualRefresh) Serial.println("Manual refresh requested");
  lastAttemptAt = millis();

  if (!connectWifi(false)) return;

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
