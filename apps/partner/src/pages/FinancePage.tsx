import { useEffect, useState } from "react";
import { Wallet, ArrowDownRight, ArrowUpRight, FileText } from "lucide-react";
import { Badge, Button, Card, Spinner } from "@deliphone/ui";
import { financeApi } from "@/api/partner";

type Balance = {
  current: number;
  pending: number;
  next_payout_date: string | null;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
};

type Payout = {
  id: string;
  amount: number;
  status: string;
  period_id: string;
  created_at: string;
};

export function FinancePage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [b, t, p] = await Promise.all([
          financeApi.balance(),
          financeApi.transactions(),
          financeApi.payouts(),
        ]);
        setBalance(b);
        setTransactions(t.items ?? t ?? []);
        setPayouts(p.items ?? p ?? []);
      } catch {
        // handle error silently
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-48">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-24">
      <h1 className="h2 text-ink-900">Финансы</h1>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-12">
        <Card variant="outlined" padding={20}>
          <div className="body-sm text-ink-500">Баланс</div>
          <div className="display text-ink-900 mt-8">
            {(balance?.current ?? 0).toLocaleString("ru-RU")} {"\u20BD"}
          </div>
        </Card>
        <Card variant="outlined" padding={20}>
          <div className="body-sm text-ink-500">В ожидании</div>
          <div className="display text-ink-900 mt-8">
            {(balance?.pending ?? 0).toLocaleString("ru-RU")} {"\u20BD"}
          </div>
        </Card>
        <Card variant="outlined" padding={20}>
          <div className="body-sm text-ink-500">Следующая выплата</div>
          <div className="body text-ink-900 mt-8">
            {balance?.next_payout_date
              ? new Date(balance.next_payout_date).toLocaleDateString("ru-RU")
              : "\u2014"}
          </div>
        </Card>
      </div>

      {/* Transactions */}
      <section>
        <div className="caption text-ink-500 uppercase tracking-wider mb-8">Транзакции</div>
        {transactions.length === 0 ? (
          <Card variant="outlined" padding={20}>
            <p className="body-sm text-ink-500 text-center">Нет транзакций</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-8">
            {transactions.map((tx) => (
              <Card key={tx.id} variant="outlined" padding={16}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-12">
                    {tx.amount > 0 ? (
                      <ArrowDownRight size={20} className="text-accent" />
                    ) : (
                      <ArrowUpRight size={20} className="text-danger" />
                    )}
                    <div>
                      <div className="body text-ink-900">{tx.description}</div>
                      <div className="caption text-ink-400">
                        {new Date(tx.created_at).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                  </div>
                  <div className={`body font-semibold ${tx.amount > 0 ? "text-accent-ink" : "text-danger"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString("ru-RU")} {"\u20BD"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Payouts */}
      <section>
        <div className="caption text-ink-500 uppercase tracking-wider mb-8">Выплаты</div>
        {payouts.length === 0 ? (
          <Card variant="outlined" padding={20}>
            <p className="body-sm text-ink-500 text-center">Нет выплат</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-8">
            {payouts.map((p) => (
              <Card key={p.id} variant="outlined" padding={16}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-12">
                    <Wallet size={20} className="text-ink-400" />
                    <div>
                      <div className="body text-ink-900">
                        {p.amount.toLocaleString("ru-RU")} {"\u20BD"}
                      </div>
                      <div className="caption text-ink-400">
                        {new Date(p.created_at).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <Badge
                      variant={p.status === "paid" ? "success" : "warning"}
                      size="sm"
                    >
                      {p.status === "paid" ? "Оплачено" : "В обработке"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={FileText}
                      onClick={() => window.open(`/api/v1/partner/finance/periods/${p.period_id}/act`, "_blank")}
                    >
                      Акт
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
