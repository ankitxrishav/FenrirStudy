"use client";

import { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const colors = ["#3498DB", "#2ECC71", "#F1C40F", "#E74C3C", "#9B59B6", "#1ABC9C", "#E67E22", "#34495E"];
const priorities = ['low', 'medium', 'high'] as const;

interface EditSubjectDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onUpdateSubject: (subjectId: string, updates: Partial<Subject>) => void;
    subject: Subject | null;
}

export function EditSubjectDialog({ isOpen, onOpenChange, onUpdateSubject, subject }: EditSubjectDialogProps) {
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(colors[0]);
    const [priority, setPriority] = useState<Subject['priority']>('medium');

    useEffect(() => {
        if (subject) {
            setName(subject.name);
            setSelectedColor(subject.color);
            setPriority(subject.priority || 'medium');
        }
    }, [subject]);

    const handleSubmit = () => {
        if (name.trim() && subject) {
            onUpdateSubject(subject.id, { name, color: selectedColor, priority });
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Subject</DialogTitle>
                    <DialogDescription>
                        Update the details of your study subject.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-name" className="text-right">
                            Name
                        </Label>
                        <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-priority" className="text-right">
                            Priority
                        </Label>
                        <Select value={priority} onValueChange={(val) => setPriority(val as Subject['priority'])}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                {priorities.map((p) => (
                                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-color" className="text-right">
                            Color
                        </Label>
                        <div className="col-span-3 flex flex-wrap gap-2">
                            {colors.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className="h-8 w-8 rounded-full border-2 transition-all"
                                    style={{
                                        backgroundColor: color,
                                        borderColor: selectedColor === color ? 'hsl(var(--primary))' : 'transparent',
                                        transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
