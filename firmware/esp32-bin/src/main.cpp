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
// Mỗi loại rác gắn với một servo riêng, gạt 0° → 90° rồi về. Đổi chân GPIO
// bên dưới cho khớp mạch thật của bạn trước khi nạp.
//
// Tiết kiệm điện: servo chỉ được cấp xung (attach) lúc đang quay, quay xong thì
// detach — servo đứng yên gần như không ăn dòng, nên một nguồn 5V nhỏ đủ cho cả
// 3 servo, và mỗi lúc chỉ có 1 servo chuyển động.
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
const int OPEN_DURATION_MS = 2500;  // giữ nắp mở đủ lâu để người dùng bỏ rác
const int GAP_BETWEEN_MS = 500;     // nghỉ giữa 2 lần mở — không bao giờ 2 servo quay cùng lúc

// Dải xung mặc định của thư viện — đừng mở rộng: xung ngoài dải làm servo đập
// vào điểm chặn cơ khí.
const int PULSE_MIN = 544;
const int PULSE_MAX = 2400;

// Quay từ từ 5° mỗi bước — đỡ giật, đỡ ăn dòng khi cấp nguồn qua VIN.
const int STEP_DEG = 5;
const int STEP_MS = 15;

Servo servoHuuCo;
Servo servoVoCo;
Servo servoTaiChe;

BLECharacteristic *statusChar = nullptr;

// Hàng đợi lệnh: onWrite() (task BLE) chỉ đẩy lệnh vào, loop() lấy ra xử lý
// LẦN LƯỢT từng lệnh. Lệnh tới khi servo khác đang mở sẽ xếp hàng chứ không ghi
// đè/mất, và không bao giờ có 2 servo quay cùng lúc (tránh sụt nguồn).
// Mã ngăn: 0 = huu_co, 1 = vo_co, 2 = tai_che.
QueueHandle_t commandQueue;
const char *BIN_KEYS[3] = {"huu_co", "vo_co", "tai_che"};

int binIndex(const char *bin) {
  for (int i = 0; i < 3; i++)
    if (strcmp(bin, BIN_KEYS[i]) == 0) return i;
  return -1;
}

void setStatus(bool ok, const String &message) {
  StaticJsonDocument<160> doc;
  doc["status"] = ok ? "ok" : "error";
  if (message.length()) doc["message"] = message;

  String json;
  serializeJson(doc, json);

  statusChar->setValue(json.c_str());

  Serial.printf("[BLE]   Tra ket qua cho app: %s\n", json.c_str());
}

const char *labelFor(const String &bin) {
  if (bin == "huu_co") return "HUU CO";
  if (bin == "vo_co") return "VO CO";
  if (bin == "tai_che") return "TAI CHE";
  return "?";
}

Servo *servoFor(const String &bin) {
  if (bin == "huu_co") return &servoHuuCo;
  if (bin == "vo_co") return &servoVoCo;
  if (bin == "tai_che") return &servoTaiChe;
  return nullptr;
}

int pinFor(const String &bin) {
  if (bin == "huu_co") return SERVO_PIN_HUU_CO;
  if (bin == "vo_co") return SERVO_PIN_VO_CO;
  return SERVO_PIN_TAI_CHE;
}

void sweep(Servo *servo, int from, int to) {
  int dir = to > from ? STEP_DEG : -STEP_DEG;
  for (int a = from; (dir > 0 ? a < to : a > to); a += dir) {
    servo->write(a);
    delay(STEP_MS);
  }
  servo->write(to);
}

// Ngắt xung để servo nghỉ không ăn dòng, và kéo chân về LOW để tách hẳn khỏi
// kênh PWM — nếu không, servo khác attach sau dùng lại kênh cũ sẽ kéo cả servo
// này quay theo.
void release(Servo *servo, int pin) {
  servo->detach();
  pinMode(pin, OUTPUT);
  digitalWrite(pin, LOW);
}

// ---- Servo quay liên tục 360° (nhóm tận dụng linh kiện có sẵn cho ngăn Hữu cơ) ----
// Loại này không giữ được góc: write(90) = DỪNG, lệch khỏi 90 = quay với tốc
// độ tỉ lệ độ lệch. Nên "mở nắp" = quay thuận trong SPIN_MS rồi dừng, "đóng" =
// quay ngược đúng bấy nhiêu thời gian. Nắp quay thiếu/thừa thì chỉnh SPIN_MS.
const bool CONTINUOUS_HUU_CO = true;
const int SPIN_STOP = 90;
const int SPIN_SPEED = 30;   // 90 ± 30 → tốc độ vừa phải
const int SPIN_MS = 300;     // thời gian quay để nắp mở khoảng 90°

bool isContinuous(int pin) { return CONTINUOUS_HUU_CO && pin == SERVO_PIN_HUU_CO; }

void openBinContinuous(Servo *servo, int pin) {
  servo->attach(pin, PULSE_MIN, PULSE_MAX);
  servo->write(SPIN_STOP);
  delay(100);
  servo->write(SPIN_STOP + SPIN_SPEED);  // quay thuận: mở nắp
  delay(SPIN_MS);
  servo->write(SPIN_STOP);
  delay(OPEN_DURATION_MS);
  servo->write(SPIN_STOP - SPIN_SPEED);  // quay ngược: đóng nắp
  delay(SPIN_MS);
  servo->write(SPIN_STOP);
  delay(200);
  release(servo, pin);
}

// Mở ngăn: quay từ từ lên góc mở, GIỮ lực trong lúc mở, quay về rồi mới nhả.
void openBin(Servo *servo, int pin) {
  if (isContinuous(pin)) {
    openBinContinuous(servo, pin);
    return;
  }
  servo->attach(pin, PULSE_MIN, PULSE_MAX);
  servo->write(CLOSED_ANGLE);
  delay(100);
  sweep(servo, CLOSED_ANGLE, OPEN_ANGLE);
  delay(OPEN_DURATION_MS);
  sweep(servo, OPEN_ANGLE, CLOSED_ANGLE);
  delay(300);
  release(servo, pin);
}

void closeOnBoot(Servo *servo, int pin) {
  servo->attach(pin, PULSE_MIN, PULSE_MAX);
  // Servo 360° chỉ cần lệnh dừng; write(0) sẽ làm nó quay hết tốc lực.
  servo->write(isContinuous(pin) ? SPIN_STOP : CLOSED_ANGLE);
  delay(500);
  release(servo, pin);
}

// Chạy trong loop() — được phép delay() an toàn, không đụng tới BLE stack.
void processPendingCommand() {
  uint8_t idx;
  if (xQueueReceive(commandQueue, &idx, 0) != pdTRUE) return;

  String bin = BIN_KEYS[idx];
  Servo *target = servoFor(bin);
  int pin = pinFor(bin);

  if (isContinuous(pin)) {
    Serial.printf("[SERVO] Mo ngan %s (GPIO %d, servo 360) quay %d ms, giu %.1f giay\n", labelFor(bin), pin,
                  SPIN_MS, OPEN_DURATION_MS / 1000.0);
  } else {
    Serial.printf("[SERVO] Mo ngan %s (GPIO %d) -> %d do, giu %.1f giay\n", labelFor(bin), pin, OPEN_ANGLE,
                  OPEN_DURATION_MS / 1000.0);
  }
  openBin(target, pin);
  Serial.printf("[SERVO] Dong ngan %s\n", labelFor(bin));

  setStatus(true, "");

  int waiting = uxQueueMessagesWaiting(commandQueue);
  if (waiting > 0) Serial.printf("[HANG]  Con %d lenh dang cho, nghi %d ms roi mo tiep\n", waiting, GAP_BETWEEN_MS);
  Serial.println();
  delay(GAP_BETWEEN_MS);
}

class CommandCallback : public BLECharacteristicCallbacks {
  // Không delay()/không điều khiển servo ở đây — chỉ giải mã và đánh dấu cờ,
  // trả quyền cho BLE stack ngay lập tức.
  void onWrite(BLECharacteristic *characteristic) override {
    std::string raw = characteristic->getValue();
    String received = String(raw.c_str());

    Serial.printf("[BLE]   Nhan lenh tu app: %s\n", received.c_str());

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

    int idx = binIndex(bin);
    if (idx < 0) {
      setStatus(false, "Khong xac dinh ngan rac");
      return;
    }

    uint8_t code = idx;
    if (xQueueSend(commandQueue, &code, 0) != pdTRUE) {
      Serial.println("[HANG]  Hang doi day, bo qua lenh");
      setStatus(false, "Thung dang ban, thu lai sau");
    }
  }
};

class ServerCallback : public BLEServerCallbacks {
  void onConnect(BLEServer *server) override {
    Serial.println("[BLE]   Dien thoai da ket noi");
  }
  void onDisconnect(BLEServer *server) override {
    Serial.println("[BLE]   Dien thoai ngat ket noi, quang ba lai...");
    delay(200);
    BLEDevice::startAdvertising();
  }
};

void setup() {
  Serial.begin(115200);

  delay(300);
  Serial.println();
  Serial.println("=== SMARTBIN ESP32 KHOI DONG ===");

  commandQueue = xQueueCreate(5, sizeof(uint8_t));

  // Đưa lần lượt từng nắp về vị trí đóng (từng cái một để không sụt nguồn).
  closeOnBoot(&servoHuuCo, SERVO_PIN_HUU_CO);
  closeOnBoot(&servoVoCo, SERVO_PIN_VO_CO);
  closeOnBoot(&servoTaiChe, SERVO_PIN_TAI_CHE);

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

  Serial.println("[BLE]   Dang quang ba SmartBin-01, cho app ket noi...");
}

void loop() {
  processPendingCommand();
  delay(20);
}
