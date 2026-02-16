import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getCurrentUser,
  getMyMainProjects,
  getSubprojects,
  getProjectIssues,
} from "../api/redmineApi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
  Cell,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import "./StateMinisterDashboard.css";

// ============================
// STATUS CONFIGURATION
// ============================

// Status configuration
const STATUS_CONFIG = {
  ACHIEVED: { 
    label: "Achieved", 
    color: "#2E7D32", 
    textColor: "#ffffff",
    icon: "✓", 
    threshold: 95 
  },
  ON_TRACK: { 
    label: "On Track", 
    color: "#1976d2", 
    textColor: "#ffffff",
    icon: "↗", 
    threshold: 85 
  },
  IN_PROGRESS: { 
    label: "In Progress", 
    color: "#f57c00", 
    textColor: "#000000",
    icon: "⏳", 
    threshold: 65 
  },
  WEAK: { 
    label: "Weak Performance", 
    color: "#6a1b9a", 
    textColor: "#ffffff",
    icon: "⚠", 
    threshold: 50 
  },
  INTERVENTION: { 
    label: "Requires Intervention", 
    color: "#d32f2f", 
    textColor: "#ffffff",
    icon: "🚨", 
    threshold: 0 
  },
};

// Get contrasting text color
const getContrastColor = (hexColor) => {
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
};

// Helper function to filter issues without parent
const filterTopLevelIssues = (issues) => {
  return issues.filter(issue => !issue.parent_id && !issue.parent);
};

// Helper function to get all child issues recursively
const getAllChildIssues = (allIssues, parentId) => {
  const children = allIssues.filter(issue => issue.parent_id === parentId || issue.parent?.id === parentId);
  let allDescendants = [...children];
  
  children.forEach(child => {
    const grandchildren = getAllChildIssues(allIssues, child.id);
    allDescendants = [...allDescendants, ...grandchildren];
  });
  
  return allDescendants;
};

// ============================
// PERIOD FILTER FUNCTIONS
// ============================

// Period options
const periodOptions = [
  "Yearly",
  "1ኛ ሩብዓመት",
  "2ኛ ሩብዓመት", 
  "3ኛ ሩብዓመት",
  "4ኛ ሩብዓመት",
  "6 Months",
  "9 Months"
];

// Helper function to get quarter index
const getQuarterIndex = (quarterName) => {
  switch (quarterName) {
    case "1ኛ ሩብዓመት": return 1;
    case "2ኛ ሩብዓመት": return 2;
    case "3ኛ ሩብዓመት": return 3;
    case "4ኛ ሩብዓመት": return 4;
    default: return 0;
  }
};

// Get custom field value from issue
const getField = (issue, fieldName) => {
  const field = issue.custom_fields?.find((f) => f.name === fieldName);
  return field?.value;
};

// Get weight value from issue
const getWeight = (issue) => {
  const weightField = issue.custom_fields?.find(f => 
    f.name === "ክብደት" || f.name === "Weight"
  );
  
  if (!weightField) return null;
  
  const weight = parseFloat(weightField.value);
  return isNaN(weight) ? null : weight;
};

// Format weight for display
const formatWeight = (weight) => {
  if (weight === null || weight === undefined) return 'N/A';
  return `${weight}%`;
};

// Helper function to get progress percentage for a period (for sub-issues only)
const getProgressForPeriod = (issue, period) => {
  if (!issue) return 0;
  
  if (period === "Yearly") {
    const q1Actual = parseFloat(getField(issue, "1ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q2Actual = parseFloat(getField(issue, "2ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q3Actual = parseFloat(getField(issue, "3ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q4Actual = parseFloat(getField(issue, "4ኛ ሩብዓመት_አፈጻጸም") || "0");
    const yearlyTarget = parseFloat(getField(issue, "የዓመቱ እቅድ") || "0");
    
    const totalActual = q1Actual + q2Actual + q3Actual + q4Actual;
    
    if (yearlyTarget <= 0) return 0;
    
    const progress = (totalActual * 100) / yearlyTarget;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }
  
  if (period === "6 Months") {
    const q1Actual = parseFloat(getField(issue, "1ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q2Actual = parseFloat(getField(issue, "2ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q1Target = parseFloat(getField(issue, "1ኛ ሩብዓመት") || "0");
    const q2Target = parseFloat(getField(issue, "2ኛ ሩብዓመት") || "0");
    
    const totalActual = q1Actual + q2Actual;
    const totalTarget = q1Target + q2Target;
    
    if (totalTarget <= 0) return 0;
    
    const progress = (totalActual * 100) / totalTarget;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }
  
  if (period === "9 Months") {
    const q1Actual = parseFloat(getField(issue, "1ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q2Actual = parseFloat(getField(issue, "2ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q3Actual = parseFloat(getField(issue, "3ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q1Target = parseFloat(getField(issue, "1ኛ ሩብዓመት") || "0");
    const q2Target = parseFloat(getField(issue, "2ኛ ሩብዓመት") || "0");
    const q3Target = parseFloat(getField(issue, "3ኛ ሩብዓመት") || "0");
    
    const totalActual = q1Actual + q2Actual + q3Actual;
    const totalTarget = q1Target + q2Target + q3Target;
    
    if (totalTarget <= 0) return 0;
    
    const progress = (totalActual * 100) / totalTarget;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }
  
  // For quarterly periods
  const quarterIndex = getQuarterIndex(period);
  let quarterActual, quarterTarget;
  
  switch (quarterIndex) {
    case 1:
      quarterActual = parseFloat(getField(issue, "1ኛ ሩብዓመት_አፈጻጸም") || "0");
      quarterTarget = parseFloat(getField(issue, "1ኛ ሩብዓመት") || "0");
      break;
    case 2:
      quarterActual = parseFloat(getField(issue, "2ኛ ሩብዓመት_አፈጻጸም") || "0");
      quarterTarget = parseFloat(getField(issue, "2ኛ ሩብዓመት") || "0");
      break;
    case 3:
      quarterActual = parseFloat(getField(issue, "3ኛ ሩብዓመት_አፈጻጸም") || "0");
      quarterTarget = parseFloat(getField(issue, "3ኛ ሩብዓመት") || "0");
      break;
    case 4:
      quarterActual = parseFloat(getField(issue, "4ኛ ሩብዓመት_አፈጻጸም") || "0");
      quarterTarget = parseFloat(getField(issue, "4ኛ ሩብዓመት") || "0");
      break;
    default:
      return 0;
  }
  
  if (quarterTarget <= 0) return 0;
  
  const progress = (quarterActual * 100) / quarterTarget;
  return Math.min(100, Math.max(0, Math.round(progress)));
};

// Check if target value is valid for the period
const isValidTargetValue = (targetValue, period) => {
  if (!targetValue) return false;
  
  const trimmed = targetValue.toString().trim();
  
  if (trimmed === "" || 
      trimmed === "0" || 
      trimmed === "0.0" || 
      trimmed === "0.00" ||
      trimmed === "0.000" ||
      trimmed.toLowerCase() === "null" ||
      trimmed.toLowerCase() === "undefined" ||
      trimmed.toLowerCase() === "nan") {
    return false;
  }
  
  const numValue = parseFloat(trimmed);
  
  if (isNaN(numValue) || numValue <= 0) {
    return false;
  }
  
  return true;
};

// Filter sub-issues by period
const filterSubIssuesByPeriod = (subIssues, period) => {
  if (!subIssues || subIssues.length === 0) return [];
  
  if (period === "Yearly") {
    return subIssues.filter(issue => {
      const yearlyValue = getField(issue, "የዓመቱ እቅድ");
      return isValidTargetValue(yearlyValue, period);
    });
  }

  if (period === "6 Months") {
    return subIssues.filter(issue => {
      const q1 = getField(issue, "1ኛ ሩብዓመት");
      const q2 = getField(issue, "2ኛ ሩብዓመት");
      
      const hasQ1 = isValidTargetValue(q1, "1ኛ ሩብዓመት");
      const hasQ2 = isValidTargetValue(q2, "2ኛ ሩብዓመት");
      
      return hasQ1 || hasQ2;
    });
  }

  if (period === "9 Months") {
    return subIssues.filter(issue => {
      const q1 = getField(issue, "1ኛ ሩብዓመት");
      const q2 = getField(issue, "2ኛ ሩብዓመት");
      const q3 = getField(issue, "3ኛ ሩብዓመት");
      
      const hasQ1 = isValidTargetValue(q1, "1ኛ ሩብዓመት");
      const hasQ2 = isValidTargetValue(q2, "2ኛ ሩብዓመት");
      const hasQ3 = isValidTargetValue(q3, "3ኛ ሩብዓመት");
      
      return hasQ1 || hasQ2 || hasQ3;
    });
  }

  return subIssues.filter(issue => {
    const quarterValue = getField(issue, period);
    return isValidTargetValue(quarterValue, period);
  });
};

// Get target value based on selected period
const getTargetValue = (issue, period) => {
  if (!issue) return "0";
  
  if (period === "Yearly") {
    return getField(issue, "የዓመቱ እቅድ") || "0";
  }
  
  if (period === "6 Months") {
    const q1 = parseFloat(getField(issue, "1ኛ ሩብዓመት") || "0") || 0;
    const q2 = parseFloat(getField(issue, "2ኛ ሩብዓመት") || "0") || 0;
    const sum = q1 + q2;
    return sum > 0 ? sum.toString() : "0";
  }
  
  if (period === "9 Months") {
    const q1 = parseFloat(getField(issue, "1ኛ ሩብዓመት") || "0") || 0;
    const q2 = parseFloat(getField(issue, "2ኛ ሩብዓመት") || "0") || 0;
    const q3 = parseFloat(getField(issue, "3ኛ ሩብዓመት") || "0") || 0;
    const sum = q1 + q2 + q3;
    return sum > 0 ? sum.toString() : "0";
  }
  
  return getField(issue, period) || "0";
};

// Get actual performance value based on selected period
const getActualValue = (issue, period) => {
  if (period === "Yearly") {
    const q1Actual = parseFloat(getField(issue, "1ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q2Actual = parseFloat(getField(issue, "2ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q3Actual = parseFloat(getField(issue, "3ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q4Actual = parseFloat(getField(issue, "4ኛ ሩብዓመት_አፈጻጸም") || "0");
    
    return q1Actual + q2Actual + q3Actual + q4Actual;
  }
  
  if (period === "6 Months") {
    const q1Actual = parseFloat(getField(issue, "1ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q2Actual = parseFloat(getField(issue, "2ኛ ሩብዓመት_አፈጻጸም") || "0");
    
    return q1Actual + q2Actual;
  }
  
  if (period === "9 Months") {
    const q1Actual = parseFloat(getField(issue, "1ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q2Actual = parseFloat(getField(issue, "2ኛ ሩብዓመት_አፈጻጸም") || "0");
    const q3Actual = parseFloat(getField(issue, "3ኛ ሩብዓመት_አፈጻጸም") || "0");
    
    return q1Actual + q2Actual + q3Actual;
  }
  
  const quarterIndex = getQuarterIndex(period);
  switch (quarterIndex) {
    case 1:
      return parseFloat(getField(issue, "1ኛ ሩብዓመት_አፈጻጸም") || "0");
    case 2:
      return parseFloat(getField(issue, "2ኛ ሩብዓመት_አፈጻጸም") || "0");
    case 3:
      return parseFloat(getField(issue, "3ኛ ሩብዓመት_አፈጻጸም") || "0");
    case 4:
      return parseFloat(getField(issue, "4ኛ ሩብዓመት_አፈጻጸም") || "0");
    default:
      return 0;
  }
};

// Calculate actual weight value based on the formula: (Actual * Weight) / Target
// with bounds: min 0, max = weight value
const calculateActualWeight = (issue, period) => {
  const weight = getWeight(issue);
  const target = parseFloat(getTargetValue(issue, period));
  const actual = getActualValue(issue, period);
  
  // Return null if any required value is missing or invalid
  if (weight === null || weight === undefined || isNaN(weight) || 
      !target || target <= 0 || 
      actual === undefined || actual === null) {
    return null;
  }
  
  let actualWeight = (actual * weight) / target;
  
  // Apply bounds: cannot be less than 0
  if (actualWeight < 0) {
    actualWeight = 0;
  }
  
  // Apply bounds: cannot exceed the weight value
  if (actualWeight > weight) {
    actualWeight = weight;
  }
  
  return actualWeight;
};

// ============================
// NEW FUNCTION: Calculate Sum of Actual Weights for All Sub-Issues in a Department
// ============================

const calculateDepartmentActualWeightSum = (department, period) => {
  if (!department || !department.goals) return 0;
  
  let totalActualWeight = 0;
  let hasValidData = false;
  
  // Iterate through all goals in the department
  department.goals.forEach(goal => {
    if (goal.topLevelIssues && goal.topLevelIssues.length > 0) {
      // Iterate through all top-level issues
      goal.topLevelIssues.forEach(topIssue => {
        // Get all sub-issues (child issues) for this top-level issue
        const subIssues = topIssue.childIssues || [];
        
        if (subIssues.length > 0) {
          // Filter sub-issues by period
          const filteredSubIssues = filterSubIssuesByPeriod(subIssues, period);
          
          // Calculate actual weight for each sub-issue and sum them
          filteredSubIssues.forEach(subIssue => {
            const actualWeight = calculateActualWeight(subIssue, period);
            if (actualWeight !== null && !isNaN(actualWeight)) {
              totalActualWeight += actualWeight;
              hasValidData = true;
            }
          });
        }
      });
    }
  });
  
  return hasValidData ? parseFloat(totalActualWeight.toFixed(2)) : 0;
};

// ============================
// QUARTERLY PROGRESS CALCULATION FUNCTIONS
// ============================

// Get quarterly performance custom fields
const getQuarterlyPerformance = (issue) => {
  return {
    q1_performance: parseFloat(issue.custom_fields?.find(f => f.name === "1ኛ ሩብዓመት_አፈጻጸም")?.value) || 0,
    q2_performance: parseFloat(issue.custom_fields?.find(f => f.name === "2ኛ ሩብዓመት_አፈጻጸም")?.value) || 0,
    q3_performance: parseFloat(issue.custom_fields?.find(f => f.name === "3ኛ ሩብዓመት_አፈጻጸም")?.value) || 0,
    q4_performance: parseFloat(issue.custom_fields?.find(f => f.name === "4ኛ ሩብዓመት_አፈጻጸም")?.value) || 0,
  };
};

// Get quarterly plan values
const getQuarterlyPlan = (issue) => {
  return {
    q1_plan: parseFloat(issue.custom_fields?.find(f => f.name === "1ኛ ሩብዓመት")?.value) || 0,
    q2_plan: parseFloat(issue.custom_fields?.find(f => f.name === "2ኛ ሩብዓመት")?.value) || 0,
    q3_plan: parseFloat(issue.custom_fields?.find(f => f.name === "3ኛ ሩብዓመት")?.value) || 0,
    q4_plan: parseFloat(issue.custom_fields?.find(f => f.name === "4ኛ ሩብዓመት")?.value) || 0,
  };
};

// Get yearly plan
const getYearlyPlan = (issue) => {
  return parseFloat(issue.custom_fields?.find(f => f.name === "የዓመቱ እቅድ")?.value) || 0;
};

// Calculate quarterly progress percentage
const calculateQuarterProgress = (performance, plan) => {
  if (!plan || plan === 0) return 0;
  return Math.min(100, Math.round((performance * 100) / plan));
};

// Calculate overall yearly progress percentage
const calculateYearlyProgress = (issue) => {
  const perf = getQuarterlyPerformance(issue);
  const plan = getQuarterlyPlan(issue);
  const yearlyPlan = getYearlyPlan(issue);
  
  const totalPerformance = perf.q1_performance + perf.q2_performance + perf.q3_performance + perf.q4_performance;
  
  if (!yearlyPlan || yearlyPlan === 0) return 0;
  return Math.min(100, Math.round((totalPerformance * 100) / yearlyPlan));
};

// Get progress color based on percentage (kept for backward compatibility)
const getProgressColor = (percentage) => {
  if (percentage >= 90) return "#2e7d32";
  if (percentage >= 75) return "#4caf50";
  if (percentage >= 60) return "#ff9800";
  if (percentage >= 40) return "#6a1b9a";
  return "#d32f2f";
};

// NEW: Get color based on actual weight sum (for departments)
const getActualWeightColor = (weightSum) => {
  if (weightSum >= 90) return "#2e7d32";
  if (weightSum >= 75) return "#4caf50";
  if (weightSum >= 60) return "#ff9800";
  if (weightSum >= 40) return "#6a1b9a";
  return "#d32f2f";
};

// Helper function to truncate text
const truncateText = (text, maxLength = 20) => {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

// Icons as text
const Icons = {
  ArrowBack: () => <span className="icon">←</span>,
  Download: () => <span className="icon">📥</span>,
  Refresh: () => <span className="icon">🔄</span>,
  TrendingUp: () => <span className="icon">📈</span>,
  Warning: () => <span className="icon">⚠</span>,
  CheckCircle: () => <span className="icon">✓</span>,
  Schedule: () => <span className="icon">⏰</span>,
  Error: () => <span className="icon">❌</span>,
  Timeline: () => <span className="icon">📊</span>,
  FilterList: () => <span className="icon">☰</span>,
  ExpandMore: () => <span className="icon">▼</span>,
  Calendar: () => <span className="icon">📅</span>,
  Target: () => <span className="icon">🎯</span>,
  ChartLine: () => <span className="icon">📉</span>,
  Building: () => <span className="icon">🏢</span>,
  Trophy: () => <span className="icon">🏆</span>,
  Alert: () => <span className="icon">🔴</span>,
  Sector: () => <span className="icon">🏛️</span>,
  Department: () => <span className="icon">📋</span>,
  Organization: () => <span className="icon">🏢</span>,
  Team: () => <span className="icon">👥</span>,
  Add: () => <span className="icon">➕</span>,
  SubIssue: () => <span className="icon">↳</span>,
  Issue: () => <span className="icon">📌</span>,
  BackToParent: () => <span className="icon">⬆</span>,
  Close: () => <span className="icon">✕</span>,
  Fullscreen: () => <span className="icon">⛶</span>,
  Weight: () => <span className="icon">⚖️</span>,
  ActualWeight: () => <span className="icon">📊</span>,
};

// ============================
// FUNCTION TO CALCULATE BEST DEPARTMENTS
// ============================

const calculateBestDepartments = (departments) => {
  // Filter out departments with actualWeightSum <= 0
  const validDepartments = departments.filter(dept => dept.actualWeightSum > 0);
  
  if (validDepartments.length === 0) return null;
  
  // Find the maximum actualWeightSum among valid departments
  const maxWeightSum = Math.max(...validDepartments.map(dept => dept.actualWeightSum));
  
  // Get all departments that have the maximum weight sum
  const bestDepartments = validDepartments.filter(dept => dept.actualWeightSum === maxWeightSum);
  
  return bestDepartments;
};

export default function MinisterDashboard() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(null);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [selectedTopLevelIssue, setSelectedTopLevelIssue] = useState(null);
  const [subIssues, setSubIssues] = useState([]);
  const [bestDepartments, setBestDepartments] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalGoals: 0,
    completedGoals: 0,
    totalIssues: 0,
    avgProgress: 0,
    statusDistribution: {},
  });
  const [error, setError] = useState(null);
  const [collapsedDepartments, setCollapsedDepartments] = useState(new Set());
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [filterCategory, setFilterCategory] = useState(null);
  const [goalViewTab, setGoalViewTab] = useState("chart");
  const [rawDepartments, setRawDepartments] = useState([]);
  
  // Detailed Analysis Tab States
  const [analysisView, setAnalysisView] = useState('departments');
  const [selectedAnalysisDept, setSelectedAnalysisDept] = useState(null);
  const [selectedAnalysisGoal, setSelectedAnalysisGoal] = useState(null);
  const [expandedGoals, setExpandedGoals] = useState(new Set());
  const [selectedIssueForSubIssues, setSelectedIssueForSubIssues] = useState(null);
  const [showSubIssuesModal, setShowSubIssuesModal] = useState(false);
  
  // Full Page Sub-Issues View States
  const [fullPageSubIssues, setFullPageSubIssues] = useState(false);
  const [fullPageParentIssue, setFullPageParentIssue] = useState(null);
  const [fullPageSubIssuesList, setFullPageSubIssuesList] = useState([]);
  const [fullPageGoal, setFullPageGoal] = useState(null);
  const [fullPageDepartment, setFullPageDepartment] = useState(null);
  const [fullPageViewTab, setFullPageViewTab] = useState("chart");
  
  // PERIOD FILTER STATE
  const [selectedPeriod, setSelectedPeriod] = useState("Yearly");

  // Memoized status determination using yearly progress
  const getGoalStatus = useCallback((progress) => {
    let status;
    if (progress >= STATUS_CONFIG.ACHIEVED.threshold) {
      status = STATUS_CONFIG.ACHIEVED;
    } else if (progress >= STATUS_CONFIG.ON_TRACK.threshold) {
      status = STATUS_CONFIG.ON_TRACK;
    } else if (progress >= STATUS_CONFIG.IN_PROGRESS.threshold) {
      status = STATUS_CONFIG.IN_PROGRESS;
    } else if (progress >= STATUS_CONFIG.WEAK.threshold) {
      status = STATUS_CONFIG.WEAK;
    } else {
      status = STATUS_CONFIG.INTERVENTION;
    }
    
    return {
      ...status,
      textColor: getContrastColor(status.color)
    };
  }, []);

  // Load data - ONLY on initial mount
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      const mainProjects = await getMyMainProjects();

      const departmentPromises = mainProjects.map(async (dep) => {
        try {
          // Fetch department goals (subprojects)
          const goals = await getSubprojects(dep.id).catch(() => []);

          // Fetch and process issues for each goal
          const goalsWithIssues = await Promise.all(
            goals.map(async (goal) => {
              try {
                // Fetch all issues for the goal project
                const issuesRaw = await getProjectIssues({ 
                  project_id: goal.id, 
                  status_id: "*" 
                }).catch(() => []);
                
                // Filter for top-level issues only
                const topLevelIssues = filterTopLevelIssues(issuesRaw);
                
                // For each top-level issue, get its child issues and calculate progress
                const topLevelIssuesWithChildren = topLevelIssues.map(issue => ({
                  ...issue,
                  childIssues: getAllChildIssues(issuesRaw, issue.id),
                  allSubIssues: issuesRaw.filter(i => i.parent_id === issue.id || i.parent?.id === issue.id),
                  // Calculate yearly progress for the issue
                  progress: calculateYearlyProgress(issue),
                  weight: getWeight(issue),
                  // Store quarterly data for potential detailed views
                  quarterlyData: {
                    q1: {
                      plan: getQuarterlyPlan(issue).q1_plan,
                      performance: getQuarterlyPerformance(issue).q1_performance,
                      progress: calculateQuarterProgress(
                        getQuarterlyPerformance(issue).q1_performance,
                        getQuarterlyPlan(issue).q1_plan
                      )
                    },
                    q2: {
                      plan: getQuarterlyPlan(issue).q2_plan,
                      performance: getQuarterlyPerformance(issue).q2_performance,
                      progress: calculateQuarterProgress(
                        getQuarterlyPerformance(issue).q2_performance,
                        getQuarterlyPlan(issue).q2_plan
                      )
                    },
                    q3: {
                      plan: getQuarterlyPlan(issue).q3_plan,
                      performance: getQuarterlyPerformance(issue).q3_performance,
                      progress: calculateQuarterProgress(
                        getQuarterlyPerformance(issue).q3_performance,
                        getQuarterlyPlan(issue).q3_plan
                      )
                    },
                    q4: {
                      plan: getQuarterlyPlan(issue).q4_plan,
                      performance: getQuarterlyPerformance(issue).q4_performance,
                      progress: calculateQuarterProgress(
                        getQuarterlyPerformance(issue).q4_performance,
                        getQuarterlyPlan(issue).q4_plan
                      )
                    }
                  },
                  yearlyPlan: getYearlyPlan(issue)
                }));
                
                return { 
                  ...goal, 
                  allIssues: issuesRaw,
                  topLevelIssues: topLevelIssuesWithChildren,
                  displayName: goal.name
                };
              } catch (err) {
                console.error(`Error loading issues for goal ${goal.name}:`, err);
                return {
                  ...goal,
                  allIssues: [],
                  topLevelIssues: [],
                  displayName: goal.name
                };
              }
            })
          );

          // Calculate department actual weight sum using the new function
          const actualWeightSum = calculateDepartmentActualWeightSum(
            { ...dep, goals: goalsWithIssues }, 
            "Yearly"
          );

          return {
            ...dep,
            displayName: dep.name,
            goals: goalsWithIssues,
            actualWeightSum, // Store the actual weight sum
            validIssuesCount: goalsWithIssues.reduce((count, goal) => 
              count + goal.topLevelIssues.length, 0),
            directTopLevelIssues: [],
          };
        } catch (err) {
          console.error(`Error loading department ${dep.name}:`, err);
          return { 
            ...dep, 
            displayName: dep.name,
            goals: [], 
            directTopLevelIssues: [],
            actualWeightSum: 0,
            validIssuesCount: 0
          };
        }
      });

      const allDepartmentData = await Promise.all(departmentPromises);
      
      // Sort departments by actual weight sum (descending)
      const sortedDepartments = [...allDepartmentData].sort((a, b) => b.actualWeightSum - a.actualWeightSum);
      
      setRawDepartments(allDepartmentData);
      setDepartments(sortedDepartments);
      
      // Calculate best departments
      const bestDepts = calculateBestDepartments(sortedDepartments);
      setBestDepartments(bestDepts);
      
      // Calculate stats
      const allGoals = allDepartmentData.flatMap(dep => dep.goals);
      const allIssues = allDepartmentData.flatMap(dep => 
        dep.goals.flatMap(goal => goal.topLevelIssues)
      );
      
      const statusDistribution = allGoals.reduce((acc, goal) => {
        const goalProgress = goal.topLevelIssues.length > 0 
          ? Math.round(goal.topLevelIssues.reduce((sum, issue) => sum + (issue.progress || 0), 0) / goal.topLevelIssues.length)
          : 0;
        const status = getGoalStatus(goalProgress).label;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      const totalWeightSum = allDepartmentData.reduce((sum, dep) => sum + dep.actualWeightSum, 0);
      const avgWeightSum = allDepartmentData.length > 0 
        ? Math.round(totalWeightSum / allDepartmentData.length) 
        : 0;
      
      setStats({
        totalGoals: allGoals.length,
        completedGoals: allGoals.filter(g => {
          const progress = g.topLevelIssues.length > 0 
            ? Math.round(g.topLevelIssues.reduce((sum, issue) => sum + (issue.progress || 0), 0) / g.topLevelIssues.length)
            : 0;
          return progress >= 95;
        }).length,
        totalIssues: allIssues.length,
        avgWeightSum,
        statusDistribution,
        validDepartmentsCount: allDepartmentData.filter(d => d.validIssuesCount > 0).length,
        totalDepartmentsCount: allDepartmentData.length
      });
      
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
      setRawDepartments([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [getGoalStatus]);

  // Load data ONLY on initial mount
  useEffect(() => {
    loadData();
  }, []);

  // Update department actual weight sums and best departments when period changes
  useEffect(() => {
    if (departments.length > 0) {
      const updatedDepartments = departments.map(dept => ({
        ...dept,
        actualWeightSum: calculateDepartmentActualWeightSum(dept, selectedPeriod)
      }));
      
      // Re-sort by updated actual weight sum
      const sortedUpdated = [...updatedDepartments].sort((a, b) => b.actualWeightSum - a.actualWeightSum);
      setDepartments(sortedUpdated);
      
      // Update best departments
      const bestDepts = calculateBestDepartments(sortedUpdated);
      setBestDepartments(bestDepts);
    }
  }, [selectedPeriod]);

  // Handlers for main dashboard
  const handleCategoryClick = useCallback((category) => {
    let filtered = [];
    
    switch(category) {
      case 'total': filtered = departments; break;
      case 'active': filtered = departments.filter(d => d.actualWeightSum > 0); break;
      case 'completed': filtered = departments.filter(d => d.actualWeightSum >= 90); break;
      case 'struggling': filtered = departments.filter(d => d.actualWeightSum < 50); break;
      case 'excellent': filtered = departments.filter(d => d.actualWeightSum >= 90); break;
      case 'good': filtered = departments.filter(d => d.actualWeightSum >= 75 && d.actualWeightSum < 90); break;
      case 'average': filtered = departments.filter(d => d.actualWeightSum >= 60 && d.actualWeightSum < 75); break;
      case 'poor': filtered = departments.filter(d => d.actualWeightSum >= 40 && d.actualWeightSum < 60); break;
      case 'critical': filtered = departments.filter(d => d.actualWeightSum < 40); break;
      default: filtered = departments;
    }
    
    setFilteredDepartments(filtered);
    setFilterCategory(category);
  }, [departments]);

  const clearFilter = useCallback(() => {
    setFilteredDepartments([]);
    setFilterCategory(null);
  }, []);

  const handleDepartmentClick = useCallback((dep) => {
    setSelectedDepartmentId(dep.id);
    setSelectedGoalId(null);
    setSelectedTopLevelIssue(null);
    setSubIssues([]);
    setActiveTab(0);
    setGoalViewTab("chart");
  }, []);

  const handleGoalClick = useCallback((goal, departmentId = null) => {
    if (departmentId && departmentId !== selectedDepartmentId) {
      setSelectedDepartmentId(departmentId);
      setTimeout(() => {
        setSelectedGoalId(goal.id);
        setSelectedTopLevelIssue(null);
        setSubIssues([]);
        setGoalViewTab("chart");
      }, 50);
    } else {
      setSelectedGoalId(goal.id);
      setSelectedTopLevelIssue(null);
      setSubIssues([]);
      setGoalViewTab("chart");
    }
  }, [selectedDepartmentId]);

  const handleBackToDepartments = useCallback(() => {
    setSelectedDepartmentId(null);
    setSelectedGoalId(null);
    setSelectedTopLevelIssue(null);
    setSubIssues([]);
    setGoalViewTab("chart");
  }, []);

  const handleBackToGoals = useCallback(() => {
    setSelectedGoalId(null);
    setSelectedTopLevelIssue(null);
    setSubIssues([]);
    setGoalViewTab("chart");
  }, []);

  const toggleDepartmentCollapse = useCallback((departmentId) => {
    setCollapsedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(departmentId)) {
        newSet.delete(departmentId);
      } else {
        newSet.add(departmentId);
      }
      return newSet;
    });
  }, []);

  // Detailed Analysis Tab Handlers
  const handleAnalysisDepartmentClick = useCallback((dept) => {
    setSelectedAnalysisDept(dept);
    setAnalysisView('goals');
    setSelectedAnalysisGoal(null);
    setExpandedGoals(new Set());
    setSelectedIssueForSubIssues(null);
    setShowSubIssuesModal(false);
  }, []);

  const handleBackToAnalysisDepartments = useCallback(() => {
    setAnalysisView('departments');
    setSelectedAnalysisDept(null);
    setSelectedAnalysisGoal(null);
    setExpandedGoals(new Set());
    setSelectedIssueForSubIssues(null);
    setShowSubIssuesModal(false);
  }, []);

  const handleBackToAnalysisGoals = useCallback(() => {
    setAnalysisView('goals');
    setSelectedAnalysisGoal(null);
    setExpandedGoals(new Set());
    setSelectedIssueForSubIssues(null);
    setShowSubIssuesModal(false);
  }, []);

  const toggleGoalExpand = useCallback((goalId) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  }, []);

  const handleGoalPlusClick = useCallback((goal, dept) => {
    setSelectedAnalysisDept(dept);
    setSelectedAnalysisGoal(goal);
    toggleGoalExpand(goal.id);
  }, [toggleGoalExpand]);

  // Function to calculate sub-issues with current period
  const calculateSubIssuesWithPeriod = useCallback((issue, period) => {
    if (!issue) return [];
    
    // Get all sub-issues
    const allSubIssues = issue.childIssues || [];
    
    // Apply period filter to sub-issues
    const filteredSubIssues = filterSubIssuesByPeriod(allSubIssues, period);
    
    // Calculate progress for filtered sub-issues using the selected period
    return filteredSubIssues.map(subIssue => ({
      ...subIssue,
      progress: getProgressForPeriod(subIssue, period),
      weight: getWeight(subIssue),
      periodTarget: getTargetValue(subIssue, period),
      periodActual: getActualValue(subIssue, period),
      actualWeight: calculateActualWeight(subIssue, period),
      quarterlyData: {
        q1: {
          plan: getQuarterlyPlan(subIssue).q1_plan,
          performance: getQuarterlyPerformance(subIssue).q1_performance,
          progress: calculateQuarterProgress(
            getQuarterlyPerformance(subIssue).q1_performance,
            getQuarterlyPlan(subIssue).q1_plan
          )
        },
        q2: {
          plan: getQuarterlyPlan(subIssue).q2_plan,
          performance: getQuarterlyPerformance(subIssue).q2_performance,
          progress: calculateQuarterProgress(
            getQuarterlyPerformance(subIssue).q2_performance,
            getQuarterlyPlan(subIssue).q2_plan
          )
        },
        q3: {
          plan: getQuarterlyPlan(subIssue).q3_plan,
          performance: getQuarterlyPerformance(subIssue).q3_performance,
          progress: calculateQuarterProgress(
            getQuarterlyPerformance(subIssue).q3_performance,
            getQuarterlyPlan(subIssue).q3_plan
          )
        },
        q4: {
          plan: getQuarterlyPlan(subIssue).q4_plan,
          performance: getQuarterlyPerformance(subIssue).q4_performance,
          progress: calculateQuarterProgress(
            getQuarterlyPerformance(subIssue).q4_performance,
            getQuarterlyPlan(subIssue).q4_plan
          )
        }
      },
      yearlyPlan: getYearlyPlan(subIssue)
    }));
  }, []);

  // Full Page Sub-Issues Handlers
  const handleViewFullPage = useCallback((issue, goal, dept) => {
    // Calculate sub-issues with current period
    const subIssuesWithProgress = calculateSubIssuesWithPeriod(issue, selectedPeriod);

    setFullPageParentIssue(issue);
    setFullPageSubIssuesList(subIssuesWithProgress);
    setFullPageGoal(goal);
    setFullPageDepartment(dept);
    setFullPageSubIssues(true);
    setFullPageViewTab("chart");
    setShowSubIssuesModal(false);
  }, [selectedPeriod, calculateSubIssuesWithPeriod]);

  // Update full page sub-issues when period changes
  useEffect(() => {
    if (fullPageSubIssues && fullPageParentIssue) {
      const updatedSubIssuesList = calculateSubIssuesWithPeriod(fullPageParentIssue, selectedPeriod);
      setFullPageSubIssuesList(updatedSubIssuesList);
    }
  }, [selectedPeriod, fullPageSubIssues, fullPageParentIssue, calculateSubIssuesWithPeriod]);

  const handleBackFromFullPage = useCallback(() => {
    setFullPageSubIssues(false);
    setFullPageParentIssue(null);
    setFullPageSubIssuesList([]);
    setFullPageGoal(null);
    setFullPageDepartment(null);
    setFullPageViewTab("chart");
  }, []);

  const handleIssueNameClick = useCallback((issue, goal, dept) => {
    handleViewFullPage(issue, goal, dept);
  }, [handleViewFullPage]);

  const handleQuickView = useCallback((issue, goal, dept) => {
    setSelectedAnalysisDept(dept);
    setSelectedAnalysisGoal(goal);
    setSelectedIssueForSubIssues(issue);
    
    // Calculate sub-issues with current period
    const subIssuesWithProgress = calculateSubIssuesWithPeriod(issue, selectedPeriod);
    
    setSubIssues(subIssuesWithProgress);
    setShowSubIssuesModal(true);
  }, [selectedPeriod, calculateSubIssuesWithPeriod]);

  const handleCloseSubIssuesModal = useCallback(() => {
    setShowSubIssuesModal(false);
    setSelectedIssueForSubIssues(null);
    setSubIssues([]);
  }, []);

  // ============================
  // MEMOIZED DATA
  // ============================

  const selectedDepartment = useMemo(() => 
    departments.find(dep => dep.id === selectedDepartmentId),
    [departments, selectedDepartmentId]
  );

  const selectedGoal = useMemo(() => 
    selectedDepartment?.goals.find(g => g.id === selectedGoalId),
    [selectedDepartment, selectedGoalId]
  );

  const statusChartData = useMemo(() => 
    Object.entries(stats.statusDistribution).map(([name, value]) => {
      const status = Object.values(STATUS_CONFIG).find(s => s.label === name);
      return {
        name,
        value,
        color: status?.color || "#cccccc",
        textColor: getContrastColor(status?.color || "#cccccc")
      };
    }),
    [stats.statusDistribution]
  );

  const departmentPerformance = useMemo(() => {
    if (!departments.length) return { excellent: 0, good: 0, average: 0, poor: 0, critical: 0 };
    
    return {
      excellent: departments.filter(d => d.actualWeightSum >= 90).length,
      good: departments.filter(d => d.actualWeightSum >= 75 && d.actualWeightSum < 90).length,
      average: departments.filter(d => d.actualWeightSum >= 60 && d.actualWeightSum < 75).length,
      poor: departments.filter(d => d.actualWeightSum >= 40 && d.actualWeightSum < 60).length,
      critical: departments.filter(d => d.actualWeightSum < 40).length,
    };
  }, [departments]);

  // Custom tooltip component for department chart (showing actual weight sum)
  const DepartmentTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          maxWidth: '300px'
        }}>
          <p className="tooltip-label"><strong>{data.displayName}</strong></p>
          <p className="tooltip-value" style={{ color: getActualWeightColor(data.actualWeightSum || 0) }}>
            <strong>Sum of Actual Weight:</strong> {data.actualWeightSum?.toFixed(2) || 0}
          </p>
          <p className="tooltip-note">Period: {selectedPeriod}</p>
          <p className="tooltip-note">Valid Goals: {data.goals?.length || 0}</p>
          <p className="tooltip-note">ዋና ተግባራት: {data.validIssuesCount || 0}</p>
        </div>
      );
    }
    return null;
  };

  const IssueTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const actualWeight = calculateActualWeight(data, selectedPeriod);
      
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label"><strong>{data.subject}</strong></p>
          <p className="tooltip-value">Progress: {payload[0].value}%</p>
          <p className="tooltip-note">Weight: {formatWeight(data.weight)}</p>
          {actualWeight && (
            <p className="tooltip-note">Actual Weight: {actualWeight.toFixed(2)}</p>
          )}
          <p className="tooltip-note">Period: {selectedPeriod}</p>
          
          {data.yearlyPlan > 0 && (
            <p className="tooltip-plan">Yearly Plan: {data.yearlyPlan}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Sub-Issue Tooltip for full page view
  const SubIssueTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const issue = payload[0].payload;
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          maxWidth: '300px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
            #{issue.id}: {issue.subject}
          </p>
          <p style={{ margin: '4px 0', color: getProgressColor(issue.progress || 0) }}>
            <strong>Progress ({selectedPeriod}):</strong> {issue.progress || 0}%
          </p>
          <p style={{ margin: '4px 0' }}>
            <strong>Weight:</strong> {formatWeight(issue.weight)}
          </p>
          {issue.actualWeight && (
            <p style={{ margin: '4px 0' }}>
              <strong>Actual Weight:</strong> {issue.actualWeight.toFixed(2)}
            </p>
          )}
          {issue.periodTarget && issue.periodTarget !== "0" && (
            <p style={{ margin: '4px 0' }}>
              <strong>Target ({selectedPeriod}):</strong> {issue.periodTarget}
            </p>
          )}
          {issue.periodActual > 0 && (
            <p style={{ margin: '4px 0' }}>
              <strong>Actual ({selectedPeriod}):</strong> {issue.periodActual.toFixed(2)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Get bar cell color based on actual weight sum
  const getBarCellColor = (actualWeightSum) => {
    return getActualWeightColor(actualWeightSum || 0);
  };

  // ============================
  // RENDER FUNCTIONS FOR DETAILED ANALYSIS
  // ============================

  const renderAnalysisDepartments = () => {
    return (
      <div className="analysis-departments-container">
        <h3>Departments</h3>
        <div className="department-cards-grid">
          {departments.map((dept) => (
            <div 
              key={dept.id} 
              className="department-analysis-card"
              onClick={() => handleAnalysisDepartmentClick(dept)}
            >
              <div className="department-card-header">
                <Icons.Building />
                <h4>{dept.displayName}</h4>
              </div>
              <div className="department-card-stats">
                <div className="stat">
                  <span className="stat-label">Goals:</span>
                  <span className="stat-value">{dept.goals.length}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">ዋና ተግባራት:</span>
                  <span className="stat-value">{dept.validIssuesCount}</span>
                </div>
              
              </div>
              <div className="department-card-footer">
                <span className="click-hint">Click to view goals →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAnalysisGoals = () => {
    if (!selectedAnalysisDept) return null;
    
    return (
      <div className="analysis-goals-container">
        <div className="analysis-header">
          <button className="back-button" onClick={handleBackToAnalysisDepartments}>
            <Icons.ArrowBack /> Back to Departments
          </button>
          <h3>{selectedAnalysisDept.displayName} - Goals</h3>
        </div>
        
        <div className="goals-cards-grid">
          {selectedAnalysisDept.goals.map((goal) => {
            const goalProgress = goal.topLevelIssues.length > 0 
              ? Math.round(goal.topLevelIssues.reduce((sum, issue) => sum + (issue.progress || 0), 0) / goal.topLevelIssues.length)
              : 0;
            const status = getGoalStatus(goalProgress);
            const isExpanded = expandedGoals.has(goal.id);
            
            return (
              <div key={goal.id} className="goal-analysis-card">
                <div className="goal-card-header">
                  <div className="goal-title">
                    <h4>{goal.displayName}</h4>
                  </div>
                </div>
                
                <div className="goal-card-stats">
                  <div className="stat">
                    <span className="stat-label">ዋና ተግባራት:</span>
                    <span className="stat-value">{goal.topLevelIssues.length}</span>
                  </div>
                </div>
                
                <div className="goal-card-actions">
                  <button 
                    className="plus-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGoalPlusClick(goal, selectedAnalysisDept);
                    }}
                  >
                    <Icons.Add /> {isExpanded ? 'Hide ዋና ተግባራት' : 'View ዋና ተግባራት'}
                  </button>
                </div>
                
                {isExpanded && (
                  <div className="goal-issues-list-container">
                    <h5>ዋና ተግባራት:</h5>
                    {goal.topLevelIssues.length > 0 ? (
                      <ul className="issues-list">
                        {goal.topLevelIssues.map(issue => (
                          <li key={issue.id} className="issue-list-item">
                            <span 
                              className="issue-name-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleIssueNameClick(issue, goal, selectedAnalysisDept);
                              }}
                            >
                              <Icons.Issue /> {truncateText(issue.subject, 60)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-data">No ዋና ተግባራት</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Full Page Sub-Issues Render Function
  const renderFullPageSubIssues = () => {
    if (!fullPageSubIssues || !fullPageParentIssue) return null;

    const parentIssue = fullPageParentIssue;
    const subIssuesList = fullPageSubIssuesList;
    const goal = fullPageGoal;
    const dept = fullPageDepartment;

    return (
      <div className="fullpage-subissues-container">
        <div className="fullpage-header">
          <div className="fullpage-header-left">
            <button className="fullpage-back-button" onClick={handleBackFromFullPage}>
              <Icons.ArrowBack /> Back to Goals
            </button>
          </div>
        </div>
        
        {/* Period Filter */}
        <div className="period-filter-container" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '20px',
          padding: '15px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <div className="period-selector" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <label style={{ 
              fontWeight: 'bold', 
              color: '#1a237e',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Icons.Calendar /> Filter by Period:
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '2px solid #1976d2',
                backgroundColor: 'white',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                minWidth: '180px',
                color: '#333'
              }}
            >
              {periodOptions.map(period => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Period Info Banner */}
        <div className="period-info-banner" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          margin: '15px 0'
        }}>
          <div className="period-info-content" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span><strong>Selected Period:</strong> {selectedPeriod}</span>
            <span><strong>Showing:</strong> {subIssuesList.length} of {parentIssue.childIssues?.length || 0} ዝርዝር ተግባራት</span>
          </div>
        </div>

        <div className="fullpage-view-tabs">
          <button 
            className={`fullpage-tab ${fullPageViewTab === 'chart' ? 'active' : ''}`}
            onClick={() => setFullPageViewTab('chart')}
          >
            <Icons.Timeline /> Bar Chart View
          </button>
          <button 
            className={`fullpage-tab ${fullPageViewTab === 'table' ? 'active' : ''}`}
            onClick={() => setFullPageViewTab('table')}
          >
            <Icons.FilterList /> Table View
          </button>
        </div>

        <div className="fullpage-content">
          {fullPageViewTab === 'chart' ? (
            <div className="subissues-chart-container fullpage">
              {subIssuesList.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(400, subIssuesList.length * 35)}>
                  <BarChart
                    layout="vertical"
                    data={subIssuesList}
                    margin={{ 
                      top: 20, 
                      right: 50, 
                      left: 20,
                      bottom: 20 
                    }}
                    barSize={24}
                    barGap={4}
                    className="responsive-barchart"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    
                    <XAxis 
                      type="number" 
                      domain={[0, 100]} 
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fill: '#666', fontSize: 11 }}
                      axisLine={{ stroke: '#ccc' }}
                      tickLine={{ stroke: '#ccc' }}
                    />
                    
                    <YAxis
                      type="category"
                      dataKey="subject"
                      width={280}
                      tick={({ x, y, payload }) => {
                        const issue = subIssuesList.find(i => i.subject === payload.value);
                        if (!issue) return null;
                        
                        const text = payload.value;
                        const maxChars = 45;
                        const lines = [];
                        let currentLine = '';
                        
                        text.split(' ').forEach(word => {
                          if ((currentLine + word).length <= maxChars) {
                            currentLine += (currentLine ? ' ' : '') + word;
                          } else {
                            if (currentLine) lines.push(currentLine);
                            currentLine = word;
                          }
                        });
                        if (currentLine) lines.push(currentLine);
                        
                        const displayLines = lines.slice(0, 3);
                        if (lines.length > 3) {
                          displayLines[2] = displayLines[2].substring(0, maxChars - 3) + '...';
                        }
                        
                        return (
                          <g transform={`translate(${x - 10}, ${y - 8})`}>
                            {displayLines.map((line, index) => (
                              <text
                                key={index}
                                x={0}
                                y={index * 16}
                                textAnchor="end"
                                className="chart-yaxis-label"
                                style={{
                                  fontSize: '11px',
                                  fill: '#333',
                                  fontWeight: index === 0 ? 500 : 400
                                }}
                              >
                                {line}
                              </text>
                            ))}
                            <text
                              x={0}
                              y={displayLines.length * 16 + 2}
                              textAnchor="end"
                              style={{
                                fontSize: '10px',
                                fill: '#666',
                                fontStyle: 'italic'
                              }}
                            >
                              #{issue.id} • {issue.progress || 0}% • W:{formatWeight(issue.weight)}
                            </text>
                          </g>
                        );
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    
                    <Tooltip content={<SubIssueTooltip />} />
                    
                    <Bar 
                      dataKey="progress"
                      radius={[0, 4, 4, 0]}
                      minPointSize={5}
                    >
                      {subIssuesList.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getBarCellColor(entry.progress || 0)}
                          style={{
                            filter: entry.progress >= 100 ? 'drop-shadow(0 0 4px rgba(46,125,50,0.5))' : 'none',
                            transition: 'fill 0.2s ease'
                          }}
                        />
                      ))}
                      <LabelList
                        dataKey="progress"
                        position="right"
                        formatter={(v) => `${v}%`}
                        fill="#ffffff"
                        fontSize={11}
                        fontWeight="bold"
                        offset={5}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data-message">
                  <Icons.SubIssue />
                  <p>No ዝርዝር ተግባራት match the selected period: {selectedPeriod}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="subissues-table-container fullpage">
              <table className="subissues-table fullpage-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Subject</th>
                    <th>ክብደት (%)</th>
                    <th>Progress ({selectedPeriod})</th>
                    <th>Target ({selectedPeriod})</th>
                    <th>Actual ({selectedPeriod})</th>
                    <th>Actual Weight <Icons.ActualWeight /></th>
                  </tr>
                </thead>
                <tbody>
                  {subIssuesList.length > 0 ? (
                    subIssuesList.map((issue) => (
                      <tr key={issue.id}>
                        <td>#{issue.id}</td>
                        <td className="subject-cell" title={issue.subject}>
                          <Icons.SubIssue /> {truncateText(issue.subject, 80)}
                        </td>
                        <td>
                          <span className="weight-badge" style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#e3f2fd',
                            color: '#1976d2',
                            fontWeight: 'bold'
                          }}>
                            {formatWeight(issue.weight)}
                          </span>
                        </td>
                        <td>
                          <div 
                            className="progress-badge"
                            style={{ 
                              backgroundColor: getProgressColor(issue.progress || 0),
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              textAlign: 'center',
                              fontWeight: 'bold'
                            }}
                          >
                            {issue.progress || 0}%
                          </div>
                        </td>
                        <td>{issue.periodTarget || 'N/A'}</td>
                        <td>{(issue.periodActual || 0).toFixed(2)}</td>
                        <td>
                          <span className="actual-weight-badge" style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: issue.actualWeight ? '#c8e6c9' : '#ffcdd2',
                            color: issue.actualWeight ? '#2e7d32' : '#b71c1c',
                            fontWeight: 'bold',
                            textAlign: 'center'
                          }}>
                            {issue.actualWeight ? issue.actualWeight.toFixed(2) : 'N/A'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="no-data">
                        No ዝርዝር ተግባራት found for period: {selectedPeriod}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================
  // RENDER BEST DEPARTMENTS SECTION
  // ============================

  const renderBestDepartments = () => {
    // If no departments with positive actual weight sum
    if (!bestDepartments || bestDepartments.length === 0) {
      return (
        
        <div className="best-performer">
          <div className="best-performer-content">
            <div className="best-performer-left">
              <h3><span className="trophy">🏆</span> Best Performing Department</h3>
              <div className="empty-state-message">
                <p className="empty-icon">📊</p>
                <p className="empty-text">No best performer found</p>
                <p className="empty-subtext">All departments have zero or negative actual weight sum for the selected period</p>
              </div>
            </div>
          </div>
       
        </div>
      );
    }
    
    const maxWeightSum = bestDepartments[0].actualWeightSum;
    
    if (bestDepartments.length === 1) {
      // Single best department
      const bestDept = bestDepartments[0];
      return (
        <div className="best-performer">
          <div className="best-performer-content">
            <div className="best-performer-left">
              <h3><span className="trophy">🏆</span> Best Performing Department</h3>
              <h2>{bestDept.displayName}</h2>
              <p style={{ color: getActualWeightColor(bestDept.actualWeightSum) }}>
                Sum of Actual Weight: {bestDept.actualWeightSum?.toFixed(2) || 0}
              </p>
            </div>
          </div>
        </div>
      );
    } else {
      // Multiple departments tied for best
      return (
        <div className="best-performer">
          <div className="best-performer-content">
            <div className="best-performer-left">
              <h3><span className="trophy">🏆</span> Top Performing Departments (Tied)</h3>
              <div className="tied-departments-list">
                {bestDepartments.map((dept, index) => (
                  <div key={dept.id} className="tied-department-item">
                    <h2>{dept.displayName}</h2>
                    <p style={{ color: getActualWeightColor(dept.actualWeightSum) }}>
                      Sum of Actual Weight: {dept.actualWeightSum?.toFixed(2) || 0}
                    </p>
                    {index < bestDepartments.length - 1 && <hr className="tie-divider" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  // ============================
  // RENDER MAIN DASHBOARD
  // ============================

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-alert">
        <div className="error-content">
          <span className="error-icon">⚠</span>
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">
            <Icons.Refresh /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {fullPageSubIssues ? (
        renderFullPageSubIssues()
      ) : (
        <>
          {!selectedDepartmentId && !selectedGoalId && activeTab === 0 && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Departments</div>
                <div className="stat-value">{departments.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Goals across departments</div>
                <div className="stat-value">{stats.totalGoals}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total ዋና ተግባራት across departments</div>
                <div className="stat-value issues">{stats.totalIssues}</div>
              </div>
            </div>
          )}

          {!selectedDepartmentId && !selectedGoalId && (
            <>
              <div className="tabs">
                <button 
                  className={`tab ${activeTab === 0 ? 'active' : ''}`}
                  onClick={() => setActiveTab(0)}
                >
                  <Icons.Timeline /> Performance Overview
                </button>
                <button 
                  className={`tab ${activeTab === 1 ? 'active' : ''}`}
                  onClick={() => setActiveTab(1)}
                >
                  <Icons.FilterList /> Detailed Analysis
                </button>
              </div>

              {activeTab === 0 && (
                <div className="chart-card">
                  <div className="chart-header">
                    
                    {/* Period Filter */}
                    <div className="period-filter-container" style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginBottom: '20px',
                      padding: '15px 20px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div className="period-selector" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '15px',
                        flexWrap: 'wrap'
                      }}>
                        <label style={{ 
                          fontWeight: 'bold', 
                          color: '#1a237e',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Icons.Calendar /> Filter by Period:
                        </label>
                        <select
                          value={selectedPeriod}
                          onChange={(e) => setSelectedPeriod(e.target.value)}
                          style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            border: '2px solid #1976d2',
                            backgroundColor: 'white',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: 'pointer',
                            minWidth: '180px',
                            color: '#333'
                          }}
                        >
                          {periodOptions.map(period => (
                            <option key={period} value={period}>{period}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Best Departments Section - Updated with empty state */}
                  {renderBestDepartments()}
                  
                  <div className="chart-container">
                    <h3>Department Performance</h3>
                    {departments.length > 0 ? (
                      <ResponsiveContainer width="100%" height={500}>
                        <BarChart
                          layout="horizontal"
                          data={departments}
                          margin={{ top: 20, right: 30, left: 20, bottom: 120 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            type="category"
                            dataKey="displayName"
                            angle={-45}
                            textAnchor="end"
                            height={100}
                            interval={0}
                            tick={{ fontSize: 12, fill: '#333' }}
                          />
                          <YAxis 
                            type="number" 
                            domain={[0, 'dataMax']}
                            tickFormatter={(value) => value.toFixed(2)}
                          />
                          <Tooltip content={<DepartmentTooltip />} />
                          <Bar
                            dataKey="actualWeightSum"
                            radius={[4, 4, 0, 0]}
                          >
                            {departments.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={getBarCellColor(entry.actualWeightSum)}
                              />
                            ))}
                            <LabelList
                              dataKey="actualWeightSum"
                              position="top"
                              formatter={(v) => v.toFixed(2)}
                              fill="#ffffff"
                              fontSize={12}
                              fontWeight="bold"
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="no-data-message">
                        <p>No department data available</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="chart-card">
                  <div className="analysis-content">
                    {analysisView === 'departments' && renderAnalysisDepartments()}
                    {analysisView === 'goals' && renderAnalysisGoals()}
                  </div>
                </div>
              )}
            </>
          )}

          {selectedDepartment && !selectedGoalId && !fullPageSubIssues && (
            <div className="chart-card">
              <div className="department-detail-header">
                <button className="back-button" onClick={handleBackToDepartments}>
                  <Icons.ArrowBack /> Back
                </button>
                <div className="department-title">
                  <h2>{selectedDepartment.displayName}</h2>
                  <p>Department Goals and Progress</p>
                  <div className="department-stats">
                    <span className="department-stat">
                      Sum of Actual Weight ({selectedPeriod}): 
                      <strong style={{ color: getActualWeightColor(selectedDepartment.actualWeightSum) }}>
                        {selectedDepartment.actualWeightSum?.toFixed(2) || 0}
                      </strong>
                    </span>
                    <span className="department-stat">Goals: <strong>{selectedDepartment.goals?.length || 0}</strong></span>
                    <span className="department-stat">ዋና ተግባራት: <strong>{selectedDepartment.validIssuesCount}</strong></span>
                  </div>
                </div>
              </div>

              {selectedDepartment.goals.length > 0 ? (
                <div className="goals-chart-container">
                  <div style={{ minWidth: selectedDepartment.goals.length * 200 }}>
                    <BarChart
                      layout="horizontal"
                      data={selectedDepartment.goals.map(goal => {
                        const progress = goal.topLevelIssues.length > 0 
                          ? Math.round(goal.topLevelIssues.reduce((sum, issue) => sum + (issue.progress || 0), 0) / goal.topLevelIssues.length)
                          : 0;
                        return { ...goal, progress };
                      })}
                      width={selectedDepartment.goals.length * 200}
                      height={400}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <YAxis type="number" domain={[0, 100]} />
                      <XAxis
                        type="category"
                        dataKey="displayName"
                        height={100}
                        interval={0}
                        tick={({ x, y, payload }) => {
                          const goal = selectedDepartment.goals.find(
                            (g) => g.displayName === payload.value
                          );
                          if (!goal) return null;
                          return (
                            <text
                              x={x}
                              y={y + 15}
                              transform={`rotate(-45, ${x}, ${y + 15})`}
                              textAnchor="end"
                              className="chart-xaxis-label"
                              onClick={() => handleGoalClick(goal, selectedDepartment.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              {payload.value.length > 25
                                ? payload.value.substring(0, 22) + "..."
                                : payload.value}
                            </text>
                          );
                        }}
                      />
                      <Tooltip formatter={(value) => [`${value}%`, 'Yearly Progress']} />
                      <Bar
                        dataKey="progress"
                        cursor="pointer"
                        onClick={(data) => handleGoalClick(data, selectedDepartment.id)}
                        radius={[4, 4, 0, 0]}
                      >
                        {selectedDepartment.goals.map((entry, index) => {
                          const progress = entry.topLevelIssues.length > 0 
                            ? Math.round(entry.topLevelIssues.reduce((sum, issue) => sum + (issue.progress || 0), 0) / entry.topLevelIssues.length)
                            : 0;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={getBarCellColor(progress)}
                            />
                          );
                        })}
                        <LabelList
                          dataKey="progress"
                          position="top"
                          formatter={(v) => `${v}%`}
                          fill="#ffffff"
                          fontSize={12}
                          fontWeight="bold"
                        />
                      </Bar>
                    </BarChart>
                  </div>
                </div>
              ) : (
                <div className="no-data">
                  <p>No goals found for this department.</p>
                </div>
              )}
            </div>
          )}

          {selectedGoal && !fullPageSubIssues && (
            <div className="chart-card">
              <div className="goal-detail-header">
                <button className="back-button" onClick={handleBackToGoals}>
                  <Icons.ArrowBack /> Back
                </button>
                <div className="goal-title">
                  <h2>{selectedGoal.displayName}</h2>
                  <div className="goal-metadata">
                    <span className="goal-issues-count">
                      ዋና ተግባራት: {selectedGoal.topLevelIssues.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="goal-view-tabs">
                <button 
                  className={`goal-tab ${goalViewTab === 'chart' ? 'active' : ''}`}
                  onClick={() => setGoalViewTab('chart')}
                >
                  <Icons.Timeline /> Progress Chart
                </button>
                <button 
                  className={`goal-tab ${goalViewTab === 'table' ? 'active' : ''}`}
                  onClick={() => setGoalViewTab('table')}
                >
                  <Icons.Target /> Issues Table
                </button>
              </div>

              {goalViewTab === 'chart' ? (
                <>
                  {selectedGoal.topLevelIssues.length > 0 ? (
                    <div className="issues-chart-container">
                      <ResponsiveContainer width="100%" height={Math.max(400, selectedGoal.topLevelIssues.length * 40)}>
                        <BarChart
                          layout="vertical"
                          data={selectedGoal.topLevelIssues}
                          margin={{ top: 20, right: 30, left: 250, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis
                            type="category"
                            dataKey="subject"
                            width={250}
                            tick={({ x, y, payload }) => {
                              const text = payload.value.length > 40
                                ? payload.value.substring(0, 37) + "..."
                                : payload.value;
                              return (
                                <text
                                  x={x - 10}
                                  y={y + 5}
                                  textAnchor="end"
                                  className="chart-yaxis-label"
                                >
                                  {text}
                                </text>
                              );
                            }}
                          />
                          <Tooltip content={<IssueTooltip />} />
                          <Bar 
                            dataKey="progress" 
                            barSize={25}
                            radius={[4, 4, 0, 0]}
                          >
                            {selectedGoal.topLevelIssues.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={getBarCellColor(entry.progress || 0)}
                              />
                            ))}
                            <LabelList
                              dataKey="progress"
                              position="right"
                              formatter={(v) => `${v}%`}
                              fill="#ffffff"
                              fontSize={12}
                              fontWeight="bold"
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="no-data">
                      <p>No top-level issues for this goal.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="issues-table-container">
                  <table className="issues-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Subject</th>
                        <th>ክብደት (%)</th>
                        <th>Progress ({selectedPeriod})</th>
                        <th>Target ({selectedPeriod})</th>
                        <th>Actual ({selectedPeriod})</th>
                        <th>Actual Weight <Icons.ActualWeight /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGoal.topLevelIssues.length > 0 ? (
                        selectedGoal.topLevelIssues.map((issue) => {
                          // Calculate period-specific values for each issue
                          const periodProgress = getProgressForPeriod(issue, selectedPeriod);
                          const periodTarget = getTargetValue(issue, selectedPeriod);
                          const periodActual = getActualValue(issue, selectedPeriod);
                          const actualWeight = calculateActualWeight(issue, selectedPeriod);
                          
                          return (
                            <tr key={issue.id}>
                              <td>#{issue.id}</td>
                              <td className="subject-cell" title={issue.subject}>
                                {truncateText(issue.subject, 60)}
                              </td>
                              <td>
                                <span className="weight-badge" style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#e3f2fd',
                                  color: '#1976d2',
                                  fontWeight: 'bold'
                                }}>
                                  {formatWeight(issue.weight)}
                                </span>
                              </td>
                              <td>
                                <div 
                                  className="progress-badge"
                                  style={{ 
                                    backgroundColor: getProgressColor(periodProgress || 0),
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    textAlign: 'center',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {periodProgress || 0}%
                                </div>
                              </td>
                              <td>{periodTarget || 'N/A'}</td>
                              <td>{(periodActual || 0).toFixed(2)}</td>
                              <td>
                                <span className="actual-weight-badge" style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: actualWeight ? '#c8e6c9' : '#ffcdd2',
                                  color: actualWeight ? '#2e7d32' : '#b71c1c',
                                  fontWeight: 'bold',
                                  textAlign: 'center'
                                }}>
                                  {actualWeight ? actualWeight.toFixed(2) : 'N/A'}
                                </span>
                                {actualWeight && issue.weight && (
                                  <span style={{
                                    fontSize: '10px',
                                    display: 'block',
                                    color: '#666',
                                    marginTop: '2px'
                                  }}>
                                    bounded: 0-{issue.weight}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="no-data">
                            No issues found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!selectedDepartmentId && !selectedGoalId && activeTab === 0 && departments.length > 0 && (
            <div className="department-summary-box">
              <div className="summary-header">
                <h3><Icons.Building /> Department Performance Summary</h3>
                <div className="total-departments">
                  <span className="total-count">{departments.length}</span>
                  <span className="total-label">Departments</span>
                </div>
              </div>
              
              <div className="performance-categories">
                <div 
                  className="category-card excellent"
                  onClick={() => handleCategoryClick('excellent')}
                >
                  <div className="category-header">
                    <span className="category-icon">🏆</span>
                    <h4>Excellent</h4>
                  </div>
                  <div className="category-count">{departmentPerformance.excellent}</div>
                  <div className="category-range">≥ 90 Weight Sum</div>
                  <div className="category-percentage">
                    {Math.round((departmentPerformance.excellent / departments.length) * 100)}%
                  </div>
                </div>
                
                <div 
                  className="category-card good"
                  onClick={() => handleCategoryClick('good')}
                >
                  <div className="category-header">
                    <span className="category-icon">👍</span>
                    <h4>Good</h4>
                  </div>
                  <div className="category-count">{departmentPerformance.good}</div>
                  <div className="category-range">75-89 Weight Sum</div>
                  <div className="category-percentage">
                    {Math.round((departmentPerformance.good / departments.length) * 100)}%
                  </div>
                </div>
                
                <div 
                  className="category-card average"
                  onClick={() => handleCategoryClick('average')}
                >
                  <div className="category-header">
                    <span className="category-icon">📊</span>
                    <h4>Average</h4>
                  </div>
                  <div className="category-count">{departmentPerformance.average}</div>
                  <div className="category-range">60-74 Weight Sum</div>
                  <div className="category-percentage">
                    {Math.round((departmentPerformance.average / departments.length) * 100)}%
                  </div>
                </div>
                
                <div 
                  className="category-card poor"
                  onClick={() => handleCategoryClick('poor')}
                >
                  <div className="category-header">
                    <span className="category-icon">⚠️</span>
                    <h4>Needs Attention</h4>
                  </div>
                  <div className="category-count">{departmentPerformance.poor}</div>
                  <div className="category-range">40-59 Weight Sum</div>
                  <div className="category-percentage">
                    {Math.round((departmentPerformance.poor / departments.length) * 100)}%
                  </div>
                </div>
                
                <div 
                  className="category-card critical"
                  onClick={() => handleCategoryClick('critical')}
                >
                  <div className="category-header">
                    <span className="category-icon">🔴</span>
                    <h4>Critical</h4>
                  </div>
                  <div className="category-count">{departmentPerformance.critical}</div>
                  <div className="category-range">&lt; 40 Weight Sum</div>
                  <div className="category-percentage">
                    {Math.round((departmentPerformance.critical / departments.length) * 100)}%
                  </div>
                </div>
              </div>
              
              <div className="summary-footer">
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Highest Weight Sum:</span>
                    <span className="stat-value" style={{ color: getActualWeightColor(bestDepartments ? bestDepartments[0].actualWeightSum : 0) }}>
                      {bestDepartments ? bestDepartments[0].actualWeightSum?.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Lowest Weight Sum:</span>
                    <span className="stat-value" style={{ color: getActualWeightColor(departments[departments.length - 1]?.actualWeightSum || 0) }}>
                      {departments.length > 0 ? departments[departments.length - 1].actualWeightSum?.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Median Weight Sum:</span>
                    <span className="stat-value" style={{ color: getActualWeightColor(departments[Math.floor(departments.length / 2)]?.actualWeightSum || 0) }}>
                      {departments.length > 0 ? 
                        departments[Math.floor(departments.length / 2)].actualWeightSum?.toFixed(2) : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}