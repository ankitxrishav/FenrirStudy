
"use client";

import { useRef } from 'react';
import { Query, DocumentReference, queryEqual, refEqual } from 'firebase/firestore';

type FirebaseRef = Query | DocumentReference;

/**
 * A hook to memoize Firestore queries and document references.
 * This is crucial to prevent infinite loops in `useEffect` hooks
 * that depend on these references. It only updates the reference
 * when the query or path actually changes.
 *
 * @param ref The Firestore Query or DocumentReference to memoize.
 * @returns A stable, memoized version of the reference.
 */
export function useMemoFirebase<T extends FirebaseRef | null>(
  ref: T,
): T {
    const refRef = useRef<T>(ref);

    const areEqual = (prev: T, next: T): boolean => {
        if (!prev || !next) {
            return prev === next;
        }

        if (prev.type !== next.type) {
            return false;
        }

        if (prev.type === 'query' && next.type === 'query') {
            return queryEqual(prev as Query, next as Query);
        }

        if (prev.type === 'document' && next.type === 'document') {
            return refEqual(prev as DocumentReference, next as DocumentReference);
        }

        return false;
    }

    if (!areEqual(refRef.current, ref)) {
        refRef.current = ref;
    }

    return refRef.current;
}
