export const formatVND = (digits) =>
  digits ? Number(digits).toLocaleString("vi-VN") : "";
export const parseVND = (value) => value.replace(/\D/g, "");
