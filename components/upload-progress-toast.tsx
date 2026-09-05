"use client";

import { Progress } from "@/components/ui/progress";

type UploadProgressToastProps = {
  label: string;
  progress: number;
};

export function UploadProgressToast({
  label,
  progress,
}: UploadProgressToastProps) {
  return (
    <div className="w-[320px] rounded-xl border bg-background p-4 shadow-lg">
      <div className="mb-2 flex justify-between">
        <span className="font-medium">Uploading {label} files</span>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>

      <Progress value={progress} />
    </div>
  );
}
