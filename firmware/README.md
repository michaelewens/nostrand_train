# CrowPanel 5.79-inch firmware

This PlatformIO project targets Elecrow model **DIS08792E**: the ESP32-S3 CrowPanel with a 792×272 black-and-white e-paper panel. It uses the panel's GDEY0579T93/dual-SSD1683 driver through GxEPD2 and Elecrow's published board pins.

## Configure

1. Install [Visual Studio Code](https://code.visualstudio.com/) and the PlatformIO extension, or install the PlatformIO CLI.
2. Copy `include/nostrand_config.example.h` to `include/nostrand_config.h`.
3. Put your 2.4 GHz Wi-Fi name and password in `nostrand_config.h`.
4. Set `API_BASE_URL` to a reachable deployment of this repository. For local testing, use the computer's LAN address, not `localhost` (for example, `http://192.168.1.42:5000`).

`nostrand_config.h` is ignored by Git so Wi-Fi credentials are not committed.

## Build and flash

Connect the CrowPanel by USB-C, then run from this directory:

```bash
pio run
pio run --target upload
pio device monitor
```

If automatic upload does not start, hold **BOOT**, tap **RST**, release **BOOT**, and retry the upload. The serial monitor runs at 115200 baud.

The screen refreshes once per minute. Most updates use the panel's fast partial mode; every 15th update is a full refresh to control ghosting. On a network/API error it leaves the last useful screen in place and retries later.

## Board mapping

| Signal | ESP32-S3 GPIO |
|---|---:|
| E-paper power | 7 |
| SCK | 12 |
| MOSI | 11 |
| RESET | 47 |
| DC | 46 |
| CS | 45 |
| BUSY | 48 |

These pins are for the integrated CrowPanel. No external SPI wiring is required.
