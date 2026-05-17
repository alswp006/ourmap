import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

type TextareaProps = TextInputProps & {
  error?: boolean;
};

export function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      className={cn(
        "w-full rounded-xl border bg-bg-input px-4 py-3.5 text-base text-text min-h-[120px]",
        error ? "border-danger" : "border-border focus:border-accent",
        className,
      )}
      placeholderTextColor="#63636e"
      {...props}
    />
  );
}
