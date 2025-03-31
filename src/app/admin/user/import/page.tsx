"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import collegesData from "@/data/colleges.json";
import { createUser, bulkImportUsers } from "@/lib/actions/user-actions";

// Define form schema for manual user addition
const manualAddSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email format" }),
  phone: z.string().regex(/^\d{10}$/, { message: "Phone must be 10 digits" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  college: z.string().min(1, { message: "College is required" }),
  branch: z.string().min(1, { message: "Branch is required" }),
  year: z.string().min(1, { message: "Year is required" }),
});

// Define CSV upload schema
const csvSchema = z.object({
  college: z.string().min(1, { message: "College is required" }),
  branch: z.string().min(1, { message: "Branch is required" }),
  year: z.string().min(1, { message: "Year is required" }),
  file: z.any().refine((file) => file && file.type === "text/csv", {
    message: "Please upload a CSV file",
  }),
});

type ManualAddFormValues = z.infer<typeof manualAddSchema>;
type CSVFormValues = z.infer<typeof csvSchema>;

interface CsvRow {
  name: string;
  email: string;
  phone: string;
  status?: "success" | "error";
  error?: string;
}

export default function ImportUserPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("manual");
  const [selectedCollege, setSelectedCollege] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [csvUploadStatus, setCsvUploadStatus] = useState<"idle" | "processing" | "complete">("idle");
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
  const [csvProcessed, setCsvProcessed] = useState<CsvRow[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form for manual adding
  const manualForm = useForm<ManualAddFormValues>({
    resolver: zodResolver(manualAddSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      college: "",
      branch: "",
      year: "",
    },
  });

  // Form for CSV upload
  const csvForm = useForm<CSVFormValues>({
    resolver: zodResolver(csvSchema),
    defaultValues: {
      college: "",
      branch: "",
      year: "",
      file: undefined,
    },
  });

  // Update branches when college changes
  useEffect(() => {
    if (selectedCollege) {
      const college = collegesData.colleges.find(c => c.id === selectedCollege);
      if (college) {
        setBranches(college.branches);
        setYears(college.years);
      }
    } else {
      setBranches([]);
      setYears([]);
    }
  }, [selectedCollege]);

  // Handle manual form submission
  const handleManualSubmit = async (values: ManualAddFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Call the server action to create a user
      await createUser({
        email: values.email,
        password: values.password,
        name: values.name,
        role: 'student',
        phone: values.phone,
        college: values.college,
        branch: values.branch,
        year: values.year,
      });

      toast.success("User created successfully");
      manualForm.reset();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle CSV file selection
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    csvForm.setValue("file", file);

    // Preview CSV contents
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      setCsvPreview(rows.slice(0, 5)); // Preview first 5 rows
    };
    reader.readAsText(file);
  };

  // Parse CSV text to array of objects
  const parseCSV = (text: string): CsvRow[] => {
    const lines = text.split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    // Check if required headers exist
    const requiredHeaders = ["name", "email", "phone"];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      toast.error(`CSV is missing required headers: ${missingHeaders.join(", ")}`);
      return [];
    }

    const result: CsvRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = lines[i].split(",").map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        if (index < values.length) {
          row[header] = values[index];
        }
      });
      
      result.push(row as CsvRow);
    }
    
    return result;
  };

  // Process CSV upload
  const handleCsvSubmit = async (values: CSVFormValues) => {
    if (!values.file) {
      toast.error("Please select a CSV file");
      return;
    }

    setCsvUploadStatus("processing");
    setShowUploadDialog(true);
    setProcessingProgress(0);
    setCsvProcessed([]);

    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const rows = parseCSV(text);
        
        if (rows.length === 0) {
          toast.error("No valid data found in CSV");
          setCsvUploadStatus("idle");
          return;
        }

        try {
          setIsSubmitting(true);
          
          // Call the server action to import users in bulk
          const result = await bulkImportUsers(rows, {
            college: values.college,
            branch: values.branch,
            year: values.year
          });
          
          // Process results
          const processedRows = rows.map((row, index) => {
            const errorItem = result.errors.find(e => e.email === row.email);
            if (errorItem) {
              return {
                ...row,
                status: "error" as const,
                error: errorItem.error
              };
            } else {
              return {
                ...row,
                status: "success" as const
              };
            }
          });
          
          setCsvProcessed(processedRows);
          setProcessingProgress(100);
          toast.success(`Imported ${result.success} of ${rows.length} users`);
          setCsvUploadStatus("complete");
        } catch (error: any) {
          console.error("Error processing CSV:", error);
          toast.error(error.message || "Failed to process CSV");
          setCsvUploadStatus("idle");
        } finally {
          setIsSubmitting(false);
        }
      };

      reader.readAsText(values.file);
    } catch (error: any) {
      console.error("Error reading CSV:", error);
      toast.error(error.message || "Failed to read CSV");
      setCsvUploadStatus("idle");
      setIsSubmitting(false);
    }
  };

  const getCollegeNameById = (id: string) => {
    const college = collegesData.colleges.find(c => c.id === id);
    return college ? college.name : id;
  };

  const downloadCsvTemplate = () => {
    const headers = "Name,Email,Phone\n";
    const sampleData = "John Doe,john.doe@example.com,1234567890\n";
    const csvContent = headers + sampleData;
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "user_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Import Users</h1>
          <Button variant="outline" onClick={() => router.push("/admin/user")}>
            Back to Users
          </Button>
        </div>

        <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Add</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Import (CSV)</TabsTrigger>
          </TabsList>
          
          {/* Manual Add Form */}
          <TabsContent value="manual">
            <div className="border rounded-lg p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Add Single User</h2>
              
              <form onSubmit={manualForm.handleSubmit(handleManualSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Enter full name" 
                        {...manualForm.register("name")} 
                      />
                      {manualForm.formState.errors.name && (
                        <p className="text-sm text-red-500 mt-1">{manualForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="user@example.com" 
                        {...manualForm.register("email")} 
                      />
                      {manualForm.formState.errors.email && (
                        <p className="text-sm text-red-500 mt-1">{manualForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone" 
                        placeholder="10-digit phone number" 
                        {...manualForm.register("phone")} 
                      />
                      {manualForm.formState.errors.phone && (
                        <p className="text-sm text-red-500 mt-1">{manualForm.formState.errors.phone.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="Minimum 6 characters" 
                        {...manualForm.register("password")} 
                      />
                      {manualForm.formState.errors.password && (
                        <p className="text-sm text-red-500 mt-1">{manualForm.formState.errors.password.message}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Academic Information */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="college">College</Label>
                      <Select 
                        onValueChange={(value) => {
                          setSelectedCollege(value);
                          manualForm.setValue("college", value);
                          manualForm.setValue("branch", "");
                          manualForm.setValue("year", "");
                        }}
                      >
                        <SelectTrigger id="college">
                          <SelectValue placeholder="Select college" />
                        </SelectTrigger>
                        <SelectContent>
                          {collegesData.colleges.map((college) => (
                            <SelectItem key={college.id} value={college.id}>
                              {college.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {manualForm.formState.errors.college && (
                        <p className="text-sm text-red-500 mt-1">{manualForm.formState.errors.college.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="branch">Branch</Label>
                      <Select 
                        disabled={branches.length === 0}
                        onValueChange={(value) => manualForm.setValue("branch", value)}
                      >
                        <SelectTrigger id="branch">
                          <SelectValue placeholder={branches.length === 0 ? "Select college first" : "Select branch"} />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch} value={branch}>
                              {branch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {manualForm.formState.errors.branch && (
                        <p className="text-sm text-red-500 mt-1">{manualForm.formState.errors.branch.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Select 
                        disabled={years.length === 0}
                        onValueChange={(value) => manualForm.setValue("year", value)}
                      >
                        <SelectTrigger id="year">
                          <SelectValue placeholder={years.length === 0 ? "Select college first" : "Select year"} />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {manualForm.formState.errors.year && (
                        <p className="text-sm text-red-500 mt-1">{manualForm.formState.errors.year.message}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adding User..." : "Add User"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
          
          {/* Bulk Import Form */}
          <TabsContent value="bulk">
            <div className="border rounded-lg p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Bulk Import Users</h2>
              
              <div className="mb-6">
                <Alert>
                  <AlertTitle>CSV Format Instructions</AlertTitle>
                  <AlertDescription>
                    <p>The CSV file should contain the following columns: Name, Email, and Phone Number.</p>
                    <p className="mt-2">All users will be imported with the college, branch, and year specified below.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={downloadCsvTemplate} 
                      className="mt-2"
                    >
                      Download Template
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
              
              <form onSubmit={csvForm.handleSubmit(handleCsvSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="csv-college">College</Label>
                    <Select 
                      onValueChange={(value) => {
                        setSelectedCollege(value);
                        csvForm.setValue("college", value);
                        csvForm.setValue("branch", "");
                        csvForm.setValue("year", "");
                      }}
                    >
                      <SelectTrigger id="csv-college">
                        <SelectValue placeholder="Select college" />
                      </SelectTrigger>
                      <SelectContent>
                        {collegesData.colleges.map((college) => (
                          <SelectItem key={college.id} value={college.id}>
                            {college.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {csvForm.formState.errors.college && (
                      <p className="text-sm text-red-500 mt-1">{csvForm.formState.errors.college.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="csv-branch">Branch</Label>
                    <Select 
                      disabled={branches.length === 0}
                      onValueChange={(value) => csvForm.setValue("branch", value)}
                    >
                      <SelectTrigger id="csv-branch">
                        <SelectValue placeholder={branches.length === 0 ? "Select college first" : "Select branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch} value={branch}>
                            {branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {csvForm.formState.errors.branch && (
                      <p className="text-sm text-red-500 mt-1">{csvForm.formState.errors.branch.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="csv-year">Year</Label>
                    <Select 
                      disabled={years.length === 0}
                      onValueChange={(value) => csvForm.setValue("year", value)}
                    >
                      <SelectTrigger id="csv-year">
                        <SelectValue placeholder={years.length === 0 ? "Select college first" : "Select year"} />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {csvForm.formState.errors.year && (
                      <p className="text-sm text-red-500 mt-1">{csvForm.formState.errors.year.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label htmlFor="csv-file">Upload CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="mt-1"
                  />
                  {csvForm.formState.errors.file && (
                    <p className="text-sm text-red-500 mt-1">
                      {csvForm.formState.errors.file.message as string}
                    </p>
                  )}
                </div>
                
                {csvPreview.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-md font-medium mb-2">CSV Preview (first 5 rows):</h3>
                    <div className="border rounded overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {csvPreview.map((row, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">{row.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{row.email}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{row.phone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {csvFileName && `Selected file: ${csvFileName}`}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end mt-6">
                  <Button type="submit" disabled={isSubmitting || csvUploadStatus === "processing"}>
                    {isSubmitting || csvUploadStatus === "processing" 
                      ? "Processing..." 
                      : "Import Users"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* CSV Upload Progress Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {csvUploadStatus === "processing" 
                  ? "Processing CSV Upload" 
                  : "CSV Upload Results"}
              </DialogTitle>
              <DialogDescription>
                {csvUploadStatus === "processing" 
                  ? `Importing users from ${csvFileName}. Please do not close this window.` 
                  : `Completed importing users from ${csvFileName}.`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {csvUploadStatus === "processing" && (
                <div className="space-y-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-center">
                    Processing... {processingProgress}%
                  </p>
                </div>
              )}
              
              {csvProcessed.length > 0 && (
                <div className="mt-4 max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvProcessed.map((row, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {row.status === "success" ? (
                              <span className="text-green-500">✅</span>
                            ) : (
                              <span className="text-red-500">❌</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{row.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{row.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {row.status === "error" && (
                              <span className="text-red-500 text-sm">{row.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <DialogFooter>
              {csvUploadStatus === "complete" && (
                <Button onClick={() => {
                  setShowUploadDialog(false);
                  setCsvUploadStatus("idle");
                  setCsvProcessed([]);
                  setCsvPreview([]);
                  csvForm.reset();
                }}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
} 