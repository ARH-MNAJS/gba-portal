"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PracticeReportsTab from "@/components/reports/practice-reports-tab";
import AssessmentReportsTab from "@/components/reports/assessment-reports-tab";

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<string>("practice");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Reports Dashboard</h1>
      
      <Tabs
        defaultValue="practice"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="practice">
          <PracticeReportsTab />
        </TabsContent>
        
        <TabsContent value="assessments">
          <AssessmentReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
} 