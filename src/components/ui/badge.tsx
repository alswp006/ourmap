import { View, Text, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "error" | "warning";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-accent-soft",
  success: "bg-success-soft",
  error: "bg-danger-soft",
  warning: "bg-warning/10",
};

const textStyles: Record<BadgeVariant, string> = {
  default: "text-accent",
  success: "text-success",
  error: "text-danger",
  warning: "text-warning",
};

type BadgeProps = ViewProps & {
  label: string;
  variant?: BadgeVariant;
};

export function Badge({ label, variant = "default", className, ...props }: BadgeProps) {
  return (
    <View
      className={cn("self-start rounded-full px-3 py-1", variantStyles[variant], className)}
      accessibilityRole="text"
      {...props}
    >
      <Text className={cn("text-xs font-medium", textStyles[variant])}>{label}</Text>
    </View>
  );
}
