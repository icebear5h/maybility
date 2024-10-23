import { Spacer, Link, Button, Input, Divider } from "@nextui-org/react";
import React, { useState, useEffect } from 'react';

interface Message {
    id: string;
    role: string;
    content: string;
}

interface Conversation {
    id: string;
    messages: Message[];
}

export default function Home() {
    

}