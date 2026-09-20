const vietnamDateTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  dateStyle: 'short',
  timeStyle: 'short',
});

export const formatOrderDate = (value: string) => vietnamDateTime.format(new Date(value));
