"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Subject } from '@/lib/definitions';

const colors = ["#3498DB", "#2ECC71", "#F1C40F", "#E74C3C", "#9B59B6", "#1ABC9C", "#E67E22", "#34495E"];

interface AddSubjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddSubject: (subject: Omit<Subject, 'id' | 'archived' | 'userId' | 'createdAt'>) => void;
}

export function AddSubjectDialog({ isOpen, onOpenChange, onAddSubject }: AddSubjectDialogProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  const handleSubmit = () => {
    if (name.trim()) {
      onAddSubject({ name, color: selectedColor });
      onOpenChange(false);
      setName('');
      setSelectedColor(colors[0]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Subject</DialogTitle>
          <DialogDescription>
            Create a new subject to track your study sessions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Color
            </Label>
            <div className="col-span-3 flex gap-2">
              {colors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className="h-8 w-8 rounded-full border-2"
                  style={{
                    backgroundColor: color,
                    borderColor: selectedColor === color ? 'hsl(var(--primary))' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Add Subject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
