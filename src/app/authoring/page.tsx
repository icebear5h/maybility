"use client";

import Journal from "../../../components/authoring/Journal";
import { Spacer, Link, Button, Input, Divider } from "@nextui-org/react";
import React, { useState, useEffect } from 'react';

interface Document {
    id: string;
    title: string;
    content: string;
}

export default function Home() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
    const [newDocumentTitle, setNewDocumentTitle] = useState<string>("");

    useEffect(() => {
        // Fetch documents from the API on component mount
        async function fetchDocuments() {
            try {
                const response = await fetch('/api/documents/documents');
                const data = await response.json();
                setDocuments(data);
            } catch (error) {
                console.error("Error fetching documents:", error);
            }
        }
        fetchDocuments();
    }, []);

    const handleDocumentClick = (doc: Document) => {
        setSelectedDocument(doc);
    };

    const handleCreateDocument = async () => {
        if (newDocumentTitle.trim() === "") {
            alert("Please enter a document title");
            return;
        }

        try {
            const response = await fetch('/api/documents/documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: newDocumentTitle,
                    content: "New document content", // Initial content for the new document
                }),
            });

            if (response.ok) {
                const newDocument = await response.json();
                setDocuments([...documents, newDocument]);
                setNewDocumentTitle(""); // Clear the input field
            } else {
                console.error("Failed to create document:", response.statusText);
            }
        } catch (error) {
            console.error("Error creating document:", error);
        }
    };

    return (
        <div style={{ display: "flex", height: "100vh" }}>
            {/* Sidebar */}
            <div style={{ width: "250px", padding: "20px", boxSizing: "border-box" }}>
                <h4>Journal Documents</h4>
                <Divider className="my-5"/>
                <Spacer y={1} />
                {documents.map((doc) => (
                    <div key={doc.id}>
                        <Link href={`#${doc.title.replace(/\s+/g, '-').toLowerCase()}`} onPress={() => handleDocumentClick(doc)}>
                            {doc.title}
                        </Link>
                        <Divider className="my-4"/>
                    </div>
                ))}
                <Spacer y={1} />
                <Input
                    placeholder="New document title"
                    value={newDocumentTitle}
                    onChange={(e) => setNewDocumentTitle(e.target.value)}
                />
                <Spacer y={0.5} />
                <Button onPress={handleCreateDocument}>
                    Create Document
                </Button>
            </div>
            {/* Main Journal Area */}
            <div style={{ flex: 1, overflow: "auto" }}>
                {selectedDocument ? (
                    <Journal 
                        key={selectedDocument.id} 
                        document={selectedDocument} 
                        setDocuments={setDocuments} 
                        documents={documents} 
                    />
                ) : (
                    <div style={{ padding: "20px" }}>Select a document to view its journal entry.</div>
                )}
            </div>
        </div>
    );
}
