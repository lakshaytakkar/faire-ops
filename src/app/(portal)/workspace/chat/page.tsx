"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Phone, Video, Send } from "lucide-react"

type Status = "online" | "away" | "offline"

interface Contact {
  id: string
  name: string
  role: string
  initials: string
  avatarColor: string
  status: Status
  lastMessage: string
  lastTime: string
  type: "team" | "retailer"
}

interface Message {
  id: string
  contactId: string
  text: string
  sent: boolean
  time: string
}

const STATUS_DOT: Record<Status, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-slate-400",
}

const STATUS_LABEL: Record<Status, string> = {
  online: "Online",
  away: "Away",
  offline: "Offline",
}

const CONTACTS: Contact[] = [
  // Team
  { id: "aditya", name: "Aditya", role: "Operations", initials: "AD", avatarColor: "bg-violet-600", status: "online", lastMessage: "Order VXTKE5DRYW needs review", lastTime: "10:33 AM", type: "team" },
  { id: "khushal", name: "Khushal", role: "Fulfillment", initials: "KH", avatarColor: "bg-blue-600", status: "online", lastMessage: "Shipped 3 orders today \u2713", lastTime: "9:25 AM", type: "team" },
  { id: "bharti", name: "Bharti", role: "CRM", initials: "BH", avatarColor: "bg-rose-600", status: "away", lastMessage: "New retailer from Portland signed up", lastTime: "8:45 AM", type: "team" },
  { id: "allen", name: "Allen", role: "Products", initials: "AL", avatarColor: "bg-teal-600", status: "offline", lastMessage: "Updated pricing for Toy Nest", lastTime: "Yesterday", type: "team" },
  { id: "harsh", name: "Harsh", role: "Analytics", initials: "HA", avatarColor: "bg-amber-600", status: "online", lastMessage: "Q1 report is ready for review", lastTime: "11:00 AM", type: "team" },
  // Retailers
  { id: "twilight", name: "Twilight House of Salem", role: "Retailer", initials: "TH", avatarColor: "bg-muted", status: "online", lastMessage: "When will our order ship?", lastTime: "Yesterday", type: "retailer" },
  { id: "enchanted", name: "Enchanted Shire", role: "Retailer", initials: "ES", avatarColor: "bg-muted", status: "online", lastMessage: "Can we increase our order?", lastTime: "Yesterday", type: "retailer" },
  { id: "turtle", name: "Great Turtle Toys", role: "Retailer", initials: "GT", avatarColor: "bg-muted", status: "away", lastMessage: "Thanks for the quick delivery!", lastTime: "Mar 31", type: "retailer" },
  { id: "wildflowers", name: "Wildflowers Boutique", role: "Retailer", initials: "WB", avatarColor: "bg-muted", status: "offline", lastMessage: "Need invoice for March orders", lastTime: "Mar 30", type: "retailer" },
  { id: "coast", name: "Coast & Craft Co.", role: "Retailer", initials: "CC", avatarColor: "bg-muted", status: "offline", lastMessage: "Interested in new product line", lastTime: "Mar 28", type: "retailer" },
]

const INITIAL_MESSAGES: Message[] = [
  // Aditya
  { id: "a1", contactId: "aditya", text: "Hey, order VXTKE5DRYW from Twilight House needs review. The items look unusual.", sent: false, time: "10:30 AM" },
  { id: "a2", contactId: "aditya", text: "Let me check. What\u2019s the total value?", sent: true, time: "10:32 AM" },
  { id: "a3", contactId: "aditya", text: "It\u2019s $163.50 \u2014 two butterfly lights and crystal ornaments. Flagged for manual review.", sent: false, time: "10:33 AM" },
  // Khushal
  { id: "k1", contactId: "khushal", text: "Shipped 3 orders today \u2014 Toy Nest and Bloom Decor batches", sent: false, time: "9:15 AM" },
  { id: "k2", contactId: "khushal", text: "Great work! Any tracking issues?", sent: true, time: "9:20 AM" },
  { id: "k3", contactId: "khushal", text: "All good. UPS picked up at 2pm. Tracking will update tonight.", sent: false, time: "9:22 AM" },
  { id: "k4", contactId: "khushal", text: "Perfect, update the system when numbers come in.", sent: true, time: "9:25 AM" },
  // Twilight House
  { id: "t1", contactId: "twilight", text: "Hi, we placed order VXTKE5DRYW on April 1st. When will it ship?", sent: false, time: "Yesterday" },
  { id: "t2", contactId: "twilight", text: "We\u2019re reviewing your order now. Should ship within 48 hours.", sent: true, time: "Yesterday" },
  { id: "t3", contactId: "twilight", text: "Thanks! Please send tracking once available.", sent: false, time: "Yesterday" },
]

export default function ChatPage() {
  const [activeContactId, setActiveContactId] = useState("aditya")
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [searchQuery, setSearchQuery] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeContact = CONTACTS.find((c) => c.id === activeContactId)!
  const activeMessages = messages.filter((m) => m.contactId === activeContactId)

  const teamContacts = CONTACTS.filter((c) => c.type === "team")
  const retailerContacts = CONTACTS.filter((c) => c.type === "retailer")

  const filteredTeam = teamContacts.filter(
    (c) =>
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase()),
  )
  const filteredRetailers = retailerContacts.filter(
    (c) =>
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeMessages.length])

  function handleSend() {
    const text = inputValue.trim()
    if (!text) return
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      contactId: activeContactId,
      text,
      sent: true,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, newMessage])
    setInputValue("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function renderContactRow(contact: Contact) {
    const isActive = contact.id === activeContactId
    const isRetailer = contact.type === "retailer"
    return (
      <button
        key={contact.id}
        onClick={() => setActiveContactId(contact.id)}
        className={`flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/20 transition-colors cursor-pointer ${
          isActive ? "bg-primary/5 border-l-2 border-l-primary" : ""
        }`}
      >
        <div className="relative shrink-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              isRetailer ? "bg-muted text-foreground" : `${contact.avatarColor} text-white`
            }`}
          >
            {contact.initials}
          </div>
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${STATUS_DOT[contact.status]}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{contact.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">{contact.lastTime}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{contact.lastMessage}</p>
        </div>
      </button>
    )
  }

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-lg border bg-card overflow-hidden">
      {/* Left Panel — Contact List */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold mb-2">Messages</h2>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full pl-8 text-sm rounded-md border bg-transparent px-3 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Scrollable contact list */}
        <div className="flex-1 overflow-y-auto">
          {/* Team section */}
          {filteredTeam.length > 0 && (
            <>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1">
                Team
              </div>
              {filteredTeam.map(renderContactRow)}
            </>
          )}

          {/* Retailers section */}
          {filteredRetailers.length > 0 && (
            <>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1">
                Retailers
              </div>
              {filteredRetailers.map(renderContactRow)}
            </>
          )}
        </div>
      </div>

      {/* Right Panel — Conversation View */}
      <div className="flex-1 flex flex-col">
        {/* Conversation Header */}
        <div className="px-5 py-3 border-b flex items-center gap-3">
          <div className="relative shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                activeContact.type === "retailer"
                  ? "bg-muted text-foreground"
                  : `${activeContact.avatarColor} text-white`
              }`}
            >
              {activeContact.initials}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${STATUS_DOT[activeContact.status]}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{activeContact.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[activeContact.status]}`}
              />
              {STATUS_LABEL[activeContact.status]}
              <span className="mx-1">&middot;</span>
              {activeContact.role}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="inline-flex items-center justify-center rounded-md w-8 h-8 hover:bg-muted transition-colors">
              <Phone className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="inline-flex items-center justify-center rounded-md w-8 h-8 hover:bg-muted transition-colors">
              <Video className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2.5 ${
                  msg.sent ? "bg-primary text-white ml-auto" : "bg-muted"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.sent ? "text-primary-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
          {activeMessages.length === 0 && (
            <div className="flex-1 flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">No messages yet. Start a conversation!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="px-5 py-3 border-t flex items-center gap-3">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-10 rounded-lg border px-4 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
