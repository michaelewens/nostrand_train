# CrowPanel 5.79-inch firmware

This PlatformIO project targets Elecrow model **DIS08792E**: the ESP32-S3 CrowPanel with a 792×272 black-and-white e-paper panel. It uses the panel's GDEY0579T93/dual-SSD1683 driver through GxEPD2 and Elecrow's published board pins.

## First-time Wi-Fi setup

1. Install [Visual Studio Code](https://code.visualstudio.com/) and the PlatformIO extension, or install the PlatformIO CLI.
2. Flash the firmware, then join the **Nostrand-Display** Wi-Fi network from a phone or computer.
3. The captive setup page opens automatically. Choose your home Wi-Fi and enter its password. If it does not open, browse to `http://192.168.4.1`.

The ESP32 stores the Wi-Fi credentials in its own nonvolatile storage. They are never placed in this repository. The setup network times out after five minutes; press **RST** to try again.

The firmware uses the live Railway deployment by default. To point it elsewhere, copy `include/nostrand_config.example.h` to `include/nostrand_config.h` and change `API_BASE_URL`. The override file is ignored by Git.

## Build and flash

Connect the CrowPanel by USB-C, then run from this directory:

```bash
pio run
pio run --target upload
pio device monitor
```

If automatic upload does not start, hold **BOOT**, tap **RST**, release **BOOT**, and retry the upload. The serial monitor runs at 115200 baud.

The screen refreshes once per minute. Most updates use the panel's fast partial mode; every 15th update is a full refresh to control ghosting. On a network/API error it leaves the last useful screen in place and retries later. Routine reconnects never launch the setup portal or overwrite the dashboard.

HTTPS responses are verified against the ISRG Root X1 certificate used by the Railway backend. If an `API_BASE_URL` override uses a different certificate authority, update `API_ROOT_CA` in the same private configuration file.

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
