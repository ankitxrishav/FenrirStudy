'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Habit, HabitCategory, HABIT_CATEGORY_META } from '@/lib/definitions';
import { AddHabitInput } from '@/hooks/use-habits';

// ---------------------------------------------------------
// Schema
// ---------------------------------------------------------
const habitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(60),
  category: z.enum(['exercise', 'health', 'learning', 'work', 'mindfulness', 'custom'] as const),
  frequencyType: z.enum(['daily', 'weekly']),
  weekDays: z.array(z.number()).default([]),
  reminderTime: z.string().nullable().default(null),
  startTime: z.string().nullable().default(null),
  endTime: z.string().nullable().default(null),
});

type HabitFormValues = z.infer<typeof habitSchema>;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------
// Component
// ---------------------------------------------------------
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
      name: defaultValues?.name ?? '',
      category: defaultValues?.category ?? 'custom',
      frequencyType: defaultValues?.frequencyType ?? 'daily',
      weekDays: defaultValues?.weekDays ?? [],
      reminderTime: defaultValues?.reminderTime ?? null,
      startTime: defaultValues?.startTime ?? null,
      endTime: defaultValues?.endTime ?? null,
    },
  });

  // Reset form when dialog reopens with new defaults
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: defaultValues?.name ?? '',
        category: defaultValues?.category ?? 'custom',
        frequencyType: defaultValues?.frequencyType ?? 'daily',
        weekDays: defaultValues?.weekDays ?? [],
        reminderTime: defaultValues?.reminderTime ?? null,
        startTime: defaultValues?.startTime ?? null,
        endTime: defaultValues?.endTime ?? null,
      });
    }
  }, [open, defaultValues]);

  const onSubmit = async (values: HabitFormValues) => {
    setSaving(true);
    try {
      // If we are in "all day" mode, ensure times are null
      // (This logic can be handled by the UI toggle as well)
      await onSave(values as AddHabitInput);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const frequencyType = form.watch('frequencyType');
  const startTimeVal = form.watch('startTime');
  const endTimeVal = form.watch('endTime');
  const isAllDay = !startTimeVal && !endTimeVal;

  const toggleAllDay = (allDay: boolean) => {
    if (allDay) {
      form.setValue('startTime', null);
      form.setValue('endTime', null);
    } else {
      // Set some sensible defaults if going from all-day to specific time
      form.setValue('startTime', '09:00');
      form.setValue('endTime', '10:00');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border bg-background shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black tracking-tight">
            {isEdit ? 'Edit Habit' : 'New Habit'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="habit-name" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Name
            </Label>
            <Input
              id="habit-name"
              placeholder="E.g. Fajr Prayer, Read 1 Page…"
              className="rounded-xl"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Category
            </Label>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="rounded-xl h-11 md:h-10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(HABIT_CATEGORY_META) as [HabitCategory, typeof HABIT_CATEGORY_META[HabitCategory]][]).map(
                      ([key, meta]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                          </span>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Frequency
            </Label>
            <Controller
              control={form.control}
              name="frequencyType"
              render={({ field }) => (
                <div className="flex gap-2">
                  {(['daily', 'weekly'] as const).map(ft => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => field.onChange(ft)}
                      className={cn(
                        'flex-1 py-3 md:py-2 rounded-xl text-sm font-bold capitalize border transition-all duration-200',
                        field.value === ft
                          ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                          : 'bg-muted/50 text-muted-foreground border-transparent hover:border-primary/30'
                      )}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Week day selector (only for weekly) */}
          <AnimatePresence>
            {frequencyType === 'weekly' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1.5"
              >
                <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Days of Week
                </Label>
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
                              'flex-1 aspect-square rounded-xl text-[10px] font-black uppercase transition-all duration-200',
                              selected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/50 text-muted-foreground hover:bg-accent'
                            )}
                          >
                            {d[0]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Time Window Section */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Time Availability
              </Label>
              <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/50">
                <button
                  type="button"
                  onClick={() => toggleAllDay(true)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                    isAllDay ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Day
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllDay(false)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                    !isAllDay ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Window
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!isAllDay && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="grid grid-cols-2 gap-4 overflow-hidden"
                >
                  <div className="space-y-1.5 pb-2">
                    <Label htmlFor="start-time" className="text-[10px] font-medium text-muted-foreground ml-1">
                      Start
                    </Label>
                    <Input
                      id="start-time"
                      type="time"
                      className="rounded-xl h-9"
                      {...form.register('startTime')}
                    />
                  </div>
                  <div className="space-y-1.5 pb-2">
                    <Label htmlFor="end-time" className="text-[10px] font-medium text-muted-foreground ml-1">
                      End
                    </Label>
                    <Input
                      id="end-time"
                      type="time"
                      className="rounded-xl h-9"
                      {...form.register('endTime')}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl font-bold px-6"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Habit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
