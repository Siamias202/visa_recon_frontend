"use client"

import { Info } from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

interface UploadInstructionsProps {
  atmGlNumber: string
}


export function UploadInstructions({ atmGlNumber }: UploadInstructionsProps) {
  return (
    <Alert className="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
      <Info className="h-4 w-4" />

      <AlertTitle className="font-semibold">
        Upload Instructions
      </AlertTitle>

      <AlertDescription>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
          <li>
            You can select and upload{" "}
            <strong>multiple files</strong> at once, or use{" "}
            <strong>Auto Fetch</strong> to pull files automatically.
          </li>

          <li>
            Only <strong>Excel</strong> and <strong>CSV</strong> files are
            allowed.
          </li>

          <li>
            Allowed Excel formats: <strong>.xlsx</strong> and{" "}
            <strong>.xls</strong>
          </li>

          <li>
            Allowed CSV format: <strong>.csv</strong>
          </li>

          <li>
            Select the date associated with the uploaded files.
          </li>

          <li>
            Make sure each file contains the required columns and data.
          </li>

          <li>
            Default GL Number for ATM:{" "}
            <strong>{atmGlNumber}</strong>
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  )
}
