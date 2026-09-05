export type TransactionCurrency = "USD" | "BDT";
export type TransactionCategory = "ATM" | "POS" | "PREAUTH";

const ACCOUNT_NUMBERS: Record<
  TransactionCategory,
  Partial<Record<TransactionCurrency, string>>
> = {
  ATM: { USD: "9900832394840", BDT: "9900832418050" },
  POS: { USD: "9900832392840", BDT: "9900832428050" },
  PREAUTH: { USD: "9900832393840" },
};

export const getFilterAccountNumber = (
  currency: TransactionCurrency,
  category: TransactionCategory,
) => ACCOUNT_NUMBERS[category][currency];

