import { View, Text, Switch, type ViewProps, Platform } from "react-native";
import { cn } from "@/lib/utils";

type ToggleProps = ViewProps & {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function Toggle({ label, description, value, onValueChange, disabled, className, ...props }: ToggleProps) {
  return (
    <View
      className={cn("flex-row items-center justify-between py-3 min-h-[48px]", className)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      {...props}
    >
      <View className="flex-1 mr-3">
        <Text className="text-base font-medium text-text">{label}</Text>
        {description ? <Text className="text-sm text-text-secondary mt-0.5">{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#1e1e22", true: "rgba(59, 130, 246, 0.4)" }}
        thumbColor={value ? "#3b82f6" : "#63636e"}
        ios_backgroundColor="#1e1e22"
      />
    </View>
  );
}
