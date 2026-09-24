/*
 * ==============================================================================
 *  PROYECTO: Lentes Inteligentes CokieLens - Cokie College
 *  DISPOSITIVO: ESP32-CAM (Módulo AI Thinker con Cámara OV2640)
 *  CARACTERÍSTICAS AVANZADAS:
 *   1. Portal Cautivo Wi-Fi (WiFiManager Autónomo):
 *      Si no hay Wi-Fi guardado o no se puede conectar, crea la red "CokieLens-Setup"
 *      para que configures el Wi-Fi desde tu teléfono sin tocar Arduino IDE nunca más.
 *   2. Guardado en Memoria Flash (NVS Preferences): Las contraseñas quedan guardadas.
 *   3. mDNS (http://cokielens.local): Conéctate por nombre sin buscar la IP.
 *   4. Streaming MJPEG fluido y Captura ultrarrápida /capture con CORS.
 *   5. WIFI_PS_NONE: Cero congelamientos de video a los 5 segundos.
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

// ── CONFIGURACIÓN POR DEFECTO / FALLBACK ─────────────────────────────────────
// Puedes dejar esto como predeterminado para el primer flasheo si deseas:
const char* default_ssid = "TU_RED_WIFI";
const char* default_pass = "TU_PASSWORD_WIFI";

String wifi_ssid = "";
String wifi_pass = "";
int audio_volume = 80;

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

// ── SERVIDORES Y CONSTANTES ────────────────────────────────────────────────
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
    char json_response[320];
    snprintf(json_response, sizeof(json_response),
        "{\"status\":\"online\",\"device\":\"CokieLens-ESP32\",\"ip\":\"%s\",\"mdns\":\"http://cokielens.local\",\"volume\":%d,\"free_heap\":%u,\"rssi\":%d}",
        in_ap_mode ? WiFi.softAPIP().toString().c_str() : WiFi.localIP().toString().c_str(),
        audio_volume,
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

    // Leer cabecera opcional de volumen
    char vol_hdr[10];
    if (httpd_req_get_hdr_value_str(req, "X-Audio-Volume", vol_hdr, sizeof(vol_hdr)) == ESP_OK) {
        int v = atoi(vol_hdr);
        if (v >= 0 && v <= 100) {
            audio_volume = v;
        }
    }

    Serial.printf("[COKIELENS AUDIO] Recibido a volumen %d%%: %s\n", audio_volume, content);

    // Destello de feedback
    digitalWrite(LED_FLASH_PIN, HIGH);
    delay(50);
    digitalWrite(LED_FLASH_PIN, LOW);

    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    char resp[80];
    snprintf(resp, sizeof(resp), "{\"status\":\"ok\",\"audio_routed\":\"lentes\",\"volume\":%d}", audio_volume);
    return httpd_resp_send(req, resp, strlen(resp));
}

// ── HANDLER 4B: AJUSTE DE VOLUMEN (/volume) ───────────────────────────────
static esp_err_t volume_handler(httpd_req_t *req) {
    char param[32];
    if (httpd_req_get_url_query_str(req, param, sizeof(param)) == ESP_OK) {
        char val_str[10];
        if (httpd_query_key_value(param, "level", val_str, sizeof(val_str)) == ESP_OK) {
            int val = atoi(val_str);
            if (val >= 0 && val <= 100) {
                audio_volume = val;
                preferences.begin("cokielens", false);
                preferences.putInt("volume", audio_volume);
                preferences.end();
                Serial.printf("[COKIELENS AUDIO] Nuevo volumen establecido: %d%%\n", audio_volume);
            }
        }
    } else if (req->method == HTTP_POST && req->content_len > 0) {
        char buf[16];
        int ret = httpd_req_recv(req, buf, min((size_t)req->content_len, sizeof(buf) - 1));
        if (ret > 0) {
            buf[ret] = '\0';
            int val = atoi(buf);
            if (val >= 0 && val <= 100) {
                audio_volume = val;
                preferences.begin("cokielens", false);
                preferences.putInt("volume", audio_volume);
                preferences.end();
                Serial.printf("[COKIELENS AUDIO] Nuevo volumen establecido (POST): %d%%\n", audio_volume);
            }
        }
    }

    char json_resp[64];
    snprintf(json_resp, sizeof(json_resp), "{\"status\":\"ok\",\"volume\":%d}", audio_volume);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_send(req, json_resp, strlen(json_resp));
}

// ── HANDLER 5: PORTAL CAUTIVO PARA GUARDAR WI-FI SIN ARDUINO IDE ───────────
static esp_err_t wifi_portal_handler(httpd_req_t *req) {
    // Si recibe POST con el nuevo SSID y contraseña
    if (req->method == HTTP_POST) {
        char buf[200];
        int ret = httpd_req_recv(req, buf, sizeof(buf) - 1);
        if (ret > 0) {
            buf[ret] = '\0';
            String data = String(buf);
            
            // Parsear parámetros ssid=xxx&pass=yyy
            int s_idx = data.indexOf("ssid=");
            int p_idx = data.indexOf("&pass=");
            if (s_idx != -1 && p_idx != -1) {
                String new_ssid = data.substring(s_idx + 5, p_idx);
                String new_pass = data.substring(p_idx + 6);
                
                // Reemplazar símbolos URL
                new_ssid.replace("+", " ");
                new_pass.replace("+", " ");

                // Guardar en la memoria Flash del ESP32
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

    // Página HTML del Portal de Configuración
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
    httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Audio-Volume, *");
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

    httpd_uri_t vol_get     = { .uri = "/volume",  .method = HTTP_GET,     .handler = volume_handler,  .user_ctx = NULL };
    httpd_uri_t vol_post    = { .uri = "/volume",  .method = HTTP_POST,    .handler = volume_handler,  .user_ctx = NULL };
    httpd_uri_t opt_vol     = { .uri = "/volume",  .method = HTTP_OPTIONS, .handler = options_handler, .user_ctx = NULL };

    if (httpd_start(&camera_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(camera_httpd, &capture_uri);
        httpd_register_uri_handler(camera_httpd, &status_uri);
        httpd_register_uri_handler(camera_httpd, &audio_uri);
        httpd_register_uri_handler(camera_httpd, &stream_uri);
        httpd_register_uri_handler(camera_httpd, &portal_get);
        httpd_register_uri_handler(camera_httpd, &portal_post);
        httpd_register_uri_handler(camera_httpd, &vol_get);
        httpd_register_uri_handler(camera_httpd, &vol_post);

        httpd_register_uri_handler(camera_httpd, &opt_status);
        httpd_register_uri_handler(camera_httpd, &opt_capture);
        httpd_register_uri_handler(camera_httpd, &opt_audio);
        httpd_register_uri_handler(camera_httpd, &opt_stream);
        httpd_register_uri_handler(camera_httpd, &opt_vol);
    }
}

// ── INICIAR PORTAL CAUTIVO AUTÓNOMO (SI NO HAY WI-FI) ──────────────────────
void startCaptivePortal() {
    in_ap_mode = true;
    Serial.println("\n[PORTAL] Iniciando punto de acceso CokieLens-Setup...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP("CokieLens-Setup", ""); // Sin contraseña para fácil conexión desde teléfono

    dnsServer.start(53, "*", WiFi.softAPIP());
    Serial.print("[PORTAL] Conéctate a la red Wi-Fi: CokieLens-Setup y entra a: http://");
    Serial.println(WiFi.softAPIP());

    startCameraServer();
}

// ── SETUP DEL SISTEMA ──────────────────────────────────────────────────────
void setup() {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // Desactivar detector de brownout

    Serial.begin(115200);
    Serial.println("\n\n==============================================");
    Serial.println("   COKIELENS INTELIGENTE - COKIE COLLEGE AI   ");
    Serial.println("==============================================");

    pinMode(LED_FLASH_PIN, OUTPUT);
    digitalWrite(LED_FLASH_PIN, LOW);

    // Cargar credenciales Wi-Fi y volumen desde memoria NVS interna
    preferences.begin("cokielens", false);
    wifi_ssid = preferences.getString("ssid", default_ssid);
    wifi_pass = preferences.getString("pass", default_pass);
    audio_volume = preferences.getInt("volume", 80);
    preferences.end();

    // Configuración OV2640
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
        config.frame_size = FRAMESIZE_QVGA;  // 320x240 para fluidez y bajo consumo
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

    // ── INTENTO DE CONEXIÓN A LA RED GUARDADA ────────────────────────────────
    Serial.printf("[WIFI] Intentando conectar a '%s'...", wifi_ssid.c_str());
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());

    WiFi.setSleep(false);
    esp_wifi_set_ps(WIFI_PS_NONE);

    int timeout = 0;
    while (WiFi.status() != WL_CONNECTED && timeout < 24) { // 12 segundos
        delay(500);
        Serial.print(".");
        timeout++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[OK] Conexión Wi-Fi Exitosa!");
        Serial.print("[INFO] IP asignada: http://");
        Serial.println(WiFi.localIP());

        // Iniciar mDNS: Permite entrar como http://cokielens.local sin buscar la IP
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
