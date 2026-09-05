"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadList,
  FileUploadItem,
  FileUploadItemPreview,
  FileUploadItemMetadata,
  FileUploadItemDelete,
  FileUploadItemProgress,
  FileUploadClear,
} from "@/components/ui/file-upload";

import { UploadProgressToast } from "@/components/upload-progress-toast";
import { TransactionArea } from "@/types/preview";

type DataUploadProps = {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  label: string;
  dataType: "cbs" | "bo" | "gl" | "fe" | "ep";
  area?: TransactionArea;
};

export function DataUpload({
  files,
  setFiles,
  label,
  dataType,
  area = "issuing",
}: DataUploadProps) {
  const [uploading, setUploading] = React.useState(false);

  const uploadFiles = React.useCallback(() => {
    if (!files.length) {
      toast.warning("Please select at least one file.");
      return;
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    setUploading(true);

    let progress = 0;

    const toastId = toast.custom(
      () => (
        <UploadProgressToast
          label={label}
          progress={progress}
        />
      ),
      {
        duration: Infinity,
        position: "bottom-right",
      }
    );

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;

      progress = Math.round(
        (event.loaded / event.total) * 100
      );

      toast.custom(
        () => (
          <UploadProgressToast
            label={label}
            progress={progress}
          />
        ),
        {
          id: toastId,
          duration: Infinity,
          position: "bottom-right",
        }
      );
    };

    xhr.onload = () => {
      setUploading(false);
      toast.dismiss(toastId);

      if (xhr.status >= 200 && xhr.status < 300) {
        toast.success("Files uploaded successfully.", {
          position: "bottom-right",
        });

        setFiles([]);
        return;
      }

      toast.error("Upload failed.", {
        position: "bottom-right",
      });
    };

    xhr.onerror = () => {
      setUploading(false);
      toast.dismiss(toastId);

      toast.error("Something went wrong. Please try again.", {
        position: "bottom-right",
      });
    };

    xhr.open("POST", `/api/${area}/upload?type=${dataType}`);
    xhr.send(formData);
  }, [area, dataType, files, label, setFiles]);

  return (
    <div className="space-y-4">
      <FileUpload
        value={files}
        onValueChange={setFiles}
        accept=".csv,.xlsx,.xls"
        multiple
      >
        <FileUploadDropzone className="cursor-pointer rounded-xl border-2 border-dashed p-6 text-center sm:p-10">
          <UploadCloud className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

          <h3 className="font-medium">
            Drag & drop {label} files here
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            CSV, XLSX, and XLS files supported
          </p>
        </FileUploadDropzone>

        <div className="mt-4 flex justify-between">
          <FileUploadClear asChild>
            <Button variant="outline">
              Clear All
            </Button>
          </FileUploadClear>

          <Button
            onClick={uploadFiles}
            disabled={uploading || !files.length}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>

        {files.length > 0 && (
          <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border p-3">
            <FileUploadList>
              {files.map((file) => (
                <FileUploadItem
                  key={`${file.name}-${file.lastModified}`}
                  value={file}
                >
                  <FileUploadItemPreview />

                  <div className="flex flex-1 flex-col gap-2">
                    <FileUploadItemMetadata />
                    <FileUploadItemProgress variant="linear" />
                  </div>

                  <FileUploadItemDelete asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </FileUploadItemDelete>
                </FileUploadItem>
              ))}
            </FileUploadList>
          </div>
        )}
      </FileUpload>
    </div>
  );
}
