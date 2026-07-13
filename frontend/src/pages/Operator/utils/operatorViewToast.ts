export type ToastState = {
  message: string;
  variant: "success" | "error" | "info";
  visible: boolean;
  actionLink?: { label: string; href: string };
};

export const createDefaultToast = (variant: ToastState["variant"]): ToastState => ({
  message: "",
  variant,
  visible: false,
});
