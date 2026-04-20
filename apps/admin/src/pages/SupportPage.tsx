import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Input,
  List,
  Space,
  Tag,
  Typography,
} from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const { Title, Text } = Typography;
const { TextArea } = Input;

type QueueChat = {
  id: string;
  user_id: string | null;
  partner_user_id: string | null;
  user_name: string | null;
  subject: string | null;
  status: string;
  priority: string;
  assigned_admin_id: string | null;
  last_message_preview: string | null;
  updated_at: string | null;
};

type Message = {
  id: string;
  sender_type: string | null;
  sender_id: string | null;
  content: string | null;
  created_at: string;
};

type ChatDetail = {
  id: string;
  user_id: string | null;
  partner_user_id: string | null;
  subject: string | null;
  status: string;
  priority: string;
  assigned_admin_id: string | null;
  created_at: string;
  messages: Message[];
};

export function SupportPage() {
  const qc = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  const { data: queues } = useQuery({
    queryKey: ["admin", "support", "queues"],
    queryFn: () => api<QueueChat[]>("/support/queues"),
    refetchInterval: 5000,
  });

  const { data: chatDetail } = useQuery({
    queryKey: ["admin", "support", "chat", activeChatId],
    queryFn: () => api<ChatDetail>(`/support/chats/${activeChatId}`),
    enabled: !!activeChatId,
    refetchInterval: 5000,
  });

  const assignMut = useMutation({
    mutationFn: (chatId: string) =>
      api(`/support/chats/${chatId}/assign`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
  });

  const closeMut = useMutation({
    mutationFn: (chatId: string) =>
      api(`/support/chats/${chatId}/close`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
      setActiveChatId(null);
    },
  });

  const sendMut = useMutation({
    mutationFn: (payload: { chatId: string; content: string }) =>
      api(`/support/chats/${payload.chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: payload.content }),
      }),
    onSuccess: () => {
      setMessageText("");
      qc.invalidateQueries({ queryKey: ["admin", "support", "chat", activeChatId] });
    },
  });

  const handleSend = () => {
    if (!activeChatId || !messageText.trim()) return;
    sendMut.mutate({ chatId: activeChatId, content: messageText.trim() });
  };

  const chats = queues ?? [];

  return (
    <>
      <Title level={2} style={{ marginTop: 0 }}>
        Поддержка
      </Title>

      <div style={{ display: "flex", gap: 16, height: "calc(100vh - 160px)" }}>
        {/* Left panel — chat list */}
        <div
          style={{
            width: "33%",
            minWidth: 300,
            overflowY: "auto",
            borderRight: "1px solid #f0f0f0",
            paddingRight: 12,
          }}
        >
          <List
            dataSource={chats}
            renderItem={(chat) => (
              <List.Item
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                style={{
                  cursor: "pointer",
                  background: chat.id === activeChatId ? "#f6ffed" : undefined,
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                <List.Item.Meta
                  avatar={<Avatar>{(chat.user_name ?? "?")[0]}</Avatar>}
                  title={
                    <Space>
                      <Text strong>{chat.user_name ?? "Пользователь"}</Text>
                      <Tag color={chat.priority === "high" ? "lime" : "default"}>
                        {chat.priority === "high" ? "Удобно" : "обычный"}
                      </Tag>
                      <Tag
                        color={
                          chat.status === "open"
                            ? "blue"
                            : chat.status === "in_progress"
                              ? "orange"
                              : "default"
                        }
                      >
                        {chat.status}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      {chat.subject && (
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                          {chat.subject}
                        </Text>
                      )}
                      <Text
                        type="secondary"
                        ellipsis
                        style={{ fontSize: 12, display: "block" }}
                      >
                        {chat.last_message_preview ?? "..."}
                      </Text>
                      {chat.updated_at && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(chat.updated_at).toLocaleString("ru-RU")}
                        </Text>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>

        {/* Right panel — active chat */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {chatDetail ? (
            <>
              {/* Header */}
              <div
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Space>
                  <Text strong>{chatDetail.subject ?? "Чат"}</Text>
                  <Tag color={chatDetail.priority === "high" ? "lime" : "default"}>
                    {chatDetail.priority}
                  </Tag>
                  <Tag>{chatDetail.status}</Tag>
                </Space>
                <Space>
                  {chatDetail.status === "open" && (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => assignMut.mutate(chatDetail.id)}
                      loading={assignMut.isPending}
                    >
                      Взять в работу
                    </Button>
                  )}
                  {chatDetail.status !== "closed" && (
                    <Button
                      danger
                      size="small"
                      onClick={() => closeMut.mutate(chatDetail.id)}
                      loading={closeMut.isPending}
                    >
                      Закрыть
                    </Button>
                  )}
                </Space>
              </div>

              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {chatDetail.messages.map((msg) => {
                  const isAdmin = msg.sender_type === "admin";
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: isAdmin ? "flex-end" : "flex-start",
                        maxWidth: "70%",
                        background: isAdmin ? "#f6ffed" : "#f5f5f5",
                        borderRadius: 12,
                        padding: "8px 12px",
                      }}
                    >
                      <Text style={{ display: "block" }}>{msg.content}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(msg.created_at).toLocaleTimeString("ru-RU")}
                      </Text>
                    </div>
                  );
                })}
              </div>

              {/* Input */}
              {chatDetail.status !== "closed" && (
                <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
                  <TextArea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Сообщение..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="primary"
                    onClick={handleSend}
                    loading={sendMut.isPending}
                    disabled={!messageText.trim()}
                  >
                    Отправить
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text type="secondary">Выберите чат из списка слева</Text>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
