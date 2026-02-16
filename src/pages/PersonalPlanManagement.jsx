import React, { useState, useEffect, useRef } from "react";
import {
  getCurrentUser,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  getAllMyAssignedIssues,
  getIssuesAssigned
} from "../api/redmineApi";

export default function PersonalPlanManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [editFormData, setEditFormData] = useState({
    subject: "",
    description: "",
    status_id: "",
    priority_id: "",
    assigned_to_id: "",
    start_date: "",
    due_date: ""
  });
  
  // Data structures for the hierarchy
  const [parentIssues, setParentIssues] = useState([]);
  const [childIssuesMap, setChildIssuesMap] = useState(new Map());
  const [subIssuesMap, setSubIssuesMap] = useState(new Map());
  
  // Filter state
  const [filterType, setFilterType] = useState("all");
  
  const [parentId, setParentId] = useState("");
  const [parentIssue, setParentIssue] = useState(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [trackerId, setTrackerId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [priorityId, setPriorityId] = useState("2");
  const [assignedToId, setAssignedToId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [customFields, setCustomFields] = useState([]);
  const [editCustomFields, setEditCustomFields] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [deleting, setDeleting] = useState(false);

  // NEW: Layout dimensions
  const [headerHeight, setHeaderHeight] = useState(70);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const mainContentRef = useRef(null);

  // Fields to exclude from custom fields
  const excludedFields = [
    "የአፈጻጸም አመልካች",
    "የእድገት ሪፖርት ማጠቃለያ",
    "የጠናቀቀ መረጃ",
    "Supporters",
    "1ኛ ሩብዓመት_አፈጻጸም",
    "2ኛ ሩብዓመት_አፈጻጸም",
    "3ኛ ሩብዓመት_አፈጻጸም",
    "4ኛ ሩብዓመት_አፈጻጸም"  
  ];

  // FIXED ORDER of fields as specified
  const fieldOrder = [
    "መለኪያ",
    "ክብደት",
    "የዓመቱ እቅድ",
    "1ኛ ሩብዓመት",
    "2ኛ ሩብዓመት",
    "3ኛ ሩብዓመት",
    "4ኛ ሩብዓመት",
    "የሚጠበቅ ውጤት"
  ];

  // List of always mandatory fields
  const alwaysMandatoryFields = [
    "መለኪያ",
    "ክብደት",
    "የዓመቱ እቅድ",
    "የሚጠበቅ ውጤት"
  ];

  // Quarter fields that become mandatory if parent has them
  const quarterFields = [
    "1ኛ ሩብዓመት",
    "2ኛ ሩብዓመት",
    "3ኛ ሩብዓመት",
    "4ኛ ሩብዓመት"
  ];

  // Field that should show parent value hint
  const fieldWithParentValueHint = "መለኪያ";

  // Helper function to get custom field value
  const getCustomFieldValue = (issue, fieldName) => {
    if (!issue || !issue.custom_fields) return "";
    
    const field = issue.custom_fields.find(cf => cf.name === fieldName);
    return field ? field.value || "" : "";
  };

  // Helper function to check if a field has value (not empty and not zero)
  const fieldHasValue = (issue, fieldName) => {
    const value = getCustomFieldValue(issue, fieldName);
    return value && value !== "" && value !== "0" && value !== 0;
  };

  // Helper function to get quarter fields that are mandatory for parent
  const getMandatoryQuarterFieldsForParent = (parentIssue) => {
    if (!parentIssue) return [];
    
    return quarterFields.filter(fieldName => 
      fieldHasValue(parentIssue, fieldName)
    );
  };

  // Helper function to sort custom fields according to the fixed order
  const sortCustomFieldsByFixedOrder = (fields) => {
    return [...fields].sort((a, b) => {
      const indexA = fieldOrder.indexOf(a.name);
      const indexB = fieldOrder.indexOf(b.name);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      return 0;
    });
  };

  // Helper function to get assignee name
  const getAssigneeName = (issue) => {
    if (!issue) return "Unassigned";
    
    if (issue.assigned_to && typeof issue.assigned_to === 'object') {
      const firstName = issue.assigned_to.firstname || '';
      const lastName = issue.assigned_to.lastname || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      if (fullName) return fullName;
      
      if (issue.assigned_to.name) return issue.assigned_to.name;
    }
    
    if (issue.assigned_to && typeof issue.assigned_to === 'number') {
      return `User ID: ${issue.assigned_to}`;
    }
    
    if (issue.author) {
      return `${issue.author.firstname || ''} ${issue.author.lastname || ''}`.trim();
    }
    
    return "Unassigned";
  };

  // Calculate layout dimensions
  useEffect(() => {
    const updateLayoutDimensions = () => {
      // Update screen width
      const width = window.innerWidth;
      setScreenWidth(width);
      
      // Get header height
      const header = document.querySelector('header');
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
      
      // Get sidebar width and collapsed state
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        setSidebarWidth(sidebar.offsetWidth);
        const isCollapsed = sidebar.classList.contains('collapsed') || 
                          (width <= 991 && !sidebar.classList.contains('expanded'));
        setIsSidebarCollapsed(isCollapsed);
      }
    };

    // Initial calculation
    updateLayoutDimensions();

    // Update on resize
    window.addEventListener('resize', updateLayoutDimensions);

    // Set up mutation observer for sidebar changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          updateLayoutDimensions();
        }
      });
    });

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateLayoutDimensions);
    };
  }, []);

  // Calculate modal positioning
  const getModalPosition = () => {
    if (screenWidth <= 767) {
      // Mobile
      return {
        top: `${headerHeight}px`,
        left: '0',
        right: '0',
        bottom: '0',
        padding: '20px 15px'
      };
    }
    
    // Desktop - account for sidebar
    let leftPosition = isSidebarCollapsed ? 80 : sidebarWidth;
    
    return {
      top: `${headerHeight}px`,
      left: `${leftPosition}px`,
      right: '0',
      bottom: '0',
      padding: '40px 20px'
    };
  };

  // Calculate modal content max height
  const getModalMaxHeight = () => {
    const modalPosition = getModalPosition();
    const paddingTop = parseInt(modalPosition.padding.split(' ')[0]) || 0;
    return `calc(100vh - ${headerHeight + paddingTop}px)`;
  };

  // Load current user FIRST
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
        if (user) {
          setAssignedToId(user.id || "");
        }
      } catch (error) {
        console.error("Error loading current user:", error);
      }
    }
    loadCurrentUser();
  }, []);

  // Enhanced function to fetch issue with assignee details
  const fetchIssueWithDetails = async (issueId) => {
    try {
      const issue = await getIssue(issueId);
      return issue;
    } catch (error) {
      console.error(`Error fetching issue ${issueId}:`, error);
      throw error;
    }
  };

  // Then load issues in the new hierarchy
  useEffect(() => {
    async function loadIssuesHierarchy() {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        console.log("=== Starting to load hierarchy ===");
        console.log("Current user ID:", currentUser.id);
        
        // Step 1: Try to get all assigned issues using getAllMyAssignedIssues
        let allAssignedIssues = await getAllMyAssignedIssues();
        
        // If no issues found or function doesn't exist, try getIssuesAssigned as fallback
        if (!allAssignedIssues || allAssignedIssues.length === 0) {
          console.log("getAllMyAssignedIssues returned no issues, trying getIssuesAssigned...");
          allAssignedIssues = await getIssuesAssigned(currentUser.id);
          
          // Add assignment type for fallback issues
          allAssignedIssues = allAssignedIssues.map(issue => ({
            ...issue,
            assignmentType: 'Direct',
            assignmentSource: `${currentUser.firstname} ${currentUser.lastname}`
          }));
        }
        
        console.log("Total issues found:", allAssignedIssues.length);
        
        // Step 2: Identify child issues (issues with parent)
        const childIssues = allAssignedIssues.filter(issue => 
          issue.parent && issue.parent.id
        );
        
        console.log("Child issues (with parent):", childIssues.length);
        
        // Step 3: Identify sub-issues (issues whose parent is a child issue)
        const childIssueIds = new Set(childIssues.map(c => c.id));
        const subIssues = allAssignedIssues.filter(issue => 
          issue.parent && issue.parent.id && childIssueIds.has(issue.parent.id)
        );
        
        console.log("Sub-issues:", subIssues.length);
        
        // Step 4: Get unique parent IDs from child issues
        const parentIdsFromChildren = new Set();
        childIssues.forEach(child => {
          if (child.parent && child.parent.id) {
            parentIdsFromChildren.add(child.parent.id);
          }
        });
        
        console.log("Parent IDs from children:", Array.from(parentIdsFromChildren));
        
        // Step 5: Fetch parent issues
        const verifiedParentIssues = [];
        
        for (const parentId of Array.from(parentIdsFromChildren)) {
          try {
            const parentIssue = await fetchIssueWithDetails(parentId);
            
            // Only include if it's a top-level issue (no parent)
            if (!parentIssue.parent || !parentIssue.parent.id) {
              console.log(`Parent ${parentId} is top-level: "${parentIssue.subject}"`);
              
              // Get child issues for this parent
              const childrenForThisParent = childIssues.filter(child => 
                child.parent && child.parent.id === parentId
              );
              
              console.log(`  Has ${childrenForThisParent.length} child issues`);
              
              // Fetch details for each child
              const childrenWithDetails = await Promise.all(
                childrenForThisParent.map(async (child) => {
                  try {
                    const childDetails = await fetchIssueWithDetails(child.id);
                    return {
                      ...childDetails,
                      assignmentType: child.assignmentType || 'Direct',
                      assignmentSource: child.assignmentSource || `${currentUser.firstname} ${currentUser.lastname}`
                    };
                  } catch (error) {
                    console.error(`Error fetching child ${child.id}:`, error);
                    return child;
                  }
                })
              );
              
              verifiedParentIssues.push({
                ...parentIssue,
                children: childrenWithDetails
              });
            }
          } catch (error) {
            console.error(`Error loading parent ${parentId}:`, error);
          }
        }
        
        // Step 6: Also include standalone parent issues
        const standaloneParentIssues = allAssignedIssues.filter(issue => 
          !issue.parent || !issue.parent.id
        );
        
        for (const parent of standaloneParentIssues) {
          if (!verifiedParentIssues.some(vp => vp.id === parent.id)) {
            try {
              const parentWithDetails = await fetchIssueWithDetails(parent.id);
              if (!parentWithDetails.parent || !parentWithDetails.parent.id) {
                verifiedParentIssues.push({
                  ...parentWithDetails,
                  children: [],
                  assignmentType: parent.assignmentType || 'Direct',
                  assignmentSource: parent.assignmentSource || `${currentUser.firstname} ${currentUser.lastname}`
                });
              }
            } catch (error) {
              console.error(`Error loading standalone parent ${parent.id}:`, error);
            }
          }
        }
        
        // Step 7: Organize sub-issues
        const subIssuesMapWithDetails = new Map();
        const subIssuesByParentId = {};
        
        subIssues.forEach(subIssue => {
          if (!subIssue.parent || !subIssue.parent.id) return;
          const parentId = subIssue.parent.id;
          if (!subIssuesByParentId[parentId]) {
            subIssuesByParentId[parentId] = [];
          }
          subIssuesByParentId[parentId].push(subIssue);
        });
        
        // Fetch details for sub-issues
        for (const [parentId, subIssuesList] of Object.entries(subIssuesByParentId)) {
          const subIssuesWithDetails = await Promise.all(
            subIssuesList.map(async (subIssue) => {
              try {
                const details = await fetchIssueWithDetails(subIssue.id);
                return {
                  ...details,
                  assignmentType: subIssue.assignmentType || 'Direct',
                  assignmentSource: subIssue.assignmentSource || `${currentUser.firstname} ${currentUser.lastname}`
                };
              } catch (error) {
                console.error(`Error fetching sub-issue ${subIssue.id}:`, error);
                return subIssue;
              }
            })
          );
          subIssuesMapWithDetails.set(parseInt(parentId), subIssuesWithDetails);
        }
        
        // Step 8: Create child issues map
        const childIssuesByParentId = new Map();
        childIssues.forEach(child => {
          if (child.parent && child.parent.id) {
            const parentId = child.parent.id;
            if (!childIssuesByParentId.has(parentId)) {
              childIssuesByParentId.set(parentId, []);
            }
            childIssuesByParentId.get(parentId).push(child);
          }
        });
        
        // Sort parent issues by ID
        verifiedParentIssues.sort((a, b) => (a.id || 0) - (b.id || 0));
        
        console.log("=== Hierarchy loaded ===");
        console.log("Parent issues:", verifiedParentIssues.length);
        console.log("Sub-issues map size:", subIssuesMapWithDetails.size);
        
        // Update state
        setParentIssues(verifiedParentIssues);
        setChildIssuesMap(childIssuesByParentId);
        setSubIssuesMap(subIssuesMapWithDetails);
        
      } catch (error) {
        console.error("Error loading issue hierarchy:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (currentUser) {
      loadIssuesHierarchy();
    }
  }, [currentUser]);

  // Load parent issue data when parent is selected
  const loadParentData = async (issueId) => {
    try {
      const issue = await fetchIssueWithDetails(issueId);
      setParentIssue(issue);
      
      if (issue.tracker && issue.tracker.id) {
        setTrackerId(issue.tracker.id.toString());
      }
      
      setStatuses(issue.allowed_statuses || []);

      // Get all custom fields from parent except excluded ones
      const allCustomFields = issue.custom_fields || [];
      
      // Identify which quarter fields are mandatory for this parent
      const mandatoryQuarterFields = getMandatoryQuarterFieldsForParent(issue);
      
      // Filter custom fields: exclude excludedFields, but include all fields in our fixed order
      const filteredCustomFields = allCustomFields
        .filter(cf => {
          return (
            fieldOrder.includes(cf.name) ||
            !excludedFields.includes(cf.name)
          );
        })
        .map(cf => {
          const isMandatory = alwaysMandatoryFields.includes(cf.name) || mandatoryQuarterFields.includes(cf.name);
          const showParentValue = cf.name === fieldWithParentValueHint;
          
          return {
            id: cf.id,
            name: cf.name,
            value: isMandatory && showParentValue ? (cf.value || "") : "",
            isMandatory: isMandatory,
            originalValue: cf.value || "",
            showParentValueHint: showParentValue
          };
        });

      // Sort fields according to the fixed order
      const sortedCustomFields = sortCustomFieldsByFixedOrder(filteredCustomFields);

      setCustomFields(sortedCustomFields);
      
    } catch (error) {
      console.error("Error loading parent data:", error);
    }
  };

  const handleCreateClick = async (issueId) => {
    setParentId(issueId);
    await loadParentData(issueId);
    setShowCreateModal(true);
  };

  const handleEditClick = async (issue) => {
    setEditingIssue(issue);
    
    setEditFormData({
      subject: issue.subject || "",
      description: issue.description || "",
      status_id: issue.status?.id?.toString() || "",
      priority_id: issue.priority?.id?.toString() || "2",
      assigned_to_id: currentUser?.id || "",
      start_date: issue.start_date || "",
      due_date: issue.due_date || ""
    });
    
    if (issue.tracker && issue.tracker.id) {
      setTrackerId(issue.tracker.id.toString());
    }
    
    if (issue.parent && issue.parent.id) {
      try {
        const parentIssueData = await fetchIssueWithDetails(issue.parent.id);
        setParentIssue(parentIssueData);
        setStatuses(parentIssueData.allowed_statuses || []);
        
        // Get mandatory quarter fields for parent
        const mandatoryQuarterFields = getMandatoryQuarterFieldsForParent(parentIssueData);
        
        const parentCustomFields = parentIssueData.custom_fields || [];
        const issueCustomFields = issue.custom_fields || [];
        
        // Map custom fields, marking mandatory ones
        const mappedCustomFields = parentCustomFields
          .filter(cf => {
            return (
              fieldOrder.includes(cf.name) ||
              !excludedFields.includes(cf.name)
            );
          })
          .map(cf => {
            const issueField = issueCustomFields.find(f => f.id === cf.id);
            const isMandatory = alwaysMandatoryFields.includes(cf.name) || mandatoryQuarterFields.includes(cf.name);
            const showParentValue = cf.name === fieldWithParentValueHint;
            
            // For መለኪያ field, use the parent value as initial value if issue doesn't have one
            const value = issueField?.value || (isMandatory && showParentValue ? (cf.value || "") : "");
            
            return {
              id: cf.id,
              name: cf.name,
              value: value,
              isMandatory: isMandatory,
              originalValue: cf.value || "",
              showParentValueHint: showParentValue
            };
          });
        
        // Sort fields according to the fixed order
        const sortedCustomFields = sortCustomFieldsByFixedOrder(mappedCustomFields);
        
        setEditCustomFields(sortedCustomFields);
        
      } catch (error) {
        console.error("Error loading parent data for edit:", error);
      }
    }
    
    setShowEditModal(true);
  };

  // Validation function for create form
  const validateCreateForm = () => {
    if (!parentId) {
      alert("Select a parent issue.");
      return false;
    }
    
    if (!subject.trim()) {
      alert("Subject is required.");
      return false;
    }
    
    // Check mandatory fields
    const missingMandatoryFields = customFields
      .filter(cf => cf.isMandatory && (!cf.value || cf.value.trim() === ""))
      .map(cf => cf.name);
    
    if (missingMandatoryFields.length > 0) {
      alert(`The following mandatory fields are required:\n${missingMandatoryFields.join("\n")}`);
      return false;
    }
    
    return true;
  };

  // Validation function for edit form
  const validateEditForm = () => {
    if (!editFormData.subject.trim()) {
      alert("Subject is required.");
      return false;
    }
    
    // Check mandatory fields
    const missingMandatoryFields = editCustomFields
      .filter(cf => cf.isMandatory && (!cf.value || cf.value.trim() === ""))
      .map(cf => cf.name);
    
    if (missingMandatoryFields.length > 0) {
      alert(`The following mandatory fields are required:\n${missingMandatoryFields.join("\n")}`);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateCreateForm()) return;

    const payload = {
      project_id: parentIssue.project.id,
      parent_issue_id: parentId,
      subject,
      description,
      tracker_id: trackerId,
      status_id: statusId,
      priority_id: priorityId,
      assigned_to_id: currentUser?.id,
      start_date: startDate || null,
      due_date: dueDate || null,
      custom_fields: customFields.map(f => ({ id: f.id, value: f.value })),
    };

    const result = await createIssue(payload);

    if (result.success) {
      alert("Sub-issue created!");
      await refreshData();
      resetCreateForm();
      setShowCreateModal(false);
    } else {
      alert("Create failed");
    }
  };

  const handleEditSubmit = async () => {
    if (!editingIssue) return;
    
    if (!validateEditForm()) return;

    const payload = {
      ...editFormData,
      assigned_to_id: currentUser?.id,
      custom_fields: editCustomFields.map(f => ({ id: f.id, value: f.value }))
    };

    const result = await updateIssue(editingIssue.id, payload);
    
    if (result.success) {
      alert("Issue updated successfully!");
      setShowEditModal(false);
      setEditingIssue(null);
      await refreshData();
    } else {
      alert("Update failed");
    }
  };

  const handleDelete = async (issueId) => {
    if (!window.confirm("Are you sure you want to delete this issue? This action cannot be undone.")) {
      return;
    }
    
    setDeleting(true);
    try {
      const result = await deleteIssue(issueId);
      
      if (result.success) {
        alert("Issue deleted successfully!");
        await refreshData();
      } else {
        alert(`Delete failed: ${result.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed: " + (error.message || "Network error"));
    } finally {
      setDeleting(false);
    }
  };

  const refreshData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Re-fetch all data
      let allAssignedIssues = await getAllMyAssignedIssues();
      
      if (!allAssignedIssues || allAssignedIssues.length === 0) {
        allAssignedIssues = await getIssuesAssigned(currentUser.id);
        allAssignedIssues = allAssignedIssues.map(issue => ({
          ...issue,
          assignmentType: 'Direct',
          assignmentSource: `${currentUser.firstname} ${currentUser.lastname}`
        }));
      }
      
      // Identify child issues
      const childIssues = allAssignedIssues.filter(issue => 
        issue.parent && issue.parent.id
      );
      
      // Identify sub-issues
      const childIssueIds = new Set(childIssues.map(c => c.id));
      const subIssues = allAssignedIssues.filter(issue => 
        issue.parent && issue.parent.id && childIssueIds.has(issue.parent.id)
      );
      
      // Get unique parent IDs from child issues
      const parentIdsFromChildren = new Set();
      childIssues.forEach(child => {
        if (child.parent && child.parent.id) {
          parentIdsFromChildren.add(child.parent.id);
        }
      });
      
      // Fetch and verify parent issues
      const verifiedParentIssues = [];
      for (const parentId of Array.from(parentIdsFromChildren)) {
        try {
          const parentIssue = await fetchIssueWithDetails(parentId);
          if (!parentIssue.parent || !parentIssue.parent.id) {
            const childrenForThisParent = childIssues.filter(child => 
              child.parent && child.parent.id === parentId
            );
            
            const childrenWithDetails = await Promise.all(
              childrenForThisParent.map(async (child) => {
                try {
                  const details = await fetchIssueWithDetails(child.id);
                  return {
                    ...details,
                    assignmentType: child.assignmentType || 'Direct',
                    assignmentSource: child.assignmentSource || `${currentUser.firstname} ${currentUser.lastname}`
                  };
                } catch (error) {
                  console.error(`Error fetching child issue ${child.id}:`, error);
                  return child;
                }
              })
            );
            
            verifiedParentIssues.push({
              ...parentIssue,
              children: childrenWithDetails
            });
          }
        } catch (error) {
          console.error(`Error loading parent issue ${parentId}:`, error);
        }
      }
      
      // Add standalone parent issues
      const standaloneParentIssues = allAssignedIssues.filter(issue => 
        !issue.parent || !issue.parent.id
      );
      
      for (const parent of standaloneParentIssues) {
        if (!verifiedParentIssues.some(vp => vp.id === parent.id)) {
          try {
            const parentWithDetails = await fetchIssueWithDetails(parent.id);
            if (!parentWithDetails.parent || !parentWithDetails.parent.id) {
              verifiedParentIssues.push({
                ...parentWithDetails,
                children: [],
                assignmentType: parent.assignmentType || 'Direct',
                assignmentSource: parent.assignmentSource || `${currentUser.firstname} ${currentUser.lastname}`
              });
            }
          } catch (error) {
            console.error(`Error loading standalone parent ${parent.id}:`, error);
          }
        }
      }
      
      // Organize sub-issues
      const subIssuesMapWithDetails = new Map();
      const subIssuesByParentId = {};
      subIssues.forEach(subIssue => {
        if (!subIssue.parent || !subIssue.parent.id) return;
        const parentId = subIssue.parent.id;
        if (!subIssuesByParentId[parentId]) {
          subIssuesByParentId[parentId] = [];
        }
        subIssuesByParentId[parentId].push(subIssue);
      });
      
      for (const [parentId, subIssuesList] of Object.entries(subIssuesByParentId)) {
        const subIssuesWithDetails = await Promise.all(
          subIssuesList.map(async (subIssue) => {
            try {
              const details = await fetchIssueWithDetails(subIssue.id);
              return {
                ...details,
                assignmentType: subIssue.assignmentType || 'Direct',
                assignmentSource: subIssue.assignmentSource || `${currentUser.firstname} ${currentUser.lastname}`
              };
            } catch (error) {
              console.error(`Error fetching sub-issue ${subIssue.id}:`, error);
              return subIssue;
            }
          })
        );
        subIssuesMapWithDetails.set(parseInt(parentId), subIssuesWithDetails);
      }
      
      // Create child issues map
      const childIssuesByParentId = new Map();
      childIssues.forEach(child => {
        if (child.parent && child.parent.id) {
          const parentId = child.parent.id;
          if (!childIssuesByParentId.has(parentId)) {
            childIssuesByParentId.set(parentId, []);
          }
          childIssuesByParentId.get(parentId).push(child);
        }
      });
      
      // Sort parent issues by ID
      verifiedParentIssues.sort((a, b) => (a.id || 0) - (b.id || 0));
      
      setParentIssues(verifiedParentIssues);
      setChildIssuesMap(childIssuesByParentId);
      setSubIssuesMap(subIssuesMapWithDetails);
      
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetCreateForm = () => {
    setSubject("");
    setDescription("");
    setStatusId("");
    setPriorityId("2");
    setStartDate("");
    setDueDate("");
    setParentId("");
    setParentIssue(null);
    setTrackerId("");
    setCustomFields([]);
  };

  // Helper function to check if a child issue has sub-issues assigned to current user
  const hasSubIssuesAssignedToMe = (childId) => {
    if (!subIssuesMap.has(childId)) return false;
    
    const subIssues = subIssuesMap.get(childId);
    return subIssues && subIssues.length > 0;
  };

  // Filter handler
  const handleFilterChange = (value) => {
    setFilterType(value);
  };

  // Get filtered parent issues based on filter type
  const getFilteredParentIssues = () => {
    if (filterType === "all" || !currentUser) {
      return parentIssues;
    }
    
    if (filterType === "childWithoutSubIssues") {
      return parentIssues.map(parent => {
        const filteredChildren = (parent.children || []).filter(child => 
          !hasSubIssuesAssignedToMe(child.id)
        );
        
        if (filteredChildren.length > 0) {
          return {
            ...parent,
            children: filteredChildren
          };
        }
        return null;
      }).filter(parent => parent !== null);
    }
    
    return parentIssues;
  };

  // CSS for loading spinner
  const spinnerStyles = {
    spinnerContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '300px',
      width: '100%'
    },
    spinner: {
      width: '50px',
      height: '50px',
      border: '4px solid rgba(76, 175, 80, 0.2)',
      borderTop: '4px solid #4caf50',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  };

  // Add CSS animation for spinner
  const spinnerCSS = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;

  if (!currentUser && loading) {
    return (
      <div style={{ 
        padding: "40px 20px", 
        textAlign: "center",
        minHeight: "calc(100vh - 200px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <style>{spinnerCSS}</style>
        <h1 style={{ color: "#2e7d32", marginBottom: "30px" }}>Loading User Information</h1>
        <div style={spinnerStyles.spinnerContainer}>
          <div style={spinnerStyles.spinner}></div>
        </div>
        <p style={{ color: "#666", marginTop: "20px", fontSize: "14px" }}>Please wait while we load your user information...</p>
      </div>
    );
  }

  const filteredParentIssues = getFilteredParentIssues();
  const modalPosition = getModalPosition();
  const modalMaxHeight = getModalMaxHeight();

  return (
    <div 
      ref={mainContentRef}
      style={{ 
        width: "100%",
        minHeight: "calc(100vh - 70px)", // Account for header
        backgroundColor: "#f5f5f5"
      }}
    >
      <style>{spinnerCSS}</style>
      
      {/* Filter Section */}
      <div style={{ 
        marginBottom: "20px",
        padding: "15px 20px",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: screenWidth <= 768 ? "column" : "row",
        alignItems: screenWidth <= 768 ? "stretch" : "center",
        justifyContent: "space-between",
        gap: screenWidth <= 768 ? "15px" : "0"
      }}>
        <div>
          <h3 style={{ 
            color: "#2e7d32", 
            margin: "0",
            fontSize: "16px"
          }}>
            ዝርዝር ተግባራት Filter
          </h3>
          <p style={{ 
            color: "#666", 
            fontSize: "13px",
            margin: "5px 0 0 0"
          }}>
            Filter the information displayed below
          </p>
        </div>
        
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "10px",
          flexWrap: "wrap"
        }}>
          <label style={{
            fontSize: "14px",
            color: "#2e7d32",
            fontWeight: "600"
          }}>
            Show:
          </label>
          <select
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            style={{
              padding: "10px 15px",
              border: "1px solid #c8e6c9",
              borderRadius: "6px",
              fontSize: "14px",
              background: "white",
              color: "#2e7d32",
              fontWeight: "500",
              minWidth: screenWidth <= 768 ? "100%" : "280px",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="all">All (ሁሉም ተግባሮች)</option>
            <option value="childWithoutSubIssues">ዝርዝር ተግባር (የግል እቅድ የሌላቸው)</option>
          </select>
        </div>
      </div>
      
      <div style={{ 
        marginBottom: "30px",
        padding: "20px",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        overflowX: "auto"
      }}>
        
        {loading ? (
          <div style={{ 
            textAlign: "center", 
            padding: "60px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <div style={spinnerStyles.spinner}></div>
            <p style={{ 
              marginTop: "20px", 
              color: "#4caf50",
              fontSize: "16px",
              fontWeight: "600"
            }}>
              Loading your issues...
            </p>
            <p style={{ 
              marginTop: "10px", 
              color: "#666",
              fontSize: "14px"
            }}>
              Please wait
            </p>
          </div>
        ) : filteredParentIssues.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "40px 20px",
            background: "#f9f9f9",
            borderRadius: "8px"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              margin: "0 auto 20px",
              background: filterType === "childWithoutSubIssues" ? "#fff3e0" : "#e8f5e9",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <span style={{ 
                fontSize: "40px", 
                color: filterType === "childWithoutSubIssues" ? "#ff9800" : "#4caf50"
              }}>
                {filterType === "childWithoutSubIssues" ? "✅" : "📋"}
              </span>
            </div>
            <h3 style={{ 
              color: filterType === "childWithoutSubIssues" ? "#e65100" : "#2e7d32", 
              marginBottom: "10px" 
            }}>
              {filterType === "childWithoutSubIssues" 
                ? "ሁሉም ዝርዝር ተግባሮች የግል እቅድ አላቸው" 
                : "No ዝርዝር ተግባር Assigned to you"}
            </h3>
            <p style={{ 
              color: "#666", 
              fontSize: "14px",
              maxWidth: "400px",
              margin: "0 auto"
            }}>
              {filterType === "childWithoutSubIssues" 
                ? "All your ዝርዝር ተግባሮች already have የግል እቅድ" 
                : "You don't have any ዝርዝር ተግባር assigned to you at the moment."}
            </p>
          </div>
        ) : (
          <div style={{ 
            overflowX: "auto",
            maxWidth: "100%",
            position: "relative"
          }}>
            <table style={{ 
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
              minWidth: screenWidth <= 768 ? "1200px" : "auto"
            }}>
              <thead>
                <tr style={{ background: "#f1f8e9" }}>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #c8e6c9", minWidth: "150px" }}>Type</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #c8e6c9", minWidth: "250px" }}>Subject</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #c8e6c9", minWidth: "120px" }}>Assignee</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #c8e6c9", minWidth: "80px" }}>ክብደት</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #c8e6c9", minWidth: "100px" }}>የዓመቱ እቅድ</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #c8e6c9", minWidth: "100px" }}>1ኛ ሩብዓመት</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #c8e6c9", minWidth: "100px" }}>2ኛ ሩብዓመት</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #c8e6c9", minWidth: "100px" }}>3ኛ ሩብዓመት</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #c8e6c9", minWidth: "100px" }}>4ኛ ሩብዓመት</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #c8e6c9", minWidth: "120px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredParentIssues.map(parent => (
                  <React.Fragment key={parent.id}>
                    {/* ዋና ተግባር Row - Issues that have no parent */}
                    <tr style={{ 
                      background: "#e8f5e9",
                      borderBottom: "2px solid #c8e6c9"
                    }}>
                      <td style={{ padding: "12px" }}>
                        ዋና ተግባር
                        {parent.assignmentType === 'Group' && (
                          <span style={{
                            marginLeft: "10px",
                            fontSize: "11px",
                            background: "#ff9800",
                            color: "white",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            fontWeight: "bold"
                          }}>
                            Group: {parent.assignmentSource}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px", fontWeight: "bold"}}>
                        #{parent.id} - {parent.subject}
                       
                      </td>
                      <td colSpan="8" style={{ 
                        padding: "12px", 
                        background: "#e8f5e9",
                        textAlign: "center",
                        color: "#666",
                        fontStyle: "italic"
                      }}>
                        {/* Empty for ዋና ተግባር */}
                      </td>
                    </tr>
                    
                    {/* ዝርዝር ተግባር - Child issues assigned to logged-in user */}
                    {parent.children && parent.children.map(child => (
                      <React.Fragment key={child.id}>
                        <tr style={{ 
                          background: filterType === "childWithoutSubIssues" ? "#fff3e0" : "#f9f9f9",
                          borderLeft: filterType === "childWithoutSubIssues" ? "4px solid #ffb74d" : "4px solid #81c784"
                        }}>
                          <td style={{ padding: "12px", paddingLeft: "30px" }}>
                            ዝርዝር ተግባር
                            {child.assignmentType === 'Group' && (
                              <span style={{
                                marginLeft: "10px",
                                fontSize: "11px",
                                background: "#ff9800",
                                color: "white",
                                padding: "2px 6px",
                                borderRadius: "10px",
                                fontWeight: "bold"
                              }}>
                                Group: {child.assignmentSource}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px", paddingLeft: "30px" }}>
                            #{child.id} - {child.subject}
                            {filterType === "childWithoutSubIssues" && hasSubIssuesAssignedToMe(child.id) && (
                              <span style={{
                                marginLeft: "10px",
                                fontSize: "11px",
                                background: "#ff9800",
                                color: "white",
                                padding: "2px 6px",
                                borderRadius: "10px",
                                fontWeight: "bold"
                              }}>
                                Has የግል እቅድ
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {getAssigneeName(child)}
                            {child.assignmentType === 'Group' && (
                              <div style={{ fontSize: "11px", color: "#ff9800", fontStyle: "italic" }}>
                                (Via group: {child.assignmentSource})
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            {getCustomFieldValue(child, "ክብደት") || "-"}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            {getCustomFieldValue(child, "የዓመቱ እቅድ") || "-"}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            {getCustomFieldValue(child, "1ኛ ሩብዓመት") || "-"}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            {getCustomFieldValue(child, "2ኛ ሩብዓመት") || "-"}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            {getCustomFieldValue(child, "3ኛ ሩብዓመት") || "-"}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            {getCustomFieldValue(child, "4ኛ ሩብዓመት") || "-"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <button
                              onClick={() => handleCreateClick(child.id)}
                              style={{
                                padding: "8px 15px",
                                background: filterType === "childWithoutSubIssues" ? "#ff9800" : "#4caf50",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "13px",
                                display: "block",
                                width: "100%",
                                transition: "all 0.3s ease",
                                whiteSpace: "nowrap"
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = filterType === "childWithoutSubIssues" ? "#f57c00" : "#388e3c";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = filterType === "childWithoutSubIssues" ? "#ff9800" : "#4caf50";
                              }}
                            >
                              Add የግል እቅድ
                            </button>
                          </td>
                        </tr>
                        
                        {/* የግል እቅድ - Sub-issues assigned to logged-in user */}
                        {filterType === "all" && subIssuesMap.has(child.id) && (
                          subIssuesMap.get(child.id).map(subIssue => (
                            <tr key={subIssue.id} style={{ 
                              background: "#f1f8e9",
                              borderLeft: "8px solid #a5d6a7"
                            }}>
                              <td style={{ padding: "12px", paddingLeft: "50px" }}>
                                የግል እቅድ
                                {subIssue.assignmentType === 'Group' && (
                                  <span style={{
                                    marginLeft: "10px",
                                    fontSize: "11px",
                                    background: "#ff9800",
                                    color: "white",
                                    padding: "2px 6px",
                                    borderRadius: "10px",
                                    fontWeight: "bold"
                                  }}>
                                    Group: {subIssue.assignmentSource}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "12px", paddingLeft: "50px" }}>
                                #{subIssue.id} - {subIssue.subject}
                              </td>
                              <td style={{ padding: "12px" }}>
                                {getAssigneeName(subIssue)}
                                {subIssue.assignmentType === 'Group' && (
                                  <div style={{ fontSize: "11px", color: "#ff9800", fontStyle: "italic" }}>
                                    (Via group: {subIssue.assignmentSource})
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: "12px", textAlign: "center" }}>
                                {getCustomFieldValue(subIssue, "ክብደት") || "-"}
                              </td>
                              <td style={{ padding: "12px", textAlign: "center" }}>
                                {getCustomFieldValue(subIssue, "የዓመቱ እቅድ") || "-"}
                              </td>
                              <td style={{ padding: "12px", textAlign: "center" }}>
                                {getCustomFieldValue(subIssue, "1ኛ ሩብዓመት") || "-"}
                              </td>
                              <td style={{ padding: "12px", textAlign: "center" }}>
                                {getCustomFieldValue(subIssue, "2ኛ ሩብዓመት") || "-"}
                              </td>
                              <td style={{ padding: "12px", textAlign: "center" }}>
                                {getCustomFieldValue(subIssue, "3ኛ ሩብዓመት") || "-"}
                              </td>
                              <td style={{ padding: "12px", textAlign: "center" }}>
                                {getCustomFieldValue(subIssue, "4ኛ ሩብዓመት") || "-"}
                              </td>
                              <td style={{ padding: "12px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <button
                                    onClick={() => handleEditClick(subIssue)}
                                    style={{
                                      padding: "8px 15px",
                                      background: "#81c784",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontSize: "13px",
                                      width: "100%",
                                      transition: "all 0.3s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.background = "#66bb6a";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.background = "#81c784";
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(subIssue.id)}
                                    disabled={deleting}
                                    style={{
                                      padding: "8px 15px",
                                      background: deleting ? "#ffa726" : "#ef5350",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "4px",
                                      cursor: deleting ? "not-allowed" : "pointer",
                                      fontSize: "13px",
                                      width: "100%",
                                      transition: "all 0.3s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!deleting) {
                                        e.target.style.background = "#e53935";
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!deleting) {
                                        e.target.style.background = "#ef5350";
                                      }
                                    }}
                                  >
                                    {deleting ? (
                                      <div style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "center",
                                        gap: "5px"
                                      }}>
                                        <div style={{
                                          width: "12px",
                                          height: "12px",
                                          border: "2px solid rgba(255, 255, 255, 0.3)",
                                          borderTop: "2px solid white",
                                          borderRadius: "50%",
                                          animation: "spin 1s linear infinite"
                                        }}></div>
                                        Deleting...
                                      </div>
                                    ) : "Delete"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD MODAL CODE HERE - Create Sub-Issue Modal */}
      {showCreateModal && parentIssue && (
        <div style={{
          position: "fixed",
          top: modalPosition.top,
          left: modalPosition.left,
          right: modalPosition.right,
          bottom: modalPosition.bottom,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          zIndex: 1000,
          padding: modalPosition.padding,
          overflowY: "auto"
        }}>
          <div style={{
            background: "white",
            borderRadius: "8px",
            width: screenWidth <= 768 ? "95%" : "600px",
            maxHeight: modalMaxHeight,
            overflowY: "auto",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            marginTop: "0"
          }}>
            <div style={{ 
              background: "#4caf50", 
              color: "white", 
              padding: "20px",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "sticky",
              top: 0,
              zIndex: 10
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px" }}>Create የግል እቅድ</h2>
                <p style={{ margin: "5px 0 0 0", fontSize: "14px", opacity: 0.9 }}>
                  Parent: #{parentIssue.id} - {parentIssue.subject}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                style={{
                  background: "transparent",
                  color: "white",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "25px" }}>
              {/* Inherited Tracker Info */}
              {parentIssue.tracker && (
                <div style={{
                  background: "#f1f8e9",
                  padding: "15px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #81c784"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "#81c784",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold"
                    }}>
                      T
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", color: "#2e7d32", fontWeight: "bold" }}>
                        Tracker (Inherited from Parent)
                      </div>
                      <div style={{ fontSize: "16px", color: "#1b5e20", fontWeight: "bold" }}>
                        {parentIssue.tracker.name}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-assign to current user info */}
              {currentUser && (
                <div style={{
                  background: "#e8f5e9",
                  padding: "15px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #4caf50"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "#4caf50",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold"
                    }}>
                      👤
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", color: "#2e7d32", fontWeight: "bold" }}>
                        Auto-assigned to
                      </div>
                      <div style={{ fontSize: "16px", color: "#1b5e20", fontWeight: "bold" }}>
                        {currentUser.firstname} {currentUser.lastname}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FORM */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#2e7d32",
                  fontSize: "14px"
                }}>
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #c8e6c9",
                    borderRadius: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  required
                  placeholder="Enter sub-issue subject..."
                />
              </div>

              <div style={{ 
                display: "grid", 
                gridTemplateColumns: screenWidth <= 768 ? "1fr" : "1fr 1fr", 
                gap: "15px",
                marginBottom: "20px"
              }}>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#2e7d32",
                    fontSize: "14px"
                  }}>
                    Status
                  </label>
                  <select
                    value={statusId}
                    onChange={e => setStatusId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #c8e6c9",
                      borderRadius: "4px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      background: "white"
                    }}
                  >
                    <option value="">Select Status</option>
                    {statuses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#2e7d32",
                    fontSize: "14px"
                  }}>
                    Priority
                  </label>
                  <select
                    value={priorityId}
                    onChange={e => setPriorityId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #c8e6c9",
                      borderRadius: "4px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      background: "white"
                    }}
                  >
                    <option value="1">Low</option>
                    <option value="2">Normal</option>
                    <option value="3">High</option>
                    <option value="4">Urgent</option>
                    <option value="5">Immediate</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#2e7d32",
                    fontSize: "14px"
                  }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #c8e6c9",
                      borderRadius: "4px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#2e7d32",
                    fontSize: "14px"
                  }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #c8e6c9",
                      borderRadius: "4px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#2e7d32",
                  fontSize: "14px"
                }}>
                  Description
                </label>
                <textarea
                  rows="4"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #c8e6c9",
                    borderRadius: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    resize: "vertical"
                  }}
                  placeholder="Enter detailed description..."
                />
              </div>

              {/* Custom Fields (excluding specified fields) */}
              {customFields.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ 
                    fontSize: "16px", 
                    color: "#2e7d32", 
                    marginBottom: "15px", 
                    borderBottom: "2px solid #e8f5e9", 
                    paddingBottom: "5px" 
                  }}>
                    Additional Fields
                    <span style={{ 
                      fontSize: "12px", 
                      color: "#e65100", 
                      marginLeft: "10px", 
                      fontWeight: "normal" 
                    }}>
                      * Required fields
                    </span>
                  </h3>
                  {customFields.map((cf, idx) => (
                    <div key={cf.id} style={{ marginBottom: "15px" }}>
                      <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                        color: cf.isMandatory ? "#e65100" : "#2e7d32",
                        fontSize: "14px"
                      }}>
                        {cf.name}
                        {cf.isMandatory && (
                          <span style={{ color: "#e65100", marginLeft: "5px" }}>*</span>
                        )}
                        {/* Only show parent value hint for መለኪያ field */}
                        {cf.showParentValueHint && cf.originalValue && cf.originalValue !== "" && (
                          <span style={{
                            fontSize: "12px",
                            color: "#666",
                            marginLeft: "10px",
                            fontStyle: "italic"
                          }}>
                            (Parent value: {cf.originalValue})
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={cf.value}
                        onChange={e => {
                          const copy = [...customFields];
                          copy[idx].value = e.target.value;
                          setCustomFields(copy);
                        }}
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: `1px solid ${cf.isMandatory ? "#ffcc80" : "#c8e6c9"}`,
                          borderRadius: "4px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          background: cf.isMandatory && (!cf.value || cf.value === "") ? "#fff3e0" : "white"
                        }}
                        placeholder={`Enter ${cf.name.toLowerCase()}...`}
                        required={cf.isMandatory}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ 
                display: "flex", 
                gap: "15px", 
                marginTop: "25px",
                flexDirection: screenWidth <= 768 ? "column" : "row"
              }}>
                <button
                  onClick={handleSubmit}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    background: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#388e3c";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#4caf50";
                  }}
                >
                  Create የግል እቅድ
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    background: "#81c784",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#66bb6a";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#81c784";
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL CODE HERE - Edit Sub-Issue Modal */}
      {showEditModal && editingIssue && parentIssue && (
        <div style={{
          position: "fixed",
          top: modalPosition.top,
          left: modalPosition.left,
          right: modalPosition.right,
          bottom: modalPosition.bottom,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          zIndex: 1000,
          padding: modalPosition.padding,
          overflowY: "auto"
        }}>
          <div style={{
            background: "white",
            borderRadius: "8px",
            width: screenWidth <= 768 ? "95%" : "600px",
            maxHeight: modalMaxHeight,
            overflowY: "auto",
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            marginTop: "0"
          }}>
            <div style={{ 
              background: "#81c784", 
              color: "white", 
              padding: "20px",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "sticky",
              top: 0,
              zIndex: 10
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px" }}>Edit የግል እቅድ</h2>
                <p style={{ margin: "5px 0 0 0", fontSize: "14px", opacity: 0.9 }}>
                  Editing: #{editingIssue.id} - {editingIssue.subject}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingIssue(null);
                  setParentIssue(null);
                }}
                style={{
                  background: "transparent",
                  color: "white",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%"
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "25px" }}>
              {/* Inherited Tracker Info */}
              {trackerId && parentIssue.tracker && (
                <div style={{
                  background: "#f1f8e9",
                  padding: "15px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #81c784"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "#81c784",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold"
                    }}>
                      T
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", color: "#2e7d32", fontWeight: "bold" }}>
                        Tracker (Inherited from Parent)
                      </div>
                      <div style={{ fontSize: "16px", color: "#1b5e20", fontWeight: "bold" }}>
                        {parentIssue.tracker.name}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-assign to current user info */}
              {currentUser && (
                <div style={{
                  background: "#e8f5e9",
                  padding: "15px",
                  borderRadius: "6px",
                  marginBottom: "20px",
                  borderLeft: "4px solid #4caf50"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "#4caf50",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold"
                    }}>
                      👤
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", color: "#2e7d32", fontWeight: "bold" }}>
                        Auto-assigned to
                      </div>
                      <div style={{ fontSize: "16px", color: "#1b5e20", fontWeight: "bold" }}>
                        {currentUser.firstname} {currentUser.lastname}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EDIT FORM */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#2e7d32",
                  fontSize: "14px"
                }}>
                  Subject *
                </label>
                <input
                  type="text"
                  value={editFormData.subject}
                  onChange={e => setEditFormData({...editFormData, subject: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #c8e6c9",
                    borderRadius: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                  required
                  placeholder="Enter sub-issue subject..."
                />
              </div>

              <div style={{ 
                display: "grid", 
                gridTemplateColumns: screenWidth <= 768 ? "1fr" : "1fr 1fr", 
                gap: "15px",
                marginBottom: "20px"
              }}>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#2e7d32",
                    fontSize: "14px"
                  }}>
                    Status
                  </label>
                  <select
                    value={editFormData.status_id}
                    onChange={e => setEditFormData({...editFormData, status_id: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #c8e6c9",
                      borderRadius: "4px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      background: "white"
                    }}
                  >
                    <option value="">Select Status</option>
                    {statuses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#2e7d32",
                    fontSize: "14px"
                  }}>
                    Priority
                  </label>
                  <select
                    value={editFormData.priority_id}
                    onChange={e => setEditFormData({...editFormData, priority_id: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #c8e6c9",
                      borderRadius: "4px",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      background: "white"
                    }}
                  >
                    <option value="1">Low</option>
                    <option value="2">Normal</option>
                    <option value="3">High</option>
                    <option value="4">Urgent</option>
                    <option value="5">Immediate</option>
                  </select>
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#2e7d32",
                    fontSize: "14px"
                  }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.start_date}
                    onChange={e => setEditFormData({...editFormData, start_date: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #c8e6c9",
                      borderRadius: "4px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#2e7d32",
                    fontSize: "14px"
                  }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.due_date}
                    onChange={e => setEditFormData({...editFormData, due_date: e.target.value})}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #c8e6c9",
                      borderRadius: "4px",
                      fontSize: "14px",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#2e7d32",
                  fontSize: "14px"
                }}>
                  Description
                </label>
                <textarea
                  rows="4"
                  value={editFormData.description}
                  onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #c8e6c9",
                    borderRadius: "4px",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    resize: "vertical"
                  }}
                  placeholder="Enter detailed description..."
                />
              </div>

              {/* Custom Fields (excluding specified fields) */}
              {editCustomFields.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ 
                    fontSize: "16px", 
                    color: "#2e7d32", 
                    marginBottom: "15px", 
                    borderBottom: "2px solid #e8f5e9", 
                    paddingBottom: "5px" 
                  }}>
                    Additional Fields
                    <span style={{ 
                      fontSize: "12px", 
                      color: "#e65100", 
                      marginLeft: "10px", 
                      fontWeight: "normal" 
                    }}>
                      * Required fields
                    </span>
                  </h3>
                  {editCustomFields.map((cf, idx) => (
                    <div key={cf.id} style={{ marginBottom: "15px" }}>
                      <label style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                        color: cf.isMandatory ? "#e65100" : "#2e7d32",
                        fontSize: "14px"
                      }}>
                        {cf.name}
                        {cf.isMandatory && (
                          <span style={{ color: "#e65100", marginLeft: "5px" }}>*</span>
                        )}
                        {/* Only show parent value hint for መለኪያ field */}
                        {cf.showParentValueHint && cf.originalValue && cf.originalValue !== "" && (
                          <span style={{
                            fontSize: "12px",
                            color: "#666",
                            marginLeft: "10px",
                            fontStyle: "italic"
                          }}>
                            (Parent value: {cf.originalValue})
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={cf.value}
                        onChange={e => {
                          const copy = [...editCustomFields];
                          copy[idx].value = e.target.value;
                          setEditCustomFields(copy);
                        }}
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: `1px solid ${cf.isMandatory ? "#ffcc80" : "#c8e6c9"}`,
                          borderRadius: "4px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          background: cf.isMandatory && (!cf.value || cf.value === "") ? "#fff3e0" : "white"
                        }}
                        placeholder={`Enter ${cf.name.toLowerCase()}...`}
                        required={cf.isMandatory}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ 
                display: "flex", 
                gap: "15px", 
                marginTop: "25px",
                flexDirection: screenWidth <= 768 ? "column" : "row"
              }}>
                <button
                  onClick={handleEditSubmit}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    background: "#81c784",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#66bb6a";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#81c784";
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingIssue(null);
                    setParentIssue(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    background: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#388e3c";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#4caf50";
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}