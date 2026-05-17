import { Modal, View, Pressable, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";
import { SafeAreaView } from "react-native-safe-area-context";

type BottomSheetProps = ViewProps & {
  open: boolean;
  onClose: () => void;
};

export function BottomSheet({ open, onClose, children, className, ...props }: BottomSheetProps) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose}>
        <View className="flex-1" />
        <Pressable
          className={cn("rounded-t-2xl bg-bg-card border-t border-border", className)}
          onPress={() => {}}
          {...props}
        >
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 rounded-full bg-border" />
          </View>
          <SafeAreaView edges={["bottom"]}>
            <View className="px-5 pb-4">{children}</View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
