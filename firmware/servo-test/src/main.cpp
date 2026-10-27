// Thử và chỉnh góc từng servo bằng phím trong Serial Monitor (115200):
//   1 / 2 / 3 = thử servo Hữu cơ (13) / Vô cơ (14) / Tái chế (27)
//   a         = lần lượt cả 3
//   + / -     = tăng / giảm góc mở của servo vừa thử thêm 10° (rồi thử lại)
// Mỗi lần thử: gạt 0° → góc mở, GIỮ xung 1,5 giây, về 0° rồi mới ngắt xung.

#include <Arduino.h>
#include <ESP32Servo.h>

const int PINS[3] = {13, 14, 27};
const char *NAMES[3] = {"HUU CO", "VO CO", "TAI CHE"};
int openAngle[3] = {90, 90, 90};
Servo servos[3];
int lastServo = 0;

// Dải xung mặc định của thư viện (544–2400 µs). Đừng mở rộng hơn: xung ngoài
// dải làm servo đập vào điểm chặn cơ khí. Servo nào quay thiếu góc thì tăng
// góc mở bằng phím "+", không đổi dải xung.
const int PULSE_MIN = 544;
const int PULSE_MAX = 2400;

// Quay từ từ 5° mỗi bước thay vì nhảy một phát — đỡ giật, đỡ ăn dòng.
const int STEP_DEG = 5;
const int STEP_MS = 15;

void sweep(int i, int from, int to) {
  int dir = to > from ? STEP_DEG : -STEP_DEG;
  for (int a = from; (dir > 0 ? a < to : a > to); a += dir) {
    servos[i].write(a);
    delay(STEP_MS);
  }
  servos[i].write(to);
}

// Ngắt xung và kéo chân về LOW để servo này không bị servo khác (dùng lại
// kênh PWM) kéo quay theo.
void release(int i) {
  servos[i].detach();
  pinMode(PINS[i], OUTPUT);
  digitalWrite(PINS[i], LOW);
}

void printMenu() {
  Serial.println();
  Serial.printf("Goc mo hien tai:  Huu co %d | Vo co %d | Tai che %d\n", openAngle[0], openAngle[1], openAngle[2]);
  Serial.println("Nhan phim:  1 / 2 / 3 = thu servo   a = ca 3   + / - = chinh goc servo vua thu");
  Serial.println();
}

void testServo(int i) {
  lastServo = i;
  Serial.println("========================================");
  Serial.printf(" TEST SERVO %d - %s (GPIO %d)\n", i + 1, NAMES[i], PINS[i]);
  Serial.println("----------------------------------------");
  servos[i].attach(PINS[i], PULSE_MIN, PULSE_MAX);
  servos[i].write(0);
  delay(100);
  Serial.printf("   -> quay len %d do (giu luc 1,5 giay)\n", openAngle[i]);
  sweep(i, 0, openAngle[i]);
  delay(1500);
  Serial.println("   -> quay ve 0 do");
  sweep(i, openAngle[i], 0);
  delay(300);
  release(i);
  Serial.println("   XONG");
  Serial.println("========================================");
  Serial.println();
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("=== KHOI DONG ===");
  for (int i = 0; i < 3; i++) {
    servos[i].attach(PINS[i], PULSE_MIN, PULSE_MAX);
    servos[i].write(0);
    delay(500);
    release(i);
  }
  printMenu();
}

void loop() {
  if (!Serial.available()) {
    delay(20);
    return;
  }
  char c = Serial.read();
  if (c == '1' || c == '2' || c == '3') {
    testServo(c - '1');
    printMenu();
  } else if (c == 'a' || c == 'A') {
    for (int i = 0; i < 3; i++) {
      testServo(i);
      delay(800);
    }
    printMenu();
  } else if (c == '+' || c == '-') {
    int i = lastServo;
    openAngle[i] = constrain(openAngle[i] + (c == '+' ? 10 : -10), 10, 180);
    Serial.printf(">> Goc mo servo %s = %d do. Nhan %d de thu lai.\n", NAMES[i], openAngle[i], i + 1);
  }
}
