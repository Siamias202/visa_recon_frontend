"use client";

import * as React from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Star,
  History,
  Upload,
  Eye,
  FileOutput,
  FileInput,
  LayoutDashboard,
  ListOrdered,
  Banknote,
  ShoppingCart,
  ArrowLeftRight,
  BugOff,
  CircleCheckBig,
  CircleX,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "./nav-project";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "./team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { IconReport } from "@tabler/icons-react";

function VisaLogo({ className }: { className?: string }) {
  return <img src="/visa-logo.svg" alt="Visa" className={className} />;
}

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "VISA Reconciliation",
      logo: VisaLogo,
      plan: "TEST",
    }
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: LayoutDashboard,
    },
    {
      title: "Issuing Transactions",
      url: "#",
      icon: FileOutput,
      isActive: true,
      items: [
        {
          title: "Upload",
          url: "/issuing/upload",
          icon: Upload,
        },
        {
          title: "Preview",
          url: "/issuing/preview",
          icon: Eye,
        },
        {
          title: "Output",
          url: "/issuing/output",
          icon: ArrowLeftRight ,
        },
        // {
        //   title: "Category",
        //   url: "#",
        //   icon: ListOrdered,
        //   items: [
        //     {
        //       title: "ATM",
        //       url: "#",
        //       icon: Banknote,
        //     },

        //     {
        //       title: "Purchase",
        //       url: "#",
        //       icon: ShoppingCart,
        //     },
        //   ],
        // },
      ],
    },
    {
      title: "Acquiring Transactions",
      url: "#",
      icon: FileInput,
      items: [
         {
          title: "Upload",
          url: "/acquiring/upload",
          icon: Upload,
        },
         {
          title: "Preview",
          url: "/acquiring/preview",
          icon: Eye,
        },
        {
          title: "Output",
          url: "/acquiring/output",
          icon: ArrowLeftRight ,
        },
      ],
    },
    {
      title: "Reporting",
      url: "#",
      icon: IconReport,
      items: [
        {
          title: "Resolved",
          url: "#",
          icon:CircleCheckBig 
        },
        {
          title: "Unresolved",
          url: "#",
          icon:CircleX 
        },
      ],
    },
    // {
    //   title: "Settings",
    //   url: "#",
    //   icon: Settings2,
    //   items: [
    //     {
    //       title: "General",
    //       url: "#",
    //     },
    //     {
    //       title: "Team",
    //       url: "#",
    //     },
    //     {
    //       title: "Billing",
    //       url: "#",
    //     },
    //     {
    //       title: "Limits",
    //       url: "#",
    //     },
    //   ],
    // },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
