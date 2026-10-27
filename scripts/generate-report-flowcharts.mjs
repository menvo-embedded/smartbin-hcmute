import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { instance } = require('@viz-js/viz');
const sharp = require('sharp');

const OUT = path.resolve('docs/bao-cao/hinh/luu-do');

const common = (caption) => `
  graph [
    rankdir=TB,
    bgcolor="white",
    pad=0.28,
    nodesep=0.48,
    ranksep=0.62,
    splines=ortho,
    outputorder=edgesfirst,
    fontname="Arial",
    fontsize=17,
    labelloc="b",
    labeljust="c",
    label="${caption}"
  ];
  node [
    shape=box,
    style="filled",
    fillcolor="white",
    color="#151515",
    penwidth=1.7,
    fontname="Arial",
    fontsize=17,
    margin="0.18,0.11",
    width=4.8,
    height=0.66
  ];
  edge [
    color="#151515",
    penwidth=1.6,
    arrowsize=0.78,
    fontname="Arial",
    fontsize=14,
    labelfontname="Arial"
  ];
  start [shape=oval, width=4.4];
  end [shape=oval, width=3.8];
`;

const diagrams = [
  {
    name: '01-khoi-dong-phan-quyen',
    dot: `digraph G {${common('Hình 3.2: Lưu đồ khởi động, đăng nhập và điều hướng theo vai trò')}
      start [label="Khởi động ứng dụng"];
      restore [label="Khôi phục phiên đăng nhập và hồ sơ"];
      session [shape=diamond, label="Đã có phiên hợp lệ?", width=5.3, height=1.15];
      choose [label="Chọn chế độ sử dụng"];
      community [shape=diamond, label="Chọn chế độ Cộng đồng?", width=5.5, height=1.15];
      kioskq [shape=diamond, label="Dùng Kiosk công cộng?", width=5.3, height=1.15];
      kiosk [shape=parallelogram, label="Mở Kiosk không cần đăng nhập"];
      home [label="Đăng nhập Hộ gia đình"];
      staff [label="Đăng nhập Nhân viên / Quản lý"];
      role [shape=diamond, label="Vai trò có đúng chế độ?", width=5.5, height=1.15];
      invalid [label="Đăng xuất, báo sai vai trò\nvà quay lại màn chọn chế độ"];
      retry [shape=oval, label="Quay lại màn chọn chế độ"];
      route [label="Điều hướng theo profile.role"];
      screens [shape=parallelogram, label="Hộ gia đình → Trang chủ   •   Nhân viên → Công việc\nQuản lý → Thùng rác   •   Kiosk → Phân loại", width=7.4];
      end [label="Sẵn sàng"];

      start -> restore -> session;
      session -> route [xlabel="Có"];
      session -> choose [xlabel="Không"];
      choose -> community;
      community -> kioskq [xlabel="Có"];
      community -> home [xlabel="Không"];
      kioskq -> kiosk [xlabel="Có"];
      kioskq -> staff [xlabel="Không"];
      home -> role;
      staff -> role;
      role -> route [xlabel="Có"];
      role -> invalid [xlabel="Không"];
      kiosk -> end;
      invalid -> retry;
      route -> screens -> end;

      { rank=same; home; staff; }
    }`
  },
  {
    name: '02-phan-loai-bo-rac',
    dot: `digraph G {${common('Hình 3.3: Lưu đồ phân loại và ghi nhận một lượt bỏ rác')}
      start [label="Bắt đầu một lượt bỏ rác"];
      method [shape=diamond, label="Xác định loại rác bằng cách nào?", width=6.0, height=1.18];
      manual [label="Chọn Hữu cơ / Vô cơ / Tái chế"];
      ai [label="Camera AI trả về loại rác\nvà độ tin cậy"];
      open [shape=parallelogram, label="Gửi lệnh mở ngăn qua BinController"];
      opened [shape=diamond, label="Mở ngăn thành công?", width=5.4, height=1.15];
      fail [shape=parallelogram, label="Hiển thị lỗi\nKhông ghi sự kiện"];
      local [label="Tạo local_id và thời gian sự kiện"];
      sqlite [label="Ghi sort_events vào SQLite\n(synced = 0)"];
      queue [label="Đưa thao tác vào hàng đợi đồng bộ"];
      flush [shape=parallelogram, label="Gọi flush() để thử gửi ngay"];
      received [shape=diamond, label="Máy chủ nhận sự kiện?", width=5.3, height=1.15];
      pending [label="Giữ trong hàng đợi để gửi lại"];
      synced [label="Đánh dấu đã đồng bộ\nTải lại điểm và mức đầy"];
      end [label="Kết thúc lượt bỏ rác"];
      start -> method;
      method:w -> manual:n [xlabel="Chọn tay"];
      method:e -> ai:n [xlabel="Camera AI"];
      manual -> open;
      ai -> open;
      open -> opened;
      opened:w -> fail:n [xlabel="Không"];
      opened:e -> local:n [xlabel="Có"];
      fail -> end;
      local -> sqlite -> queue -> flush -> received;
      received:w -> pending:n [xlabel="Chưa"];
      received:e -> synced:n [xlabel="Rồi"];
      pending -> end;
      synced -> end;
      { rank=same; manual; ai; }
      { rank=same; fail; local; }
      { rank=same; pending; synced; }
    }`
  },
  {
    name: '03-nhan-dien-ai-truc-tiep',
    dot: `digraph G {${common('Hình 3.4: Lưu đồ nhận diện rác trực tiếp bằng MobileCLIP-S0')}
      start [label="Bật camera AI trực tiếp"];
      frame [shape=parallelogram, label="Lấy khung hình (2 khung/giây)"];
      prep [label="Cắt giữa và chuẩn hóa RGB 256 × 256"];
      gpu [label="Suy luận MobileCLIP-S0 bằng GPU"];
      gpuerr [shape=diamond, label="GPU lỗi hoặc đầu ra NaN?", width=5.5, height=1.15];
      cpu [label="Chuyển sang CPU và suy luận lại"];
      score [label="So khớp cosine với 180 mô tả\nTổng hợp điểm cho 4 nhóm"];
      confident [shape=diamond, label="Là loại rác và độ tin cậy ≥ 0,8?", width=6.2, height=1.22];
      reset [label="Đặt lại bộ đếm ổn định\nXử lý khung tiếp theo"];
      count [label="Tăng bộ đếm nếu cùng loại"];
      stable [shape=diamond, label="Đủ 2 khung liên tiếp cùng loại?", width=6.0, height=1.18];
      next [shape=oval, label="Tiếp tục từ bước Lấy khung hình"];
      result [shape=parallelogram, label="Trả kết quả cho luồng bỏ rác"];
      cooldown [label="Nghỉ 5 giây (cooldown)"];
      clear [shape=diamond, label="Đã có 2 khung ‘không có rác’?", width=6.0, height=1.18];
      wait [shape=oval, label="Tiếp tục trạng thái Chờ vật rời khung"];
      end [label="Sẵn sàng nhận vật mới"];
      start -> frame -> prep -> gpu -> gpuerr;
      gpuerr:w -> cpu:n [xlabel="Có"];
      gpuerr:e -> score:n [xlabel="Không"];
      cpu -> score;
      score -> confident;
      confident:w -> reset:n [xlabel="Không"];
      confident:e -> count:n [xlabel="Có"];
      count -> stable;
      stable:w -> next:n [xlabel="Không"];
      stable:e -> result:n [xlabel="Có"];
      reset -> next;
      result -> cooldown -> clear;
      clear:e -> end:n [xlabel="Có"];
      clear:w -> wait:n [xlabel="Chưa"];

      { rank=same; cpu; score; }
      { rank=same; reset; count; }
      { rank=same; next; result; }
    }`
  },
  {
    name: '04-dong-bo-ngoai-tuyen',
    dot: `digraph G {${common('Hình 3.5: Lưu đồ bộ máy đồng bộ ngoại tuyến')}
      start [label="Kích hoạt đồng bộ"];
      online [shape=diamond, label="Thiết bị đang có mạng?", width=5.3, height=1.15];
      offline [label="Giữ nguyên hàng đợi ngoại tuyến"];
      load [label="Lấy tối đa 50 job có attempts < 5"];
      jobs [shape=diamond, label="Còn job cần xử lý?", width=5.2, height=1.12];
      send [shape=parallelogram, label="Gửi insert / update lên Supabase"];
      ok [shape=diamond, label="Gửi thành công?", width=5.0, height=1.10];
      mark [label="Đánh dấu sự kiện synced = 1"];
      remove [label="Xóa job khỏi hàng đợi"];
      neterr [shape=diamond, label="Là lỗi mạng?", width=4.6, height=1.05];
      stop [label="Dừng flush\nGiữ job để gửi lại"];
      attempts [label="Tăng attempts\nBỏ qua sau 5 lần"];
      again [shape=oval, label="Lặp lại từ bước Còn job cần xử lý"];
      end [label="Chờ lần đồng bộ tiếp theo"];
      start -> online;
      online:w -> offline:n [xlabel="Không"];
      online:e -> load:n [xlabel="Có"];
      offline -> end;
      load -> jobs;
      jobs:w -> end:n [xlabel="Không"];
      jobs:e -> send:n [xlabel="Có"];
      send -> ok;
      ok:e -> mark:n [xlabel="Có"];
      mark -> remove -> again;
      ok:w -> neterr:n [xlabel="Không"];
      neterr:e -> stop:n [xlabel="Có"];
      neterr:w -> attempts:n [xlabel="Không"];
      stop -> end;
      attempts -> again;
      { rank=same; offline; load; }
      { rank=same; mark; neterr; }
      { rank=same; stop; attempts; }
    }`
  },
  {
    name: '06-tu-dong-hoa-dieu-phoi',
    dot: `digraph G {${common('Hình 3.6: Lưu đồ tự động tạo và điều phối công việc')}
      start [label="Nhận cập nhật mức đầy"];
      urgent [shape=diamond, label="Mức đầy ≥ 80%?", width=5.0, height=1.08];
      urgenttask [label="Tạo việc khẩn hoặc nâng việc đang mở lên khẩn"];
      normal [shape=diamond, label="Mức đầy ≥ 60% và bật tự động?", width=5.8, height=1.18];
      normaltask [label="Tạo việc thường cho ca gần nhất"];
      none [label="Không tạo công việc mới"];
      unassigned [shape=diamond, label="Công việc chưa được giao?", width=5.5, height=1.15];
      assign [label="Chọn nhân viên đang trực\ncó ít việc nhất"];
      keep [label="Giữ nguyên người phụ trách"];
      notify [label="Ghi thông báo và phát Realtime\nđến đúng vai trò"];
      end [label="Kết thúc xử lý sự kiện"];
      start -> urgent;
      urgent:e -> urgenttask:n [xlabel="Có"];
      urgent:w -> normal:n [xlabel="Không"];
      normal:e -> normaltask:n [xlabel="Có"];
      normal:w -> none:n [xlabel="Không"];
      urgenttask -> unassigned;
      normaltask -> unassigned;
      none -> end;
      unassigned:e -> assign:n [xlabel="Có"];
      unassigned:w -> keep:n [xlabel="Không"];
      assign -> notify;
      keep -> notify;
      notify -> end;
      { rank=same; urgenttask; normal; }
      { rank=same; normaltask; none; }
      { rank=same; assign; keep; }
    }`
  },
  {
    name: '05-thu-gom',
    dot: `digraph G {${common('Hình 3.7: Lưu đồ nhận và hoàn tất công việc thu gom')}
      start [label="Nhân viên mở danh sách việc"];
      accepted [shape=diamond, label="Việc đã được nhận?", width=5.0, height=1.10];
      accept [label="Nhận việc\nstatus = in_progress"];
      route [shape=parallelogram, label="Xem lộ trình và mở chỉ đường"];
      collect [label="Đến thùng và thực hiện thu gom"];
      photo [shape=parallelogram, label="Chụp ảnh nghiệm thu"];
      upload [shape=diamond, label="Tải ảnh lên Storage thành công?", width=5.9, height=1.18];
      local [label="Giữ đường dẫn ảnh cục bộ"];
      remote [label="Lưu URL ảnh riêng tư"];
      complete [label="Ghi hoàn tất: status = done, thời gian,\nảnh và chất lượng phân loại", width=6.6];
      queue [label="Đưa vào hàng đợi và gọi flush()"];
      server [label="Máy chủ đặt mức đầy về 0%, gửi thông báo\nvà cộng 5 điểm nếu phân loại tốt", width=6.6];
      end [label="Hoàn tất công việc"];
      start -> accepted;
      accepted:w -> accept:n [xlabel="Chưa"];
      accepted:e -> route:n [xlabel="Rồi"];
      accept -> route;
      route -> collect -> photo -> upload;
      upload:w -> local:n [xlabel="Không"];
      upload:e -> remote:n [xlabel="Có"];
      local -> complete;
      remote -> complete;
      complete -> queue -> server -> end;
      { rank=same; local; remote; }
    }`
  },
  {
    name: '07-firmware-esp32',
    dot: `digraph G {${common('Hình 3.8: Lưu đồ xử lý lệnh mở nắp trên ESP32')}
      start [label="ESP32 chờ lệnh BLE"];
      receive [shape=parallelogram, label="Nhận chuỗi JSON qua characteristic lệnh"];
      validjson [shape=diamond, label="JSON hợp lệ và cmd = ‘open’?", width=5.8, height=1.18];
      errjson [shape=parallelogram, label="Trả status = error\nJSON hoặc lệnh không hợp lệ"];
      validbin [shape=diamond, label="Tên ngăn hợp lệ?", width=4.8, height=1.08];
      errbin [shape=parallelogram, label="Trả status = error\nTên ngăn không hợp lệ"];
      enqueue [label="Đưa lệnh vào hàng đợi FreeRTOS"];
      space [shape=diamond, label="Hàng đợi còn chỗ?", width=4.9, height=1.08];
      errqueue [shape=parallelogram, label="Trả status = error\nHàng đợi đầy"];
      dequeue [label="Main loop lấy lần lượt từng lệnh"];
      gpio [label="Chọn servo / GPIO theo loại ngăn"];
      servo [label="Mở nắp → giữ 2 giây → đóng nắp\n→ detach servo", width=6.0];
      ok [shape=parallelogram, label="Cập nhật status = ok"];
      end [label="Tiếp tục chờ lệnh BLE"];
      start -> receive -> validjson;
      validjson:w -> errjson:n [xlabel="Không"];
      validjson:e -> validbin:n [xlabel="Có"];
      validbin:w -> errbin:n [xlabel="Không"];
      validbin:e -> enqueue:n [xlabel="Có"];
      enqueue -> space;
      space:w -> errqueue:n [xlabel="Không"];
      space:e -> dequeue:n [xlabel="Có"];
      dequeue -> gpio -> servo -> ok -> end;
      errjson -> end;
      errbin -> end;
      errqueue -> end;
      { rank=same; errjson; validbin; }
      { rank=same; errbin; enqueue; }
      { rank=same; errqueue; dequeue; }
    }`
  }
];

await fs.mkdir(OUT, { recursive: true });
const viz = await instance();

for (const { name, dot } of diagrams) {
  const svg = viz.renderString(dot, { format: 'svg', engine: 'dot' });
  await fs.writeFile(path.join(OUT, `${name}.svg`), svg, 'utf8');
  await sharp(Buffer.from(svg), { density: 220 })
    .resize({ width: 2400, withoutEnlargement: false })
    .flatten({ background: '#ffffff' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, `${name}.png`));
}

const readme = `# Bộ lưu đồ SmartBin\n\n` + diagrams.map(({ name }, i) =>
  `${i + 1}. Hình 3.${i + 2}: [SVG](./${name}.svg) · [PNG](./${name}.png)`
).join('\n') + `\n\n- Lưu đồ được bố trí tự động bằng Graphviz với đường nối vuông góc.\n- Mỗi nhánh Có/Không dùng tuyến riêng; không dùng đường nối chồng lên nhau.\n- PNG rộng 2400 px để chèn vào báo cáo.\n`;
await fs.writeFile(path.join(OUT, 'README.md'), readme, 'utf8');

console.log(`Generated ${diagrams.length} corrected flowcharts in ${OUT} (SVG + PNG)`);
