"use client";

import { useState } from "react";
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
import { Subject } from "@/lib/definitions";
import { cn } from "@/lib/utils";

const colors = [
  "#F36B32",
  "#56745D",
  "#395B72",
  "#D9A84E",
  "#B94736",
  "#64537A",
  "#8B4A52",
  "#24201B",
];

interface AddSubjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddSubject: (
    subject: Omit<Subject, "id" | "archived" | "userId" | "createdAt">
  ) => void;
}

export function AddSubjectDialog({
  isOpen,
  onOpenChange,
  onAddSubject,
}: AddSubjectDialogProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  const handleSubmit = () => {
    if (name.trim()) {
      onAddSubject({ name: name.trim(), color: selectedColor });
      onOpenChange(false);
      setName("");
      setSelectedColor(colors[0]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Subject</DialogTitle>
          <DialogDescription>
            Create a study subject to organize your focus sessions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject-name">Name</Label>
            <Input
              id="subject-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Organic Chemistry"
            />
          </div>
          <div className="space-y-2">
            <Label>Color marker</Label>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((color) => {
                const active = selectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Select color ${color}`}
                    className={cn(
                      "h-9 w-9 rounded-full border transition-transform",
                      active
                        ? "border-line ring-2 ring-ink ring-offset-2 ring-offset-surface scale-105"
                        : "border-line/30"
                    )}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={!name.trim()}>
            Add Subject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
