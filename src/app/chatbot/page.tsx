"use client"

import { Spacer, Link, Button, Input, Divider } from "@nextui-org/react";
import ChatWindow from "../../../components/chatbot/ChatWindow";
import React, { useState, useEffect } from 'react';

interface Message {
    id: string;
    role: string;
    content: string;
}

interface Conversation {
    id: string;
    title: string;
    userId: string;
    messages: Message[];
}

export default function Home() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [newConversationTitle, setNewConversationTitle] = useState<string>("");

    useEffect(() => {
        // Fetch documents from the API on component mount
        async function fetchConversations() {
            try {
                const response = await fetch('/api/chatbot/chatbot');
                const data = await response.json();
                setConversations(data);
            } catch (error) {
                console.error("Error fetching documents:", error);
            }
        }
        fetchConversations();
    }, []);

    const handleDocumentClick = (convo: Conversation) => {
        setSelectedConversation(convo);
    };

    const handleCreateConversation = async () => {
        if (newConversationTitle.trim() === "") {
            alert("Please enter a conversation title");
            return;
        }

        try {
            const response = await fetch('/api/chatbot/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: newConversationTitle,
                    messages: [{"role": "assistant" , "content": "Hi how may I help you today?"}]
                }),
            });

            if (response.ok) {
                const newConversation = await response.json();
                setConversations([...conversations, newConversation]);
                setNewConversationTitle(""); // Clear the input field
            } else {
                console.error("Failed to create conversation:", response.statusText);
            }
        } catch (error) {
            console.error("Error creating conversation:", error);
        }
    };

    return (
        <div style={{ display: "flex", height: "100vh" }}>
            {/* Sidebar */}
            <div style={{ width: "250px", padding: "20px", boxSizing: "border-box" }}>
                <h4>My Conversations</h4>
                <Divider className="my-5"/>
                <Spacer y={1} />
                {conversations.map((convo) => (
                    <div key={convo.id}>
                        <Link href={`#${convo.title.replace(/\s+/g, '-').toLowerCase()}`} onPress={() => handleDocumentClick(convo)}>
                            {convo.title}
                        </Link>
                        <Divider className="my-4"/>
                    </div>
                ))}
                <Spacer y={1} />
                <Input
                    placeholder="New conversation title"
                    value={newConversationTitle}
                    onChange={(e) => setNewConversationTitle(e.target.value)}
                />
                <Spacer y={0.5} />
                <Button onPress={handleCreateConversation}>
                    Create new Conversation
                </Button>
            </div>
            {/* Main Journal Area */}
            <div style={{ flex: 1, overflow: "auto" }}>
                {selectedConversation ? (
                    <ChatWindow 
                        key={selectedConversation.id} 
                        conversation={selectedConversation} 
                    />
                ) : (
                    <div style={{ padding: "20px" }}>Select a conversation to view it</div>
                )}
            </div>
        </div>
    );

}