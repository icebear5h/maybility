import React, { useState, useEffect } from 'react';
import { Button, Card, CardBody, CardHeader, Input } from "@nextui-org/react";
import TextArea from './TextArea';
import { useSession } from 'next-auth/react';

interface Document {
    id: string;
    title: string;
    content: string;
}

interface JournalProps {
    document: Document;
    documents: Document[];
    setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
}

const Journal: React.FC<JournalProps> = ({ document, documents, setDocuments }) => {
    const [content, setContent] = useState(document.content);
    const [title, setTitle] = useState(document.title);
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    useEffect(() => {
        setContent(document.content);
        setTitle(document.title);
    }, [document]);

    useEffect(() => {
        const handleSave = async () => {
            try {
                const response = await fetch(`/api/documents/documents`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        documentId: document.id,
                        content: content,
                        title: title,
                        updateEmbedding: false
                    }),
                });

                if (response.ok) {
                    const updatedDocument = await response.json();
                    setDocuments(documents.map(doc => doc.id === updatedDocument.id ? updatedDocument : doc));
                    console.log("Document updated successfully");
                } else {
                    console.error("Failed to update document:", response.statusText);
                }
            } catch (error) {
                console.error("Error updating document:", error);
            }
        };

        const saveTimeout = setTimeout(() => {
            handleSave();
        }, 1000); // Autosave after 1 second of inactivity

        return () => clearTimeout(saveTimeout);
    }, [content, title]);

    const handleEmbedClick = async () => {
        try {
            const response = await fetch(`/api/documents/documents`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    documentId: document.id,
                    content: content, // Send the content to the API
                    title: title,
                    updateEmbedding: true, // Trigger embedding update
                }),
            });

            if (response.ok) {
                console.log('Document and embedding updated successfully');
            } else {
                console.error('Failed to update document and embedding:', response.statusText);
            }
        } catch (error) {
            console.error('Error updating document and embedding:', error);
        }
    };

    return (
        <div style={{ display: "flex", height: "100vh" }}>
            <div style={{ flex: 1, padding: "20px", boxSizing: "border-box" }}>
                <Card style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                        <Button 
                            color="success" 
                            onPress={handleEmbedClick}
                        >
                            Embed
                        </Button>
                    </CardHeader>
                    <CardBody style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                        <TextArea value={content} onChange={setContent} />
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

export default Journal;
