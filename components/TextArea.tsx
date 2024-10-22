import React from "react";
import { Textarea } from "@nextui-org/react";

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void; // Required prop to capture input changes
}

export default function TextArea({ value, onChange }: TextAreaProps) {
  return (
    <div style={{ flex: 1, padding: "20px", boxSizing: "border-box" }}>
      <Textarea
        placeholder="Begin Writing!"
        fullWidth
        minRows={5}
        maxRows={300}
        value={value} // Controlled component
        onChange={(e) => onChange(e.target.value)} // Update parent state
      />
    </div>
  );
}
