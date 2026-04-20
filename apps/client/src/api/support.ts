import { api } from "./client";

export type ChatBrief = { id: string; subject: string; status: string; updated_at: string };
export type Message = { id: string; sender_type: string; content: string; created_at: string; attachments: any };

export const supportApi = {
  listChats: () => api.get<ChatBrief[]>("/client/support/chats"),
  createChat: (data: { subject: string; rental_id?: string }) => api.post<ChatBrief>("/client/support/chats", data),
  getMessages: (chatId: string) => api.get<Message[]>(`/client/support/chats/${chatId}/messages`),
  sendMessage: (chatId: string, content: string) => api.post(`/client/support/chats/${chatId}/messages`, { content }),
};
