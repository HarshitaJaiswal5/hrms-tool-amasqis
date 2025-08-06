export const maskAccountNumber = (accountNumber) => {
  const visibleDigits = 4;
  return '*'.repeat(accountNumber.length - visibleDigits) + accountNumber.slice(-visibleDigits);
};