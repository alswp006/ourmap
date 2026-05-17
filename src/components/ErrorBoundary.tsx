import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text, Pressable } from "react-native";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View className="flex-1 items-center justify-center p-6 bg-[var(--bg)]">
          <Text className="text-2xl mb-2">⚠️</Text>
          <Text className="text-base font-semibold text-[var(--text)] mb-2">
            Something went wrong
          </Text>
          <Text className="text-sm text-[var(--text-muted)] text-center mb-6">
            {this.state.error?.message ?? "An unexpected error occurred"}
          </Text>
          <Pressable
            onPress={this.handleRetry}
            className="min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3"
          >
            <Text className="text-sm font-medium text-white">Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
