import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, CardBody, CardHeader, Input } from "@nextui-org/react";
import TextArea from './TextArea';
import MessageCard from './MessageCard';
import { useSession } from 'next-auth/react';

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
interface ConversationProps {
    conversation: Conversation;
}

const ChatWindow: React.FC<ConversationProps> = ({conversation}) => {
    const [userMessage, setUserMessage] = useState<string>("");
    const [title, setTitle] = useState(conversation.title);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [messages, setMessages] = useState(conversation?.messages || [{role: "assistant" , content: "How may I help you today?"}]);
    useEffect(() => {
        setIsEditingTitle(false);
        setTitle(conversation.title);
        setMessages(conversation?.messages || [{role: "assistant" , content: "How may I help you today?"}]);
        console.log("Message IDs:", messages.map((msg) => msg.id));
    }, [conversation]);


    const queryLLM = async () => {
        try {
            const userResponse  = await fetch(`/api/chatbot/chatbot`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userMessage: userMessage,
                    conversationId: conversation.id,
                }),
            });
            if (userResponse.ok) {
                const newUserMessage = await userResponse.json();
                setMessages([...messages, newUserMessage]);
                console.log("Conversation updated successfully");
            } else {
                console.error("Failed to update conversation with user message:", userResponse.statusText);
            }
            const AiResponse = await fetch(`http://0.0.0.0:8000/chatbot/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userMessage: userMessage,
                    userId: conversation.userId,
                    conversationId: conversation.id,
                    title: title,
                }),
            });

            if (AiResponse.ok) {
                const newAiMessage = await AiResponse.json();
                setMessages([...messages, newAiMessage]);
                console.log("Conversation updated successfully with AI message");
            } else {
                console.error("Failed to update conversation with ai message:", AiResponse.statusText);
            }
        } catch (error) {
            console.error("Error updating conversation:", error);
        }
    };

    return (
        <div style={{ display: "flex", height: "100vh" , flexDirection:"column"}}>
            <div style={{ flex: 1, padding: "20px", height: "65vh", overflowY: "auto"}}>
                <Card style={{ height: "auto", overflowY: "auto"}}>
                    <CardHeader style={{justifyContent: "space-between", alignItems: "center" }}>
                        {isEditingTitle ? (
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={() => setIsEditingTitle(false)}
                                autoFocus
                            />
                        ) : (
                            <h6 onClick={() => setIsEditingTitle(true)} style={{ cursor: "pointer" }}>
                                {title}
                            </h6>
                        )}
                    </CardHeader>
                    <CardBody style={{overflowY: "hidden", padding: "10px" }}>
                        {messages.map((msg) => (
                            <MessageCard
                                key={msg.id} 
                                id={msg.id}
                                role ={msg.role}
                                content={msg.content}
                            />
                        ))}
                    </CardBody>
                </Card>
            </div>
            <div style={{ padding: "10px", borderTop: "1px solid #eaeaea", display: "flex", alignItems: "center" }} onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent newline
                    queryLLM();
                    setUserMessage(''); // Clear the TextArea
                }
            }}>
                <TextArea value={userMessage} onChange={setUserMessage} />
                <Button onPress={() => {queryLLM(); setUserMessage('');}}> Send </Button>
            </div>
        </div>
    );
};

export default ChatWindow;
