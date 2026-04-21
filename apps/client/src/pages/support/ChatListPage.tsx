import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Input, Spinner } from "@deliphone/ui";
import { ArrowLeft, Plus, MessageCircle, ChevronRight } from "lucide-react";
import { supportApi, type ChatBrief } from "@/api/support";

export function ChatListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState("");

  const { data: chats, isLoading } = useQuery({
    queryKey: ["support-chats"],
    queryFn: () => supportApi.listChats(),
  });

  const createChat = useMutation({
    mutationFn: (data: { subject: string }) => supportApi.createChat(data),
    onSuccess: (chat) => {
      queryClient.invalidateQueries({ queryKey: ["support-chats"] });
      navigate(`/support/${chat.id}`);
    },
  });

  const statusLabel: Record<string, string> = {
    open: "Открыт",
    closed: "Закрыт",
    pending: "Ожидает",
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="sticky top-0 z-10 bg-ink-0 border-b border-ink-200 px-16 py-12 flex items-center gap-12">
        <button onClick={() => navigate("/profile")} className="text-ink-600">
          <ArrowLeft size={20} />
        </button>
        <h2 className="body font-semibold m-0 flex-1">Чат поддержки</h2>
      </div>

      <div className="px-16 py-20 flex flex-col gap-16 max-w-[480px] mx-auto">
        {!showNew ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setShowNew(true)}
          >
            <Plus size={18} />
            Новое обращение
          </Button>
        ) : (
          <Card variant="outlined" padding={16}>
            <div className="flex flex-col gap-12">
              <p className="body font-semibold m-0">Тема обращения</p>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Опиши проблему кратко"
              />
              <div className="flex gap-8">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => { setShowNew(false); setSubject(""); }}
                >
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={subject.trim().length < 3}
                  loading={createChat.isPending}
                  onClick={() => createChat.mutate({ subject: subject.trim() })}
                >
                  Создать
                </Button>
              </div>
            </div>
          </Card>
        )}

        {isLoading && (
          <div className="flex justify-center py-32">
            <Spinner size={32} />
          </div>
        )}

        {chats && chats.length === 0 && (
          <div className="flex flex-col items-center gap-16 py-32">
            <MessageCircle size={48} className="text-ink-300" />
            <p className="body text-ink-500 text-center m-0">
              У тебя пока нет обращений
            </p>
          </div>
        )}

        {chats?.map((chat: ChatBrief) => (
          <button
            key={chat.id}
            onClick={() => navigate(`/support/${chat.id}`)}
            className="w-full text-left bg-ink-0 rounded-12 border border-ink-200 px-16 py-12 flex items-center gap-12 hover:bg-ink-50 transition-colors"
          >
            <MessageCircle size={20} className="text-ink-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="body m-0 truncate">{chat.subject}</p>
              <p className="caption text-ink-400 m-0">
                {statusLabel[chat.status] ?? chat.status}
                {" \u00b7 "}
                {new Date(chat.updated_at).toLocaleDateString("ru-RU")}
              </p>
            </div>
            <ChevronRight size={16} className="text-ink-300 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
