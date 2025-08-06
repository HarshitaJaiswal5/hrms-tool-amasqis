export const generateId = (prefix) => {
  const randomNum = Math.floor(10000 + Math.random() * 90000); // 10000-99999
  return `${prefix}-${randomNum}`;
};