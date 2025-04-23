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
import { createUser, bulkImportUsers } from "@/lib/actions/user-actions";
import { getCollegeById, getAllColleges, type College } from "@/lib/utils/colleges";
import { parse } from 'papaparse';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Extend the College type to include the 'year' field
interface CollegeWithYear extends Omit<College, 'years'> {
  years?: string[];
  year?: string[];
}

// Define form schema for manual student addition
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
  file: z.any().refine((file) => {
    // Check if file exists
    if (!file) return false;
    
    // Check file extension instead of MIME type
    const fileName = file.name || '';
    return fileName.toLowerCase().endsWith('.csv');
  }, {
    message: "Please upload a CSV file",
  }),
});

type ManualAddFormValues = z.infer<typeof manualAddSchema>;
type CSVFormValues = z.infer<typeof csvSchema>;

interface CsvRow {
  name: string;
  email: string;
  phone: string;
  status?: "success" | "error" | "pending";
  error?: string;
}

export default function ImportStudentsPage() {
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
  const [colleges, setColleges] = useState<CollegeWithYear[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedCsvCollege, setSelectedCsvCollege] = useState<string>("");
  const [selectedCsvBranch, setSelectedCsvBranch] = useState<string>("");
  const [selectedCsvYear, setSelectedCsvYear] = useState<string>("");

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
      console.log("Selected college ID:", selectedCollege);
      
      const college = colleges.find(c => c.id === selectedCollege);
      console.log("Found college:", college);
      
      if (college) {
        console.log("College years data:", college.year || college.years);
        console.log("College branches data:", college.branches);
        
        // Ensure branches and years are never empty arrays and set initial values
        const validBranches = (college.branches && Array.isArray(college.branches) && college.branches.length > 0) 
          ? college.branches.filter(Boolean) 
          : ["General"];
        
        // Use either year or years field from college
        const validYears = (college.year && Array.isArray(college.year) && college.year.length > 0) 
          ? college.year.filter(Boolean) 
          : (college.years && Array.isArray(college.years) && college.years.length > 0)
            ? college.years.filter(Boolean)
            : ["1"];
        
        console.log("Setting branches:", validBranches);
        console.log("Setting years:", validYears);
        
        setBranches(validBranches);
        setYears(validYears);
        
        // Don't auto-select branch and year, just provide the options
        if (!manualForm.getValues("branch")) {
          manualForm.setValue("branch", "");
        }
        
        if (!manualForm.getValues("year")) {
          manualForm.setValue("year", "");
        }
        
        // Do the same for CSV form
        if (!csvForm.getValues("branch")) {
          csvForm.setValue("branch", "");
        }
        
        if (!csvForm.getValues("year")) {
          csvForm.setValue("year", "");
        }
      }
    } else {
      setBranches(["General"]);
      setYears(["1"]);
      
      // Reset branch and year fields without setting defaults
      manualForm.setValue("branch", "");
      manualForm.setValue("year", "");
      csvForm.setValue("branch", "");
      csvForm.setValue("year", "");
    }
  }, [selectedCollege, colleges, manualForm, csvForm]);

  // Add useEffect to load colleges when component mounts
  useEffect(() => {
    const fetchColleges = async () => {
      try {
        console.log("Fetching colleges directly from Firestore...");
        
        // Fetch colleges directly from Firestore
        const collegesSnapshot = await getDocs(collection(db, 'colleges'));
        const collegesList = collegesSnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Process years data
          let processedYears = data.years || data.year || [];
          if (typeof processedYears === 'string') {
            try {
              processedYears = JSON.parse(processedYears);
            } catch (e) {
              processedYears = [processedYears];
            }
          }
          
          // Process branches data
          let processedBranches = data.branches || [];
          if (typeof processedBranches === 'string') {
            try {
              processedBranches = JSON.parse(processedBranches);
            } catch (e) {
              processedBranches = [processedBranches];
            }
          }
          
          return {
            id: doc.id,
            name: data.name || 'Unknown College',
            branches: Array.isArray(processedBranches) ? processedBranches : [],
            years: Array.isArray(processedYears) ? processedYears : [],
            year: Array.isArray(processedYears) ? processedYears : []
          };
        });
        
        console.log("Colleges fetched from Firestore:", collegesList);
        
        // Don't set default college
        setColleges(collegesList);
      } catch (error) {
        console.error("Error loading colleges:", error);
        toast.error("Failed to load colleges. Please try again.");
      }
    };
    
    fetchColleges();
  }, [manualForm, csvForm]);

  // Handle manual form submission
  const handleManualSubmit = async (values: ManualAddFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Call the server action to create a student
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

      toast.success("Student created successfully");
      manualForm.reset();
    } catch (error: any) {
      console.error("Error creating student:", error);
      toast.error(error.message || "Failed to create student");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle CSV file selection
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // Clear previous file data
      setCsvFileName("");
      setCsvPreview([]);
      csvForm.setValue("file", undefined);
      return;
    }
    
    // Check if file has .csv extension
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }
    
    // Set the file name for display
    setCsvFileName(file.name);
    
    // Set the file in the form
    csvForm.setValue("file", file);
    
    // Parse the CSV file
    const fileReader = new FileReader();
    
    fileReader.onload = (event) => {
      const csvText = event.target?.result as string;
      try {
        const parsedData = parse(csvText, {
          header: true,
          dynamicTyping: false, // Keep as strings to preserve formatting
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(), // Trim header names
        });
        
        // Type assertion with strong typing and better handling of empty values
        const typedRows = (parsedData.data as unknown[]).map(row => {
          // Convert to proper format, trimming whitespace
          return {
            name: String((row as any).Name || (row as any).name || '').trim(),
            email: String((row as any).Email || (row as any).email || '').trim(),
            phone: String((row as any).Phone || (row as any).phone || '').trim()
          };
        });
        
        // Show first 5 rows as preview
        setCsvPreview(typedRows.slice(0, 5));
        
        // Clear any previous file errors
        csvForm.clearErrors("file");
      } catch (error) {
        console.error("Error parsing CSV:", error);
        toast.error("Failed to parse CSV file. Please check the format.");
        setCsvPreview([]);
        csvForm.setError("file", {
          type: "custom",
          message: "Invalid CSV format. Please check the file."
        });
      }
    };
    
    fileReader.onerror = () => {
      toast.error("Error reading the file");
      setCsvPreview([]);
      csvForm.setError("file", {
        type: "custom",
        message: "Error reading the file"
      });
    };
    
    fileReader.readAsText(file);
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
        const parsedData = parse(text, {
          header: true,
          dynamicTyping: false, // Keep as strings
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(), // Trim header names
        });
        
        // Type assertion with strong typing and better handling of empty values
        const typedRows = (parsedData.data as unknown[]).map(row => {
          // Convert to proper format, trimming whitespace
          return {
            name: String((row as any).Name || (row as any).name || '').trim(),
            email: String((row as any).Email || (row as any).email || '').trim(),
            phone: String((row as any).Phone || (row as any).phone || '').trim()
          };
        });
        
        if (typedRows.length === 0) {
          toast.error("No valid data found in CSV");
          setCsvUploadStatus("idle");
          setShowUploadDialog(false);
          return;
        }

        // Validate data before submission
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10}$/;
        const validationErrors: {index: number, field: string, value: string, message: string}[] = [];
        
        typedRows.forEach((row, index) => {
          if (!row.name) {
            validationErrors.push({index, field: 'name', value: row.name, message: 'Name is required'});
          }
          
          if (!emailRegex.test(row.email)) {
            validationErrors.push({index, field: 'email', value: row.email, message: 'Invalid email format'});
          }
          
          if (!phoneRegex.test(row.phone)) {
            validationErrors.push({index, field: 'phone', value: row.phone, message: 'Phone must be 10 digits'});
          }
        });
        
        if (validationErrors.length > 0) {
          // Create processed rows with errors
          const processedRows = typedRows.map((row, index) => {
            const rowErrors = validationErrors.filter(err => err.index === index);
            if (rowErrors.length > 0) {
              return {
                ...row,
                status: "error" as const,
                error: rowErrors.map(err => `${err.field}: ${err.message} (${err.value})`).join(', ')
              };
            }
            return {
              ...row,
              status: "pending" as const
            };
          });
          
          setCsvProcessed(processedRows);
          setProcessingProgress(100);
          toast.error(`Found ${validationErrors.length} validation errors in the CSV data`);
          setCsvUploadStatus("complete");
          return;
        }

        try {
          setIsSubmitting(true);
          setProcessingProgress(10);
          
          // Call the server action to import students in bulk
          const result = await bulkImportUsers(typedRows, {
            college: values.college,
            branch: values.branch,
            year: values.year
          });
          
          setProcessingProgress(90);
          
          // Process results
          const processedRows = typedRows.map((row) => {
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
          
          if (result.success > 0) {
            toast.success(`Imported ${result.success} of ${typedRows.length} students`);
          } else {
            toast.error(`Failed to import students. Please check the errors.`);
          }
          
          setCsvUploadStatus("complete");
          
          // Reset form data after successful import
          if (result.success > 0) {
            setCsvPreview([]);
            setCsvFileName("");
          }
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
      setShowUploadDialog(false);
    }
  };

  const getCollegeNameById = (id: string) => {
    const college = colleges.find(c => c.id === id);
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
    link.setAttribute("download", "student_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update branches when college selection changes
  useEffect(() => {
    if (selectedCollege) {
      const college = colleges.find((c) => c.id === selectedCollege);
      if (college) {
        console.log("Selected college:", college);
        setBranches(college.branches || []);
        setYears(college.year || college.years || []);
        manualForm.setValue("college", selectedCollege);
        setSelectedBranch("");
        setSelectedYear("");
      }
    } else {
      setBranches([]);
      setYears([]);
      setSelectedBranch("");
      setSelectedYear("");
    }
  }, [selectedCollege, colleges, manualForm]);

  // Update CSV branches when college selection changes
  useEffect(() => {
    if (selectedCsvCollege) {
      const college = colleges.find((c) => c.id === selectedCsvCollege);
      if (college) {
        console.log("Selected CSV college:", college);
        setBranches(college.branches || []);
        setYears(college.year || college.years || []);
        setSelectedCsvBranch("");
        setSelectedCsvYear("");
      }
    }
  }, [selectedCsvCollege, colleges]);

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Import Students</h1>
          <Button variant="outline" onClick={() => router.push("/admin/user/students")}>
            Back to Students
          </Button>
        </div>

        <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Add Student</TabsTrigger>
            <TabsTrigger value="csv">Bulk Import Students</TabsTrigger>
          </TabsList>
          
          {/* Manual Add Form */}
          <TabsContent value="manual">
            <div className="border rounded-lg p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Add Single Student</h2>
              
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
                        placeholder="student@example.com" 
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
                    <div className="space-y-2">
                      <Label htmlFor="college">College</Label>
                      <Select
                        value={manualForm.watch("college")}
                        onValueChange={(value) => {
                          manualForm.setValue("college", value);
                          setSelectedCollege(value);
                          // Reset branch and year when college changes
                          manualForm.setValue("branch", "");
                          manualForm.setValue("year", "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select College" />
                        </SelectTrigger>
                        <SelectContent>
                          {colleges.map((college) => (
                            <SelectItem key={college.id} value={college.id || "unknown"}>
                              {college.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {manualForm.formState.errors.college && (
                        <p className="text-destructive text-sm mt-1">
                          {manualForm.formState.errors.college.message}
                        </p>
                      )}
                    </div>
                    
                    {/* Branch Select - Manual Form */}
                    <div className="space-y-2">
                      <Label htmlFor="branch">Branch</Label>
                      <Select
                        value={manualForm.watch("branch")}
                        onValueChange={(value) => manualForm.setValue("branch", value)}
                        disabled={!selectedCollege}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.length > 0 ? (
                            branches.map((branch) => (
                              <SelectItem key={branch} value={branch || "default"}>
                                {branch || "Default Branch"}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="default">Default Branch</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {manualForm.formState.errors.branch && (
                        <p className="text-destructive text-sm mt-1">
                          {manualForm.formState.errors.branch.message}
                        </p>
                      )}
                    </div>
                    
                    {/* Year Select - Manual Form */}
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Select
                        value={manualForm.watch("year")}
                        onValueChange={(value) => manualForm.setValue("year", value)}
                        disabled={!selectedCollege}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.length > 0 ? (
                            years.map((year) => (
                              <SelectItem key={year} value={year || "default"}>
                                {year || "Default Year"}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="default">Default Year</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {manualForm.formState.errors.year && (
                        <p className="text-destructive text-sm mt-1">
                          {manualForm.formState.errors.year.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button type="submit" disabled={manualForm.formState.isSubmitting}>
                    {manualForm.formState.isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
                        Adding...
                      </>
                    ) : (
                      'Add Student'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
          
          {/* Bulk Import Form */}
          <TabsContent value="csv">
            <div className="border rounded-lg p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Bulk Import Students</h2>
              
              <div className="mb-6">
                <Alert>
                  <AlertTitle>CSV Format Instructions</AlertTitle>
                  <AlertDescription>
                    <p>The CSV file should contain the following columns: Name, Email, and Phone Number.</p>
                    <p className="mt-2">All students will be imported with the college, branch, and year specified below.</p>
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
                  <div className="space-y-2">
                    <Label htmlFor="csv-college">College</Label>
                    <Select
                      value={csvForm.watch("college")}
                      onValueChange={(value) => {
                        csvForm.setValue("college", value);
                        setSelectedCsvCollege(value);
                        // Reset branch and year
                        csvForm.setValue("branch", "");
                        csvForm.setValue("year", "");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select College" />
                      </SelectTrigger>
                      <SelectContent>
                        {colleges.map((college) => (
                          <SelectItem key={college.id} value={college.id || "unknown"}>
                            {college.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {csvForm.formState.errors.college && (
                      <p className="text-destructive text-sm mt-1">
                        {csvForm.formState.errors.college.message}
                      </p>
                    )}
                  </div>
                  
                  {/* Branch Select - CSV Form */}
                  <div className="space-y-2">
                    <Label htmlFor="csv-branch">Branch</Label>
                    <Select
                      value={csvForm.watch("branch")}
                      onValueChange={(value) => csvForm.setValue("branch", value)}
                      disabled={!selectedCsvCollege}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.length > 0 ? (
                          branches.map((branch) => (
                            <SelectItem key={branch} value={branch || "default"}>
                              {branch || "Default Branch"}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="default">Default Branch</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {csvForm.formState.errors.branch && (
                      <p className="text-destructive text-sm mt-1">
                        {csvForm.formState.errors.branch.message}
                      </p>
                    )}
                  </div>
                  
                  {/* Year Select - CSV Form */}
                  <div className="space-y-2">
                    <Label htmlFor="csv-year">Year</Label>
                    <Select
                      value={csvForm.watch("year")}
                      onValueChange={(value) => csvForm.setValue("year", value)}
                      disabled={!selectedCsvCollege}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.length > 0 ? (
                          years.map((year) => (
                            <SelectItem key={year} value={year || "default"}>
                              {year || "Default Year"}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="default">Default Year</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {csvForm.formState.errors.year && (
                      <p className="text-destructive text-sm mt-1">
                        {csvForm.formState.errors.year.message}
                      </p>
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
                      : "Import Students"}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* CSV Upload Progress Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {csvUploadStatus === "processing" 
                  ? "Processing CSV Upload" 
                  : "CSV Upload Results"}
              </DialogTitle>
              <DialogDescription>
                {csvUploadStatus === "processing" 
                  ? `Importing students from ${csvFileName}. Please do not close this window.` 
                  : `Completed importing students from ${csvFileName || "CSV file"}.`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-2 flex-1 overflow-hidden flex flex-col">
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
                <div className="overflow-auto max-h-[50vh]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvProcessed.map((row, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {row.status === "success" ? (
                              <span className="text-green-500">✅</span>
                            ) : row.status === "pending" ? (
                              <span className="text-yellow-500">⚠️</span>
                            ) : (
                              <span className="text-red-500">❌</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{row.name || "-"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{row.email || "-"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{row.phone || "-"}</td>
                          <td className="px-3 py-2 break-words max-w-[200px]">
                            {row.status === "error" ? row.error : (row.status === "pending" ? "Pending validation" : "Imported successfully")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <DialogFooter className="mt-4 pt-2 border-t">
              <Button
                type="button"
                onClick={() => {
                  setShowUploadDialog(false);
                  if (csvUploadStatus === "complete") {
                    // Reset the form after successful import
                    csvForm.reset();
                    setCsvPreview([]);
                    setCsvProcessed([]);
                    setCsvFileName("");
                    setCsvUploadStatus("idle");
                  }
                }}
              >
                {csvUploadStatus === "complete" ? "Done" : "Cancel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
} 