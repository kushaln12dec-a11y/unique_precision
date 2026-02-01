import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import ImageUpload from "../Programmer/components/ImageUpload";
import DateTimeInput from "./components/DateTimeInput";
import Toast from "../../components/Toast";
import ClearIcon from "@mui/icons-material/Clear";
import { getOperatorJobsByGroupId, updateOperatorJob } from "../../services/operatorApi";
import { getIdleTimeConfigs } from "../../services/idleTimeConfigApi";
import type { JobEntry } from "../../types/job";
import { calculateTotals, type CutForm } from "../Programmer/programmerUtils";
import "../RoleBoard.css";
import "../Programmer/Programmer.css";
import "../Programmer/components/JobDetailsModal.css";
import "./OperatorViewPage.css";
import "./components/DateTimeInput.css";

type CutInputData = {
  startTime: string;
  endTime: string;
  machineHrs: string;
  machineNumber: string;
  opsName: string;
  idleTime: string;
  idleTimeDuration: string;
  lastImage: string | null;
  lastImageFile: File | null;
};

const OperatorViewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");
  const cutIdParam = searchParams.get("cutId");
  
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [expandedCuts, setExpandedCuts] = useState<Set<number | string>>(new Set());
  const [cutInputs, setCutInputs] = useState<Map<number | string, CutInputData>>(new Map());
  const [idleTimeConfigs, setIdleTimeConfigs] = useState<Map<string, number>>(new Map());
  const [validationErrors, setValidationErrors] = useState<Map<number | string, Record<string, string>>>(new Map());
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info"; visible: boolean }>({
    message: "",
    variant: "success",
    visible: false,
  });

  /**
   * Calculate Machine Hours automatically based on:
   * - Start Time: When the machine operation started (DD/MM/YYYY HH:MM format)
   * - End Time: When the machine operation ended (DD/MM/YYYY HH:MM format)
   * - Idle Time Duration: Time spent idle (can be "00:20" or "HH:MM" format)
   * 
   * Formula: Machine Hrs = (End Time - Start Time) - Idle Time Duration
   * 
   * The result is displayed automatically in the "Machine Hrs" field (read-only)
   * and is visible in the UI as a readonly input field in the Input Values section.
   */
  const calculateMachineHrs = (startTime: string, endTime: string, idleTimeDuration: string): string => {
    if (!startTime || !endTime) return "0.000";
    
    // Parse datetime strings (DD/MM/YYYY HH:mm format)
    const parseDateTime = (dateTimeStr: string): number => {
      // Try DD/MM/YYYY HH:mm format first
      const parts = dateTimeStr.split(" ");
      if (parts.length === 2) {
        const datePart = parts[0].split("/");
        const timePart = parts[1].split(":");
        if (datePart.length === 3 && timePart.length === 2) {
          const day = parseInt(datePart[0], 10) || 0;
          const month = parseInt(datePart[1], 10) || 0;
          const year = parseInt(datePart[2], 10) || 0;
          const hours = parseInt(timePart[0], 10) || 0;
          const minutes = parseInt(timePart[1], 10) || 0;
          const date = new Date(year, month - 1, day, hours, minutes);
          return date.getTime() / (1000 * 60 * 60); // Convert to hours
        }
      }
      // Fallback to HH:MM format (legacy support)
      const timeParts = dateTimeStr.split(":");
      if (timeParts.length === 2) {
        const hours = parseInt(timeParts[0], 10) || 0;
        const minutes = parseInt(timeParts[1], 10) || 0;
        return hours + minutes / 60;
      }
      return 0;
    };
    
    // Parse idle time duration (can be "00:20" or "HH:MM" format)
    const parseIdleTime = (idleStr: string): number => {
      if (!idleStr) return 0;
      // Try HH:MM format first (e.g., "00:20" for 20 minutes)
      const parts = idleStr.split(":");
      if (parts.length === 2) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        return hours + minutes / 60;
      }
      // Check if it's in "Xmin" format (legacy support)
      if (idleStr.endsWith("min")) {
        const minutes = parseInt(idleStr.replace("min", ""), 10) || 0;
        return minutes / 60;
      }
      return 0;
    };
    
    const start = parseDateTime(startTime);
    const end = parseDateTime(endTime);
    const idle = parseIdleTime(idleTimeDuration);
    
    // Calculate difference in hours
    let diff = end - start;
    
    // If using datetime format, diff will be correct. If using time-only format, handle day rollover
    if (diff < 0 && !startTime.includes("/")) {
      // Only handle day rollover for time-only format
      diff += 24;
    }
    
    // Subtract idle time
    const machineHrs = Math.max(0, diff - idle);
    
    return machineHrs.toFixed(3);
  };

  const decimalHoursToHHMM = (decimal: number): string => {
    if (isNaN(decimal) || decimal <= 0) return "00:00";
  
    const totalMinutes = Math.round(decimal * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
  
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    const fetchJobs = async () => {
      if (!groupId) return;
      try {
        const fetchedJobs = await getOperatorJobsByGroupId(Number(groupId));
        
        // Filter to specific cut if cutId is provided
        let filteredJobs = fetchedJobs;
        if (cutIdParam) {
          // cutId can be string or number, so compare as strings
          filteredJobs = fetchedJobs.filter((job) => String(job.id) === String(cutIdParam));
        }
        
        // Initialize inputs for all cuts
        const initialInputs = new Map<number, CutInputData>();
        filteredJobs.forEach((job) => {
          const existing = job as any;
          const startTime = existing.startTime || "";
          const endTime = existing.endTime || "";
          let idleTime = existing.idleTime || "";
          let idleTimeDuration = existing.idleTimeDuration || "";
          
          // If Vertical Dial is selected, ensure idleTimeDuration is in "00:20" format
          if (idleTime === "Vertical Dial") {
            if (idleTimeConfigs.has("Vertical Dial")) {
              const durationMinutes = idleTimeConfigs.get("Vertical Dial") || 20;
              const hours = Math.floor(durationMinutes / 60);
              const minutes = durationMinutes % 60;
              idleTimeDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
            } else {
              // Fallback if config not loaded yet
              idleTimeDuration = "00:20";
            }
          }
          
          // Recalculate machineHrs if startTime and endTime exist
          let machineHrs = existing.machineHrs || "";
          if (startTime && endTime) {
            machineHrs = calculateMachineHrs(startTime, endTime, idleTimeDuration);
          } else {
            machineHrs = "0.000";
          }
          
          initialInputs.set(job.id as number, {
            startTime,
            endTime,
            machineHrs,
            machineNumber: existing.machineNumber || "",
            opsName: existing.opsName || "",
            idleTime,
            idleTimeDuration,
            lastImage: existing.lastImage || null,
            lastImageFile: null,
          });
        });
        
        setCutInputs(initialInputs);
        setJobs(filteredJobs);
        // Expand first cut by default
        if (filteredJobs.length > 0) {
          setExpandedCuts(new Set([filteredJobs[0].id]));
        }
      } catch (error) {
        console.error("Failed to fetch jobs", error);
      }
    };
    fetchJobs();
  }, [groupId, cutIdParam, idleTimeConfigs]);

  useEffect(() => {
    const fetchIdleTimeConfigs = async () => {
      try {
        const configs = await getIdleTimeConfigs();
        const configMap = new Map<string, number>();
        configs.forEach((config) => {
          configMap.set(config.idleTimeType, config.durationMinutes);
        });
        setIdleTimeConfigs(configMap);
      } catch (error) {
        console.error("Failed to fetch idle time configs", error);
        // Set default for Vertical Dial if fetch fails
        const defaultMap = new Map<string, number>();
        defaultMap.set("Vertical Dial", 20);
        setIdleTimeConfigs(defaultMap);
      }
    };
    fetchIdleTimeConfigs();
  }, []);

  const toggleCutExpansion = (cutId: number | string) => {
    setExpandedCuts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cutId)) {
        newSet.delete(cutId);
      } else {
        newSet.add(cutId);
      }
      return newSet;
    });
  };

  const handleCutImageChange = (cutId: number | string, file: File | null) => {
    setCutInputs((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(cutId) || {
        startTime: "",
        endTime: "",
        machineHrs: "",
        machineNumber: "",
        opsName: "",
            idleTime: "",
            idleTimeDuration: "",
            lastImage: null,
            lastImageFile: null,
          };
      
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newMap.set(cutId, {
            ...current,
            lastImage: reader.result as string,
            lastImageFile: file,
          });
          setCutInputs(new Map(newMap));
        };
        reader.readAsDataURL(file);
      } else {
        newMap.set(cutId, {
          ...current,
          lastImage: null,
          lastImageFile: null,
        });
      }
      
      return newMap;
    });
  };

  const handleInputChange = (cutId: number | string, field: keyof CutInputData, value: string) => {
    setCutInputs((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(cutId) || {
        startTime: "",
        endTime: "",
        machineHrs: "",
        machineNumber: "",
        opsName: "",
        idleTime: "",
        idleTimeDuration: "",
        lastImage: null,
        lastImageFile: null,
      };
      
      const updatedData = {
        ...current,
        [field]: value,
      };

      // If idleTime is changed to "Vertical Dial" and config exists, set duration
      if (field === "idleTime" && value === "Vertical Dial" && idleTimeConfigs.has("Vertical Dial")) {
        const durationMinutes = idleTimeConfigs.get("Vertical Dial") || 20;
        // Format as HH:MM (00:20 for 20 minutes)
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        updatedData.idleTimeDuration = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
      
      // Calculate machine hrs when start time, end time, or idle time duration changes
      if (field === "startTime" || field === "endTime" || field === "idleTimeDuration" || 
          (field === "idleTime" && (value === "Vertical Dial" || value === ""))) {
        const startTime = field === "startTime" ? value : updatedData.startTime;
        const endTime = field === "endTime" ? value : updatedData.endTime;
        let idleTimeDuration = "";
        
        // If idleTime is cleared, clear idleTimeDuration too
        if (field === "idleTime" && value === "") {
          idleTimeDuration = "";
        } else if (field === "idleTime" && value === "Vertical Dial") {
          idleTimeDuration = updatedData.idleTimeDuration;
        } else if (field === "idleTimeDuration") {
          idleTimeDuration = value;
        } else {
          idleTimeDuration = updatedData.idleTimeDuration || "";
        }
        
        // Only calculate if both start and end times are provided
        if (startTime && endTime) {
          updatedData.machineHrs = calculateMachineHrs(startTime, endTime, idleTimeDuration);
        } else {
          updatedData.machineHrs = "0.000";
        }
      }
      
      newMap.set(cutId, updatedData);
      
      // Clear error for this field when user starts typing
      if (validationErrors.has(cutId)) {
        const errors = validationErrors.get(cutId)!;
        if (errors[field]) {
          setValidationErrors((prev) => {
            const newErrors = new Map(prev);
            const cutErrors = { ...errors };
            delete cutErrors[field];
            if (Object.keys(cutErrors).length === 0) {
              newErrors.delete(cutId);
            } else {
              newErrors.set(cutId, cutErrors);
            }
            return newErrors;
          });
        }
      }
      
      return newMap;
    });
  };

  const validateCutInputs = (cutData: CutInputData): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!cutData.startTime || !cutData.startTime.trim()) {
      errors.startTime = "Start Time is required.";
    } else {
      // Validate date/time format (DD/MM/YYYY HH:mm)
      const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
      if (!dateTimeRegex.test(cutData.startTime.trim())) {
        errors.startTime = "Please enter date and time in DD/MM/YYYY HH:MM format.";
      }
    }
    
    if (!cutData.endTime || !cutData.endTime.trim()) {
      errors.endTime = "End Time is required.";
    } else {
      // Validate date/time format (DD/MM/YYYY HH:mm)
      const dateTimeRegex = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;
      if (!dateTimeRegex.test(cutData.endTime.trim())) {
        errors.endTime = "Please enter date and time in DD/MM/YYYY HH:MM format.";
      }
    }
    
    if (!cutData.machineNumber || !cutData.machineNumber.trim()) {
      errors.machineNumber = "Machine Number is required.";
    }
    
    if (!cutData.opsName || !cutData.opsName.trim()) {
      errors.opsName = "Operator Name is required.";
    }
    
    // Machine Hrs is auto-calculated, so we check if it's valid
    if (!cutData.machineHrs || parseFloat(cutData.machineHrs) < 0) {
      errors.machineHrs = "Please enter valid Start Time and End Time.";
    }
    
    return errors;
  };

  const handleSubmit = async () => {
    if (!groupId || jobs.length === 0) return;
    
    // Validate all cuts and collect errors
    const newErrors = new Map<number | string, Record<string, string>>();
    let hasErrors = false;
    
    for (const job of jobs) {
      const cutData = cutInputs.get(job.id as number);
      if (cutData) {
        const errors = validateCutInputs(cutData);
        if (Object.keys(errors).length > 0) {
          newErrors.set(job.id as number, errors);
          hasErrors = true;
          // Expand the cut if it has errors
          setExpandedCuts((prev) => {
            const newSet = new Set(prev);
            newSet.add(job.id as number);
            return newSet;
          });
        }
      }
    }
    
    if (hasErrors) {
      setValidationErrors(newErrors);
      // Scroll to first error
      const firstErrorCut = jobs.find((job) => newErrors.has(job.id as number));
      if (firstErrorCut) {
        const element = document.querySelector(`[data-cut-id="${firstErrorCut.id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }
    
    // Clear errors if validation passes
    setValidationErrors(new Map());
    
    try {
      const updatePromises: Promise<any>[] = [];
      
      for (const job of jobs) {
        const cutData = cutInputs.get(job.id as number);
        if (cutData) {
          let imageBase64 = cutData.lastImage;
          if (cutData.lastImageFile) {
            const reader = new FileReader();
            await new Promise<void>((resolve, reject) => {
              reader.onloadend = () => {
                imageBase64 = reader.result as string;
                resolve();
              };
              reader.onerror = reject;
              reader.readAsDataURL(cutData.lastImageFile!);
            });
          }
          
            updatePromises.push(
              updateOperatorJob(String(job.id), {
                ...job,
                lastImage: imageBase64,
                startTime: cutData.startTime,
                endTime: cutData.endTime,
                machineHrs: cutData.machineHrs,
                machineNumber: cutData.machineNumber,
                opsName: cutData.opsName,
                idleTime: cutData.idleTime || "",
                idleTimeDuration: cutData.idleTimeDuration || "",
              } as any)
            );
        }
      }
      
      await Promise.all(updatePromises);
      setToast({ message: "Job details updated successfully!", variant: "success", visible: true });
      setTimeout(() => {
        setToast({ message: "", variant: "success", visible: false });
        navigate("/operator");
      }, 2000);
    } catch (error) {
      console.error("Failed to update jobs", error);
      setToast({ message: "Failed to update job details. Please try again.", variant: "error", visible: true });
      setTimeout(() => setToast({ ...toast, visible: false }), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return dateString || "—";
    const day = parsed.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    const hours = parsed.getHours().toString().padStart(2, "0");
    const minutes = parsed.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${minutes}`;
  };

  const amounts = useMemo(() => {
    if (jobs.length === 0) return { perCut: [], totalWedmAmount: 0, totalSedmAmount: 0 };
    const totals = jobs.map((entry) => calculateTotals(entry as CutForm));
    const totalWedmAmount = totals.reduce((sum, t) => sum + t.wedmAmount, 0);
    const totalSedmAmount = totals.reduce((sum, t) => sum + t.sedmAmount, 0);
    return {
      perCut: totals.map((t) => ({ wedmAmount: t.wedmAmount, sedmAmount: t.sedmAmount })),
      totalWedmAmount,
      totalSedmAmount,
    };
  }, [jobs]);

  const parentJob = jobs.length > 0 ? jobs[0] : null;
  const groupTotalHrs = jobs.reduce((sum, job) => sum + (job.totalHrs || 0), 0);
  const groupTotalAmount = jobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);

  const getCutInputData = (cutId: number | string): CutInputData => {
    return cutInputs.get(cutId) || {
      startTime: "",
      endTime: "",
      machineHrs: "",
      machineNumber: "",
      opsName: "",
      idleTime: "",
      idleTimeDuration: "",
      lastImage: null,
      lastImageFile: null,
    };
  };


  return (
    <div className="roleboard-container">
      <Sidebar currentPath="/operator" onNavigate={(path) => navigate(path)} />
      <div className="roleboard-content">
        <Header title="Operator View" />
        <div className="programmer-panel operator-viewpage-panel">
          {jobs.length > 0 && parentJob && (
            <>
              {/* Page Heading */}
              <div className="operator-page-heading">
                <h2>Job Details - {parentJob.customer || "N/A"}</h2>
                {cutIdParam && (
                  <span className="cut-indicator">
                    Viewing Cut {jobs.findIndex((j) => String(j.id) === String(cutIdParam)) + 1}
                  </span>
                )}
              </div>

              {/* Job Information Section */}
              <div className="operator-job-info-section">
                <h3 className="operator-section-title">Job Information</h3>
                <div className="operator-job-info-grid">
                  <div className="operator-info-card">
                    <label>Customer</label>
                    <span>{parentJob.customer || "—"}</span>
                  </div>
                  <div className="operator-info-card">
                    <label>Created By</label>
                    <span>{parentJob.createdBy || "—"}</span>
                  </div>
                  <div className="operator-info-card">
                    <label>Created At</label>
                    <span>{formatDate(parentJob.createdAt)}</span>
                  </div>
                  {(parentJob as any)?.updatedBy && (
                    <div className="operator-info-card">
                      <label>Updated By</label>
                      <span>{(parentJob as any).updatedBy || "—"}</span>
                    </div>
                  )}
                  {(parentJob as any)?.updatedAt && (
                    <div className="operator-info-card">
                      <label>Updated At</label>
                      <span>{formatDate((parentJob as any).updatedAt)}</span>
                    </div>
                  )}
                  <div className="operator-info-card">
                    <label>Ref Number</label>
                    <span>#{(parentJob as any)?.refNumber || groupId || "—"}</span>
                  </div>
                  <div className="operator-info-card">
                    <label>Priority</label>
                    <span className={`priority-badge priority-${(parentJob.priority || "").toLowerCase()}`}>
                      {parentJob.priority || "—"}
                    </span>
                  </div>
                  <div className="operator-info-card">
                    <label>Complex</label>
                    <span className={parentJob.critical ? "complex-badge yes" : "complex-badge no"}>
                      {parentJob.critical ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cuts Information Section */}
              <div className="operator-cuts-section">
                <h3 className="operator-section-title">Cuts ({jobs.length})</h3>
                <div className="operator-cuts-container">
                  {jobs.map((cutItem, index) => {
                    const cutData = getCutInputData(cutItem.id);
                    const isExpanded = expandedCuts.has(cutItem.id);
                    
                    return (
                      <div key={cutItem.id} className="operator-cut-card">
                        <div 
                          className="operator-cut-header"
                          onClick={() => toggleCutExpansion(cutItem.id)}
                        >
                          <h4>Cut {index + 1}</h4>
                          <div className="cut-expand-indicator">
                            {isExpanded ? "▼" : "▶"}
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <>
                            {/* Cut Details */}
                            <div className="operator-cut-details-section">
                              <div className="operator-cut-details-grid">
                                <div className="cut-detail-item">
                                  <label>Customer</label>
                                  <span>{cutItem.customer || "—"}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Rate (₹/hr)</label>
                                  <span>₹{Number(cutItem.rate || 0).toFixed(2)}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Cut Length (mm)</label>
                                  <span>{Number(cutItem.cut || 0).toFixed(2)}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Description</label>
                                  <span>{cutItem.description || "—"}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>TH (MM)</label>
                                  <span>{Number(cutItem.thickness || 0).toFixed(2)}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Pass</label>
                                  <span>{cutItem.passLevel || "—"}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Setting</label>
                                  <span>{cutItem.setting || "—"}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Quantity</label>
                                  <span>{Number(cutItem.qty || 0)}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>SEDM</label>
                                  <span>{cutItem.sedm || "—"}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Material</label>
                                  <span>{cutItem.material || "—"}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>PIP Finish</label>
                                  <span className={cutItem.pipFinish ? "pip-badge yes" : "pip-badge no"}>
                                    {cutItem.pipFinish ? "Yes" : "No"}
                                  </span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Complex</label>
                                  <span className={cutItem.critical ? "complex-badge yes" : "complex-badge no"}>
                                    {cutItem.critical ? "Yes" : "No"}
                                  </span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Priority</label>
                                  <span className={`priority-badge priority-${(cutItem.priority || "").toLowerCase()}`}>
                                    {cutItem.priority || "—"}
                                  </span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Total Hrs/Piece</label>
                                  <span>{cutItem.totalHrs ? cutItem.totalHrs.toFixed(3) : "0.000"}</span>
                                </div>
                                <div className="cut-detail-item">
                                  <label>Total Amount (₹)</label>
                                  <span>₹{cutItem.totalAmount ? cutItem.totalAmount.toFixed(2) : "0.00"}</span>
                                </div>
                              </div>
                              
                              {/* Cut-specific Image Upload */}
                              <div className="operator-cut-image-section">
                                <label>Last Image (Cut {index + 1})</label>
                                <ImageUpload
                                  image={cutData.lastImage || cutItem.cutImage || null}
                                  label={`Cut ${index + 1} Last Image`}
                                  onImageChange={(file) => handleCutImageChange(cutItem.id, file)}
                                  onRemove={() => handleCutImageChange(cutItem.id, null)}
                                />
                              </div>
                            </div>

                            {/* Input Fields for this Cut */}
                            <div className="operator-cut-inputs-section" data-cut-id={cutItem.id}>
                              <h5 className="operator-inputs-title">Input Values</h5>
                              <div className="operator-inputs-grid">
                                <div className="operator-input-card">
                                  <label>Start Time</label>
                                  <DateTimeInput
                                    value={cutData.startTime}
                                    onChange={(value) => handleInputChange(cutItem.id, "startTime", value)}
                                    placeholder="DD/MM/YYYY HH:MM"
                                    error={validationErrors.get(cutItem.id as number)?.startTime}
                                  />
                                </div>
                                <div className="operator-input-card">
                                  <label>End Time</label>
                                  <DateTimeInput
                                    value={cutData.endTime}
                                    onChange={(value) => handleInputChange(cutItem.id, "endTime", value)}
                                    placeholder="DD/MM/YYYY HH:MM"
                                    error={validationErrors.get(cutItem.id as number)?.endTime}
                                  />
                                </div>
                                <div className="operator-input-card">
                                  <label>Machine Hrs</label>
                                  <input
                                    type="text"
                                    value={cutData.machineHrs ? decimalHoursToHHMM(parseFloat(cutData.machineHrs)) : "00:00"}
                                    readOnly
                                    placeholder="00:00"
                                    className="readonly-input"
                                  />
                                  {validationErrors.get(cutItem.id as number)?.machineHrs && (
                                    <p className="field-error">{validationErrors.get(cutItem.id as number)!.machineHrs}</p>
                                  )}
                                </div>
                                <div className="operator-input-card">
                                  <label>Mach #</label>
                                  <input
                                    type="text"
                                    value={cutData.machineNumber}
                                    onChange={(e) => handleInputChange(cutItem.id, "machineNumber", e.target.value)}
                                    placeholder="Machine Number"
                                    className={validationErrors.get(cutItem.id as number)?.machineNumber ? "input-error" : ""}
                                  />
                                  {validationErrors.get(cutItem.id as number)?.machineNumber && (
                                    <p className="field-error">{validationErrors.get(cutItem.id as number)!.machineNumber}</p>
                                  )}
                                </div>
                                <div className="operator-input-card">
                                  <label>Ops Name</label>
                                  <input
                                    type="text"
                                    value={cutData.opsName}
                                    onChange={(e) => handleInputChange(cutItem.id, "opsName", e.target.value)}
                                    placeholder="Operator Name"
                                    className={validationErrors.get(cutItem.id as number)?.opsName ? "input-error" : ""}
                                  />
                                  {validationErrors.get(cutItem.id as number)?.opsName && (
                                    <p className="field-error">{validationErrors.get(cutItem.id as number)!.opsName}</p>
                                  )}
                                </div>
                                <div className="operator-input-card">
                                  <label>Idle Time</label>
                                  <select 
                                    value={cutData.idleTime} 
                                    onChange={(e) => handleInputChange(cutItem.id, "idleTime", e.target.value)}
                                  >
                                    <option value="">Select</option>
                                    <option value="Power Break">Power Break</option>
                                    <option value="Machine Breakdown">Machine Breakdown</option>
                                    <option value="Vertical Dial">Vertical Dial</option>
                                    <option value="Cleaning">Cleaning</option>
                                    <option value="Consumables Change">Consumables Change</option>
                                  </select>
                                </div>
                                {cutData.idleTime && (
                                  <div className="operator-input-card">
                                    <label>Idle Time Duration</label>
                                    <div className="idle-time-duration-wrapper">
                                      <input
                                        type="text"
                                        value={cutData.idleTimeDuration}
                                        onChange={(e) => handleInputChange(cutItem.id, "idleTimeDuration", e.target.value)}
                                        placeholder={cutData.idleTime === "Vertical Dial" ? "00:20" : "HH:MM"}
                                        readOnly={cutData.idleTime === "Vertical Dial"}
                                        className={cutData.idleTime === "Vertical Dial" ? "readonly-input" : ""}
                                      />
                                      {cutData.idleTimeDuration && (
                                        <button
                                          type="button"
                                          className="idle-time-reset-icon"
                                          onClick={() => handleInputChange(cutItem.id, "idleTimeDuration", "")}
                                          aria-label="Clear idle time duration"
                                          title="Clear idle time duration"
                                        >
                                          <ClearIcon fontSize="small" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals Section */}
              <div className="operator-totals-section">
                <div className="operator-total-card">
                  <label>Total Hrs/Piece</label>
                  <span>{groupTotalHrs ? groupTotalHrs.toFixed(3) : "0.000"}</span>
                </div>
                <div className="operator-total-card">
                  <label>WEDM Amount (₹)</label>
                  <span>₹{amounts.totalWedmAmount.toFixed(2)}</span>
                </div>
                <div className="operator-total-card">
                  <label>SEDM Amount (₹)</label>
                  <span>₹{amounts.totalSedmAmount.toFixed(2)}</span>
                </div>
                <div className="operator-total-card">
                  <label>Total Amount (₹)</label>
                  <span>₹{groupTotalAmount ? groupTotalAmount.toFixed(2) : "0.00"}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="operator-view-actions">
                <button className="btn-secondary" onClick={() => navigate("/operator")}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSubmit}>
                  Submit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </div>
  );
};

export default OperatorViewPage;
