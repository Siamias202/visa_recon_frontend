"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { UploadInstructions } from "@/components/instructionbox";
import { DataUpload } from "@/components/data-upload";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { Separator } from "@/components/ui/separator";

export default function Page() {
  const pathname = usePathname();
  const area = pathname.startsWith("/acquiring") ? "acquiring" : "issuing";
  const areaLabel = area === "acquiring" ? "Acquiring" : "Issuing";
  const [cbsFiles, setCbsFiles] = React.useState<File[]>([]);
  const [boFiles, setBoFiles] = React.useState<File[]>([]);
  const [glFiles, setGlFiles] = React.useState<File[]>([]);
  const [feFiles, setFeFiles] = React.useState<File[]>([]);
  const [epFiles, setEpFiles] = React.useState<File[]>([]);

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        {/* Navbar */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />

          <Separator
            orientation="vertical"
            className="mr-2 h-4"
          />

          <div>
            <h1 className="text-lg font-semibold">
              {areaLabel} Data Upload
            </h1>

            <p className="text-sm text-muted-foreground">
              {area === "acquiring"
                ? "Upload GL, FE, and EP transaction files"
                : "Upload CBS and BO transaction files"}
            </p>
          </div>
        </header>

        <main className="p-6">
          <UploadInstructions atmGlNumber="1001" />

          <Tabs
            defaultValue={area === "acquiring" ? "gl" : "cbs"}
            className="mt-6 w-full"
          >
            <TabsList className={`grid w-full ${area === "acquiring" ? "grid-cols-3" : "grid-cols-2"}`}>
              {area === "acquiring" ? (
                <>
                  <TabsTrigger value="gl">GL Data</TabsTrigger>
                  <TabsTrigger value="fe">FE Data</TabsTrigger>
                  <TabsTrigger value="ep">EP Data</TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="cbs">CBS Data</TabsTrigger>
                  <TabsTrigger value="bo">BO Data</TabsTrigger>
                </>
              )}
            </TabsList>

            {area === "acquiring" ? (
              <>
                <TabsContent value="gl" className="mt-6">
                  <DataUpload
                    files={glFiles}
                    setFiles={setGlFiles}
                    label="GL"
                    dataType="gl"
                    area="acquiring"
                  />
                </TabsContent>
                <TabsContent value="fe" className="mt-6">
                  <DataUpload
                    files={feFiles}
                    setFiles={setFeFiles}
                    label="FE"
                    dataType="fe"
                    area="acquiring"
                  />
                </TabsContent>
                <TabsContent value="ep" className="mt-6">
                  <DataUpload
                    files={epFiles}
                    setFiles={setEpFiles}
                    label="EP"
                    dataType="ep"
                    area="acquiring"
                  />
                </TabsContent>
              </>
            ) : (
              <>
                <TabsContent value="cbs" className="mt-6">
                  <DataUpload
                    files={cbsFiles}
                    setFiles={setCbsFiles}
                    label="CBS"
                    dataType="cbs"
                    area="issuing"
                  />
                </TabsContent>
                <TabsContent value="bo" className="mt-6">
                  <DataUpload
                    files={boFiles}
                    setFiles={setBoFiles}
                    label="BO"
                    dataType="bo"
                    area="issuing"
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
