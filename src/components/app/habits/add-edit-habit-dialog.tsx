"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Habit, HabitCategory, HABIT_CATEGORY_META } from "@/lib/definitions";
import { AddHabitInput } from "@/hooks/use-habits";

const habitSchema = z.object({
  name: z.string().min(1, "Name is required").max(60),
  category: z.enum(["exercise", "health", "learning", "work", "mindfulness", "custom"] as const),
  frequencyType: z.enum(["daily", "weekly"]),
  weekDays: z.array(z.number()).default([]),
  reminderTime: z.string().nullable().default(null),
  startTime: z.string().nullable().default(null),
  endTime: z.string().nullable().default(null),
});

type HabitFormValues = z.infer<typeof habitSchema>;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AddEditHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Habit | null;
  onSave: (data: AddHabitInput) => Promise<void>;
}

export function AddEditHabitDialog({
  open,
  onOpenChange,
  defaultValues,
  onSave,
}: AddEditHabitDialogProps) {
  const isEdit = !!defaultValues;
  const [saving, setSaving] = React.useState(false);

  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      category: defaultValues?.category ?? "custom",
      frequencyType: defaultValues?.frequencyType ?? "daily",
      weekDays: defaultValues?.weekDays ?? [],
      reminderTime: defaultValues?.reminderTime ?? null,
      startTime: defaultValues?.startTime ?? null,
      endTime: defaultValues?.endTime ?? null,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues?.name ?? "",
        category: defaultValues?.category ?? "custom",
        frequencyType: defaultValues?.frequencyType ?? "daily",
        weekDays: defaultValues?.weekDays ?? [],
        reminderTime: defaultValues?.reminderTime ?? null,
        startTime: defaultValues?.startTime ?? null,
        endTime: defaultValues?.endTime ?? null,
      });
    }
  }, [open, defaultValues, form]);

  const onSubmit = async (values: HabitFormValues) => {
    setSaving(true);
    try {
      await onSave(values as AddHabitInput);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const frequencyType = form.watch("frequencyType");
  const startTimeVal = form.watch("startTime");
  const endTimeVal = form.watch("endTime");
  const isAllDay = !startTimeVal && !endTimeVal;

  const toggleAllDay = (allDay: boolean) => {
    if (allDay) {
      form.setValue("startTime", null);
      form.setValue("endTime", null);
    } else {
      form.setValue("startTime", "09:00");
      form.setValue("endTime", "10:00");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">
            {isEdit ? "Edit Habit" : "New Habit"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="habit-name" className="text-xs text-ink-muted">
              Name
            </Label>
            <Input
              id="habit-name"
              placeholder="e.g. Read 20 pages"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-danger">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-ink-muted">Category</Label>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(HABIT_CATEGORY_META) as [
                        HabitCategory,
                        (typeof HABIT_CATEGORY_META)[HabitCategory],
                      ][]
                    ).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-ink-muted">Frequency</Label>
            <Controller
              control={form.control}
              name="frequencyType"
              render={({ field }) => (
                <div className="flex gap-2">
                  {(["daily", "weekly"] as const).map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => field.onChange(ft)}
                      className={cn(
                        "flex-1 min-h-[44px] rounded-xl text-sm font-semibold capitalize border transition-colors",
                        field.value === ft
                          ? "bg-ink text-surface border-line"
                          : "bg-surface-soft text-ink-muted border-line/20 hover:border-line"
                      )}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {frequencyType === "weekly" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-ink-muted">Days of week</Label>
              <Controller
                control={form.control}
                name="weekDays"
                render={({ field }) => (
                  <div className="flex gap-1.5">
                    {DAYS.map((d, i) => {
                      const selected = field.value.includes(i);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            field.onChange(
                              selected
                                ? field.value.filter((v: number) => v !== i)
                                : [...field.value, i]
                            );
                          }}
                          className={cn(
                            "flex-1 min-h-[40px] rounded-xl font-mono text-xs font-semibold uppercase border transition-colors",
                            selected
                              ? "bg-highlight text-ink border-line"
                              : "bg-surface-soft text-ink-muted border-line/20 hover:border-line"
                          )}
                        >
                          {d[0]}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>
          )}

          <div className="space-y-3 pt-2 border-t border-line/15">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-ink-muted">Time availability</Label>
              <div className="inline-flex rounded-full border border-line/25 bg-surface-soft p-0.5">
                <button
                  type="button"
                  onClick={() => toggleAllDay(true)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                    isAllDay ? "bg-ink text-surface" : "text-ink-muted hover:text-ink"
                  )}
                >
                  All Day
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllDay(false)}
                  className={cn(
                    "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                    !isAllDay ? "bg-ink text-surface" : "text-ink-muted hover:text-ink"
                  )}
                >
                  Window
                </button>
              </div>
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="start-time" className="text-xs text-ink-muted">
                    Start
                  </Label>
                  <Input
                    id="start-time"
                    type="time"
                    className="h-10 font-mono"
                    {...form.register("startTime")}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end-time" className="text-xs text-ink-muted">
                    End
                  </Label>
                  <Input
                    id="end-time"
                    type="time"
                    className="h-10 font-mono"
                    {...form.register("endTime")}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-full bg-clay text-ink border border-line hover:bg-clay/90 font-semibold px-6"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
