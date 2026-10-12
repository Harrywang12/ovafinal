import { Book } from "lucide-react";

// Inline rule badge for use within text
export function RuleBadge({ 
  rule, 
  size = "sm" 
}: { 
  rule: string; 
  size?: "xs" | "sm" | "md";
}) {
  const sizeClasses = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1"
  };

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-medium bg-blue-500/20 text-blue-400 rounded ${sizeClasses[size]}`}>
      <Book className={size === "xs" ? "w-2.5 h-2.5" : size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {rule}
    </span>
  );
}
