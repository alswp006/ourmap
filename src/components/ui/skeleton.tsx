import { View, type ViewProps, type DimensionValue } from "react-native";
import { cn } from "@/lib/utils";

type SkeletonProps = ViewProps & {
  width?: DimensionValue;
  height?: DimensionValue;
  rounded?: boolean;
};

export function Skeleton({ width, height, rounded, className, style, ...props }: SkeletonProps) {
  return (
    <View
      className={cn("animate-pulse bg-bg-elevated", rounded ? "rounded-full" : "rounded-xl", className)}
      style={[{ width: width ?? "100%", height: height ?? 16 }, style]}
      {...props}
    />
  );
}
