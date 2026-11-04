import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Message({
  children,
  variant = "error",
}: {
  children: React.ReactNode;
  variant?: "error" | "success";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3 text-sm",
        variant === "error"
          ? "bg-red-50 text-red-800"
          : "bg-emerald-50 text-emerald-800",
      )}
      role={variant === "error" ? "alert" : "status"}
    >
      {variant === "error" ? (
        <AlertCircle className="mt-0.5 shrink-0" size={18} />
      ) : (
        <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
      )}
      <span>{children}</span>
    </div>
  );
}
