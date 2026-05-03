import { AccountingChrome } from "@/components/accounting/accounting-chrome";

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  return <AccountingChrome>{children}</AccountingChrome>;
}
