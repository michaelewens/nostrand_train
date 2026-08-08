#pragma once

// The production backend for this repository. Copy this file to
// nostrand_config.h only if you want to override these defaults.
// Do not use localhost: the ESP32 needs a URL it can reach over Wi-Fi.
constexpr char API_BASE_URL[] = "https://nostrand.up.railway.app";

constexpr unsigned long REFRESH_INTERVAL_MS = 60UL * 1000UL;
constexpr unsigned int FULL_REFRESH_EVERY = 15;

// Use 2 if the panel is mounted upside down.
constexpr unsigned int DISPLAY_ROTATION = 0;
