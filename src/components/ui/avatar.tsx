import { View, Text, Image, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type AvatarProps = ViewProps & {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
};

const sizeStyles = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" };
const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-lg" };

export function Avatar({ src, name, size = "md", className, ...props }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      className={cn("items-center justify-center rounded-full bg-accent-soft overflow-hidden", sizeStyles[size], className)}
      accessibilityRole="image"
      accessibilityLabel={name}
      {...props}
    >
      {src ? (
        <Image source={{ uri: src }} className="h-full w-full" resizeMode="cover" />
      ) : (
        <Text className={cn("font-semibold text-accent", textSizes[size])}>{initials}</Text>
      )}
    </View>
  );
}
