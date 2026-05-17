import { Modal as RNModal, View, Pressable, type ModalProps as RNModalProps } from "react-native";
import { cn } from "@/lib/utils";

type ModalProps = Omit<RNModalProps, "transparent" | "animationType"> & {
  open: boolean;
  onClose: () => void;
  className?: string;
};

export function Modal({ open, onClose, children, className, ...props }: ModalProps) {
  return (
    <RNModal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      {...props}
    >
      <Pressable className="flex-1 bg-black/60 items-center justify-center p-4" onPress={onClose}>
        <Pressable
          className={cn("w-full max-w-md rounded-2xl bg-bg-card border border-border p-5", className)}
          onPress={() => {}}
        >
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
