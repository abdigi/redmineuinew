import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getCurrentUser,
  getMyMainProjectsWithSubprojects,
  getProjects,
  getProjectIssues,
  getExpertsForTeamUser,
  getWatchedOneLevelIssuesByUser,
  getUser,
  getAllAssignedIssues,
  getIssue,
  getSubIssuesByParentAndAssignee
} from "../api/redmineApi";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
  Legend
} from "recharts";

// ========== ADDED FROM FIRST CODE ==========
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

// Get custom field value from issue - ENHANCED VERSION
const getField = (issue, fieldName) => {
  if (!issue || !issue.custom_fields) return null;
  const field = issue.custom_fields.find((f) => f.name === fieldName);
  return field?.value;
};

// Helper function to get progress percentage for a period - FROM FIRST CODE
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
    return Math.min(100, Math.max(0, progress));
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
    return Math.min(100, Math.max(0, progress));  
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
    return Math.min(100, Math.max(0, progress));
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
  return Math.min(100, Math.max(0, progress));
};

// Helper function to check if target value is valid - FROM FIRST CODE
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

// Filter issues by period - ENHANCED VERSION FROM FIRST CODE
const filterIssuesByPeriod = (issues, period) => {
  if (!issues || !Array.isArray(issues)) return [];
  
  if (period === "Yearly") {
    return issues.filter(issue => {
      const yearlyValue = getField(issue, "የዓመቱ እቅድ");
      return isValidTargetValue(yearlyValue, period);
    });
  }

  if (period === "6 Months") {
    return issues.filter(issue => {
      const q1 = getField(issue, "1ኛ ሩብዓመት");
      const q2 = getField(issue, "2ኛ ሩብዓመት");
      
      const hasQ1 = isValidTargetValue(q1, "1ኛ ሩብዓመት");
      const hasQ2 = isValidTargetValue(q2, "2ኛ ሩብዓመት");
      
      return hasQ1 || hasQ2;
    });
  }

  if (period === "9 Months") {
    return issues.filter(issue => {
      const q1 = getField(issue, "1ኛ ሩብዓመት");
      const q2 = getField(issue, "2ኛ ሩብዓመት");
      const q3 = getField(issue, "3ኛ ሩብዓመት");
      
      const hasQ1 = isValidTargetValue(q1, "1ኛ ሩብዓመት");
      const hasQ2 = isValidTargetValue(q2, "2ኛ ሩብዓመት");
      const hasQ3 = isValidTargetValue(q3, "3ኛ ሩብዓመት");
      
      return hasQ1 || hasQ2 || hasQ3;
    });
  }

  // For quarterly periods
  return issues.filter(issue => {
    const quarterValue = getField(issue, period);
    return isValidTargetValue(quarterValue, period);
  });
};

// Get target value based on selected period - FROM FIRST CODE
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

// Get actual performance value based on selected period - FROM FIRST CODE
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

// Calculate weighted performance for issues - FROM FIRST CODE
const calculateWeightedPerformanceForIssues = (issues, period, getWeightFunc) => {
  if (!issues || !Array.isArray(issues) || issues.length === 0) return 0;
  
  let totalWeight = 0;
  let weightedProgress = 0;

  issues.forEach((issue) => {
    const weight = getWeightFunc(issue);
    const progress = getProgressForPeriod(issue, period);
    totalWeight += weight;
    weightedProgress += progress * weight;
  });

  return totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
};

// Helper function to get weight - MOVED OUTSIDE COMPONENT
const getWeight = (issue) => {
  if (!issue) return 1;
  const field = getField(issue, "ክብደት");
  const weightValue = Number(field) || 0;
  return weightValue > 0 ? weightValue : 1; // Default to 1 if weight is 0 or invalid
};

// ========== END OF ADDED FUNCTIONS ==========

export default function LeadExecutiveDashboard() {
  const [departments, setDepartments] = useState([]);
  const [teamGroups, setTeamGroups] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [loading, setLoading] = useState({
    overall: true,
    departments: false,
    teams: false,
    userDetails: false
  });
  const [kpis, setKpis] = useState({
    totalGoals: 0,
    avgGoalPerformance: 0,
    totalWatchedIssues: 0,
    totalTeamMembers: 0
  });
  const [activeTab, setActiveTab] = useState('teams');
  const [expandedDepartment, setExpandedDepartment] = useState(null);
  
  const [selectedPeriod, setSelectedPeriod] = useState("Yearly");
  const [filteredDepartmentData, setFilteredDepartmentData] = useState([]);
  const [filteredTeamData, setFilteredTeamData] = useState([]);

  const [currentView, setCurrentView] = useState('main');
  
  // NEW: Cache states
  const [userDataCache, setUserDataCache] = useState({});
  const [isFetchingUser, setIsFetchingUser] = useState(false);
  const [currentCacheKey, setCurrentCacheKey] = useState('');

  // NEW: State variables for goal/issue expansion
  const [selectedGoalIssues, setSelectedGoalIssues] = useState([]);
  const [selectedIssueSubIssues, setSelectedIssueSubIssues] = useState([]);
  const [expandedGoalId, setExpandedGoalId] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  
  // NEW: State for sub-issue view
  const [isViewingSubIssues, setIsViewingSubIssues] = useState(false);
  const [selectedParentIssue, setSelectedParentIssue] = useState(null);
  // NEW: Separate period state for sub-issue view
  const [subIssuePeriod, setSubIssuePeriod] = useState("Yearly");

  // Period options - ADDED FROM FIRST CODE
  const periodOptions = useMemo(() => [
    "Yearly",
    "1ኛ ሩብዓመት",
    "2ኛ ሩብዓመት", 
    "3ኛ ሩብዓመት",
    "4ኛ ሩብዓመት",
    "6 Months",
    "9 Months"
  ], []);

  // UPDATED: Helper function to calculate Actual Weight for each sub-issue with clamping
  // USING getProgressForPeriod FROM FIRST CODE
  const calculateActualWeightForIssue = useCallback((issue, period = "Yearly") => {
    if (!issue) return 0;
    
    const weight = getWeight(issue);
    if (weight === 0) return 0;
    
    // Use getProgressForPeriod from first code for consistent calculation
    const progress = getProgressForPeriod(issue, period);
    
    // Correct formula: Actual Weight = (Weight × Progress) ÷ 100
    const actualWeight = (weight * progress) / 100;
    
    // CLAMPING LOGIC: Ensure actualWeight is between 0 and weight
    let clampedWeight = actualWeight;
    if (clampedWeight < 0) {
      clampedWeight = 0;
    } else if (clampedWeight > weight) {
      clampedWeight = weight;
    }
    
    return Math.round(clampedWeight * 100) / 100;
  }, []);

  // Helper function to get one-level deep assigned issues
  const getOneLevelAssignedIssues = useCallback(async (userId) => {
    console.log(`🔄 [Dashboard] Starting getOneLevelAssignedIssues for user ID: ${userId}`);
    
    try {
      const allAssignedIssues = await getAllAssignedIssues(userId);
      
      console.log(`📊 [Dashboard] Received ${allAssignedIssues.length} total assigned issues`);
      
      const issuesWithParent = allAssignedIssues.filter(issue => {
        return issue.parent !== undefined && issue.parent !== null;
      });
      
      console.log(`📊 [Dashboard] Found ${issuesWithParent.length} issues with a parent`);
      
      const oneLevelIssues = [];
      
      if (issuesWithParent.length > 0) {
        console.log(`🔍 [Dashboard] Checking parent details for ${issuesWithParent.length} issues...`);
        
        const parentCache = new Map();
        
        const batchSize = 5;
        for (let i = 0; i < issuesWithParent.length; i += batchSize) {
          const batch = issuesWithParent.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (issue) => {
            try {
              const parentId = issue.parent.id;
              let parentIssue;
              
              if (parentCache.has(parentId)) {
                parentIssue = parentCache.get(parentId);
              } else {
                console.log(`  🔍 Fetching parent issue #${parentId} for issue #${issue.id}...`);
                parentIssue = await getIssue(parentId);
                parentCache.set(parentId, parentIssue);
              }
              
              if (parentIssue && !parentIssue.parent) {
                const enhancedIssue = {
                  ...issue,
                  parentSubject: parentIssue.subject || 'No Subject',
                  parentTracker: parentIssue.tracker?.name || 'Unknown',
                  parentStatus: parentIssue.status?.name || 'Unknown',
                  parentWeight: getWeight(parentIssue)
                };
                return enhancedIssue;
              }
              return null;
            } catch (error) {
              console.error(`❌ Error fetching parent issue ${issue.parent?.id}:`, error.message);
              return null;
            }
          });
          
          const results = await Promise.all(batchPromises);
          const validResults = results.filter(issue => issue !== null);
          oneLevelIssues.push(...validResults);
          
          console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} processed: ${validResults.length} one-level issues found`);
          
          if (i + batchSize < issuesWithParent.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      
      console.log(`✅ [Dashboard] User ${userId} has ${oneLevelIssues.length} one-level deep issues`);
      return oneLevelIssues;
      
    } catch (err) {
      console.error("❌ [Dashboard] getOneLevelAssignedIssues error:", err);
      return [];
    }
  }, []);

  // UPDATED: Helper function to calculate target weight for a user with period filtering
  const calculateTargetWeight = useCallback(async (user, assignedOneLevelIssues, period) => {
    console.log(`⚖️ Calculating target weight for user ${user.id} (${user.name || user.login}) for period: ${period}`);
    let totalTargetWeight = 0;
    
    if (!assignedOneLevelIssues || assignedOneLevelIssues.length === 0) {
      console.log(`  No assigned one-level issues, target weight = 0`);
      return 0;
    }
    
    console.log(`  Processing ${assignedOneLevelIssues.length} one-level issues...`);
    
    // Filter issues by period first
    const filteredIssues = filterIssuesByPeriod(assignedOneLevelIssues, period);
    console.log(`  After period filtering: ${filteredIssues.length} issues have valid targets for period: ${period}`);
    
    if (filteredIssues.length === 0) {
      console.log(`  No issues with valid targets for period ${period}, target weight = 0`);
      return 0;
    }
    
    for (const issue of filteredIssues) {
      try {
        const userSubIssues = await getSubIssuesByParentAndAssignee(issue.id, user.id);
        
        if (userSubIssues.length > 0) {
          // Filter sub-issues by period
          const filteredSubIssues = filterIssuesByPeriod(userSubIssues, period);
          console.log(`    User has ${filteredSubIssues.length} sub-issues with valid targets for period ${period}`);
          
          const subIssueWeights = filteredSubIssues.reduce((sum, subIssue) => {
            const weight = getWeight(subIssue);
            console.log(`    Sub-issue #${subIssue.id}: weight = ${weight}`);
            return sum + weight;
          }, 0);
          
          console.log(`    Total weight from sub-issues for period ${period} = ${subIssueWeights}`);
          totalTargetWeight += subIssueWeights;
        } else {
          const issueWeight = getWeight(issue);
          console.log(`    No sub-issues assigned, using one-level issue weight = ${issueWeight} for period ${period}`);
          totalTargetWeight += issueWeight;
        }
        
      } catch (error) {
        console.error(`  ❌ Error checking sub-issues for issue #${issue.id}:`, error.message);
        const issueWeight = getWeight(issue);
        totalTargetWeight += issueWeight;
      }
    }
    
    console.log(`  ✅ Final target weight for user ${user.id} for period ${period}: ${totalTargetWeight}`);
    return totalTargetWeight;
  }, []);

  // UPDATED: Helper function to calculate contributed weight (Actual Weight) for a user with period filtering
  const calculateContributedWeight = useCallback(async (user, assignedOneLevelIssues, period) => {
    console.log(`📊 Calculating Contributed Weight for user ${user.id} for period: ${period}`);
    let totalContributedWeight = 0;
    
    if (!assignedOneLevelIssues || assignedOneLevelIssues.length === 0) {
      console.log(`  No assigned one-level issues, contributed weight = 0`);
      return 0;
    }
    
    console.log(`  Processing ${assignedOneLevelIssues.length} one-level issues for contributed weight...`);
    
    // Filter issues by period first
    const filteredIssues = filterIssuesByPeriod(assignedOneLevelIssues, period);
    console.log(`  After period filtering: ${filteredIssues.length} issues have valid targets for period: ${period}`);
    
    if (filteredIssues.length === 0) {
      console.log(`  No issues with valid targets for period ${period}, contributed weight = 0`);
      return 0;
    }
    
    for (const issue of filteredIssues) {
      try {
        const userSubIssues = await getSubIssuesByParentAndAssignee(issue.id, user.id);
        
        if (userSubIssues.length > 0) {
          // Filter sub-issues by period
          const filteredSubIssues = filterIssuesByPeriod(userSubIssues, period);
          console.log(`    User has ${filteredSubIssues.length} sub-issues with valid targets for period ${period}`);
          
          // User has sub-issues: Calculate Actual Weight for each sub-issue
          let issueContributedWeight = 0;
          for (const subIssue of filteredSubIssues) {
            const actualWeight = calculateActualWeightForIssue(subIssue, period);
            console.log(`    Sub-issue #${subIssue.id}: Actual Weight = ${actualWeight} (clamped)`);
            issueContributedWeight += actualWeight;
          }
          
          console.log(`    User has ${filteredSubIssues.length} sub-issues, contributed weight = ${issueContributedWeight}`);
          totalContributedWeight += issueContributedWeight;
        } else {
          // No sub-issues assigned to user: Actual Weight = 0
          console.log(`    No sub-issues assigned to user, contributed weight = 0 for issue #${issue.id}`);
          // Don't add anything (Actual Weight = 0)
        }
        
      } catch (error) {
        console.error(`  ❌ Error checking sub-issues for contributed weight calculation (issue #${issue.id}):`, error.message);
        // If error, contributed weight for this issue = 0
      }
    }
    
    console.log(`  ✅ Final contributed weight for user ${user.id} for period ${period}: ${totalContributedWeight}`);
    return Math.round(totalContributedWeight * 100) / 100; // Round to 2 decimal places
  }, [calculateActualWeightForIssue]);

  // Helper function to count total sub-issues for a user with period filtering
  const countTotalPersonalSubIssues = useCallback(async (user, assignedOneLevelIssues, period) => {
    console.log(`🔢 Counting total personal sub-issues for user ${user.id} for period: ${period}`);
    let totalPersonalSubIssues = 0;
    
    if (!assignedOneLevelIssues || assignedOneLevelIssues.length === 0) {
      console.log(`  No assigned one-level issues, total personal sub-issues = 0`);
      return 0;
    }
    
    console.log(`  Checking ${assignedOneLevelIssues.length} one-level issues for personal sub-issues...`);
    
    // Filter issues by period first
    const filteredIssues = filterIssuesByPeriod(assignedOneLevelIssues, period);
    console.log(`  After period filtering: ${filteredIssues.length} issues have valid targets for period: ${period}`);
    
    if (filteredIssues.length === 0) {
      console.log(`  No issues with valid targets for period ${period}, total personal sub-issues = 0`);
      return 0;
    }
    
    for (const issue of filteredIssues) {
      try {
        const userSubIssues = await getSubIssuesByParentAndAssignee(issue.id, user.id);
        // Filter sub-issues by period
        const filteredSubIssues = filterIssuesByPeriod(userSubIssues, period);
        totalPersonalSubIssues += filteredSubIssues.length;
        console.log(`    Issue #${issue.id}: ${filteredSubIssues.length} personal sub-issues with valid targets for period ${period}`);
      } catch (error) {
        console.error(`  ❌ Error counting sub-issues for issue #${issue.id}:`, error.message);
      }
    }
    
    console.log(`  ✅ Final total personal sub-issues for user ${user.id} for period ${period}: ${totalPersonalSubIssues}`);
    return totalPersonalSubIssues;
  }, []);

  // NEW: Helper function to calculate performance percentage
  const calculatePerformancePercentage = useCallback((contributedWeight, targetWeight) => {
    if (!targetWeight || targetWeight === 0) return 0;
    const percentage = (contributedWeight * 100) / targetWeight;
    return Math.min(100, Math.round(percentage)); // Cap at 100%
  }, []);

  // UPDATED: Use getProgressForPeriod from first code for consistency
  const calculateProgress = useCallback((issue, period = "Yearly") => {
    return getProgressForPeriod(issue, period);
  }, []);

  // UPDATED: Calculate weighted performance using imported function
  const calculateWeightedPerformance = useCallback((issues, period = "Yearly") => {
    return calculateWeightedPerformanceForIssues(issues, period, getWeight);
  }, []);

  const getStatusColor = useCallback((progress) => {
    if (progress === 0) return '#f44336';
    if (progress < 100) return '#ff9800';
    return '#4caf50';
  }, []);

  const getStatusText = useCallback((progress) => {
    if (progress === 0) return 'Not Started';
    if (progress < 100) return 'In Progress';
    return 'Done';
  }, []);

  const calculateKPIs = useCallback((depts, teams, period = "Yearly") => {
    if (!depts || !teams) return;
    
    let totalGoals = 0;
    let totalPerf = 0;
    let totalWatchedIssues = 0;
    let totalTeamMembers = 0;

    depts.forEach(dept => {
      if (!dept.goals) return;
      totalGoals += dept.goals.length;
      dept.goals.forEach(goal => {
        if (!goal.issues) return;
        totalPerf += calculateWeightedPerformance(goal.issues, period);
      });
    });

    teams.forEach(team => {
      if (!team.users) return;
      totalTeamMembers += team.users.length;
      team.users.forEach(user => {
        if (!user.watchedIssues) return;
        const periodIssues = filterIssuesByPeriod(user.watchedIssues || [], period);
        totalWatchedIssues += periodIssues?.length || 0;
      });
    });

    setKpis({
      totalGoals,
      avgGoalPerformance: totalGoals > 0 ? Math.round(totalPerf / totalGoals) : 0,
      totalWatchedIssues,
      totalTeamMembers
    });
  }, [calculateWeightedPerformance]);

  // UPDATED: Prepare issue chart data with target value filtering
  const prepareIssueChartData = useCallback((issues, period = "Yearly") => {
    if (!issues || !Array.isArray(issues)) return [];
    
    // First filter by period to get issues with valid targets
    const filteredIssues = filterIssuesByPeriod(issues, period);
    
    // Then filter out issues where target value is 0, empty, or invalid
    const validIssues = filteredIssues.filter(issue => {
      const targetValue = getTargetValue(issue, period);
      return isValidTargetValue(targetValue, period);
    });
    
    console.log(`📊 prepareIssueChartData: Started with ${issues.length} issues`);
    console.log(`📊 After period filtering: ${filteredIssues.length} issues`);
    console.log(`📊 After target validation: ${validIssues.length} issues with valid targets`);
    
    return validIssues.map(issue => ({
      name: issue?.subject?.length > 20 ? issue.subject.substring(0, 20) + '...' : issue?.subject || 'No Subject',
      progress: calculateProgress(issue, period),
      weight: getWeight(issue),
      status: getStatusText(calculateProgress(issue, period)),
      fullSubject: issue?.subject || 'No Subject',
      id: issue?.id,
      originalIssue: issue,
      // Add actual weight for tooltip
      actualWeight: calculateActualWeightForIssue(issue, period),
      targetValue: getTargetValue(issue, period),
      actualValue: getActualValue(issue, period)
    }));
  }, [calculateProgress, getStatusText, calculateActualWeightForIssue]);

  // UPDATED: Prepare issues for goal display - SHOW ALL ISSUES WITHOUT PERIOD FILTERING
  const prepareIssuesForGoal = useCallback((issues, period = "Yearly") => {
    if (!issues || !Array.isArray(issues)) return [];
    
    // REMOVED: Period filtering - show all root issues regardless of period
    // const filteredIssues = filterIssuesByPeriod(issues, period);
    
    // Filter out issues where target value is invalid for the selected period
    // BUT keep them in the list with 0 progress if they don't have valid targets
    const rootIssues = issues.filter(issue => !issue.parent);
    
    console.log(`📊 prepareIssuesForGoal: ${rootIssues.length} root issues found (NO PERIOD FILTERING)`);
    
    return rootIssues.map(issue => {
      // Check if this issue has valid targets for the selected period
      const targetValue = getTargetValue(issue, period);
      const hasValidTarget = isValidTargetValue(targetValue, period);
      
      // Calculate progress only if there's a valid target, otherwise show 0
      const progress = hasValidTarget ? calculateProgress(issue, period) : 0;
      const actualWeight = hasValidTarget ? calculateActualWeightForIssue(issue, period) : 0;
      const actualValue = hasValidTarget ? getActualValue(issue, period) : 0;
      
      return {
        id: issue.id,
        subject: issue.subject || 'No Subject',
        progress: progress,
        weight: getWeight(issue),
        actualWeight: actualWeight,
        targetValue: hasValidTarget ? targetValue : "0",
        actualValue: actualValue,
        status: hasValidTarget ? getStatusText(progress) : 'No Target',
        originalIssue: issue,
        hasValidTarget: hasValidTarget // Add flag to indicate if issue has valid target
      };
    });
  }, [calculateProgress, getStatusText, calculateActualWeightForIssue]);

  const prepareFilteredData = useCallback((departments, teams, period) => {
    if (!departments || !teams) return;
    
    const filteredDepts = departments.map(dept => ({
      ...dept,
      goals: dept.goals ? dept.goals.map(goal => {
        const filteredIssues = filterIssuesByPeriod(goal.issues || [], period);
        
        return {
          ...goal,
          issues: filteredIssues,
          performance: calculateWeightedPerformance(goal.issues || [], period),
          issueChartData: prepareIssueChartData(filteredIssues, period),
          statusSummary: {
            notStarted: filteredIssues.filter(i => calculateProgress(i, period) === 0).length,
            inProgress: filteredIssues.filter(i => calculateProgress(i, period) > 0 && calculateProgress(i, period) < 100).length,
            done: filteredIssues.filter(i => calculateProgress(i, period) === 100).length
          }
        };
      }) : []
    }));

    const filteredTeams = teams.map(team => ({
      ...team,
      users: team.users ? team.users.map(user => {
        const filteredWatchedIssues = filterIssuesByPeriod(user.watchedIssues || [], period);
        
        // Calculate performance percentage using the new formula
        const performancePercentage = calculatePerformancePercentage(
          user.contributedWeight || 0,
          user.targetWeight || 0
        );
        
        return {
          ...user,
          watchedIssues: filteredWatchedIssues,
          performance: performancePercentage, // Use the new formula here
          issueChartData: prepareIssueChartData(filteredWatchedIssues, period)
        };
      }) : []
    }));

    setFilteredDepartmentData(filteredDepts);
    setFilteredTeamData(filteredTeams);
    calculateKPIs(filteredDepts, filteredTeams, period);
  }, [calculateWeightedPerformance, prepareIssueChartData, calculateProgress, calculatePerformancePercentage, calculateKPIs]);

  // NEW: Handle goal card click
  const handleGoalCardClick = useCallback(async (goal) => {
    console.log(`🖱️ Goal card clicked: ${goal.name}`);
    
    if (expandedGoalId === goal.id) {
      // If already expanded, collapse it
      setExpandedGoalId(null);
      setSelectedGoalIssues([]);
      setSelectedIssueId(null);
      setSelectedIssueSubIssues([]);
      setIsViewingSubIssues(false);
      setSelectedParentIssue(null);
    } else {
      // Expand the goal and fetch its issues
      setExpandedGoalId(goal.id);
      setSelectedIssueId(null);
      setSelectedIssueSubIssues([]);
      setIsViewingSubIssues(false);
      setSelectedParentIssue(null);
      
      // Prepare issues for the selected goal - use ALL issues, not filtered
      const issues = prepareIssuesForGoal(goal.originalIssues || goal.issues || [], selectedPeriod);
      setSelectedGoalIssues(issues);
    }
  }, [expandedGoalId, selectedPeriod, prepareIssuesForGoal]);

  // NEW: Handle issue click with sub-issue view
  const handleIssueClick = useCallback(async (issueId, parentIssue) => {
    console.log(`🖱️ Issue clicked: ${issueId}`);
    
    setSelectedIssueId(issueId);
    setSelectedParentIssue(parentIssue);
    setIsViewingSubIssues(true);
    // Set sub-issue period to match main period initially
    setSubIssuePeriod(selectedPeriod);
    
    try {
      const subIssues = await getSubIssuesByParentAndAssignee(issueId, null);
      console.log(`📊 Found ${subIssues.length} sub-issues for issue ${issueId}`);
      
      // Filter sub-issues by selected period (initially same as main)
      const filteredSubIssues = filterIssuesByPeriod(subIssues, selectedPeriod);
      
      // Prepare sub-issues for display
      const preparedSubIssues = filteredSubIssues.map(subIssue => ({
        id: subIssue.id,
        subject: subIssue.subject || 'No Subject',
        progress: calculateProgress(subIssue, selectedPeriod),
        weight: getWeight(subIssue),
        actualWeight: calculateActualWeightForIssue(subIssue, selectedPeriod),
        targetValue: getTargetValue(subIssue, selectedPeriod),
        actualValue: getActualValue(subIssue, selectedPeriod),
        status: getStatusText(calculateProgress(subIssue, selectedPeriod)),
        assignee: subIssue.assigned_to?.name || 'Unassigned',
        originalIssue: subIssue
      }));
      
      setSelectedIssueSubIssues(preparedSubIssues);
    } catch (error) {
      console.error(`❌ Error fetching sub-issues for issue ${issueId}:`, error);
      setSelectedIssueSubIssues([]);
    }
  }, [selectedPeriod, calculateProgress, getStatusText, calculateActualWeightForIssue]);

  // NEW: Handle period change in sub-issue view
  const handleSubIssuePeriodChange = useCallback(async (newPeriod) => {
    console.log(`🔄 Changing sub-issue period from ${subIssuePeriod} to ${newPeriod}`);
    
    if (newPeriod === subIssuePeriod) return;
    
    setSubIssuePeriod(newPeriod);
    
    // Recalculate sub-issues with new period
    if (selectedIssueId) {
      try {
        const subIssues = await getSubIssuesByParentAndAssignee(selectedIssueId, null);
        console.log(`📊 Found ${subIssues.length} sub-issues for period: ${newPeriod}`);
        
        // Filter sub-issues by new period
        const filteredSubIssues = filterIssuesByPeriod(subIssues, newPeriod);
        
        // Prepare sub-issues for display with new period
        const preparedSubIssues = filteredSubIssues.map(subIssue => ({
          id: subIssue.id,
          subject: subIssue.subject || 'No Subject',
          progress: calculateProgress(subIssue, newPeriod),
          weight: getWeight(subIssue),
          actualWeight: calculateActualWeightForIssue(subIssue, newPeriod),
          targetValue: getTargetValue(subIssue, newPeriod),
          actualValue: getActualValue(subIssue, newPeriod),
          status: getStatusText(calculateProgress(subIssue, newPeriod)),
          assignee: subIssue.assigned_to?.name || 'Unassigned',
          originalIssue: subIssue
        }));
        
        setSelectedIssueSubIssues(preparedSubIssues);
      } catch (error) {
        console.error(`❌ Error fetching sub-issues for new period ${newPeriod}:`, error);
        setSelectedIssueSubIssues([]);
      }
    }
  }, [subIssuePeriod, selectedIssueId, calculateProgress, getStatusText, calculateActualWeightForIssue]);

  // NEW: Handle back from sub-issue view
  const handleBackFromSubIssues = useCallback(() => {
    setIsViewingSubIssues(false);
    setSelectedIssueId(null);
    setSelectedParentIssue(null);
    setSelectedIssueSubIssues([]);
  }, []);

  // UPDATED: handleUserClick with enhanced period handling
  const handleUserClick = useCallback(async (user) => {
    console.log("🖱️ User clicked:", user);
    
    const cacheKey = `${user.id}-${selectedPeriod}`;
    setCurrentCacheKey(cacheKey);
    
    // Check if user data is already in cache
    if (userDataCache[cacheKey] && userDataCache[cacheKey].user) {
      console.log("✅ Using cached data for user:", user.id);
      setSelectedUser(userDataCache[cacheKey].user);
      setSelectedGroupMembers(userDataCache[cacheKey].groupMembers || []);
      setSelectedGroupName(userDataCache[cacheKey].groupName || "");
      setCurrentView('userDetail');
      return;
    }
    
    // If not in cache, fetch data
    setSelectedUser(user);
    setLoading(prev => ({ ...prev, userDetails: true }));
    setIsFetchingUser(true);
    
    try {
      const fullUser = await getUser(user.id);
      const username = fullUser?.login;
      
      if (!username) {
        console.error("❌ No username (login) found in full user object");
        setSelectedGroupMembers([]);
        setSelectedGroupName("No username found");
        setLoading(prev => ({ ...prev, userDetails: false }));
        setIsFetchingUser(false);
        return;
      }
      
      const groupMembers = await getExpertsForTeamUser(username);
      
      // Get selected user's data first
      const selectedUserOneLevelIssues = await getOneLevelAssignedIssues(user.id);
      const selectedUserTargetWeight = await calculateTargetWeight(user, selectedUserOneLevelIssues, selectedPeriod);
      const selectedUserContributedWeight = await calculateContributedWeight(user, selectedUserOneLevelIssues, selectedPeriod);
      const selectedUserTotalPersonalSubIssues = await countTotalPersonalSubIssues(user, selectedUserOneLevelIssues, selectedPeriod);
      
      // Get watched issues for the chart (ዝርዝር ተግባራት)
      const selectedUserWatchedIssues = await getWatchedOneLevelIssuesByUser(user.id);
      
      // Calculate performance percentage using new formula
      const selectedUserPerformance = calculatePerformancePercentage(
        selectedUserContributedWeight,
        selectedUserTargetWeight
      );
      
      const enhancedUser = {
        ...user,
        targetWeight: selectedUserTargetWeight,
        contributedWeight: selectedUserContributedWeight,
        totalPersonalSubIssues: selectedUserTotalPersonalSubIssues,
        watchedIssues: selectedUserWatchedIssues, // Use watched issues for chart
        assignedOneLevelIssues: selectedUserOneLevelIssues, // Keep one-level issues separate
        performance: selectedUserPerformance, // Use the new formula
        issueChartData: prepareIssueChartData(selectedUserWatchedIssues, selectedPeriod)
      };
      
      setSelectedUser(enhancedUser);
      
      // Get group members' data
      const membersWithDetails = await Promise.all(
        groupMembers.map(async (member) => {
          try {
            const assignedOneLevelIssues = await getOneLevelAssignedIssues(member.id);
            const targetWeight = await calculateTargetWeight(member, assignedOneLevelIssues, selectedPeriod);
            const contributedWeight = await calculateContributedWeight(member, assignedOneLevelIssues, selectedPeriod);
            const totalPersonalSubIssues = await countTotalPersonalSubIssues(member, assignedOneLevelIssues, selectedPeriod);
            
            // Calculate performance using new formula
            const performance = calculatePerformancePercentage(contributedWeight, targetWeight);
            
            return {
              ...member,
              assignedOneLevelIssues: assignedOneLevelIssues,
              watchedIssues: [],
              issueCount: assignedOneLevelIssues.length,
              performance: performance,
              targetWeight: targetWeight,
              contributedWeight: contributedWeight,
              totalPersonalSubIssues: totalPersonalSubIssues
            };
          } catch (error) {
            console.error(`Error fetching details for user ${member.id}:`, error);
            return {
              ...member,
              assignedOneLevelIssues: [],
              watchedIssues: [],
              issueCount: 0,
              performance: 0,
              targetWeight: 0,
              contributedWeight: 0,
              totalPersonalSubIssues: 0
            };
          }
        })
      );
      
      setSelectedGroupMembers(membersWithDetails);
      setSelectedGroupName(username);
      
      // Store in cache
      setUserDataCache(prev => ({
        ...prev,
        [cacheKey]: {
          user: enhancedUser,
          groupMembers: membersWithDetails,
          groupName: username,
          timestamp: Date.now()
        }
      }));
      
      setCurrentView('userDetail');
      
    } catch (error) {
      console.error("❌ Error fetching user details or group members:", error);
      setSelectedGroupMembers([]);
      setSelectedGroupName("Error fetching username");
    } finally {
      setLoading(prev => ({ ...prev, userDetails: false }));
      setIsFetchingUser(false);
    }
  }, [selectedPeriod, userDataCache, getOneLevelAssignedIssues, calculateTargetWeight, calculateContributedWeight, countTotalPersonalSubIssues, calculatePerformancePercentage, prepareIssueChartData]);

  const handleBackToMain = useCallback(() => {
    setCurrentView('main');
    setSelectedUser(null);
    setSelectedGroupMembers([]);
    setSelectedGroupName("");
  }, []);

  // ENHANCED: Function to handle period change with proper caching and recalculation
  const handlePeriodChange = useCallback((newPeriod) => {
    console.log(`🔄 Changing period from ${selectedPeriod} to ${newPeriod}`);
    
    if (newPeriod === selectedPeriod) return;
    
    setSelectedPeriod(newPeriod);
    
    // Prepare filtered data for the new period
    if (departments.length > 0 && teamGroups.length > 0) {
      prepareFilteredData(departments, teamGroups, newPeriod);
    }
    
    // If we're in user detail view, update the cached data
    if (currentView === 'userDetail' && selectedUser) {
      const newCacheKey = `${selectedUser.id}-${newPeriod}`;
      
      // Check if we have cached data for this period
      if (userDataCache[newCacheKey]) {
        console.log("✅ Using cached data for period in detail view:", newPeriod);
        setSelectedUser(userDataCache[newCacheKey].user);
        setSelectedGroupMembers(userDataCache[newCacheKey].groupMembers || []);
        setSelectedGroupName(userDataCache[newCacheKey].groupName || "");
        setCurrentCacheKey(newCacheKey);
      } else {
        // Recalculate with existing cached data
        console.log("🔄 Recalculating user data for new period:", newPeriod);
        
        // Recalculate contributed weight with new period
        const recalculateUserData = async () => {
          if (!selectedUser.assignedOneLevelIssues) return;
          
          const newTargetWeight = await calculateTargetWeight(
            selectedUser, 
            selectedUser.assignedOneLevelIssues, 
            newPeriod
          );
          
          const newContributedWeight = await calculateContributedWeight(
            selectedUser, 
            selectedUser.assignedOneLevelIssues, 
            newPeriod
          );
          
          const newPerformance = calculatePerformancePercentage(
            newContributedWeight,
            newTargetWeight
          );
          
          const newTotalPersonalSubIssues = await countTotalPersonalSubIssues(
            selectedUser,
            selectedUser.assignedOneLevelIssues,
            newPeriod
          );
          
          const updatedUser = {
            ...selectedUser,
            targetWeight: newTargetWeight,
            contributedWeight: newContributedWeight,
            totalPersonalSubIssues: newTotalPersonalSubIssues,
            performance: newPerformance,
            issueChartData: prepareIssueChartData(selectedUser.watchedIssues || [], newPeriod)
          };
          
          // Update group members' performance with new period
          const updatedGroupMembers = await Promise.all(
            selectedGroupMembers.map(async (member) => {
              if (!member.assignedOneLevelIssues) return member;
              
              const memberTargetWeight = await calculateTargetWeight(
                member,
                member.assignedOneLevelIssues,
                newPeriod
              );
              
              const memberContributedWeight = await calculateContributedWeight(
                member,
                member.assignedOneLevelIssues,
                newPeriod
              );
              
              const memberPerformance = calculatePerformancePercentage(
                memberContributedWeight,
                memberTargetWeight
              );
              
              const memberTotalPersonalSubIssues = await countTotalPersonalSubIssues(
                member,
                member.assignedOneLevelIssues,
                newPeriod
              );
              
              return {
                ...member,
                targetWeight: memberTargetWeight,
                contributedWeight: memberContributedWeight,
                totalPersonalSubIssues: memberTotalPersonalSubIssues,
                performance: memberPerformance
              };
            })
          );
          
          setSelectedUser(updatedUser);
          setSelectedGroupMembers(updatedGroupMembers);
          
          // Update cache
          setUserDataCache(prev => ({
            ...prev,
            [newCacheKey]: {
              user: updatedUser,
              groupMembers: updatedGroupMembers,
              groupName: selectedGroupName,
              timestamp: Date.now()
            }
          }));
          
          setCurrentCacheKey(newCacheKey);
        };
        
        recalculateUserData();
      }
    }
    
    // Update selected goal issues with new period if expanded
    if (expandedGoalId && selectedGoalIssues.length > 0) {
      const updatedGoalIssues = selectedGoalIssues.map(issue => {
        const targetValue = getTargetValue(issue.originalIssue, newPeriod);
        const hasValidTarget = isValidTargetValue(targetValue, newPeriod);
        
        const progress = hasValidTarget ? calculateProgress(issue.originalIssue, newPeriod) : 0;
        const actualWeight = hasValidTarget ? calculateActualWeightForIssue(issue.originalIssue, newPeriod) : 0;
        const actualValue = hasValidTarget ? getActualValue(issue.originalIssue, newPeriod) : 0;
        
        return {
          ...issue,
          progress: progress,
          actualWeight: actualWeight,
          targetValue: hasValidTarget ? targetValue : "0",
          actualValue: actualValue,
          status: hasValidTarget ? getStatusText(progress) : 'No Target',
          hasValidTarget: hasValidTarget
        };
      });
      
      setSelectedGoalIssues(updatedGoalIssues);
    }
  }, [selectedPeriod, departments, teamGroups, currentView, selectedUser, selectedGroupMembers, selectedGroupName, userDataCache, prepareFilteredData, calculateTargetWeight, calculateContributedWeight, countTotalPersonalSubIssues, calculatePerformancePercentage, prepareIssueChartData, expandedGoalId, selectedGoalIssues, calculateProgress, getStatusText, calculateActualWeightForIssue]);

  // Enhanced Tooltip component with period-specific data
  const CustomTooltip = ({ active, payload, label, period = selectedPeriod }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const issue = data?.originalIssue;
      
      const displayPeriod = period || selectedPeriod;
      
      if (!issue) {
        return (
          <div style={{
            backgroundColor: 'white',
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            maxWidth: '400px'
          }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px' }}>
              {data?.fullSubject || label || 'No data'}
            </p>
            <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
              <p style={{ margin: '4px 0', color: '#1976D2' }}>
                {displayPeriod} Progress: <strong>{data?.progress || 0}%</strong>
              </p>
              <p style={{ margin: '4px 0', color: '#4CAF50' }}>
                Weight: <strong>{data?.weight || 1}</strong>
              </p>
              <p style={{ margin: '4px 0', color: '#9C27B0' }}>
                Actual Weight: <strong>{data?.actualWeight?.toFixed(2) || '0.00'}</strong>
              </p>
            </div>
          </div>
        );
      }
      
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          maxWidth: '500px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '14px' }}>{data?.fullSubject || label}</p>
          <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '10px',
              marginBottom: '10px'
            }}>
              <div>
                <p style={{ margin: '4px 0', color: '#1976D2', fontSize: '12px' }}>
                  <strong>{displayPeriod} Progress:</strong>
                </p>
                <p style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold', color: getStatusColor(data?.progress || 0) }}>
                  {data?.progress || 0}%
                </p>
              </div>
              <div>
                <p style={{ margin: '4px 0', color: '#4CAF50', fontSize: '12px' }}>
                  <strong>Weight:</strong>
                </p>
                <p style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold', color: '#4CAF50' }}>
                  {data?.weight || 1}
                </p>
              </div>
              <div>
                <p style={{ margin: '4px 0', color: '#9C27B0', fontSize: '12px' }}>
                  <strong>Actual Weight:</strong>
                </p>
                <p style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold', color: '#9C27B0' }}>
                  {data?.actualWeight?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <p style={{ margin: '4px 0', color: getStatusColor(data?.progress || 0), fontSize: '12px' }}>
                  <strong>Status:</strong>
                </p>
                <p style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold', color: getStatusColor(data?.progress || 0) }}>
                  {data?.status || 'Unknown'}
                </p>
              </div>
            </div>
            
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '10px', 
              borderRadius: '4px',
              marginTop: '10px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '12px', color: '#666' }}>
                Period Details:
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span>Target ({displayPeriod}):</span>
                  <span style={{ fontWeight: 'bold', color: '#2E7D32' }}>{data?.targetValue || '0'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span>Actual ({displayPeriod}):</span>
                  <span style={{ fontWeight: 'bold', color: '#1976D2' }}>{data?.actualValue?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
            
            {displayPeriod === "Yearly" && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Quarterly Breakdown:</div>
                {["1ኛ ሩብዓመት", "2ኛ ሩብዓመት", "3ኛ ሩብዓመት", "4ኛ ሩብዓመት"].map(quarter => {
                  const performance = getActualValue(issue, quarter);
                  const plan = parseFloat(getTargetValue(issue, quarter)) || 0;
                  const progress = plan > 0 ? Math.round((performance * 100) / plan) : 0;
                  
                  return (
                    <div key={quarter} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>{quarter}:</span>
                      <span>
                        {performance.toFixed(2)} / {plan}
                        ({progress}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // ========== UI COMPONENTS ==========

  const LoadingSpinner = ({ text = "Loading..." }) => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '40px',
      minHeight: '200px'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid #1976D2',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }}></div>
      <p style={{ color: '#666' }}>{text}</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  const ProgressBar = ({ value, max = 100, color = '#1976D2', height = 8 }) => (
    <div style={{
      width: '100%',
      backgroundColor: '#f0f0f0',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${(value / max) * 100}%`,
        backgroundColor: color,
        height: `${height}px`,
        borderRadius: '4px',
        transition: 'width 0.3s ease'
      }}></div>
    </div>
  );

  const KPICard = ({ title, value, color, isLoading = false }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      textAlign: 'center',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.12)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
    }}
    >
      {isLoading ? (
        <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: '30px',
            height: '30px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid' + color,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      ) : (
        <>
          <h3 style={{ margin: '0', color: '#666', fontSize: '14px', fontWeight: '500' }}>{title}</h3>
          <p style={{ fontSize: '2.5rem', margin: '15px 0', fontWeight: 'bold', color: color }}>{value}</p>
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '4px',
            backgroundColor: color,
            opacity: '0.3'
          }}></div>
        </>
      )}
    </div>
  );

  const IssueBarChart = ({ data, title, onBarClick, isSubIssueView = false, period = selectedPeriod }) => (
    <div style={{ marginTop: '20px' }}>
      <h4 style={{ marginBottom: '15px', color: '#555' }}>{title}</h4>
      <ResponsiveContainer width="100%" height={Math.max(400, data.length * 25)}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          barSize={25}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <YAxis 
            type="number" 
            domain={[0, 100]}
            label={{ 
              value: `${period} Progress %`, 
              angle: -90, 
              position: 'insideLeft',
              offset: -10,
              style: { fontSize: 12 }
            }} 
          />
          <Tooltip content={<CustomTooltip period={period} />} />
          <Bar 
            dataKey="progress" 
            fill={isSubIssueView ? "#9C27B0" : "#8884d8"}
            onClick={onBarClick}
            radius={[4, 4, 0, 0]}
          >
            <LabelList 
              dataKey="progress" 
              position="top" 
              fill="#333"
              formatter={(value) => `${value}%`}
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const Section = ({ title, children, isExpanded, onToggle }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      borderLeft: `4px solid ${isExpanded ? '#1976D2' : '#e0e0e0'}`
    }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={onToggle}
      >
        <h2 style={{ margin: '0', color: '#333' }}>{title}</h2>
        <span style={{ fontSize: '24px', color: '#1976D2' }}>
          {isExpanded ? '−' : '+'}
        </span>
      </div>
      {isExpanded && (
        <div style={{ marginTop: '20px' }}>
          {children}
        </div>
      )}
    </div>
  );

  // ADDED: PeriodFilter Component
  const PeriodFilter = ({ currentPeriod, onPeriodChange }) => (
    <div style={{ 
      marginBottom: '30px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontWeight: 'bold', color: '#495057' }}>Filter by Period:</span>
        <select
          value={currentPeriod}
          onChange={(e) => onPeriodChange(e.target.value)}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #ced4da',
            backgroundColor: 'white',
            fontSize: '14px',
            minWidth: '180px',
            cursor: 'pointer'
          }}
        >
          {periodOptions.map(period => (
            <option key={period} value={period}>{period}</option>
          ))}
        </select>
      </div>
    </div>
  );

  // NEW: SubIssueView Component with Period Filter
  const SubIssueView = () => {
    // Prepare chart data for sub-issues
    const subIssueChartData = selectedIssueSubIssues.map(subIssue => ({
      name: subIssue.subject?.length > 20 ? subIssue.subject.substring(0, 20) + '...' : subIssue.subject || 'No Subject',
      progress: subIssue.progress,
      weight: subIssue.weight,
      status: subIssue.status,
      fullSubject: subIssue.subject || 'No Subject',
      id: subIssue.id,
      originalIssue: subIssue.originalIssue,
      actualWeight: subIssue.actualWeight,
      targetValue: subIssue.targetValue,
      actualValue: subIssue.actualValue,
      assignee: subIssue.assignee
    }));

    return (
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Back Button Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <button 
            onClick={handleBackFromSubIssues}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e0e0e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
          >
            ← Back to Parent Issues
          </button>
          
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: '0', color: '#9C27B0', fontSize: '28px' }}>
              {selectedParentIssue?.subject || 'Unknown Issue'}
            </h1>
            
          </div>
        </div>

        {/* Period Filter for Sub-Issues */}
        <div style={{ 
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#f3e5f5',
          borderRadius: '8px',
          border: '1px solid #e1bee7'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontWeight: 'bold', color: '#7b1fa2' }}>Filter by Period:</span>
            <select
              value={subIssuePeriod}
              onChange={(e) => handleSubIssuePeriodChange(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #ba68c8',
                backgroundColor: 'white',
                fontSize: '14px',
                minWidth: '180px',
                cursor: 'pointer',
                color: '#7b1fa2',
                fontWeight: 'bold'
              }}
            >
              {periodOptions.map(period => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
            
            
            
          
          </div>
        </div>

        {/* Sub-Issues Table */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              width: '100%'
            }}>
              <h2 style={{ 
                margin: '0', 
                color: '#9C27B0',
                paddingBottom: '10px',
                borderBottom: '2px solid #e0e0e0'
              }}>
                ዝርዝር ተግባራት Details ({subIssuePeriod})
              </h2>
              
             
            </div>
          </div>
          
          {selectedIssueSubIssues.length > 0 ? (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                overflowX: 'auto'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: '800px'
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#9C27B0',
                      color: 'white'
                    }}>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>#</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>Subject</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>Assignee</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {subIssuePeriod === "Yearly" ? "የዓመቱ እቅድ" : subIssuePeriod}
                      </th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {subIssuePeriod === "Yearly" ? "ዓመታዊ_አፈጻጸም" : subIssuePeriod + "_አፈጻጸም"}
                      </th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>Progress</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>Weight</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>Actual Weight</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIssueSubIssues.map((subIssue, index) => (
                      <tr 
                        key={subIssue.id}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                          borderBottom: '1px solid #e0e0e0',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f8ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#fff';
                        }}
                      >
                        <td style={{
                          padding: '12px 15px',
                          fontWeight: 'bold',
                          color: '#9C27B0',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <a 
                            href={`#${subIssue.id}`}
                            style={{
                              color: 'inherit',
                              textDecoration: 'none'
                            }}
                          >
                            #{subIssue.id}
                          </a>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          maxWidth: '300px',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <div style={{
                            fontWeight: 'bold',
                            color: '#333',
                            marginBottom: '4px'
                          }}>
                            {subIssue.subject}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: '#1976D2',
                            backgroundColor: '#e7f3ff',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {subIssue.assignee}
                          </span>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: '#2E7D32',
                            backgroundColor: '#e8f5e9',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {subIssue.targetValue}
                          </span>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: '#1976D2',
                            backgroundColor: '#e7f3ff',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {subIssue.actualValue?.toFixed(2)}
                          </span>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              
                            </div>
                            <span style={{
                              fontWeight: 'bold',
                              color: getStatusColor(subIssue.progress),
                              minWidth: '50px',
                              textAlign: 'right'
                            }}>
                              {subIssue.progress}%
                            </span>
                          </div>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: '#FF9800',
                            backgroundColor: '#fff3e0',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {subIssue.weight}
                          </span>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: '#9C27B0',
                            backgroundColor: '#f3e5f5',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {subIssue.actualWeight?.toFixed(2)}
                          </span>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: getStatusColor(subIssue.progress),
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            fontSize: '12px'
                          }}>
                            {subIssue.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Summary row */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderTop: '2px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Target</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2E7D32' }}>
                      {selectedIssueSubIssues.reduce((sum, issue) => sum + parseFloat(issue.targetValue || 0), 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Performance</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976D2' }}>
                      {selectedIssueSubIssues.reduce((sum, issue) => sum + (issue.actualValue || 0), 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Weight</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF9800' }}>
                      {selectedIssueSubIssues.reduce((sum, issue) => sum + (issue.weight || 0), 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Actual Weight</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#9C27B0' }}>
                      {selectedIssueSubIssues.reduce((sum, issue) => sum + (issue.actualWeight || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: '#e7f3ff',
                  padding: '8px 15px',
                  borderRadius: '6px',
                  border: '1px solid #b6d4fe'
                }}>
                  <div style={{ fontSize: '12px', color: '#084298', marginBottom: '4px' }}>Avg. Progress</div>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: selectedIssueSubIssues.length > 0 ? 
                      getStatusColor(Math.round(selectedIssueSubIssues.reduce((sum, issue) => sum + issue.progress, 0) / selectedIssueSubIssues.length)) : 
                      '#666'
                  }}>
                    {selectedIssueSubIssues.length > 0 ? 
                      Math.round(selectedIssueSubIssues.reduce((sum, issue) => sum + issue.progress, 0) / selectedIssueSubIssues.length) + '%' : 
                      '0%'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: '30px', 
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <p style={{ color: '#666', fontSize: '16px' }}>
                No ዝርዝር ተግባራት found for this ዋና ተግባር in the selected period ({subIssuePeriod}).
              </p>
              <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
                Try selecting a different period from the filter above.
              </p>
            </div>
          )}
        </div>

        {/* Sub-Issues Chart */}
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: '0', color: '#9C27B0' }}>
              ዝርዝር ተግባራት Progress Chart ({subIssuePeriod})
            </h2>
            
          </div>
          
          {subIssueChartData.length > 0 ? (
            <IssueBarChart
              data={subIssueChartData}
              
              onBarClick={(data) => console.log('Sub-issue clicked:', data)}
              isSubIssueView={true}
              period={subIssuePeriod}
            />
          ) : (
            <div style={{ 
              padding: '30px', 
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <p style={{ color: '#666', fontSize: '16px' }}>
                No ዝርዝር ተግባራት found for chart display in the selected period ({subIssuePeriod}).
              </p>
             
            </div>
          )}
        </div>
      </div>
    );
  };

  // NEW: GoalCard Component
  const GoalCard = ({ goal, departmentName, isExpanded }) => {
     const allRootIssues = (goal.originalIssues || goal.issues || []).filter(issue => !issue.parent);
  const issueCount = allRootIssues.length;
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: isExpanded ? '0 4px 12px rgba(25, 118, 210, 0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
        border: isExpanded ? '2px solid #1976D2' : '1px solid #e0e0e0',
        marginBottom: '15px',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => handleGoalCardClick(goal)}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h3 style={{ 
                margin: '0', 
                color: '#1976D2',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                {goal.name}
              </h3>
              <span style={{
                backgroundColor: '#e7f3ff',
                color: 'black',
                padding: '2px 8px',
                borderRadius: '5px',
                fontSize: '20px',
                fontWeight: 'bold'
              }}>
                {issueCount} ዋና ተግባራት
              </span>
            </div>
            
           
          </div>
          
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: isExpanded ? '#1976D2' : '#f5f5f5',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isExpanded ? 'white' : '#666',
            fontSize: '24px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
            flexShrink: 0,
            marginLeft: '15px'
          }}>
            {isExpanded ? '−' : '+'}
          </div>
        </div>
        
        {/* Expanded Content */}
        {isExpanded && !isViewingSubIssues && (
          <div style={{ 
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: '1px solid #e0e0e0',
            animation: 'fadeIn 0.3s ease'
          }}>
            {/* Issues List */}
            {selectedGoalIssues.length > 0 ? (
              <div>
                <h4 style={{ 
                  margin: '0 0 15px 0', 
                  color: '#555',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  ዋና ተግባራት ({selectedPeriod})
                </h4>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  {selectedGoalIssues.map(issue => (
                    <div 
                      key={issue.id}
                      style={{
                        backgroundColor: selectedIssueId === issue.id ? '#e7f3ff' : '#f9f9f9',
                        padding: '15px',
                        borderRadius: '8px',
                        border: selectedIssueId === issue.id ? '2px solid #1976D2' : '1px solid #e0e0e0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIssueClick(issue.id, issue);
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: '#333',
                        fontSize: '14px',
                        marginBottom: '8px',
                        lineHeight: '1.4'
                      }}>
                        {issue.subject}
                      </div>
                      
                     
                      
                      
                     
                      
                      {/* Click indicator */}
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        fontSize: '12px',
                        color: '#1976D2',
                        opacity: 0.7
                      }}>
                        ▶
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px',
                color: '#666',
                backgroundColor: '#f9f9f9',
                borderRadius: '6px'
              }}>
                No ዋና ትግባራት found for this goal.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const TabNavigation = () => (
    <div style={{ 
      display: 'flex', 
      gap: '10px', 
      marginBottom: '20px',
      borderBottom: '2px solid #e0e0e0',
      paddingBottom: '10px'
    }}>
      <button
        onClick={() => setActiveTab('teams')}
        style={{
          padding: '10px 24px',
          backgroundColor: activeTab === 'teams' ? '#1976D2' : '#f5f5f5',
          color: activeTab === 'teams' ? 'white' : '#333',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'all 0.2s'
        }}
      >
        Performance Overview
      </button>
      <button
        onClick={() => setActiveTab('departments')}
        style={{
          padding: '10px 24px',
          backgroundColor: activeTab === 'departments' ? '#1976D2' : '#f5f5f5',
          color: activeTab === 'departments' ? 'white' : '#333',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'all 0.2s'
        }}
      >
        Detailed Analysis
      </button>
    </div>
  );

  const UserList = ({ users, teamName }) => (
    <div style={{ marginTop: '20px' }}>
      <h4 style={{ 
        marginBottom: '15px', 
        color: '#555',
        paddingBottom: '10px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        {teamName}
      </h4>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: '15px'
      }}>
        {(users || []).map(user => (
          <div 
            key={user.id}
            style={{
              backgroundColor: '#f9f9f9',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f8ff';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f9f9f9';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onClick={() => handleUserClick(user)}
          >
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#1976D2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: 'bold', 
                color: '#333',
                fontSize: '16px',
                marginBottom: '4px'
              }}>
                {user.name || 'Unknown User'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const UserDetailView = () => {
    const pieData = [
      { 
        name: 'Not Started', 
        value: (selectedUser?.watchedIssues || []).filter(i => calculateProgress(i, selectedPeriod) === 0).length, 
        color: '#f44336' 
      },
      { 
        name: 'In Progress', 
        value: (selectedUser?.watchedIssues || []).filter(i => calculateProgress(i, selectedPeriod) > 0 && calculateProgress(i, selectedPeriod) < 100).length, 
        color: '#ff9800' 
      },
      { 
        name: 'Done', 
        value: (selectedUser?.watchedIssues || []).filter(i => calculateProgress(i, selectedPeriod) === 100).length, 
        color: '#4caf50' 
      },
    ].filter(item => item.value > 0);

    // Calculate best performers (performance > 0%)
    const bestPerformers = selectedGroupMembers
      .filter(member => (member.performance || 0) > 0)
      .sort((a, b) => (b.performance || 0) - (a.performance || 0))
      .slice(0, 3); // Top 3 performers

    // Calculate average performance of all team members
    const calculateAveragePerformance = () => {
      if (selectedGroupMembers.length === 0) return 0;
      
      const totalPerformance = selectedGroupMembers.reduce((sum, member) => {
        return sum + (member.performance || 0);
      }, 0);
      
      return Math.round(totalPerformance / selectedGroupMembers.length);
    };

    const averagePerformance = calculateAveragePerformance();

    // UPDATED: Prepare table data for ዝርዝር ተግባራት details with target value filtering
    const prepareIssueTableData = () => {
      const issues = selectedUser?.watchedIssues || [];
      
      // First filter by period
      const filteredIssues = filterIssuesByPeriod(issues, selectedPeriod);
      
      // Then filter out issues where target value is 0, empty, or invalid
      const validIssues = filteredIssues.filter(issue => {
        const targetValue = getTargetValue(issue, selectedPeriod);
        return isValidTargetValue(targetValue, selectedPeriod);
      });
      
      console.log(`📋 prepareIssueTableData: Started with ${issues.length} issues`);
      console.log(`📋 After period filtering: ${filteredIssues.length} issues`);
      console.log(`📋 After target validation: ${validIssues.length} issues with valid targets`);
      
      return validIssues.map(issue => {
        const weight = getWeight(issue);
        const actualWeight = calculateActualWeightForIssue(issue, selectedPeriod);
        
        // Get target based on period
        let target = 0;
        let performance = 0;
        
        if (selectedPeriod === "Yearly") {
          target = parseFloat(getTargetValue(issue, selectedPeriod)) || 0;
          performance = getActualValue(issue, selectedPeriod);
        } else {
          target = parseFloat(getTargetValue(issue, selectedPeriod)) || 0;
          performance = getActualValue(issue, selectedPeriod);
        }
        
        const progress = calculateProgress(issue, selectedPeriod);
        
        return {
          id: issue.id,
          subject: issue.subject || 'No Subject',
          target: target,
          performance: performance,
          progress: progress,
          weight: weight,
          actualWeight: actualWeight,
          status: getStatusText(progress),
          issueUrl: issue.url || `#${issue.id}`,
          originalIssue: issue
        };
      });
    };

    const issueTableData = prepareIssueTableData();

    return (
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <button 
            onClick={handleBackToMain}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e0e0e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
          >
            ← Back to Dashboard
          </button>
          
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: '0', color: '#1976D2', fontSize: '28px' }}>
              {selectedUser?.name || 'Unknown User'}
            </h1>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
              Period: <strong>{selectedPeriod}</strong>
            </div>
          </div>
        </div>

        {/* Period filter above Best Performers */}
        <div style={{ 
          marginBottom: '30px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontWeight: 'bold', color: '#495057' }}>Filter by Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #ced4da',
                backgroundColor: 'white',
                fontSize: '14px',
                minWidth: '180px',
                cursor: 'pointer'
              }}
            >
              <option value="Yearly">Yearly</option>
              <option value="1ኛ ሩብዓመት">1ኛ ሩብዓመት</option>
              <option value="2ኛ ሩብዓመት">2ኛ ሩብዓመት</option>
              <option value="3ኛ ሩብዓመት">3ኛ ሩብዓመት</option>
              <option value="4ኛ ሩብዓመት">4ኛ ሩብዓመት</option>
              <option value="6 Months">6 Months</option>
              <option value="9 Months">9 Months</option>
            </select>
            
            <div style={{ 
              fontSize: '14px', 
              color: '#495057',
              backgroundColor: '#e7f3ff',
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #b6d4fe'
            }}>
              <strong>Target Weight:</strong> {selectedUser?.targetWeight || 0} | 
              <strong> Contributed Weight:</strong> {selectedUser?.contributedWeight || 0}
            </div>
          </div>
        </div>

        {/* Combined Best Performers and Team Leader Performance Cards */}
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          {/* Best Performers Card */}
          {bestPerformers.length > 0 && (
            <div style={{ 
              flex: '1',
              minWidth: '300px',
              backgroundColor: '#fff8e1',
              borderRadius: '12px',
              padding: '20px',
              border: '2px solid #ffd54f',
              boxShadow: '0 4px 12px rgba(255, 213, 79, 0.2)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '15px',
                gap: '10px'
              }}>
                <div style={{
                  backgroundColor: '#ffd54f',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#333',
                  fontWeight: 'bold',
                  fontSize: '20px'
                }}>
                  🏆
                </div>
                <h2 style={{ margin: '0', color: '#ff8f00', fontSize: '24px' }}>
                  Best Performers
                </h2>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#ff8f00',
                  backgroundColor: '#ffecb3',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {selectedPeriod}
                </span>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '15px'
              }}>
                {bestPerformers.map((member, index) => (
                  <div 
                    key={member.id}
                    style={{
                      backgroundColor: index === 0 ? '#fff3e0' : '#fff',
                      padding: '15px',
                      borderRadius: '8px',
                      border: index === 0 ? '2px solid #ffb300' : '1px solid #ffd54f',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 6px 12px rgba(255, 213, 79, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {index === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        backgroundColor: '#ffb300',
                        color: 'white',
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        1st
                      </div>
                    )}
                    
                    <div style={{
                      width: '50px',
                      height: '50px',
                      backgroundColor: index === 0 ? '#ffb300' : 
                                     index === 1 ? '#ffd54f' : '#ffe082',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: index === 0 ? '#333' : '#666',
                      fontWeight: 'bold',
                      fontSize: '20px',
                      border: index === 0 ? '3px solid #ff8f00' : '2px solid #ffd54f'
                    }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: '#333',
                        fontSize: '18px',
                        marginBottom: '4px'
                      }}>
                        {member.login || member.name || 'Unknown'}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#666',
                        marginBottom: '8px'
                      }}>
                        {member.firstname || ''} {member.lastname || ''}
                      </div>
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 'bold',
                          color: index === 0 ? '#ff8f00' : '#666'
                        }}>
                          Performance: <span style={{ 
                            backgroundColor: index === 0 ? '#ff8f00' : 
                                           index === 1 ? '#ffb300' : '#ffca28',
                            color: 'white',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '14px'
                          }}>
                            {member.performance || 0}%
                          </span>
                        </div>
                        {member.id === selectedUser?.id && (
                          <span style={{ 
                            backgroundColor: '#1976D2',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {bestPerformers.length === 1 && (
                <div style={{ 
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#ffecb3',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#ff8f00',
                  textAlign: 'center'
                }}>
                  🎉 Congratulations! {bestPerformers[0].login || bestPerformers[0].name} is the only performer in the group with positive performance.
                </div>
              )}
            </div>
          )}

          {/* Team Leader Performance Card */}
          <div style={{ 
            flex: '0 0 250px',
            backgroundColor: '#e8f5e9',
            borderRadius: '12px',
            padding: '20px',
            border: '2px solid #4caf50',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{
              backgroundColor: '#4caf50',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '24px',
              marginBottom: '15px'
            }}>
              📊
            </div>
            
            <h3 style={{ 
              margin: '0 0 10px 0', 
              color: '#2e7d32', 
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              Team Leader Performance
            </h3>
            
            <div style={{ 
              fontSize: '42px', 
              fontWeight: 'bold',
              color: averagePerformance >= 80 ? '#4caf50' : 
                     averagePerformance >= 50 ? '#ff9800' : '#f44336',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
              margin: '10px 0'
            }}>
              {averagePerformance}%
            </div>
            
            <div style={{ 
              fontSize: '14px', 
              color: '#388e3c',
              marginTop: '10px'
            }}>
              Average of {selectedGroupMembers.length} members
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#666',
              marginTop: '5px',
              backgroundColor: '#c8e6c9',
              padding: '3px 8px',
              borderRadius: '4px'
            }}>
              Period: {selectedPeriod}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h2 style={{ margin: '0', color: '#1976D2' }}>
             Experts
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ 
                backgroundColor: '#e7f3ff',
                padding: '6px 15px',
                borderRadius: '20px',
                fontSize: '14px',
                color: '#084298',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>👥</span>
                Total: {selectedGroupMembers.length} members
              </span>
              <span style={{ 
                backgroundColor: '#d4edda',
                padding: '6px 15px',
                borderRadius: '20px',
                fontSize: '14px',
                color: '#155724',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📅</span>
                Period: {selectedPeriod}
              </span>
            </div>
          </div>
          
          {loading.userDetails ? (
            <LoadingSpinner text="Loading group members..." />
          ) : selectedGroupMembers.length === 0 ? (
            <div style={{ 
              padding: '25px', 
              backgroundColor: '#f8d7da',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #f5c6cb'
            }}>
              <p style={{ marginBottom: '10px', color: '#721c24' }}>
                <strong>⚠️ No group found with name "{selectedGroupName}"</strong>
              </p>
              <p style={{ fontSize: '14px', color: '#721c24' }}>
                There is no Redmine group with the exact name "{selectedGroupName}" 
                (user's login name).
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
              gap: '20px'
            }}>
              {selectedGroupMembers.map(member => (
                <div 
                  key={member.id}
                  style={{
                    backgroundColor: member.id === selectedUser?.id ? '#e7f3ff' : '#f9f9f9',
                    padding: '20px',
                    borderRadius: '10px',
                    border: member.id === selectedUser?.id ? '2px solid #1976D2' : '1px solid #e0e0e0',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (member.id !== selectedUser?.id) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        color: '#333',
                        fontSize: '18px',
                        marginBottom: '2px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>{member.login || member.name || 'Unknown'}</span>
                        <span style={{ 
                          fontSize: '14px',
                          fontWeight: 'normal',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          padding: '2px 10px',
                          borderRadius: '5px'
                        }}>
                          Performance-{member.performance || 0}%
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#666'
                      }}>
                        {member.firstname || ''} {member.lastname || ''}
                      </div>
                      {member.id === selectedUser?.id && (
                        <span style={{ 
                          display: 'inline-block',
                          marginTop: '5px',
                          backgroundColor: '#1976D2',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'normal'
                        }}>
                          Current User
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '10px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ 
                      backgroundColor: '#fff',
                      padding: '10px',
                      borderRadius: '6px',
                      textAlign: 'center',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Target Weight</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4CAF50' }}>
                        {member.targetWeight || 0}
                      </div>
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{selectedPeriod}</div>
                    </div>
                    <div style={{ 
                      backgroundColor: '#fff',
                      padding: '10px',
                      borderRadius: '6px',
                      textAlign: 'center',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Contributed Weight</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF9800' }}>
                        {member.contributedWeight || 0}
                      </div>
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{selectedPeriod}</div>
                    </div>
                    <div style={{ 
                      backgroundColor: '#fff',
                      padding: '10px',
                      borderRadius: '6px',
                      textAlign: 'center',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>total የግል እቅድ</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976D2' }}>
                        {member.totalPersonalSubIssues || 0}
                      </div>
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{selectedPeriod}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ዝርዝር ተግባራት Details Table */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              width: '100%'
            }}>
              <h2 style={{ 
                margin: '0', 
                color: '#1976D2',
                paddingBottom: '10px',
                borderBottom: '2px solid #e0e0e0'
              }}>
                ዝርዝር ተግባራት Details ({selectedPeriod})
              </h2>
              
              <div style={{ 
                backgroundColor: '#e7f3ff',
                padding: '6px 15px',
                borderRadius: '20px',
                fontSize: '14px',
                color: '#084298',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📊</span>
                Showing {issueTableData.length} issues with valid targets
              </div>
            </div>
          </div>
          
          {issueTableData.length > 0 ? (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                overflowX: 'auto'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: '800px'
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: '#1976D2',
                      color: 'white'
                    }}>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>#</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>Subject</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {selectedPeriod === "Yearly" ? "የዓመቱ እቅድ" : selectedPeriod}
                      </th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {selectedPeriod === "Yearly" ? "ዓመታዊ_አፈጻጸም" : selectedPeriod + "_አፈጻጸም"}
                      </th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>Progress</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>Weight</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        borderRight: '1px solid rgba(255,255,255,0.1)'
                      }}>Actual Weight</th>
                      <th style={{
                        padding: '12px 15px',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issueTableData.map((issue, index) => (
                      <tr 
                        key={issue.id}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                          borderBottom: '1px solid #e0e0e0',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f0f8ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : '#fff';
                        }}
                      >
                        <td style={{
                          padding: '12px 15px',
                          fontWeight: 'bold',
                          color: '#1976D2',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <a 
                            href={issue.issueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'inherit',
                              textDecoration: 'none'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = 'none';
                            }}
                          >
                            #{issue.id}
                          </a>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          maxWidth: '300px',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <div style={{
                            fontWeight: 'bold',
                            color: '#333',
                            marginBottom: '4px'
                          }}>
                            {issue.subject}
                          </div>
                          {issue.originalIssue?.tracker && (
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              backgroundColor: '#e9ecef',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              display: 'inline-block'
                            }}>
                              {issue.originalIssue.tracker.name}
                            </div>
                          )}
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: '#2E7D32',
                            backgroundColor: '#e8f5e9',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {issue.target}
                          </span>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: '#1976D2',
                            backgroundColor: '#e7f3ff',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {issue.performance}
                          </span>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                backgroundColor: '#f0f0f0',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                height: '8px'
                              }}>
                                <div style={{
                                  width: `${issue.progress}%`,
                                  backgroundColor: getStatusColor(issue.progress),
                                  height: '100%',
                                  transition: 'width 0.3s ease'
                                }}></div>
                              </div>
                            </div>
                            <span style={{
                              fontWeight: 'bold',
                              color: getStatusColor(issue.progress),
                              minWidth: '50px',
                              textAlign: 'right'
                            }}>
                              {issue.progress}%
                            </span>
                          </div>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: '#FF9800',
                            backgroundColor: '#fff3e0',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {issue.weight}
                          </span>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center',
                          borderRight: '1px solid #e0e0e0'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: '#9C27B0',
                            backgroundColor: '#f3e5f5',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            {issue.actualWeight}
                          </span>
                        </td>
                        <td style={{
                          padding: '12px 15px',
                          textAlign: 'center'
                        }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: 'white',
                            backgroundColor: getStatusColor(issue.progress),
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            fontSize: '12px'
                          }}>
                            {issue.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Summary row */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderTop: '2px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Target</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2E7D32' }}>
                      {issueTableData.reduce((sum, issue) => sum + issue.target, 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Performance</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976D2' }}>
                      {issueTableData.reduce((sum, issue) => sum + issue.performance, 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Weight</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#FF9800' }}>
                      {issueTableData.reduce((sum, issue) => sum + issue.weight, 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Actual Weight</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#9C27B0' }}>
                      {issueTableData.reduce((sum, issue) => sum + issue.actualWeight, 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: '#e7f3ff',
                  padding: '8px 15px',
                  borderRadius: '6px',
                  border: '1px solid #b6d4fe'
                }}>
                  <div style={{ fontSize: '12px', color: '#084298', marginBottom: '4px' }}>Avg. Progress</div>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: issueTableData.length > 0 ? 
                      getStatusColor(Math.round(issueTableData.reduce((sum, issue) => sum + issue.progress, 0) / issueTableData.length)) : 
                      '#666'
                  }}>
                    {issueTableData.length > 0 ? 
                      Math.round(issueTableData.reduce((sum, issue) => sum + issue.progress, 0) / issueTableData.length) + '%' : 
                      '0%'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: '30px', 
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <p style={{ color: '#666', fontSize: '16px' }}>
                No ዝርዝር ተግባራት found for this user in the selected period with valid targets.
              </p>
              <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
                (Issues with target value 0, empty, or invalid are filtered out)
              </p>
            </div>
          )}
        </div>

        {/* Chart Section */}
        <div>
          <h2 style={{ marginBottom: '20px', color: '#1976D2' }}>
            ዝርዝር ተግባራት Progress Chart ({selectedPeriod})
          </h2>
          {selectedUser?.issueChartData && selectedUser.issueChartData.length > 0 ? (
            <IssueBarChart
              data={selectedUser.issueChartData}
              title="ዝርዝር ተግባራት Progress"
              onBarClick={(data) => console.log('Issue clicked:', data)}
            />
          ) : (
            <div style={{ 
              padding: '30px', 
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <p style={{ color: '#666', fontSize: '16px' }}>
                No ዝርዝር ተግባራት found for this user in the selected period with valid targets.
              </p>
              <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
                (Issues with target value 0, empty, or invalid are filtered out from the chart)
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    async function fetchData() {
      setLoading({ overall: true, departments: false, teams: false, userDetails: false });
      
      try {
        const user = await getCurrentUser();
        if (!user) return;

        setLoading(prev => ({ ...prev, departments: true }));
        const [mainProjects, allProjects] = await Promise.all([
          getMyMainProjectsWithSubprojects(),
          getProjects()
        ]);

        const deptWithGoals = await Promise.all(
          mainProjects.map(async (mainProject) => {
            const subprojects = allProjects.filter(
              (p) => p.parent?.id === mainProject.id
            );

            const goals = await Promise.all(
              subprojects.map(async (goal) => {
                const issues = await getProjectIssues({ project_id: goal.id });
                const rootIssues = issues.filter((i) => !i.parent);
                const statusSummary = {
                  notStarted: rootIssues.filter(i => getProgressForPeriod(i, "Yearly") === 0).length,
                  inProgress: rootIssues.filter(i => getProgressForPeriod(i, "Yearly") > 0 && getProgressForPeriod(i, "Yearly") < 100).length,
                  done: rootIssues.filter(i => getProgressForPeriod(i, "Yearly") === 100).length
                };
                return {
                  id: goal.id,
                  name: goal.name,
                  issues: rootIssues,
                  originalIssues: rootIssues, // Store original unfiltered issues
                  performance: calculateWeightedPerformance(rootIssues, "Yearly"),
                  statusSummary,
                  issueChartData: prepareIssueChartData(rootIssues, "Yearly")
                };
              })
            );

            return { department: mainProject, goals };
          })
        );

        setDepartments(deptWithGoals);
        setLoading(prev => ({ ...prev, departments: false }));

        setLoading(prev => ({ ...prev, teams: true }));
        const teamField = user.custom_fields?.find((f) => f.name === "Team");
        const teamNames = Array.isArray(teamField?.value) ? teamField.value : [];

        const groupsData = await Promise.all(
          teamNames.map(async (teamName) => {
            console.log("🔄 Fetching group for team:", teamName);
            const users = await getExpertsForTeamUser(teamName);
            console.log("✅ Users in group", teamName, ":", users);

            const usersWithDetails = await Promise.all(
              users.map(async (u) => {
                const watchedIssues = await getWatchedOneLevelIssuesByUser(u.id);
                const assignedOneLevelIssues = await getOneLevelAssignedIssues(u.id);
                const targetWeight = await calculateTargetWeight(u, assignedOneLevelIssues, "Yearly");
                const contributedWeight = await calculateContributedWeight(u, assignedOneLevelIssues, "Yearly");
                const totalPersonalSubIssues = await countTotalPersonalSubIssues(u, assignedOneLevelIssues, "Yearly");
                
                // Calculate performance percentage using the new formula
                const performancePercentage = calculatePerformancePercentage(
                  contributedWeight,
                  targetWeight
                );
                
                return { 
                  ...u, 
                  watchedIssues, 
                  performance: performancePercentage,
                  issueChartData: prepareIssueChartData(watchedIssues, "Yearly"),
                  targetWeight: targetWeight,
                  contributedWeight: contributedWeight,
                  totalPersonalSubIssues: totalPersonalSubIssues,
                  assignedOneLevelIssues: assignedOneLevelIssues
                };
              })
            );

            return { name: teamName, users: usersWithDetails };
          })
        );

        console.log("📊 Final groups data:", groupsData);
        setTeamGroups(groupsData);
        prepareFilteredData(deptWithGoals, groupsData, "Yearly");
        setLoading(prev => ({ ...prev, teams: false, overall: false }));

      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setLoading({ overall: false, departments: false, teams: false, userDetails: false });
      }
    }

    fetchData();
  }, [getOneLevelAssignedIssues, calculateTargetWeight, calculateContributedWeight, countTotalPersonalSubIssues, calculatePerformancePercentage, prepareIssueChartData, calculateWeightedPerformance, prepareFilteredData]);

  // Update filtered data when period changes
  useEffect(() => {
    if (departments.length > 0 && teamGroups.length > 0) {
      prepareFilteredData(departments, teamGroups, selectedPeriod);
    }
  }, [selectedPeriod, departments, teamGroups, prepareFilteredData]);

  if (loading.overall) {
    return <LoadingSpinner text="Loading dashboard data..." />;
  }

  // Check if we're viewing sub-issues
  if (isViewingSubIssues) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <SubIssueView />
      </div>
    );
  }

  if (currentView === 'userDetail') {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        {isFetchingUser ? (
          <LoadingSpinner text="Loading user details..." />
        ) : (
          <UserDetailView />
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <KPICard 
          title="Total Goals Tracked" 
          value={kpis.totalGoals} 
          color="#1976D2"
          isLoading={loading.departments}
        />
        <KPICard 
          title="Team Leaders" 
          value={kpis.totalTeamMembers} 
          color="#FF8F00"
          isLoading={loading.teams}
        />
        <KPICard 
          title={`${selectedPeriod} ዝርዝር ተግባራት`}
          value={kpis.totalWatchedIssues} 
          color="#9C27B0"
          isLoading={loading.teams}
        />
      </div>

      <TabNavigation />

      {activeTab === 'departments' && (
        <>
          {/* REMOVED: PeriodFilter from Detailed Analysis tab */}
          
          {loading.departments ? (
            <LoadingSpinner text="Loading department data..." />
          ) : filteredDepartmentData.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              backgroundColor: '#f9f9f9',
              borderRadius: '8px'
            }}>
              <p>No departments found for the selected period.</p>
            </div>
          ) : (
            <div>
              <h2 style={{ 
                marginBottom: '30px', 
                color: '#1976D2',
                paddingBottom: '15px',
                borderBottom: '2px solid #e0e0e0'
              }}>
                Detailed Analysis
              </h2>
              
              {filteredDepartmentData.map(({ department, goals }) => (
                <div key={department.id} style={{ marginBottom: '30px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ 
                      margin: '0', 
                      color: '#333',
                      fontSize: '22px',
                      fontWeight: 'bold'
                    }}>
                      {department.name}
                    </h3>
                    <span style={{
                      backgroundColor: '#1976D2',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      {goals?.length || 0} Goals
                    </span>
                  </div>
                  
                  {(goals?.length || 0) === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '30px',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '8px'
                    }}>
                      <p style={{ color: '#666' }}>No goals under this department for the selected period.</p>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
                      gap: '20px'
                    }}>
                      {goals.map(goal => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          departmentName={department.name}
                          isExpanded={expandedGoalId === goal.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'teams' && (
        <>
          {/* KEEP: PeriodFilter in Performance Overview tab */}
          <PeriodFilter 
            currentPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
          
          {loading.teams ? (
            <LoadingSpinner text="Loading team data..." />
          ) : filteredTeamData.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              backgroundColor: '#f9f9f9',
              borderRadius: '8px'
            }}>
              <p>No teams assigned or no data for the selected period.</p>
            </div>
          ) : (
            <div>
              <h2 style={{ 
                marginBottom: '30px', 
                color: '#1976D2',
                paddingBottom: '15px',
                borderBottom: '2px solid #e0e0e0'
              }}>
                Performance Overview
              </h2>
              
              {filteredTeamData.map((group) => (
                <div key={group.name} style={{ marginBottom: '30px' }}>
                  <UserList users={group.users} teamName={group.name} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Add CSS animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }l
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}