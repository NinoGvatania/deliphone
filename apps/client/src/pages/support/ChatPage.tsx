import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@deliphone/ui";
import { ArrowLeft, Send } from "lucide-react";
import { supportApi } from "@/api/support";
import { useAuthStore } from "@/stores/auth";
import { colors } from "@deliphone/ui/tokens";

export function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", chatId],
    queryFn: () => supportApi.getMessages(chatId!),
    enabled: !!chatId,
    refetchInterval: 5000,
  });

  const sendMut = useMutation({
    mutationFn: () => supportApi.sendMessage(chatId!, text),
    onSuccess: () => { setText(""); queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] }); },
  });

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-ink-0 border-b border-ink-200 px-16 py-12 flex items-center gap-12">
        <button onClick={() => navigate("/support")} className="text-ink-600"><ArrowLeft size={20} /></button>
        <h2 className="body font-semibold m-0">Чат поддержки</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-16 py-16 flex flex-col gap-8">
        {isLoading ? <Spinner size={24} /> : messages.map((m: any) => (
          <div key={m.id} className={`max-w-[80%] px-12 py-8 body-sm ${m.sender_type === "user" ? "self-end bg-accent text-accent-ink" : "self-start bg-ink-100 text-ink-900"}`} style={{ borderRadius: 16 }}>
            {m.content}
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 bg-ink-0 border-t border-ink-200 px-16 py-8 flex gap-8">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение..." className="flex-1 h-40 px-12 border border-ink-200 rounded-full body-sm" style={{ outline: "none" }} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) sendMut.mutate(); }} />
        <button onClick={() => text.trim() && sendMut.mutate()} disabled={!text.trim()} style={{ width: 40, height: 40, borderRadius: 999, background: text.trim() ? colors.ink[900] : colors.ink[200], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
