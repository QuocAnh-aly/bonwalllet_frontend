import Dexie from "dexie";

// IndexedDB qua Dexie cho chế độ offline.
// - cache    : kết quả GET đã mã hóa (key = định danh logic của request)
// - syncQueue: các mutation tạo khi offline, chờ gửi lại khi có mạng
export const db = new Dexie("MoneyFlowOffline");

db.version(1).stores({
  cache: "key, updatedAt",
  syncQueue: "++id, createdAt",
});
