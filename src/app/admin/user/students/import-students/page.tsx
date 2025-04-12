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
  const [currentAction, setCurrentAction] = useState<"manual" | "csv">("manual");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [selectedCsvCollege, setSelectedCsvCollege] = useState<string>("");
  const [selectedCsvBranch, setSelectedCsvBranch] = useState<string>("");
  const [selectedCsvYear, setSelectedCsvYear] = useState<string>("");
  const [showCsvPreview, setShowCsvPreview] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

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
    if (!file) return;
    
    const fileReader = new FileReader();
    setCsvFileName(file.name);
    
    fileReader.onload = (event) => {
      const csvText = event.target?.result as string;
      const parsedData = parse(csvText, {
        header: true,
        dynamicTyping: true,
      });
      
      // Type assertion with strong typing
      const typedRows = (parsedData.data as unknown[]).map(row => ({
        name: String((row as any).name || ''),
        email: String((row as any).email || ''),
        phone: String((row as any).phone || '')
      }));
      
      setCsvPreview(typedRows.slice(0, 5)); // Show first 5 rows as preview
      csvForm.setValue("file", file);
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
          dynamicTyping: true,
        });
        
        // Type assertion with strong typing
        const typedRows = (parsedData.data as unknown[]).map(row => ({
          name: String((row as any).name || ''),
          email: String((row as any).email || ''),
          phone: String((row as any).phone || '')
        }));
        
        if (typedRows.length === 0) {
          toast.error("No valid data found in CSV");
          setCsvUploadStatus("idle");
          return;
        }

        try {
          setIsSubmitting(true);
          
          // Call the server action to import students in bulk
          const result = await bulkImportUsers(typedRows, {
            college: values.college,
            branch: values.branch,
            year: values.year
          });
          
          // Process results
          const processedRows = typedRows.map((row, index) => {
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
          toast.success(`Imported ${result.success} of ${typedRows.length} students`);
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

  // CSV file handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          // Ensure the parsed data is properly typed
          const typedData = (results.data as unknown[]).map(row => ({
            name: String((row as any).name || ''),
            email: String((row as any).email || ''),
            phone: String((row as any).phone || '')
          }));
          setCsvData(typedData);
          setShowCsvPreview(true);
        },
      });
    }
  };

  async function handleBulkImport() {
    if (!selectedCsvCollege || !selectedCsvBranch || !selectedCsvYear) {
      toast.error("Please select college, branch, and year.");
      return;
    }

    setIsLoading(true);
    try {
      const formattedData = csvData.map((row) => ({
        ...row,
        collegeId: selectedCsvCollege,
        branch: selectedCsvBranch,
        year: selectedCsvYear,
        role: "student",
      }));

      await bulkImportUsers(formattedData, {
        college: selectedCsvCollege,
        branch: selectedCsvBranch,
        year: selectedCsvYear
      });
      
      toast.success(`${csvData.length} students have been imported.`);
      
      // Reset form
      setCsvData([]);
      setFileName("");
      setSelectedCsvCollege("");
      setSelectedCsvBranch("");
      setSelectedCsvYear("");
      setShowCsvPreview(false);
    } catch (error) {
      console.error("Error importing students:", error);
      toast.error("There was an error importing students. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

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
                    onChange={handleFileUpload}
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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {csvUploadStatus === "processing" 
                  ? "Processing CSV Upload" 
                  : "CSV Upload Results"}
              </DialogTitle>
              <DialogDescription>
                {csvUploadStatus === "processing" 
                  ? `Importing students from ${csvFileName}. Please do not close this window.` 
                  : `Completed importing students from ${csvFileName}.`}
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
                            {row.status === "error" ? row.error : "Imported successfully"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <DialogFooter>
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