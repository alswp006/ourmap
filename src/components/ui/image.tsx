import { useState } from "react";
import { Image, View, ActivityIndicator, type ImageProps } from "react-native";
import { cn } from "@/lib/utils";

type AppImageProps = Omit<ImageProps, "source"> & {
  uri: string;
  fallbackColor?: string;
  className?: string;
};

export function AppImage({ uri, fallbackColor = "var(--bg-card)", className, style, ...props }: AppImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error || !uri) {
    return (
      <View className={cn("items-center justify-center bg-[var(--bg-card)]", className)} style={style}>
        <View className="h-8 w-8 rounded-full bg-[var(--border)]" />
      </View>
    );
  }

  return (
    <View className={cn("overflow-hidden", className)} style={style}>
      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-[var(--bg-card)]">
          <ActivityIndicator size="small" color="var(--text-muted)" />
        </View>
      )}
      <Image
        source={{ uri }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        className="h-full w-full"
        resizeMode="cover"
        {...props}
      />
    </View>
  );
}
