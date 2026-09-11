import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "./App.css";
import { createStarterChat, readChats, messagesForApi, STORAGE_KEY } from "./chat-state.js";
import { MAX_MESSAGE_LENGTH, validateMessages } from "../shared/chat.js";
import { requestApi, streamReply } from "./api.js";
import MessageContent from "./MessageContent.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import ModelSelector from "./ModelSelector.jsx";
import HistoryTools from "./HistoryTools.jsx";
import DocumentPanel from "./DocumentPanel.jsx";
import ChatTitle from "./ChatTitle.jsx";

gsap.registerPlugin(useGSAP);

const quickPrompts = [
  "Explain React like I am 12",
  "Build me a 30-day coding roadmap",
  "Debug this API idea",
  "Suggest a premium SaaS project",
];

function loadInitialState() {
  try {
    return { chats: readChats(localStorage), storageError: "" };
  } catch {
    return {
      chats: [createStarterChat()],
      storageError: "Saved chats could not be loaded. Existing stored data has been left untouched; new changes will not be saved.",
    };
  }
}

function App() {
  const shellRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [initialState] = useState(loadInitialState);
  const [chats, setChats] = useState(initialState.chats);
  const [activeChatId, setActiveChatId] = useState(initialState.chats[0]?.id || null);
  const [storageError, setStorageError] = useState(initialState.storageError);
  const [connection, setConnection] = useState("Checking backend…");
  const [chatErrors, setChatErrors] = useState({});
  const requestInFlight = useRef(false);
  const [pendingChatId, setPendingChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [inputText, setInputText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const abortRequest = useRef(null);
  const [draftReply, setDraftReply] = useState("");
  useEffect(() => () => abortRequest.current?.abort(), []);

  async function checkConnection() {
    setConnection("Checking backend…");
    try {
      const data = await requestApi("/api/health");
      if (typeof data.configured !== "boolean") throw new Error("Unexpected health response");
      setConnection(data.configured ? "Provider configured · not verified" : "AI setup needed");
    } catch {
      setConnection("Backend unavailable");
    }
  }

  useEffect(() => { checkConnection(); }, []);

  function setChatError(chatId, error) {
    setChatErrors((current) => ({ ...current, [chatId]: error }));
  }

  useGSAP(
    function () {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".sidebar-panel > *", {
        y: 18,
        opacity: 0,
        duration: 0.7,
        stagger: 0.055,
        ease: "power3.out",
      });

      gsap.from(".hero-card", {
        scale: 0.965,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });

    },
    { scope: shellRef }
  );

  useEffect(
    function () {
      if (initialState.storageError) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
        setStorageError("");
      } catch {
        setStorageError("Your browser could not save these changes. Keep this tab open to avoid losing them.");
      }
    },
    [chats, initialState.storageError]
  );

  useEffect(
    function () {
      if (!activeChatId && chats.length > 0) {
        setActiveChatId(chats[0].id);
      }
    },
    [activeChatId, chats]
  );

  useEffect(
    function () {
      const container = messagesEndRef.current?.parentElement;
      const hasUserMessages = chats.find((chat) => chat.id === activeChatId)?.messages.some((message) => message.sender === "user");
      container?.scrollTo({ top: hasUserMessages ? container.scrollHeight : 0, behavior: "instant" });
    },
    [chats, activeChatId, isLoading, draftReply]
  );

  useEffect(
    function () {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rows = shellRef.current?.querySelectorAll(".message-row");
      const lastRow = rows?.[rows.length - 1];

      if (lastRow) {
        gsap.fromTo(
          lastRow,
          { y: 10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.34, ease: "power2.out" }
        );
      }
    },
    [chats, activeChatId, isLoading]
  );

  const activeChat = chats.find(function (chat) {
    return chat.id === activeChatId;
  });

  const activeMessageCount = activeChat?.messages.filter((message, index) => !(index === 0 && message.kind === "notice")).length || 0;
  const hasConversation = activeChat?.messages.some((message) => message.sender === "user");

  const filteredChats = useMemo(
    function () {
      return chats.filter(function (chat) {
        return chat.title.toLowerCase().includes(searchText.toLowerCase());
      });
    },
    [chats, searchText]
  );

  function appendBotMessage(chatId, text, kind = "message", model) {
    setChats(function (currentChats) {
      return currentChats.map(function (chat) {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, { sender: "bot", text, kind, ...(model ? { model } : {}) }],
          };
        }

        return chat;
      });
    });
  }

  async function getRealApiAdvice() {
    if (!activeChat || requestInFlight.current) {
      return;
    }

    requestInFlight.current = true;
    setIsLoading(true);
    setPendingChatId(activeChatId);
    setChatError(activeChatId, null);

    try {
      const data = await requestApi("/api/advice");
      if (typeof data.advice !== "string") throw new Error("No advice was returned.");
      appendBotMessage(activeChatId, `Random advice (not AI): ${data.advice}`, "notice");
    } catch (error) {
      setChatError(activeChatId, { text: error.message });
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
      setPendingChatId(null);
    }
  }

  function createNewChat() {
    const newChat = createStarterChat("A blank conversation is ready. What shall we refine first?");

    setChats((current) => [newChat, ...current]);
    setActiveChatId(newChat.id);
    setInputText("");
    setSearchText("");
    setSidebarOpen(false);
  }

  async function sendMessage(customText, retry = false) {
    if (!activeChat || requestInFlight.current) {
      return;
    }
    if (!selectedModel) {
      setChatError(activeChatId, { text: "Load the model list before sending a message." });
      return;
    }

    const trimmedInput = (customText || inputText).trim();

    if (!retry && trimmedInput === "") {
      return;
    }

    const userMessage = {
      sender: "user",
      text: trimmedInput,
      ...(activeChat.document ? { documentName: activeChat.document.name } : {}),
    };

    const updatedMessages = retry ? activeChat.messages : [...activeChat.messages, userMessage];
    const apiMessages = messagesForApi(updatedMessages);
    const validationError = validateMessages(apiMessages);
    if (validationError) {
      setChatError(activeChatId, { text: validationError });
      return;
    }

    setChats(function (currentChats) {
      return currentChats.map(function (chat) {
        if (chat.id === activeChatId) {
          const updatedTitle =
            chat.title === "New Chat" && !retry ? trimmedInput.slice(0, 34) : chat.title;

          return {
            ...chat,
            title: updatedTitle,
            messages: updatedMessages,
          };
        }

        return chat;
      });
    });

    if (!retry) setInputText("");
    requestInFlight.current = true;
    setIsLoading(true);
    setPendingChatId(activeChatId);
    setChatError(activeChatId, null);
    const controller = new AbortController();
    abortRequest.current = controller;
    setDraftReply("");
    let partial = "";
    try {
      await streamReply({ messages: apiMessages, model: selectedModel, document: activeChat.document }, controller.signal, (delta) => {
        partial += delta;
        setDraftReply(partial);
      });
      if (!partial.trim()) throw new Error("The provider returned no text. Please retry.");
      appendBotMessage(activeChatId, partial, "message", selectedModel);
      setConnection("AI reply verified this session");
    } catch (error) {
      if (partial) appendBotMessage(activeChatId, partial, "partial", selectedModel);
      const stopped = controller.signal.aborted;
      setChatError(activeChatId, { text: stopped ? "Generation stopped. Partial text is kept but excluded from future AI context." : error.message, retry: true });
      setConnection(stopped ? "Generation stopped" : "AI request failed · check setup");
    } finally {
      abortRequest.current = null;
      setDraftReply("");
      requestInFlight.current = false;
      setIsLoading(false);
      setPendingChatId(null);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage();
    }
  }

  function deleteChat(chatId) {
    if (chatId === pendingChatId) abortRequest.current?.abort();
    const filtered = chats.filter(function (chat) {
      return chat.id !== chatId;
    });

    setChats(filtered);

    if (activeChatId === chatId) {
      setActiveChatId(filtered[0]?.id || null);
    }
  }

  return (
    <main className="app-shell" ref={shellRef}>
      <button className="mobile-sidebar-toggle ghost-action" aria-expanded={sidebarOpen} aria-controls="conversations" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? "Close conversations" : `Conversations (${chats.length})`}
      </button>
      <aside id="conversations" className={`sidebar-panel${sidebarOpen ? " is-open" : ""}`}>
        <div className="brand-mark">
          <div className="brand-symbol">A</div>
          <div>
            <h2>Advance Online Chatbot</h2>
            <p>Your personal AI workspace</p>
          </div>
        </div>

        <button className="primary-action" onClick={createNewChat}>
          <span aria-hidden="true">＋ </span>New Chat
        </button>

        <label className="search-wrap">
          <span>Search</span>
          <input
            className="search"
            type="text"
            placeholder="Find a conversation"
            value={searchText}
            onChange={function (event) {
              setSearchText(event.target.value);
            }}
          />
        </label>

        <div className="mini-grid">
          <div>
            <span>Chats</span>
            <strong>{chats.length}</strong>
          </div>
          <div>
            <span>Messages</span>
            <strong>{activeMessageCount}</strong>
          </div>
        </div>

        <div className="chat-list">
          {filteredChats.length === 0 ? (
            <p className="empty">No chats found</p>
          ) : (
            filteredChats.map(function (chat) {
              return (
                <div
                  key={chat.id}
                  className={chat.id === activeChatId ? "chat-item active" : "chat-item"}
                >
                  <button
                    className="chat-title"
                    onClick={function () {
                      setActiveChatId(chat.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <span>{chat.title}</span>
                    <small>{chat.messages.filter((message, index) => !(index === 0 && message.kind === "notice")).length} messages</small>
                  </button>

                  <button
                    className="delete-btn"
                    aria-label={`Delete ${chat.title}`}
                    onClick={function () {
                      deleteChat(chat.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="craft-card">
          <span>YOUR WORKSPACE</span>
          <strong>Make room for your next idea.</strong>
          <p>History stays in this browser. Messages are sent to your configured AI provider.</p>
        </div>
      </aside>

      <section className="chat-panel">
        <div className="workspace-bar">
          <span>Advance <span className="workspace-label">/ Chat workspace</span></span>
          <ThemeToggle />
        </div>
        <ModelSelector value={selectedModel} onChange={setSelectedModel} disabled={isLoading} />
        <HistoryTools chats={chats} disabled={isLoading} onImport={(incoming) => {
          setChats((current) => [...incoming, ...current]); setActiveChatId(incoming[0].id); setSearchText("");
        }} />
        {abortRequest.current && <button className="stop-button" onClick={() => abortRequest.current?.abort()}>Stop generation</button>}
        {storageError && <p className="error-notice" role="alert">{storageError}</p>}
        {activeChat ? (
          <>
            <header className="topbar">
              <div>
                <p>Current conversation</p>
                <ChatTitle key={activeChatId} title={activeChat.title} onRename={(title) => setChats((current) => current.map((chat) => chat.id === activeChatId ? { ...chat, title } : chat))} />
              </div>
              <div className="topbar-actions">
                <div className="status-pill" role="status">
                  {connection}
                </div>
                <button className="ghost-action" onClick={checkConnection} disabled={isLoading}>Check connection</button>
                <button className="ghost-action" onClick={getRealApiAdvice} disabled={isLoading}>
                  Random advice
                </button>
              </div>
            </header>

            <div className={`messages${hasConversation ? "" : " is-empty"}`}>
              {!hasConversation && <section className="hero-card">
                <div className="hero-copy">
                  <div className="welcome-symbol" aria-hidden="true">A</div>
                  <p className="quiet-label">A little curiosity goes a long way</p>
                  <h2>
                    What will you explore today?
                  </h2>
                  <p>
                    Ask a question, untangle some code, or turn a rough idea into a plan.
                  </p>
                </div>

                <div className="quick-prompts">
                  {quickPrompts.map(function (prompt) {
                    return (
                      <button
                        key={prompt}
                        onClick={function () {
                          sendMessage(prompt);
                        }}
                        disabled={isLoading}
                      >
                        {prompt}
                      </button>
                    );
                  })}
                </div>
              </section>}

              {activeChat.messages.map(function (message, index) {
                if (index === 0 && message.kind === "notice") return null;
                return (
                  <div key={index} className={`message-row ${message.sender}`}>
                    <div className="avatar">{message.sender === "user" ? "You" : "AI"}</div>
                    <div className="message-stack">
                      <div className="message-meta">
                        {message.sender === "user" ? "You" : "Advance Online Chatbot"}
                        {typeof message.model === "string" && message.model && <span className="reply-model"> · {message.model}</span>}
                        {message.kind === "partial" && <span> · Partial reply</span>}
                        {typeof message.documentName === "string" && <span> · Document: {message.documentName}</span>}
                      </div>
                      <div className="message-bubble">
                        <MessageContent text={message.text} markdown={message.sender === "bot"} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && pendingChatId === activeChatId && (
                <div className="message-row bot">
                  <div className="avatar">AI</div>
                  <div className="message-stack">
                    <div className="message-meta">{draftReply ? "Receiving reply…" : "Advance Online Chatbot is thinking"}</div>
                    {draftReply ? <div className="message-bubble streaming-text">{draftReply}</div> : <div className="message-bubble typing">
                      <span />
                      <span />
                      <span />
                    </div>}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="composer-wrap">
              <DocumentPanel key={activeChatId} document={activeChat.document} disabled={isLoading} onChange={(document) => setChats((current) => current.map((chat) => chat.id === activeChatId ? { ...chat, document } : chat))} />
              {chatErrors[activeChatId] && <div className="error-notice" role="alert">
                <p>{chatErrors[activeChatId].text}</p>
                {chatErrors[activeChatId].retry && <button className="ghost-action" disabled={isLoading} onClick={() => sendMessage(undefined, true)}>Retry last message</button>}
              </div>}
              <div className="composer">
                <textarea
                  aria-label="Message"
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Your message…"
                  value={inputText}
                  disabled={isLoading}
                  rows="1"
                  onChange={function (event) {
                    setInputText(event.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                />

                <button
                  onClick={function () {
                    sendMessage();
                  }}
                  disabled={isLoading || !inputText.trim()}
                >
                  {isLoading ? "Sending" : "Send"}
                </button>
              </div>
              <p className="composer-hint">AI can make mistakes. Check important answers. <span>Shift+Enter for a new line · {inputText.length}/{MAX_MESSAGE_LENGTH}</span></p>
            </div>
          </>
        ) : (
          <div className="no-chat">
            <div className="brand-symbol large">A</div>
            <h1>No chat selected</h1>
            <p>Create a fresh conversation to begin.</p>
            <button onClick={createNewChat}>Start New Chat</button>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
