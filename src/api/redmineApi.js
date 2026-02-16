  import axios from "axios";

  const API = ""; // Your Redmine base URL here

  // =========================
  // CONFIGURATION
  // =========================


  const apiClient = axios.create({
    baseURL: API,
    headers: {
      "X-Redmine-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
  });

  // =========================
  // HELPER: GET API KEY
  // =========================
  function getApiKey() {
    const user = JSON.parse(localStorage.getItem("redmine_user"));
    return user?.api_key ;
  }

  // =========================
  // LOGIN
  // =========================
  export async function loginToRedmine(username, password) {
    try {
      const res = await axios.get(`${API}/users/current.json`, {
        auth: { username, password },
      });

      return { success: true, data: res.data.user };
    } catch (err) {
      return { success: false, error: "Invalid username or password" };
    }
  }

  // =========================
  // PROJECTS
  // =========================

  // Get all projects (paginated)
  export async function getProjects() {
    let allProjects = [];
    let offset = 0;
    const limit = 100;

    try {
      while (true) {
        const res = await axios.get(`${API}/projects.json`, {
          headers: {
            "X-Redmine-API-Key": getApiKey(),
            "Content-Type": "application/json",
          },
          params: {
            limit,
            offset,
          },
        });

        const { projects, total_count } = res.data;

        allProjects = [...allProjects, ...projects];

        if (allProjects.length >= total_count) break;

        offset += limit;
      }

      return allProjects;
    } catch (err) {
      console.error("getProjects error:", err);
      return [];
    }
  }

  // Get projects where the logged-in user is a member
  export async function getMyProjects() {
    try {
      const res = await axios.get(`${API}/users/current.json?include=memberships`, {
        headers: {
          "X-Redmine-API-Key": getApiKey(),
          "Content-Type": "application/json",
        },
      });

      const memberships = res.data.user.memberships || [];
      const projects = memberships.map(m => m.project); // only projects user belongs to
      return projects;
    } catch (err) {
      console.log("getMyProjects error:", err);
      return [];
    }
  }


  // =========================
  // USERS / MEMBERS
  // =========================

  // Get assignable users for a project
  export async function getProjectMembers(projectId) {
    try {
      const res = await axios.get(`/projects/${projectId}/memberships.json?key=${getApiKey()}`);

      return res.data.memberships.map(m => {
        if (m.group) {
          // GROUP
          return {
            id: m.group.id,
            name: m.group.name,   // IMPORTANT: REMOVE [Group]
            isGroup: true
          };
        }

        if (m.user) {
          // USER
          return {
            id: m.user.id,
            name: m.user.firstname + " " + m.user.lastname,
            login: m.user.login,
            isGroup: false
          };
        }

        return null;
      }).filter(m => m !== null);

    } catch (err) {
      console.log("getProjectMembers error:", err);
      return [];
    }
  }

  // Get all members across projects logged-in user belongs to (no duplicates, no groups)
  // Get all members across projects the logged-in user belongs to
  export async function getMyProjectMembers() {
    try {
      const myProjects = await getMyProjects(); // only projects where login user belongs
      let membersById = {};

      // fetch members for all projects in parallel
      const membersLists = await Promise.all(
        myProjects.map(p => getProjectMembers(p.id))
      );

      membersLists.flat().forEach(m => {
        if (!m.isGroup) {
          membersById[m.id] = m; // dedupe by ID
        }
      });

      return Object.values(membersById);
    } catch (err) {
      console.log("getMyProjectMembers error:", err);
      return [];
    }
  }

  // Get all Redmine users (optional)
  export async function getUsers() {
    try {
      const res = await axios.get(`/users.json?key=${getApiKey()}`);
      return res.data.users;
    } catch (err) {
      console.log("getUsers error:", err);
      return [];
    }
  }

  // =========================
  // ISSUES
  // =========================

  // Get issues assigned to logged-in user
  export async function getIssuesAssignedToMe() {
    let allIssues = [];
    let offset = 0;
    const limit = 100;

    try {
      while (true) {
        const res = await axios.get(
          `/issues.json?assigned_to_id=me&status_id=*&limit=${limit}&offset=${offset}&key=${getApiKey()}`
        );

        const { issues, total_count } = res.data;
        allIssues = [...allIssues, ...issues];

        if (allIssues.length >= total_count) break;
        offset += limit;
      }
      return allIssues;
    } catch (err) {
      console.log(err);
      return [];
    }
  }
  export async function getIssuesAssignedToMeByFullName() {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return [];

      const fullName = `${currentUser.firstname} ${currentUser.lastname}`;
      let allIssues = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const res = await axios.get(
          `/issues.json?status_id=*&limit=${limit}&offset=${offset}&key=${getApiKey()}`
        );

        const issues = res.data.issues || [];
        allIssues = [...allIssues, ...issues];

        if (allIssues.length >= res.data.total_count) break;
        offset += limit;
      }

      // Filter issues by assigned_to full name
      return allIssues.filter(issue => issue.assigned_to?.name === fullName);

    } catch (err) {
      console.log("getIssuesAssignedToMeByFullName error:", err);
      return [];
    }
  }

  // Get issues assigned to a specific user
  export async function getIssuesAssigned(userId) {
    const limit = 100;
    let offset = 0;
    let allIssues = [];
    let totalCount = 0;

    try {
      const firstRes = await axios.get(`/issues.json`, {
        params: { assigned_to_id: userId, limit, offset, key: getApiKey() },
      });

      allIssues = firstRes.data.issues || [];
      totalCount = firstRes.data.total_count || allIssues.length;

      while (allIssues.length < totalCount) {
        offset += limit;
        const res = await axios.get(`/issues.json`, {
          params: { assigned_to_id: userId, limit, offset, key: getApiKey() },
        });
        allIssues = allIssues.concat(res.data.issues || []);
      }

      return allIssues;
    } catch (err) {
      console.log("getIssuesAssigned error:", err);
      return [];
    }
  } 
  // Get issues in a specific project (paginated)
  export async function getProjectIssues(params = {}) {
    let allIssues = [];
    let offset = 0;
    const limit = 100;

    try {
      while (true) {
        const queryParams = { ...params, status_id: "*", limit, offset };
        const res = await axios.get(`${API}/issues.json`, {
          headers: {
            "X-Redmine-API-Key": getApiKey(),
            "Content-Type": "application/json",
          },
          params: queryParams,
        });

        const { issues, total_count } = res.data;

        allIssues = [...allIssues, ...issues];

        if (allIssues.length >= total_count) break;

        offset += limit;
      }

      return allIssues;
    } catch (err) {
      console.error("getProjectIssues error:", err);
      return [];
    }
  }
  // Get single issue (with allowed statuses)
  // Get single issue (with allowed statuses)
// Get single issue (with allowed statuses)
export async function getIssue(issueId) {
  try {
    const res = await axios.get(`/issues/${issueId}.json?include=parent,watchers,children,assigned_to&key=${getApiKey()}`);
    return res.data.issue;
  } catch (err) {
    console.log("getIssue error:", err);
    return null;
  }
}
  // Update an issue
  export async function updateIssue(issueId, updateData) {
    try {
      const res = await axios.put(`/issues/${issueId}.json?key=${getApiKey()}`, {
        issue: updateData,
      });
      return { success: true, data: res.data };
    } catch (err) {
      console.log("updateIssue error:", err);
      return { success: false };
    }
  }

  // Create a new issue
  export async function createIssue(issueData) {
    try {
      const res = await axios.post(`/issues.json?key=${getApiKey()}`, {
        issue: issueData,
      });
      return { success: true, data: res.data.issue };
    } catch (err) {
      console.log("createIssue error:", err);
      return { success: false };
    }
  }

  // =========================
  // TRACKERS / STATUSES
  // =========================

  // Get all trackers
  export async function getTrackers() {
    try {
      const res = await axios.get(`/trackers.json?key=${getApiKey()}`);
      return res.data.trackers;
    } catch (err) {
      console.log("getTrackers error:", err);
      return [];
    }
  }
  export async function getCurrentUser() {
    try {
      const res = await axios.get(`${API}/users/current.json?key=${getApiKey()}`);
      return res.data.user;
    } catch (err) {
      console.log("getCurrentUser error:", err);
      return null;
    }
  }
  export async function getGroupDetails(groupId) {
    try {
      // IMPORTANT: Include users in the response
      const res = await axios.get(`${API}/groups/${groupId}.json`, {
        headers: {
          "X-Redmine-API-Key": getApiKey(),
          "Content-Type": "application/json",
        },
        params: {
          include: "users"  // This ensures users are included in the response
        }
      });
      return res.data.group;
    } catch (err) {
      console.log("getGroupDetails error:", err);
      return { users: [] }; // Return empty users array on error
    }
  }
  export async function getGroupByName(groupName) {
    try {
      // Fetch all groups
      const res = await axios.get(`${API}/groups.json`, {
        headers: {
          "X-Redmine-API-Key": getApiKey(),
          "Content-Type": "application/json",
        },
      });

      const groups = res.data.groups || [];

      // Find the group by name (case-insensitive)
      const group = groups.find(
        (g) => g.name.toLowerCase() === groupName.toLowerCase()
      );

      return group || null;
    } catch (err) {
      console.error("getGroupByName error:", err);
      return null;
    }
  }
  export async function getUsersInGroup(groupName) {
    try {
      const group = await getGroupByName(groupName);
      if (!group) return [];

      const res = await axios.get(`${API}/groups/${group.id}.json`, {
        headers: {
          "X-Redmine-API-Key": getApiKey(),
          "Content-Type": "application/json",
        },
        params: { include: "users" },
      });

      // Redmine can return users directly or nested
      if (res.data.group && res.data.group.users) {
        return res.data.group.users;
      } else if (res.data.users) {
        return res.data.users;
      } else {
        return [];
      }
    } catch (err) {
      console.error("getUsersInGroup error:", err);
      return [];
    }
  }

  export async function getMyMainProjects() {
    try {
      const apiKey = getApiKey();
      if (!apiKey) return [];

      // Get current user with memberships
      const userRes = await axios.get(`${API}/users/current.json`, {
        headers: {
          "X-Redmine-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        params: { include: "memberships" },
      });

      const memberships = userRes.data.user.memberships || [];

      // Filter only main projects where user is a member (projects without parent)
      const mainProjectsMap = {};
      memberships.forEach((m) => {
        if (m.project && !m.project.parent) {
          mainProjectsMap[m.project.id] = m.project;
        }
      });

      return Object.values(mainProjectsMap);
    } catch (err) {
      console.error("getMyMainProjects error:", err);
      return [];
    }
  }
  export async function getProjectsByGroupUsers(groupUsers) {
    const userIds = groupUsers.map(u => u.id);
    let projectsMap = {};

    for (const userId of userIds) {
      const issues = await getIssuesAssigned(userId);

      issues.forEach(issue => {
        if (issue.project) {
          projectsMap[issue.project.id] = issue.project;
        }
      });
    }

    return Object.values(projectsMap);
  }

  // Get subprojects of a main project
  // Get subprojects of a main project (fallback if /projects/:id/projects.json not available)
  export async function getSubprojects(mainProjectId) {
    try {
      const allProjects = await getProjects(); // get all projects
      return allProjects.filter(p => p.parent && p.parent.id === mainProjectId);
    } catch (err) {
      console.log("getSubprojects error:", err);
      return [];
    }
  }
  export async function getGroupMembership(groupId) {
    try {
      const res = await axios.get(`${API}/groups/${groupId}.json`, {
        headers: {
          "X-Redmine-API-Key": getApiKey(),
          "Content-Type": "application/json",
        },
        params: { include: "users,memberships" },
      });
      
      return res.data.group || null;
    } catch (err) {
      console.error("getGroupMembership error:", err);
      return null;
    }
  }







  // Renamed function to fetch only projects the logged-in user belongs to
  export async function fetchUserProjects() {
    try {
      // Fetch current user with memberships
      const res = await axios.get(`${API}/users/current.json?include=memberships`, {
        headers: {
          "X-Redmine-API-Key": getApiKey(),
          "Content-Type": "application/json",
        },
      });

      const user = res.data.user;

      // Extract only projects the user is a member of
      const projects = (user.memberships || []).map(m => m.project);

      return projects || [];
    } catch (err) {
      console.log("fetchUserProjects error:", err);
      return [];
    }
  }
  export async function getUser(userId) {
    try {
      const res = await axios.get(`${API}/users/${userId}.json`, {
        params: { key: getApiKey() },
      });
      return res.data.user; // contains id, login, firstname, lastname, etc.
    } catch (err) {
      console.error("getUser error:", err);
      return null;
    }
  }
  export async function getUserProjects(userId) {
    try {
      const res = await axios.get(`${API}/users/${userId}.json`, {
        params: { include: "memberships" },
        headers: {
          "X-Redmine-API-Key": getApiKey(),
          "Content-Type": "application/json",
        },
      });

      const memberships = res.data.user.memberships || [];
      const projects = memberships.map((m) => m.project); // only projects the user belongs to
      return projects;
    } catch (err) {
      console.error(`getUserProjects error for user ${userId}:`, err);
      return [];
    }
  }
  // Get all issues from projects the logged-in user belongs to
  export async function getMyProjectIssues() {
    try {
      const myProjects = await getMyProjects();
      let allIssues = [];

      // Fetch issues for all projects in parallel
      const issuesLists = await Promise.all(
        myProjects.map(project =>
          getProjectIssues({ project_id: project.id })
        )
      );

      issuesLists.forEach(list => {
        allIssues = allIssues.concat(list);
      });

      return allIssues;
    } catch (err) {
      console.log("getMyProjectIssues error:", err);
      return [];
    }
  }
  // Get issues where the logged-in user is a watcher
  export async function getIssuesWatchedByMe() {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return [];

      let allIssues = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const res = await axios.get(`${API}/issues.json`, {
          params: {
            watcher_id: currentUser.id, // filter by watcher
            status_id: "*",             // include all statuses
            limit,
            offset,
            key: getApiKey(),
          },
        });

        allIssues = [...allIssues, ...(res.data.issues || [])];

        if (allIssues.length >= res.data.total_count) break;
        offset += limit;
      }

      return allIssues;
    } catch (err) {
      console.error("getIssuesWatchedByMe error:", err);
      return [];
    }
  }
  // Get watched issues that are exactly one level deep (have a parent, but parent has no parent)
  // Get watched issues that are exactly one level deep (have a parent, but parent has no parent)
  export async function getWatchedOneLevelIssues() {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return [];

      let allIssues = [];
      let offset = 0;
      const limit = 100;

      // Step 1: fetch all watched issues WITH watcher_ids included
      while (true) {
        const res = await axios.get(`${API}/issues.json`, {
          params: {
            watcher_id: currentUser.id,
            status_id: "*",
            include: "parent,watchers", // Add watchers to include watcher_ids
            limit,
            offset,
            key: getApiKey(),
          },
        });

        allIssues = [...allIssues, ...(res.data.issues || [])];

        if (allIssues.length >= res.data.total_count) break;
        offset += limit;
      }

      // Step 2: filter only issues with exactly one parent level
      const filtered = [];

      for (const issue of allIssues) {
        if (!issue.parent) continue; // skip top-level

        // fetch parent issue to check if it has a parent
        const parentIssue = await getIssue(issue.parent.id);
        if (!parentIssue.parent) {
          // fetch children of this issue
          const childrenRes = await axios.get(`${API}/issues.json`, {
            params: {
              parent_id: issue.id,
              key: getApiKey(),
              status_id: "*",
            },
          });

          issue.children = childrenRes.data.issues || []; // attach children
          
          // If watchers data is available but watcher_ids is not, extract from watchers array
          if (issue.watchers && !issue.watcher_ids) {
            issue.watcher_ids = issue.watchers.map(w => w.id);
          }
          
          filtered.push(issue);
        }
      }

      return filtered;
    } catch (err) {
      console.error("getWatchedOneLevelIssues error:", err);
      return [];
    }
  }
  // Get main projects of logged-in user that have at least one subproject
  export async function getMyMainProjectsWithSubprojects() {
    try {
      const apiKey = getApiKey();
      if (!apiKey) return [];

      // Fetch all projects user is a member of
      const res = await axios.get(`${API}/users/current.json?include=memberships&key=${apiKey}`);
      const memberships = res.data.user.memberships || [];
      const allProjects = memberships.map(m => m.project);

      // Fetch all projects (to check parent-child relationships)
      const allProjectsData = await getProjects();

      // Filter main projects that have at least one subproject
      const mainProjectsWithSubprojects = allProjects.filter(p => {
        const isMain = !p.parent;
        if (!isMain) return false;

        // Check if this project has at least one subproject
        const hasSubproject = allProjectsData.some(sp => sp.parent?.id === p.id);
        return hasSubproject;
      });

      return mainProjectsWithSubprojects;
    } catch (err) {
      console.error("getMyMainProjectsWithSubprojects error:", err);
      return [];
    }
  }
  export async function getIssuesByProject(projectId) {
    try {
      const apiKey = getApiKey();
      if (!apiKey) return [];

      const res = await axios.get(
        `${API}/issues.json`,
        {
          params: {
            project_id: projectId,
            limit: 100,
          },
          headers: {
            "X-Redmine-API-Key": apiKey,
          },
        }
      );

      return res.data.issues || [];
    } catch (err) {
      console.error("getIssuesByProject error:", err);
      return [];
    }
  }

  /**
   * Fetch watched issues for a user (or current user if no ID provided)
   * Only returns issues that have a parent, but the parent has no parent (one level deep)
   */
  export async function getWatchedOneLevelIssuesByUser(userId = null) {
    try {
      // Use current user if userId not provided
      if (!userId) {
        const currentUser = await getCurrentUser();
        if (!currentUser) return [];
        userId = currentUser.id;
      }

      let allIssues = [];
      let offset = 0;
      const limit = 100;

      // Step 1: fetch all issues where the user is a watcher
      while (true) {
        const res = await axios.get(`${API}/issues.json`, {
          params: {
            watcher_id: userId,
            status_id: "*",
            include: "parent,watchers",
            limit,
            offset,
            key: getApiKey(),
          },
        });

        allIssues = [...allIssues, ...(res.data.issues || [])];

        if (allIssues.length >= res.data.total_count) break;
        offset += limit;
      }

      // Step 2: filter only issues that have a parent
      const issuesWithParent = allIssues.filter((issue) => issue.parent);

      // Step 3: fetch parent issues in parallel
      const parentIssuesMap = {};
      await Promise.all(
        issuesWithParent.map(async (issue) => {
          if (!parentIssuesMap[issue.parent.id]) {
            const parent = await getIssue(issue.parent.id);
            parentIssuesMap[issue.parent.id] = parent || {};
          }
        })
      );

      // Step 4: keep only issues whose parent has no parent (one level deep)
      const filteredIssues = issuesWithParent.filter((issue) => {
        const parent = parentIssuesMap[issue.parent.id];
        return parent && !parent.parent;
      });

      return filteredIssues;
    } catch (err) {
      console.error("getWatchedOneLevelIssuesByUser error:", err);
      return [];
    }
  }
  // -------------------------
  // Get users in a group whose name matches a Redmine username
  // -------------------------
  export async function getExpertsForTeamUser(username) {
    try {
      // 1. Fetch all groups
      const resGroups = await axios.get(`${API}/groups.json`, {
        headers: {
          "X-Redmine-API-Key": getApiKey(),
          "Content-Type": "application/json",
        },
      });
      const groups = resGroups.data.groups || [];

      // 2. Find group with exact name = username
      const userGroup = groups.find(g => g.name === username);
      if (!userGroup) {
        console.warn(`No group found for username: ${username}`);
        return [];
      }

      // 3. Fetch users inside that group
      const resGroupDetails = await axios.get(`${API}/groups/${userGroup.id}.json`, {
        headers: {
          "X-Redmine-API-Key": getApiKey(),
          "Content-Type": "application/json",
        },
        params: { include: "users" },
      });

      const groupUsers = resGroupDetails.data.group?.users || [];
      console.log(`Users in group for ${username}:`, groupUsers);
      return groupUsers;
    } catch (err) {
      console.error(`Error fetching experts for username: ${username}`, err);
      return [];
    }
  }
  // Add this function to redmineApi.js
  export async function getIssuesCreatedByUser(userId) {
    let allIssues = [];
    let offset = 0;
    const limit = 100;

    try {
      while (true) {
        const res = await axios.get(`${API}/issues.json`, {
          headers: {
            "X-Redmine-API-Key": getApiKey(),
            "Content-Type": "application/json",
          },
          params: {
            author_id: userId,
            status_id: "*",
            limit,
            offset,
          },
        });

        const { issues, total_count } = res.data;
        allIssues = [...allIssues, ...issues];

        if (allIssues.length >= total_count) break;
        offset += limit;
      }

      return allIssues;
    } catch (err) {
      console.error("getIssuesCreatedByUser error:", err);
      return [];
    }
  }
  // redmineApi.js - Add this function
  export const deleteIssue = async (issueId) => {
    try {
      const response = await fetch(`${API}/issues/${issueId}.json`, {
        method: 'DELETE',
        headers: {
          'X-Redmine-API-Key': getApiKey(),
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        return { success: true, message: 'Issue deleted successfully' };
      } else {
        const error = await response.json();
        return { success: false, message: error.message || 'Failed to delete issue' };
      }
    } catch (error) {
      console.error('Delete issue error:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  };
  // In redmineApi.js - Make sure getAllAssignedIssues is like this:

export async function getAllAssignedIssues(userId) {
  console.log(`🔍 [API] Getting ALL assigned issues for user: ${userId}`);
  
  try {
    // Get user details including group memberships
    const userRes = await axios.get(`${API}/users/${userId}.json`, {
      headers: {
        "X-Redmine-API-Key": getApiKey(),
        "Content-Type": "application/json",
      },
      params: { include: "groups" }
    });
    
    const user = userRes.data.user;
    const userGroups = user.groups || [];
    
    console.log(`📊 [API] User belongs to ${userGroups.length} groups`);
    
    let allIssues = [];
    
    // 1. Get issues directly assigned to the user
    console.log(`🔍 [API] Getting direct issues...`);
    const directIssues = await getIssuesAssigned(userId);
    
    // Mark as direct assignments
    const directIssuesWithType = directIssues.map(issue => ({
      ...issue,
      assignmentType: 'Direct',
      assignmentSource: user.login || `${user.firstname} ${user.lastname}`
    }));
    
    allIssues = [...directIssuesWithType];
    console.log(`✅ [API] Direct issues: ${directIssues.length}`);
    
    // 2. Get issues assigned to groups
    if (userGroups.length > 0) {
      console.log(`🔍 [API] Getting group issues...`);
      
      const groupIssuesPromises = userGroups.map(async (group) => {
        try {
          // Try multiple approaches
          let groupIssues = [];
          
          // Approach 1: Try with 'g' prefix
          try {
            const res = await axios.get(`${API}/issues.json`, {
              headers: {
                "X-Redmine-API-Key": getApiKey(),
                "Content-Type": "application/json",
              },
              params: {
                assigned_to_id: `g${group.id}`,
                status_id: "*",
                limit: 100,
                include: "assigned_to"
              }
            });
            groupIssues = res.data.issues || [];
            console.log(`  ✅ [API] Group "${group.name}" (g${group.id}): ${groupIssues.length} issues`);
          } catch (error) {
            console.log(`  ❌ [API] Group "${group.name}" (g${group.id}) failed: ${error.message}`);
          }
          
          // Approach 2: Try without 'g' prefix if first failed
          if (groupIssues.length === 0) {
            try {
              const res = await axios.get(`${API}/issues.json`, {
                headers: {
                  "X-Redmine-API-Key": getApiKey(),
                  "Content-Type": "application/json",
                },
                params: {
                  assigned_to_id: group.id,
                  status_id: "*",
                  limit: 100,
                  include: "assigned_to"
                }
              });
              groupIssues = res.data.issues || [];
              console.log(`  ✅ [API] Group "${group.name}" (${group.id}): ${groupIssues.length} issues`);
            } catch (error) {
              console.log(`  ❌ [API] Group "${group.name}" (${group.id}) failed: ${error.message}`);
            }
          }
          
          // Mark as group assignments
          return groupIssues.map(issue => ({
            ...issue,
            assignmentType: 'Group',
            assignmentSource: group.name,
            groupId: group.id
          }));
          
        } catch (error) {
          console.error(`  ❌ [API] Error with group "${group.name}":`, error);
          return [];
        }
      });
      
      const groupIssuesArrays = await Promise.all(groupIssuesPromises);
      const groupIssues = groupIssuesArrays.flat();
      
      console.log(`✅ [API] Group issues total: ${groupIssues.length}`);
      allIssues = [...allIssues, ...groupIssues];
    }
    
    // Remove duplicates
    const issueMap = new Map();
    allIssues.forEach(issue => {
      if (!issueMap.has(issue.id)) {
        issueMap.set(issue.id, issue);
      }
    });
    
    const uniqueIssues = Array.from(issueMap.values());
    
    console.log(`🎯 [API] Final: ${uniqueIssues.length} total issues`);
    console.log(`   - Direct: ${uniqueIssues.filter(i => i.assignmentType === 'Direct').length}`);
    console.log(`   - Group: ${uniqueIssues.filter(i => i.assignmentType === 'Group').length}`);
    
    return uniqueIssues;
    
  } catch (err) {
    console.error("❌ [API] getAllAssignedIssues error:", err);
    // Fallback to direct issues only
    const directIssues = await getIssuesAssigned(userId);
    return directIssues.map(issue => ({
      ...issue,
      assignmentType: 'Direct',
      assignmentSource: 'User (fallback)'
    }));
  }
}
// redmineApi.js - Add this function
export async function getSubIssuesByParentAndAssignee(parentIssueId, assigneeId) {
  try {
    const res = await axios.get(`${API}/issues.json`, {
      headers: {
        "X-Redmine-API-Key": getApiKey(),
        "Content-Type": "application/json",
      },
      params: {
        parent_id: parentIssueId,
        assigned_to_id: assigneeId,
        status_id: "*",
        limit: 100
      },
    });
    return res.data.issues || [];
  } catch (error) {
    console.error(`Error fetching sub-issues for parent ${parentIssueId} and assignee ${assigneeId}:`, error);
    return [];
  }
}// Add these functions to your redmineApi.js file:

/**
 * Get all issues assigned to current user (direct + via groups)
 * This is the main function that should work reliably
 */
export async function getAllMyAssignedIssues() {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error("No API key found");
      return [];
    }

    console.log("🔍 Starting getAllMyAssignedIssues...");

    // Get current user
    const currentUserRes = await axios.get(`${API}/users/current.json`, {
      headers: {
        "X-Redmine-API-Key": apiKey,
        "Content-Type": "application/json",
      }
    });
    
    const currentUser = currentUserRes.data.user;
    console.log(`👤 Current user: ${currentUser.firstname} ${currentUser.lastname} (ID: ${currentUser.id})`);

    // Method 1: Use Redmine's built-in 'me' keyword
    console.log("📋 Method 1: Using 'assigned_to_id=me'...");
    let allIssues = [];
    
    try {
      let offset = 0;
      const limit = 100;
      
      while (true) {
        const res = await axios.get(`${API}/issues.json`, {
          headers: {
            "X-Redmine-API-Key": apiKey,
            "Content-Type": "application/json",
          },
          params: {
            assigned_to_id: 'me', // Redmine's special keyword for current user
            status_id: '*', // All statuses
            limit: limit,
            offset: offset,
            include: 'assigned_to,parent'
          }
        });

        const issues = res.data.issues || [];
        console.log(`   Got ${issues.length} issues in batch ${offset/limit + 1}`);
        
        // Add assignment info
        const processedIssues = issues.map(issue => ({
          ...issue,
          assignmentType: 'Direct', // Will update if we find group assignments
          assignmentSource: 'Current User'
        }));
        
        allIssues = [...allIssues, ...processedIssues];
        
        if (issues.length < limit) break;
        offset += limit;
      }
      
      console.log(`✅ Method 1: Found ${allIssues.length} issues using 'me' keyword`);
      
    } catch (error) {
      console.error("Method 1 failed:", error.message);
      
      // Fallback: Try direct assignment by user ID
      console.log("📋 Fallback: Using direct user ID assignment...");
      try {
        let offset = 0;
        const limit = 100;
        
        while (true) {
          const res = await axios.get(`${API}/issues.json`, {
            headers: {
              "X-Redmine-API-Key": apiKey,
              "Content-Type": "application/json",
            },
            params: {
              assigned_to_id: currentUser.id,
              status_id: '*',
              limit: limit,
              offset: offset,
              include: 'assigned_to,parent'
            }
          });

          const issues = res.data.issues || [];
          const processedIssues = issues.map(issue => ({
            ...issue,
            assignmentType: 'Direct',
            assignmentSource: `${currentUser.firstname} ${currentUser.lastname}`
          }));
          
          allIssues = [...allIssues, ...processedIssues];
          
          if (issues.length < limit) break;
          offset += limit;
        }
        
        console.log(`✅ Fallback: Found ${allIssues.length} issues using user ID`);
        
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError.message);
      }
    }

    // Try to get group assignments
    console.log("📋 Looking for group assignments...");
    try {
      // Get user's groups
      const groupsRes = await axios.get(`${API}/users/current.json`, {
        headers: {
          "X-Redmine-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        params: { include: 'groups' }
      });
      
      const userGroups = groupsRes.data.user.groups || [];
      console.log(`   User belongs to ${userGroups.length} groups`);
      
      for (const group of userGroups) {
        try {
          let offset = 0;
          const limit = 100;
          let groupIssuesBatch = [];
          
          // Try different group ID formats
          const groupIdFormats = [
            `g${group.id}`,  // Most common
            `${group.id}`,   // Without prefix
            `group:${group.id}` // Alternative format
          ];
          
          for (const groupIdFormat of groupIdFormats) {
            try {
              offset = 0;
              groupIssuesBatch = [];
              
              while (true) {
                const res = await axios.get(`${API}/issues.json`, {
                  headers: {
                    "X-Redmine-API-Key": apiKey,
                    "Content-Type": "application/json",
                  },
                  params: {
                    assigned_to_id: groupIdFormat,
                    status_id: '*',
                    limit: limit,
                    offset: offset,
                    include: 'assigned_to,parent'
                  }
                });

                const issues = res.data.issues || [];
                
                // Mark as group assignments
                const processedIssues = issues.map(issue => ({
                  ...issue,
                  assignmentType: 'Group',
                  assignmentSource: group.name,
                  groupId: group.id
                }));
                
                groupIssuesBatch = [...groupIssuesBatch, ...processedIssues];
                
                if (issues.length < limit) break;
                offset += limit;
              }
              
              console.log(`   Found ${groupIssuesBatch.length} issues for group '${group.name}' using format '${groupIdFormat}'`);
              
              // Add only new issues (not already in allIssues)
              groupIssuesBatch.forEach(groupIssue => {
                if (!allIssues.some(existing => existing.id === groupIssue.id)) {
                  allIssues.push(groupIssue);
                }
              });
              
              break; // Stop trying other formats if this one worked
              
            } catch (formatError) {
              console.log(`   Format '${groupIdFormat}' failed for group '${group.name}': ${formatError.message}`);
            }
          }
          
        } catch (groupError) {
          console.error(`   Error processing group ${group.name}:`, groupError.message);
        }
      }
      
    } catch (groupsError) {
      console.error("Could not fetch user groups:", groupsError.message);
    }

    console.log(`🎯 FINAL: Total unique issues found: ${allIssues.length}`);
    
    // Log a sample of issues for debugging
    if (allIssues.length > 0) {
      console.log("Sample issues:");
      allIssues.slice(0, 3).forEach((issue, index) => {
        console.log(`  ${index + 1}. #${issue.id}: ${issue.subject.substring(0, 50)}...`);
        console.log(`     Parent: ${issue.parent ? `#${issue.parent.id}` : 'None'}`);
        console.log(`     Assignment: ${issue.assignmentType} - ${issue.assignmentSource}`);
      });
    }
    
    return allIssues;

  } catch (error) {
    console.error("❌ Critical error in getAllMyAssignedIssues:", error);
    return [];
  }
}

/**
 * Simple function to get current user's issues with parent info
 */
export async function getMyIssuesWithParents() {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    
    const currentUserRes = await axios.get(`${API}/users/current.json`, {
      headers: {
        "X-Redmine-API-Key": apiKey,
        "Content-Type": "application/json",
      }
    });
    
    const currentUser = currentUserRes.data.user;
    
    let allIssues = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const res = await axios.get(`${API}/issues.json`, {
        headers: {
          "X-Redmine-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        params: {
          assigned_to_id: currentUser.id,
          status_id: '*',
          limit: limit,
          offset: offset,
          include: 'assigned_to,parent,custom_fields'
        }
      });
      
      const issues = res.data.issues || [];
      allIssues = [...allIssues, ...issues];
      
      if (issues.length < limit) break;
      offset += limit;
    }
    
    return allIssues;
    
  } catch (error) {
    console.error("Error in getMyIssuesWithParents:", error);
    return [];
  }
}