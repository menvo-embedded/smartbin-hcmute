// Firmware ESP32 cho SmartBin.
//
// Đóng vai trò GATT server BLE, khớp đúng 3 UUID và giao thức JSON mà app
// React Native gọi trong src/core/ble/binController.ts:
//   - App ghi vào COMMAND_CHAR:  JSON thô {"cmd":"open","bin":"huu_co"|"vo_co"|"tai_che"}
//   - App đọc từ STATUS_CHAR:    JSON thô {"status":"ok"|"error","message":"..."}
//
// LƯU Ý QUAN TRỌNG: react-native-ble-plx bên app đã tự base64 giúp ở tầng cầu
// nối JS<->Native (bridge) — `Buffer.from(json).toString('base64')` phía app
// CHỈ để thoả tham số của thư viện, thư viện tự giải mã lại trước khi gửi
// byte thật qua sóng BLE. Nghĩa là byte thực sự bay qua BLE LÀ JSON THÔ,
// không phải base64. Firmware KHÔNG được base64-decode/encode gì thêm, chỉ
// đọc/ghi thẳng chuỗi JSON — nếu thêm 1 lớp base64 nữa ở đây sẽ ra rác.
//
// Mỗi loại rác gắn với một servo riêng. Đổi chân GPIO bên dưới cho khớp mạch
// thật của bạn trước khi nạp.
//
// QUAN TRỌNG: onWrite() của BLE KHÔNG được block lâu (không delay()) — callback
// này chạy trên task riêng của BLE stack, block lâu trong đó khiến lệnh không
// thực thi đúng dù không báo lỗi gì. Nên ở đây onWrite() chỉ đánh dấu "có lệnh
// chờ", còn việc thực sự quay servo (có delay) làm trong loop() chính.

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// ---- UUID: PHẢI trùng tuyệt đối với binController.ts bên app ----
#define SERVICE_UUID       "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define COMMAND_CHAR_UUID  "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define STATUS_CHAR_UUID   "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

// ---- Tên quảng bá BLE: hiện trong danh sách quét trên điện thoại ----
#define DEVICE_NAME "SmartBin-01"

// ---- Chân servo: chỉnh lại theo mạch thật ----
const int SERVO_PIN_HUU_CO  = 13;
const int SERVO_PIN_VO_CO   = 14;
const int SERVO_PIN_TAI_CHE = 27;

const int OPEN_ANGLE = 90;
const int CLOSED_ANGLE = 0;
const int OPEN_DURATION_MS = 2000;

Servo servoHuuCo;
Servo servoVoCo;
Servo servoTaiChe;

BLECharacteristic *statusChar = nullptr;

// Trạng thái lệnh chờ xử lý — set trong onWrite() (nhanh, không block), xử lý
// thật trong loop() (được phép delay).
volatile bool commandPending = false;
String pendingBin;

void setStatus(bool ok, const String &message) {
  StaticJsonDocument<160> doc;
  doc["status"] = ok ? "ok" : "error";
  if (message.length()) doc["message"] = message;

  String json;
  serializeJson(doc, json);

  statusChar->setValue(json.c_str());

  Serial.printf("STATUS -> %s\n", json.c_str());
}

Servo *servoFor(const String &bin) {
  if (bin == "huu_co") return &servoHuuCo;
  if (bin == "vo_co") return &servoVoCo;
  if (bin == "tai_che") return &servoTaiChe;
  return nullptr;
}

// Chạy trong loop() — được phép delay() an toàn, không đụng tới BLE stack.
void processPendingCommand() {
  if (!commandPending) return;
  commandPending = false;

  String bin = pendingBin;
  Serial.printf("Xu ly lenh (loop): bin=%s\n", bin.c_str());

  Servo *target = servoFor(bin);
  if (!target) {
    setStatus(false, "Khong xac dinh ngan rac");
    return;
  }

  target->write(OPEN_ANGLE);
  delay(OPEN_DURATION_MS);
  target->write(CLOSED_ANGLE);

  setStatus(true, "");
}

class CommandCallback : public BLECharacteristicCallbacks {
  // Không delay()/không điều khiển servo ở đây — chỉ giải mã và đánh dấu cờ,
  // trả quyền cho BLE stack ngay lập tức.
  void onWrite(BLECharacteristic *characteristic) override {
    std::string raw = characteristic->getValue();
    String received = String(raw.c_str());

    Serial.printf("COMMAND <- %s\n", received.c_str());

    StaticJsonDocument<160> doc;
    DeserializationError err = deserializeJson(doc, received);
    if (err) {
      setStatus(false, "Du lieu lenh khong hop le");
      return;
    }

    const char *cmd = doc["cmd"] | "";
    const char *bin = doc["bin"] | "";

    if (String(cmd) != "open") {
      setStatus(false, "Lenh khong ho tro");
      return;
    }

    pendingBin = String(bin);
    commandPending = true;
  }
};

class ServerCallback : public BLEServerCallbacks {
  void onConnect(BLEServer *server) override {
    Serial.println("Dien thoai da ket noi");
  }
  void onDisconnect(BLEServer *server) override {
    Serial.println("Dien thoai da ngat ket noi, quang ba lai...");
    delay(200);
    BLEDevice::startAdvertising();
  }
};

void setup() {
  Serial.begin(115200);

  servoHuuCo.attach(SERVO_PIN_HUU_CO);
  servoVoCo.attach(SERVO_PIN_VO_CO);
  servoTaiChe.attach(SERVO_PIN_TAI_CHE);
  servoHuuCo.write(CLOSED_ANGLE);
  servoVoCo.write(CLOSED_ANGLE);
  servoTaiChe.write(CLOSED_ANGLE);

  BLEDevice::init(DEVICE_NAME);
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallback());

  BLEService *service = server->createService(SERVICE_UUID);

  BLECharacteristic *commandChar =
      service->createCharacteristic(COMMAND_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  commandChar->setCallbacks(new CommandCallback());

  statusChar = service->createCharacteristic(STATUS_CHAR_UUID, BLECharacteristic::PROPERTY_READ);
  setStatus(true, "San sang");

  service->start();

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("BLE dang quang ba, cho ket noi tu app...");
}

void loop() {
  processPendingCommand();
  delay(20);
}
