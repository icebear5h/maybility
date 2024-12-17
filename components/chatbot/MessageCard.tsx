import { Card, CardBody, CardHeader } from '@nextui-org/react';
import { card } from '@nextui-org/theme';
import React from 'react'

interface Message {
  id: string;
  role: string;
  content: string;
}


export default function MessageCard ({ role, content }: Message) {
  return (
    <Card style={{ overflow: "hidden" }}>
      {role === "user" ? (
        <CardHeader className="text-right">{role}</CardHeader>
      ) : (
        <CardHeader className="text-left">{role}</CardHeader>
      )}
      <CardBody style={{ wordWrap: "break-word", whiteSpace: "pre-wrap" }}>{content}</CardBody>
    </Card>
  );
}