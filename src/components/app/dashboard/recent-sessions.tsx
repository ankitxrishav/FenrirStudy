"use client";

import { useFirestore, useUser, useCollection } from "@/firebase";
import { Subject, Session } from "@/lib/definitions";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";

export function RecentSessions() {
  const { user } = useUser();
  const firestore = useFirestore();

  const sessionsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, "sessions"),
      where("userId", "==", user.uid),
      orderBy("startTime", "desc"),
      limit(6)
    );
  }, [user, firestore]);
  const { data: recentSessions, loading: sessionsLoading } =
    useCollection<Session>(sessionsQuery);

  const subjectIds = useMemo(() => {
    if (!recentSessions) return [];
    return [...new Set(recentSessions.map((s) => s.subjectId).filter(Boolean))];
  }, [recentSessions]);

  const subjectsQuery = useMemo(() => {
    if (!firestore || subjectIds.length === 0) return null;
    return query(
      collection(firestore, "subjects"),
      where("__name__", "in", subjectIds.slice(0, 10))
    );
  }, [firestore, subjectIds]);
  const { data: subjects, loading: subjectsLoading } =
    useCollection<Subject>(subjectsQuery);

  const subjectsMap = useMemo(() => {
    if (!subjects) return new Map<string, Subject>();
    return new Map(subjects.map((s) => [s.id, s]));
  }, [subjects]);

  const loading = sessionsLoading || subjectsLoading;

  if (loading) {
    return <p className="text-sm text-ink-muted py-4">Loading recent sessions...</p>;
  }

  if (!recentSessions || recentSessions.length === 0) {
    return (
      <p className="text-sm text-ink-muted py-4">
        No recorded sessions yet. Start a timer to log your first block.
      </p>
    );
  }

  return (
    <div className="divide-y divide-line/15">
      {recentSessions.map((session) => {
        const subject = subjectsMap.get(session.subjectId);
        const mins = Math.floor(session.duration / 60);
        const h = Math.floor(mins / 60);
        const remM = mins % 60;
        const label = h > 0 ? `${h}h ${remM}m` : mins > 0 ? `${mins}m` : "<1m";

        return (
          <div key={session.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className="h-3 w-3 rounded-full border border-line/40 shrink-0"
              style={{ backgroundColor: subject?.color || "var(--surface-muted)" }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">
                {subject?.name || "General Study"}
              </p>
              <p className="text-xs text-ink-muted">
                {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
              </p>
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums text-ink border border-line/20 bg-surface-soft px-2 py-0.5 rounded-full shrink-0">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
