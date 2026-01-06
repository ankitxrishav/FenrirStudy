export function FenrirLogo({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 6l5-3 4 2 4-2 5 3" />
            <path d="M8 3l1.5 4L12 6l2.5 1L16 3" />
            <path d="M3 6l2 9 7 6 7-6 2-9" />
            <path d="M9 14h.01" />
            <path d="M15 14h.01" />
            <path d="M10 17l2 1 2-1" />
        </svg>
    );
}