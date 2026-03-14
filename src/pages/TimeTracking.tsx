import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, MapPin, List, Bell } from "lucide-react";
import { ClockInOutCard } from "@/components/time-tracking/ClockInOutCard";
import { StaffLocationMap } from "@/components/time-tracking/StaffLocationMap";
import { TimeEntriesList } from "@/components/time-tracking/TimeEntriesList";
import { JobSiteManager } from "@/components/time-tracking/JobSiteManager";
import { GeofencePrompt } from "@/components/time-tracking/GeofencePrompt";
import { GeofenceSettings } from "@/components/time-tracking/GeofenceSettings";

export default function TimeTracking() {
  const [activeTab, setActiveTab] = useState("clock");

  return (
    <DashboardLayout>
      {/* Global geofence prompt that shows on any tab */}
      <GeofencePrompt />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground">
            GPS-verified clock-in/out with geofencing for job sites
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 lg:w-[700px]">
            <TabsTrigger value="clock" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Time Clock</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="entries" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Entries</span>
            </TabsTrigger>
            <TabsTrigger value="sites" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Sites</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clock" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ClockInOutCard />
              <div className="space-y-6">
                <StaffLocationMap />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <StaffLocationMap />
          </TabsContent>

          <TabsContent value="entries" className="mt-6">
            <TimeEntriesList />
          </TabsContent>

          <TabsContent value="sites" className="mt-6">
            <JobSiteManager />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="max-w-2xl">
              <GeofenceSettings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
