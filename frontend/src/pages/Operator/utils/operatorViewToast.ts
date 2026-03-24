export type ToastState = { message: string; variant: "success" | "error" | "info"; visible: boolean };

export const createDefaultToast = (variant: ToastState["variant"]): ToastState => ({
  message: "",
  variant,
  visible: false,
});
