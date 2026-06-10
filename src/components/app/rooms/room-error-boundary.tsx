"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}
interface State { hasError: boolean }

export class RoomErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("RoomErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="glass border-destructive/20">
          <CardContent className="p-6 flex flex-col items-center gap-2 text-center">
            <AlertTriangle className="h-6 w-6 text-destructive/70" />
            <p className="text-sm text-muted-foreground">
              {this.props.fallbackLabel ?? "Something went wrong loading this panel."}
            </p>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
