import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User,
  Trash2,
  Minimize2,
  Maximize2
} from "lucide-react";

const ChatBot = ({ token, userName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Ciao ${userName || ""}! Sono l'assistente virtuale di Fiscal Tax Canarie. Come posso aiutarti oggi? Puoi chiedermi informazioni sui modelli tributari, le scadenze fiscali o i tuoi documenti.`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API}/chat`,
        {
          message: userMessage,
          conversation_id: conversationId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: response.data.response 
      }]);
      setConversationId(response.data.conversation_id);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Mi dispiace, si è verificato un errore. Riprova più tardi o contatta lo studio al +34 658 071 848." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (conversationId) {
      try {
        await axios.delete(`${API}/chat/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // Ignora errori
      }
    }
    setMessages([{
      role: "assistant",
      content: `Ciao ${userName || ""}! Come posso aiutarti?`
    }]);
    setConversationId(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-teal-500 hover:bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
        data-testid="chatbot-trigger"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 transition-all ${
        isMinimized ? "w-72 h-14" : "w-96 h-[500px]"
      }`}
    >
      {/* Header */}
      <div className="bg-teal-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Assistente Fiscal Tax</h3>
            {!isMinimized && (
              <p className="text-xs text-white/80">Sempre disponibile per te</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="h-[360px] p-4">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      msg.role === "user"
                        ? "bg-teal-500 text-white rounded-br-md"
                        : "bg-stone-100 text-slate-800 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-stone-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearChat}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Nuova conversazione"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Scrivi un messaggio..."
                disabled={isLoading}
                className="flex-1 border-slate-200 focus:border-teal-500 rounded-full px-4"
                data-testid="chatbot-input"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="bg-teal-500 hover:bg-teal-600 text-white rounded-full w-10 h-10 p-0"
                data-testid="chatbot-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatBot;
