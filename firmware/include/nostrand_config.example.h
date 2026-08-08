#pragma once

// Copy this file to nostrand_config.h and replace these values.
constexpr char WIFI_SSID[] = "YOUR_WIFI_NAME";
constexpr char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

// Do not use localhost: the ESP32 needs a URL it can reach over Wi-Fi.
// Local example: http://192.168.1.42:5000
// Hosted example: https://trains.example.com
constexpr char API_BASE_URL[] = "http://192.168.1.42:5000";

constexpr unsigned long REFRESH_INTERVAL_MS = 60UL * 1000UL;
constexpr unsigned int FULL_REFRESH_EVERY = 15;

// Use 2 if the panel is mounted upside down.
constexpr unsigned int DISPLAY_ROTATION = 0;
