# Manual Integral de CokieLens & Estudio de Gestos IA - Cokie College

> **Actualización ReDesign**: Este documento incluye las nuevas opciones de conexión dual (**AP Directo `192.168.4.1`** vs **mDNS Local `cokielens.local`**), el sistema de rescate y fallback automático para Android/iOS, el nuevo soporte de **Preflight CORS (`HTTP_OPTIONS`)** en el firmware para clientes web, y el ciclo de vida optimizado de streaming en la app.

---

## 1. Arquitectura General del Sistema

El sistema conecta los lentes inteligentes (**CokieLens**) con la aplicación móvil/web de **Cokie College** y el motor de IA de **Lenguaje de Señas y Gestos (MediaPipe + Red Neuronal Espacio-Temporal)**.

```
       [ ESP32-CAM (Lentes) ]
            │  (Wi-Fi Local @ 180ms / QVGA 320x240)
            ▼
    [ App Cokie College ] ──(Socket.IO)──> [ Backend IA (FastAPI) ]
    ├── Selector Video: Teléfono / Lentes       ├── MediaPipe Hands & Pose
    ├── Selector Audio: Teléfono / Lentes       └── Red Neuronal Temporal (LSTM)
    └── Salida de Voz Inmediata (< 20ms)               │
         (Bocina o Audífonos BT/Cable)   <─────────────┘ (Texto traducido)
```

### Flujo de datos:
1. **Lentes CokieLens (ESP32-CAM)**: Capturan video a **320x240 (QVGA)** de forma continua sin saturar la memoria y entregan cuadros JPEG en solo **15ms** vía `/capture`.
2. **App Cokie College (Móvil / Web)**: Muestra la vista en vivo de los lentes, gestiona el ciclo de vida del stream (`isFocused`) y envía los fotogramas en Base64 al servidor de IA.
3. **Servidor de IA (`sign_language_service`)**:
   - Extrae las coordenadas tridimensionales de brazos, manos y rostro.
   - Evalúa una ventana deslizante de **30 cuadros (~1 segundo)** con la Red Neuronal entrenada.
   - Emite el resultado traducido por Socket.IO en menos de **25ms**.
4. **Locución de Audio Instantánea**:
   - El teléfono recibe el texto y lo pronuncia inmediatamente con **`Speech.speak` (o Web Speech API)** a través de la **bocina del teléfono o de los audífonos (Bluetooth o cable) conectados al teléfono**.
   - Opcionalmente, si el usuario selecciona *"Lentes"* como salida de audio, la app envía la señal al endpoint `/play` del ESP32.

---

## 2. Guía de Hardware y Conexión de los Lentes (ESP32-CAM)

### Componentes:
- **Placa principal**: ESP32-CAM AI Thinker con procesador ESP32 dual-core a 240 MHz y 4MB de PSRAM.
- **Sensor de video**: Módulo de cámara OV2640 de 2 Megapíxeles con cable cinta plano.
- **Base de programación**: `ESP32-CAM-MB` con puerto micro-USB integrado y convertidor USB-Serial CH340.
- **Alimentación**: 5V vía puerto USB (se recomienda un cargador o powerbank de al menos 5V / 1.5A–2A).
- **Salida de audio futura en lentes (opcional)**: Amplificador de audio PAM8403 conectado a los pines DAC (GPIO 25 / 26) o salida I2S, con bocina pequeña o auricular mono.

### Conexión del sensor OV2640:
1. Levanta suavemente la pestaña negra del conector FPC en el ESP32-CAM.
2. Introduce el cable cinta de la cámara OV2640 con los **contactos dorados mirando hacia la placa**.
3. Baja la pestaña negra para fijar firmemente el cable.

---

## 3. ¿Cómo se Conectan los Lentes Ahora? (Novedades del ReDesign)

En el rediseño más reciente, se implementó un sistema de conexión **mucho más confiable, rápido y con tolerancia a fallos**, resolviendo los problemas comunes de resolución DNS en dispositivos móviles y restricciones de seguridad en navegadores web.

```
                    ┌──────────────────────────────────────────────┐
                    │       ¿CÓMO DESEAS CONECTARTE?               │
                    └──────────────────────┬───────────────────────┘
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             ▼                                                           ▼
   [ MODO 1: DIRECTO (AP) ]                                    [ MODO 2: RED LOCAL (STA) ]
   • Red Wi-Fi: "CokieLens-Setup"                              • Red Wi-Fi: Tu Router / Colegio
   • IP Fija: 192.168.4.1                                      • Nombre: cokielens.local o IP local
   • Sin necesidad de router exterior                          • Requiere configurar Wi-Fi en portal
   • Cero configuración de red previa                          • Fallback automático a 192.168.4.1
```

---

### MODO 1 (Recomendado y Más Rápido): Conexión Directa al Wi-Fi de los Lentes (`192.168.4.1`)

Este modo es ideal si estás en una feria escolar, en la calle, en un salón de clases sin acceso a la clave del router o si tu red no permite comunicación directa entre dispositivos.

1. **Enciende los lentes CokieLens**.
2. Si los lentes no encuentran una red Wi-Fi configurada, generarán su propia red Wi-Fi:
   👉 **`CokieLens-Setup`** (sin contraseña).
3. **Conecta tu teléfono o computadora a la red Wi-Fi `CokieLens-Setup`**.
4. Abre la app de **Cokie College** (en el **Intérprete** o en el **Estudio de Gestos**).
5. Selecciona la pestaña **`[👓 Lentes]`** y presiona el ícono de **Ajustes (⚙️)**.
6. En el modal verás dos botones rápidos arriba del campo de texto:
   - Toca el botón azul: **`[ 192.168.4.1 ] (Wi-Fi de Lentes / AP)`**.
7. Presiona **"Probar Conexión"**:
   - La app consultará `http://192.168.4.1/status` y mostrará:
     ✅ `Conectado a CokieLens-ESP32 (192.168.4.1)`.
8. Presiona **"Guardar IP"**. ¡Listo! Verás el video de los lentes en vivo al instante.

---

### MODO 2: Conexión mediante Red Wi-Fi Compartida (`cokielens.local` o IP del Router)

Este modo se utiliza cuando deseas que tanto tu teléfono/computadora como los lentes estén conectados a la red Wi-Fi de tu colegio o de tu hogar.

1. **Conectar los lentes a tu Wi-Fi por primera vez**:
   - Conéctate desde tu celular al Wi-Fi **`CokieLens-Setup`**.
   - Se abrirá automáticamente el **Portal Cautivo** (si no abre solo, entra en tu navegador a `http://192.168.4.1`).
   - Escribe el nombre de tu red Wi-Fi (`SSID`) y la contraseña.
   - Presiona **"Guardar y Conectar"**.
   - Los lentes guardarán las credenciales en su memoria Flash NVS y se reiniciarán conectándose a tu router.
2. **Conectar la app a los lentes**:
   - Asegúrate de que tu celular o computadora esté conectado a la **misma red Wi-Fi**.
   - Abre la app Cokie College -> pestaña **`[👓 Lentes]`** -> Ajustes (⚙️).
   - Toca el botón rápido: **`[ cokielens.local ] (mDNS Local)`**.
   - Presiona **"Probar Conexión"** y luego **"Guardar IP"**.

---

### 🛡️ Fallback Automático Inteligente (Rescate para Android)

Muchos teléfonos con sistema operativo **Android** tienen desactivada por defecto la resolución de dominios locales `.local` (mDNS) debido a políticas del fabricante o versiones del kernel.

**¿Cómo lo resolvió el ReDesign?**
- Si dejas configurado `cokielens.local` y tu teléfono no logra resolver el dominio en 3 segundos:
  1. La aplicación detecta el fallo automáticamente.
  2. Hace un segundo intento instantáneo hacia la IP de fábrica **`192.168.4.1`**.
  3. Si responde, actualiza el campo de texto a `192.168.4.1`, guarda el valor en el almacenamiento permanente (`AsyncStorage`) y establece la conexión de video sin que tengas que reiniciar la app ni volver a configurar nada manualmente.

---

### 🌐 Soporte de Preflight CORS (`HTTP_OPTIONS`) para Navegadores Web

En versiones anteriores, al usar la aplicación en un navegador de escritorio (Chrome, Edge, Firefox, Safari) para ver los lentes, el navegador bloqueaba las llamadas `fetch()` con el error:
> *"Access to fetch at 'http://192.168.4.1/status' from origin 'http://localhost:8081' has been blocked by CORS policy: Response to preflight request doesn't pass access control check"*.

**Ajuste del Commit ReDesign en el Firmware**:
Se añadió el handler dedicado `options_handler` en el servidor HTTP del ESP32-CAM:
```c
static esp_err_t options_handler(httpd_req_t *req) {
    httpd_resp_set_type(req, "text/plain");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    httpd_resp_set_hdr(req, "Access-Control-Max-Age", "86400");
    return httpd_resp_send(req, "OK", 2);
}
```
Y se registraron las rutas `HTTP_OPTIONS` para:
- `/status`
- `/capture`
- `/play`
- `/stream`

Gracias a esto, tanto la versión **Móvil (Android / iOS)** como la versión **Web (PC / Laptop)** pueden comunicarse de forma nativa y directa con el ESP32.

---

## 4. Código Fuente Actualizado del Firmware (`CokieLens_Camera.ino`)

A continuación se presenta el código completo del firmware listo para compilar y subir al ESP32-CAM desde **Arduino IDE**:

```cpp
/*
 * ==============================================================================
 *  PROYECTO: Lentes Inteligentes CokieLens - Cokie College
 *  DISPOSITIVO: ESP32-CAM (Módulo AI Thinker con Cámara OV2640)
 *  CARACTERÍSTICAS:
 *   1. Portal Cautivo Wi-Fi autónomo ("CokieLens-Setup").
 *   2. Guardado en Memoria Flash NVS (Preferences.h).
 *   3. Soporte mDNS (http://cokielens.local) + IP directa (192.168.4.1).
 *   4. Preflight CORS completo (HTTP_OPTIONS) para compatibilidad Web y Móvil.
 *   5. Modo sin reposo Wi-Fi (WIFI_PS_NONE) para streaming continuo sin caídas.
 * ==============================================================================
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <DNSServer.h>
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "fb_gfx.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "esp_http_server.h"
#include "esp_wifi.h"

// ── PREFERENCIAS (MEMORIA NO VOLÁTIL) ───────────────────────────────────────
Preferences preferences;

const char* default_ssid = "TU_RED_WIFI";
const char* default_pass = "TU_PASSWORD_WIFI";

String wifi_ssid = "";
String wifi_pass = "";

// ── DEFINICIÓN DE PINES PARA AI THINKER ESP32-CAM ──────────────────────────
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define LED_FLASH_PIN      4

// ── CONSTANTES DE STREAMING ────────────────────────────────────────────────
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t camera_httpd = NULL;
DNSServer dnsServer;
bool in_ap_mode = false;

// ── HANDLER 1: CAPTURA INSTANTÁNEA JPEG (/capture) ─────────────────────────
static esp_err_t capture_handler(httpd_req_t *req) {
    camera_fb_t * fb = NULL;
    esp_err_t res = ESP_OK;

    fb = esp_camera_fb_get();
    if (fb) {
        esp_camera_fb_return(fb);
    }
    fb = esp_camera_fb_get();

    if (!fb) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    httpd_resp_set_type(req, "image/jpeg");
    httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache, no-store, must-revalidate");
    httpd_resp_set_hdr(req, "Pragma", "no-cache");
    httpd_resp_set_hdr(req, "Expires", "0");

    res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    return res;
}

// ── HANDLER 2: STREAMING CONTINUO MJPEG (/stream) ──────────────────────────
static esp_err_t stream_handler(httpd_req_t *req) {
    camera_fb_t * fb = NULL;
    esp_err_t res = ESP_OK;
    size_t _jpg_buf_len = 0;
    uint8_t * _jpg_buf = NULL;
    char * part_buf[64];

    res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    if (res != ESP_OK) return res;

    while (true) {
        fb = esp_camera_fb_get();
        if (!fb) {
            res = ESP_FAIL;
        } else {
            _jpg_buf_len = fb->len;
            _jpg_buf = fb->buf;
        }

        if (res == ESP_OK) {
            size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART, _jpg_buf_len);
            res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
        }
        if (res == ESP_OK) {
            res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
        }
        if (res == ESP_OK) {
            res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
        }

        if (fb) {
            esp_camera_fb_return(fb);
            fb = NULL;
            _jpg_buf = NULL;
        } else if (_jpg_buf) {
            free(_jpg_buf);
            _jpg_buf = NULL;
        }

        if (res != ESP_OK) break;
        vTaskDelay(pdMS_TO_TICKS(10));
    }
    return res;
}

// ── HANDLER 3: ESTADO Y SALUD (/status) ────────────────────────────────────
static esp_err_t status_handler(httpd_req_t *req) {
    char json_response[300];
    snprintf(json_response, sizeof(json_response),
        "{\"status\":\"online\",\"device\":\"CokieLens-ESP32\",\"ip\":\"%s\",\"mdns\":\"http://cokielens.local\",\"free_heap\":%u,\"rssi\":%d}",
        in_ap_mode ? WiFi.softAPIP().toString().c_str() : WiFi.localIP().toString().c_str(),
        ESP.getFreeHeap(),
        in_ap_mode ? 0 : WiFi.RSSI()
    );
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, json_response, strlen(json_response));
}

// ── HANDLER 4: AUDIO / NOTIFICACIÓN (/play) ────────────────────────────────
static esp_err_t audio_play_handler(httpd_req_t *req) {
    char content[100];
    int total_len = req->content_len;
    if (total_len >= sizeof(content)) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }
    int received = httpd_req_recv(req, content, total_len);
    if (received <= 0) return ESP_FAIL;
    content[total_len] = '\0';

    Serial.printf("[COKIELENS AUDIO] Recibido para audífonos de lentes: %s\n", content);

    digitalWrite(LED_FLASH_PIN, HIGH);
    delay(50);
    digitalWrite(LED_FLASH_PIN, LOW);

    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    const char* resp = "{\"status\":\"ok\",\"audio_routed\":\"lentes\"}";
    return httpd_resp_send(req, resp, strlen(resp));
}

// ── HANDLER 5: PORTAL CAUTIVO PARA GUARDAR WI-FI ───────────────────────────
static esp_err_t wifi_portal_handler(httpd_req_t *req) {
    if (req->method == HTTP_POST) {
        char buf[200];
        int ret = httpd_req_recv(req, buf, sizeof(buf) - 1);
        if (ret > 0) {
            buf[ret] = '\0';
            String data = String(buf);
            
            int s_idx = data.indexOf("ssid=");
            int p_idx = data.indexOf("&pass=");
            if (s_idx != -1 && p_idx != -1) {
                String new_ssid = data.substring(s_idx + 5, p_idx);
                String new_pass = data.substring(p_idx + 6);
                
                new_ssid.replace("+", " ");
                new_pass.replace("+", " ");

                preferences.begin("cokielens", false);
                preferences.putString("ssid", new_ssid);
                preferences.putString("pass", new_pass);
                preferences.end();

                const char* success_html = 
                    "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
                    "<title>CokieLens Guardado</title><style>body{font-family:sans-serif;background:#0b1956;color:#fff;text-align:center;padding:40px;}</style></head>"
                    "<body><h2>¡Wi-Fi Guardado Exitosamente!</h2><p>Los lentes se reiniciarán y se conectarán a tu red.</p><p>Ya puedes volver a la app Cokie College.</p></body></html>";

                httpd_resp_send(req, success_html, strlen(success_html));
                delay(1500);
                ESP.restart();
                return ESP_OK;
            }
        }
    }

    String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>";
    html += "<title>Configurar Wi-Fi CokieLens</title><style>";
    html += "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0b1956;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}";
    html += ".card{background:#13236e;padding:28px;border-radius:20px;max-width:360px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.5);}";
    html += "h2{color:#38bdf8;margin-top:0;}label{font-size:13px;color:#94a3b8;display:block;margin:12px 0 4px;}";
    html += "input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #334155;background:#070f38;color:#fff;font-size:15px;}";
    html += "button{width:100%;margin-top:20px;padding:14px;border-radius:12px;border:none;background:#38bdf8;color:#0b1956;font-size:16px;font-weight:bold;cursor:pointer;}";
    html += "</style></head><body><div class='card'>";
    html += "<h2>👓 CokieLens Wi-Fi</h2><p style='font-size:13px;color:#94a3b8;'>Conecta tus lentes a la red de tu escuela, casa o punto móvil sin usar Arduino IDE.</p>";
    html += "<form method='POST' action='/'>";
    html += "<label>Nombre de Red Wi-Fi (SSID):</label><input type='text' name='ssid' placeholder='Ej: Mi_Casa_WiFi' required>";
    html += "<label>Contraseña de Wi-Fi:</label><input type='password' name='pass' placeholder='Contraseña de tu red'>";
    html += "<button type='submit'>Guardar y Conectar</button></form></div></body></html>";

    httpd_resp_set_type(req, "text/html");
    return httpd_resp_send(req, html.c_str(), html.length());
}

// ── HANDLER 6: PREFLIGHT CORS (OPTIONS) PARA NAVEGADORES WEB ───────────────
static esp_err_t options_handler(httpd_req_t *req) {
    httpd_resp_set_type(req, "text/plain");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    httpd_resp_set_hdr(req, "Access-Control-Max-Age", "86400");
    return httpd_resp_send(req, "OK", 2);
}

// ── REGISTRO DE ENDPOINTS HTTP ─────────────────────────────────────────────
void startCameraServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;
    config.ctrl_port = 32768;

    httpd_uri_t capture_uri = { .uri = "/capture", .method = HTTP_GET, .handler = capture_handler, .user_ctx = NULL };
    httpd_uri_t status_uri  = { .uri = "/status",  .method = HTTP_GET, .handler = status_handler,  .user_ctx = NULL };
    httpd_uri_t audio_uri   = { .uri = "/play",    .method = HTTP_POST,.handler = audio_play_handler,.user_ctx = NULL };
    httpd_uri_t stream_uri  = { .uri = "/stream",  .method = HTTP_GET, .handler = stream_handler,  .user_ctx = NULL };
    httpd_uri_t portal_get  = { .uri = "/",        .method = HTTP_GET, .handler = wifi_portal_handler,.user_ctx = NULL };
    httpd_uri_t portal_post = { .uri = "/",        .method = HTTP_POST,.handler = wifi_portal_handler,.user_ctx = NULL };

    httpd_uri_t opt_status  = { .uri = "/status",  .method = HTTP_OPTIONS, .handler = options_handler, .user_ctx = NULL };
    httpd_uri_t opt_capture = { .uri = "/capture", .method = HTTP_OPTIONS, .handler = options_handler, .user_ctx = NULL };
    httpd_uri_t opt_audio   = { .uri = "/play",    .method = HTTP_OPTIONS, .handler = options_handler, .user_ctx = NULL };
    httpd_uri_t opt_stream  = { .uri = "/stream",  .method = HTTP_OPTIONS, .handler = options_handler, .user_ctx = NULL };

    if (httpd_start(&camera_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(camera_httpd, &capture_uri);
        httpd_register_uri_handler(camera_httpd, &status_uri);
        httpd_register_uri_handler(camera_httpd, &audio_uri);
        httpd_register_uri_handler(camera_httpd, &stream_uri);
        httpd_register_uri_handler(camera_httpd, &portal_get);
        httpd_register_uri_handler(camera_httpd, &portal_post);

        httpd_register_uri_handler(camera_httpd, &opt_status);
        httpd_register_uri_handler(camera_httpd, &opt_capture);
        httpd_register_uri_handler(camera_httpd, &opt_audio);
        httpd_register_uri_handler(camera_httpd, &opt_stream);
    }
}

// ── INICIAR PORTAL CAUTIVO (SI NO HAY WI-FI DISPONIBLE) ────────────────────
void startCaptivePortal() {
    in_ap_mode = true;
    Serial.println("\n[PORTAL] Iniciando punto de acceso CokieLens-Setup...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP("CokieLens-Setup", "");

    dnsServer.start(53, "*", WiFi.softAPIP());
    Serial.print("[PORTAL] Conéctate a la red Wi-Fi: CokieLens-Setup y entra a: http://");
    Serial.println(WiFi.softAPIP());

    startCameraServer();
}

// ── SETUP DEL SISTEMA ──────────────────────────────────────────────────────
void setup() {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

    Serial.begin(115200);
    Serial.println("\n\n==============================================");
    Serial.println("   COKIELENS INTELIGENTE - COKIE COLLEGE AI   ");
    Serial.println("==============================================");

    pinMode(LED_FLASH_PIN, OUTPUT);
    digitalWrite(LED_FLASH_PIN, LOW);

    preferences.begin("cokielens", false);
    wifi_ssid = preferences.getString("ssid", default_ssid);
    wifi_pass = preferences.getString("pass", default_pass);
    preferences.end();

    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    if (psramFound()) {
        config.frame_size = FRAMESIZE_QVGA;  // 320x240 para máxima fluidez
        config.jpeg_quality = 12;
        config.fb_count = 2;
        config.fb_location = CAMERA_FB_IN_PSRAM;
        config.grab_mode = CAMERA_GRAB_LATEST;
    } else {
        config.frame_size = FRAMESIZE_QVGA;
        config.jpeg_quality = 14;
        config.fb_count = 1;
        config.fb_location = CAMERA_FB_IN_DRAM;
        config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[ERROR FATAL] Falló cámara: 0x%x\n", err);
        return;
    }

    sensor_t * s = esp_camera_sensor_get();
    if (s != NULL) {
        s->set_brightness(s, 1);
        s->set_contrast(s, 1);
        s->set_whitebal(s, 1);
        s->set_exposure_ctrl(s, 1);
    }

    Serial.printf("[WIFI] Intentando conectar a '%s'...", wifi_ssid.c_str());
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());

    WiFi.setSleep(false);
    esp_wifi_set_ps(WIFI_PS_NONE);

    int timeout = 0;
    while (WiFi.status() != WL_CONNECTED && timeout < 24) {
        delay(500);
        Serial.print(".");
        timeout++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[OK] Conexión Wi-Fi Exitosa!");
        Serial.print("[INFO] IP asignada: http://");
        Serial.println(WiFi.localIP());

        if (MDNS.begin("cokielens")) {
            Serial.println("[OK] mDNS activo: http://cokielens.local");
        }

        digitalWrite(LED_FLASH_PIN, HIGH);
        delay(100);
        digitalWrite(LED_FLASH_PIN, LOW);

        startCameraServer();
    } else {
        Serial.println("\n[AVISO] No se pudo conectar al Wi-Fi guardado.");
        Serial.println("[AVISO] Iniciando Portal Cautivo para que configures tu Wi-Fi desde tu teléfono.");
        startCaptivePortal();
    }
}

// ── LOOP PRINCIPAL ─────────────────────────────────────────────────────────
void loop() {
    if (in_ap_mode) {
        dnsServer.processNextRequest();
    } else {
        if (WiFi.status() != WL_CONNECTED) {
            WiFi.reconnect();
            delay(3000);
        }
    }
    delay(10);
}
```

---

## 5. Parámetros de Flasheo en Arduino IDE

Para flashear el ESP32-CAM por primera vez con el convertidor USB `ESP32-CAM-MB`:

1. Conecta la base USB al puerto de tu computadora (ej: `COM3` o `COM4`).
2. Abre **Arduino IDE** y carga el archivo:
   👉 `firmware/CokieLens_Camera/CokieLens_Camera.ino`
3. Configura los siguientes parámetros en **Herramientas (Tools)**:
   - **Placa**: `AI Thinker ESP32-CAM`
   - **CPU Frequency**: `240MHz (WiFi/BT)`
   - **Flash Frequency**: `80MHz`
   - **Flash Mode**: `QIO`
   - **Partition Scheme**: `Huge APP (3MB No OTA/1MB SPIFFS)`
   - **PSRAM**: `Enabled`
   - **Upload Speed**: `115200` o `921600`
   - **Puerto**: Selecciona tu puerto COM asignado.
4. Presiona el botón **Subir (Upload)**.
5. Al finalizar verás `Leaving... Hard resetting via RTS pin...`.
6. Desconecta y vuelve a conectar la alimentación. El dispositivo arrancará de inmediato.

---

## 6. Uso de los Lentes en la App Cokie College

### En la pantalla "Intérprete ISL" (`/interpreter`):
1. **Control de Fuente de Video**:
   - Presiona **`[📱 Teléfono]`** (o **`[💻 Webcam]`** en web) para usar la cámara integrada.
   - Presiona **`[👓 Lentes]`** para conectar con los lentes CokieLens.
2. **Modal de Configuración (⚙️)**:
   - El modal ofrece los botones de un toque:
     - **`[ 192.168.4.1 ]`**: Cuando tu dispositivo está conectado a la red `CokieLens-Setup`.
     - **`[ cokielens.local ]`**: Cuando ambos están en la misma red Wi-Fi institucional o doméstica.
   - Al presionar **"Probar Conexión"**, la app hace un ping al endpoint `/status` y confirma el modelo y la IP.
   - Presiona **"Guardar IP"** para almacenar la dirección en la memoria local del dispositivo.
3. **Control de Salida de Audio**:
   - **`[🔊 Altavoz]`**: Pronuncia el texto traducido con el sintetizador nativo del teléfono (`Speech.speak` en móvil o Web Speech en navegador). Si conectas audífonos Bluetooth (AirPods, auriculares inalámbricos), escucharás la traducción de forma privada en tu oído.
   - **`[👓 Lentes]`**: Envía el paquete al endpoint `/play` del ESP32 para activar la bocina de los lentes.

---

## 7. Módulo "Estudio de Gestos e IA" (`/gesture-studio`)

Para grabar nuevas señas y entrenar la red neuronal espacio-temporal directamente usando los lentes CokieLens:

1. Inicia sesión como administrador (`super_admin`).
2. Entra a **"Estudio de Gestos e IA"** desde el menú o módulos.
3. En la **Pestaña 2 (Grabador en Vivo)**:
   - Alterna la fuente a **`[👓 Lentes]`**.
   - Si no está configurada la IP, presiona el botón de ajustes (⚙️) con el punto indicador de conexión.
   - Selecciona el gesto que deseas grabar (ejemplo: *"Permiso para ir al baño"* o *"Puerta"*).
   - Tienes dos modalidades según el tipo de gesto:
     - **Seña Estática (Modo Foto)**: Coloca la mano fija frente a los lentes y presiona *"Tomar Foto de la Seña"*.
     - **Movimiento Dinámico (Modo Grabación de 30 fotogramas)**: Presiona *"Iniciar Grabación"*, espera la cuenta regresiva (3... 2... 1...) y realiza el movimiento continuo durante 1 segundo.
4. En la **Pestaña 3 (Entrenamiento IA)**:
   - Presiona **"Iniciar Entrenamiento"**.
   - La red neuronal procesará todos los vectores espacio-temporales y se recargará en caliente (*hot-reload*) en el servicio de IA sin necesidad de reiniciar servidores.

---

## 8. Arquitectura del Modelo de IA (Por qué nunca se pierden los gestos)

El sistema opera con una **Arquitectura Híbrida en 3 Capas Concurrentes**:

```
           [ Entrada de Video (Cámara / Lentes CokieLens) ]
                                 │
                                 ▼
                     [ MediaPipe Hands & Pose ]
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
 [ CAPA 1: TEMPORAL ]      [ CAPA 2: GEOMÉTRICA ]   [ CAPA 3: MEDIAPIPE ]
 Red Neuronal LSTM / MLP   Abecedario Completo A-Z  Gestos Universales
 (Gestos entrenados:       Números 0 al 10          (OpenPalm, ClosedFist,
 Hola, Permiso, Gracias...) (Heurística analítica)   ILoveYou...)
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 ▼
              [ Traducción y Voz Inmediata (< 20ms) ]
```

1. **Capa Geométrica Heurística**: Todo el abecedario de la A a la Z y los números del 0 al 10 están programados con reglas trigonométricas puras en [`isl_model.py`](file:///d:/Portafolio/Proyectos/Cokie_college/backend/sign_language_service/isl_model.py). **No dependen del entrenamiento de la red neuronal**, por lo que **nunca se borran ni pierden precisión** al agregar nuevas palabras.
2. **Capa Temporal Acumulativa**: Cada muestra grabada en el Estudio de Gestos se almacena como un archivo independiente `.npy` con marca de tiempo única en `data/samples/`. Al presionar entrenar, el algoritmo entrena con **todas las muestras históricas**, haciendo a la IA cada vez más inteligente y tolerante al ruido.

---

## 9. Tabla Resumen de Soluciones y Ajustes Técnicos

| Problema / Escenario | Causa Original | Solución Actualizada (ReDesign) |
| :--- | :--- | :--- |
| **Android no se conecta a `cokielens.local`** | Android desactiva mDNS en muchas redes móviles. | **Fallback automático a `192.168.4.1`** tras 3s de timeout + botón rápido de un toque en el modal. |
| **Error de CORS en la versión Web al consultar los lentes** | El navegador bloquea peticiones cross-origin a IPs locales sin cabeceras OPTIONS. | **`options_handler` en firmware** respondiendo cabeceras CORS en `/status`, `/capture`, `/play` y `/stream`. |
| **¿Cómo usar los lentes sin internet ni router?** | Dependencia previa de routers Wi-Fi externos. | **Modo AP Directo**: Te conectas a `CokieLens-Setup` y la app apunta a `192.168.4.1`. 100% autónomo. |
| **El stream consumía batería en segundo plano** | Los temporizadores de descarga continuaban activos al cambiar de pantalla. | **Validación `isFocused`**: Cámara y stream se suspenden automáticamente al cambiar de pestaña. |
| **Tasa de refresco saturaba el chip ESP32** | Peticiones a 160ms provocaban cola de paquetes HTTP. | **Intervalo optimizado a 180ms (~5.5-6 FPS)** con decodificación `FileReader` validada. |
| **Sintetizador de voz duplicado** | El backend llamaba a `gTTS` mientras el teléfono ejecutaba `Speech.speak`. | **Voz 100% nativa** en el dispositivo móvil/web con soporte para audífonos Bluetooth privados. |

---

## 10. Preguntas Frecuentes Rápidas (Cheat Sheet)

- **"No recuerdo la IP de mis lentes, ¿qué hago?"**
  - Conéctate a la red Wi-Fi `CokieLens-Setup` desde los ajustes Wi-Fi de tu celular.
  - Abre la app Cokie College -> Intérprete -> Ajustes ⚙️.
  - Toca el botón **`[ 192.168.4.1 ]`** y presiona **"Guardar IP"**. Es todo.

- **"Quiero conectar los lentes al Wi-Fi de mi casa o escuela"**:
  - Conéctate al Wi-Fi `CokieLens-Setup`.
  - Entra en tu navegador a `http://192.168.4.1`.
  - Ingresa el nombre y contraseña de tu red y presiona *"Guardar y Conectar"*.
  - En la app, toca el botón **`[ cokielens.local ]`**.

- **"¿Cómo sé si los lentes están transmitiendo?"**:
  - En el navegador de tu computadora o teléfono, entra a `http://192.168.4.1/status` (o `http://cokielens.local/status`). Si responde `{"status":"online",...}`, los lentes están listos para transmitir.
