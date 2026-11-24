"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
const priorities = ["low", "medium", "high"] as const;

interface EditSubjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateSubject: (subjectId: string, updates: Partial<Subject>) => void;
  subject: Subject | null;
}

export function EditSubjectDialog({
  isOpen,
  onOpenChange,
  onUpdateSubject,
  subject,
}: EditSubjectDialogProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [priority, setPriority] = useState<Subject["priority"]>("medium");

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setSelectedColor(subject.color);
      setPriority(subject.priority || "medium");
    }
  }, [subject]);

  const handleSubmit = () => {
    if (name.trim() && subject) {
      onUpdateSubject(subject.id, {
        name: name.trim(),
        color: selectedColor,
        priority,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogDescription>
            Update the name, priority, or marker color of this subject.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(val) => setPriority(val as Subject["priority"])}
            >
              <SelectTrigger id="edit-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
