import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";

export const SIDEBAR_WIDTH_CONST = 260;

// Define ALL required icons as components
const DashboardIcon = ({ active }) => (
  <svg className={`icon ${active ? 'active' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />
  </svg>
);

const TaskIcon = ({ active }) => (
  <svg className={`icon ${active ? 'active' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const ProgressIcon = ({ active }) => (
  <svg className={`icon ${active ? 'active' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.2 4.2 0 00-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 00-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 00-.1 3.2A4.6 4.6 0 004 10.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  </svg>
);

const LogoutIcon = ({ active }) => (
  <svg className={`icon ${active ? 'active' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

const UserIcon = ({ active }) => (
  <svg className={`icon ${active ? 'active' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ChevronRightIcon = ({ active }) => (
  <svg className={`icon chevron ${active ? 'active' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const MenuIcon = ({ active }) => (
  <svg className={`icon ${active ? 'active' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);

const CloseIcon = ({ active }) => (
  <svg className={`icon ${active ? 'active' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function Sidebar({ 
  onCollapsedChange, 
  onMobileMenuChange,
  collapsed,
  isMobileMenuOpen
}) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeItem, setActiveItem] = useState("");
  const [role, setRole] = useState("");
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Get logged-in user data from localStorage
    try {
      const user = JSON.parse(localStorage.getItem("redmine_user"));
      if (user && user.memberships && user.memberships.length > 0) {
        const roleSet = new Set();
        user.memberships.forEach((membership) => {
          membership.roles.forEach((r) => roleSet.add(r.name));
        });
        const roles = Array.from(roleSet);
        
        // Determine main role
        if (roles.includes("Team Leaders")) setRole("Team Leaders");
        else if (roles.includes("Executives")) setRole("Executives");
        else if (roles.includes("Chief Executives")) setRole("Chief Executives");
        else if (roles.includes("State Ministers")) setRole("State Ministers");
        else setRole("User");
      } else {
        setRole("User");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      setRole("User");
    }
  }, []);

  // Update active item based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    setActiveItem(currentPath);
    
    // Close mobile menu on route change (for mobile)
    if (screenWidth <= 767 && onMobileMenuChange) {
      onMobileMenuChange(false);
    }
  }, [location, screenWidth, onMobileMenuChange]);

  // Handle screen resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      
      // Auto-collapse on tablet/mobile
      if (width <= 991 && onCollapsedChange) {
        onCollapsedChange(true);
      }
      
      // Auto-expand on desktop
      if (width > 991 && onCollapsedChange) {
        onCollapsedChange(false);
      }
      
      // Close mobile menu on larger screens
      if (width > 767 && onMobileMenuChange) {
        onMobileMenuChange(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, [onCollapsedChange, onMobileMenuChange]);

  // Define menu items with icons based on role
  let menuItems = [];

  if (role === "Team Leaders") {
    menuItems = [
      { name: "Dashboard", path: "/teamleader-dashboard", icon: DashboardIcon },
      { name: "Personal Plan", path: "/personal-plan-management", icon: TaskIcon },
      { name: "Progress", path: "/progress-page", icon: ProgressIcon },
    ];
  } else if (role === "Executives") {
    menuItems = [
      { name: "Dashboard", path: "/master-dashboard", icon: DashboardIcon },
    ];
  } else if (role === "Chief Executives" || role === "State Ministers") {
    menuItems = [
      { name: "Dashboard", path: "/state-minister-dashboard", icon: DashboardIcon },
    ];
  }else if (role === "Minister" ) {
    menuItems = [
      { name: "Dashboard", path: "/minister-dashboard", icon: DashboardIcon },
    ];
  } 
  else {
    menuItems = [
      { name: "Dashboard", path: "/dashboard", icon: DashboardIcon },
      { name: "Personal Plan", path: "/personal-plan-management", icon: TaskIcon },
      { name: "Progress", path: "/progress-page", icon: ProgressIcon },
    ];
  }

  const handleLogout = () => {
    // Clear all user-related data from localStorage
    localStorage.removeItem("redmine_user");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_session");
    
    // Clear sessionStorage as well if used
    sessionStorage.clear();
    
    // Navigate to login page
    navigate("/");
    
    // Optional: Force a page reload to clear any React state
    // window.location.reload();
  };

  const toggleSidebar = () => {
    setIsTransitioning(true);
    
    // Add a small delay to allow CSS transition to complete
    setTimeout(() => {
      if (screenWidth <= 767) {
        const newState = !isMobileMenuOpen;
        if (onMobileMenuChange) onMobileMenuChange(newState);
      } else {
        const newState = !collapsed;
        if (onCollapsedChange) onCollapsedChange(newState);
      }
      
      setIsTransitioning(false);
    }, 50);
  };

  const handleNavClick = (path) => {
    if (screenWidth <= 767 && onMobileMenuChange) {
      onMobileMenuChange(false);
    }
    setActiveItem(path);
  };

  // Calculate sidebar width based on screen size
  const getSidebarWidth = () => {
    if (screenWidth <= 575) {
      return isMobileMenuOpen ? "85vw" : "0px";
    }
    if (screenWidth <= 767) {
      return isMobileMenuOpen ? "200px" : "60px";
    }
    if (screenWidth <= 991) {
      return collapsed ? "70px" : "220px";
    }
    return collapsed ? "80px" : "260px";
  };

  // Determine if text should be shown
  const shouldShowText = () => {
    // Show text when:
    // 1. On mobile and menu is open
    // 2. On desktop and sidebar is NOT collapsed
    return (screenWidth <= 767 && isMobileMenuOpen) || (screenWidth > 767 && !collapsed);
  };

  // Mobile hamburger menu button
  const MobileMenuButton = () => (
    screenWidth <= 767 && (
      <button 
        className="mobile-menu-toggle"
        onClick={toggleSidebar}
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        style={{
          position: 'fixed',
          top: '75px',
          left: '15px',
          zIndex: '1200',
          width: '44px',
          height: '44px',
          background: '#4CAF50',
          border: 'none',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          cursor: 'pointer'
        }}
      >
        {isMobileMenuOpen ? <CloseIcon active={false} /> : <MenuIcon active={false} />}
      </button>
    )
  );

  // Sidebar styles
  const sidebarContainerStyle = {
    width: getSidebarWidth(),
    position: 'fixed',
    top: '70px',
    left: '0',
    height: 'calc(100vh - 70px)',
    zIndex: '1000',
    backgroundColor: '#1B5E20',
    background: 'linear-gradient(180deg, #1B5E20 0%, #2E7D32 100%)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
    // Smooth transition for width only
    transition: isTransitioning ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
    // Prevent other transitions that might cause content to shift
    transform: 'none !important',
    transformOrigin: 'left center !important'
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <MobileMenuButton />
      
      {/* Mobile Overlay */}
      {screenWidth <= 767 && isMobileMenuOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => onMobileMenuChange && onMobileMenuChange(false)}
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: '999',
            backdropFilter: 'blur(3px)'
          }}
        />
      )}
      
      <div 
        className={`sidebar-container ${collapsed ? 'collapsed' : ''} ${screenWidth <= 767 && !isMobileMenuOpen ? 'hidden-mobile' : ''}`}
        style={sidebarContainerStyle}
      >
        <div className="sidebar" style={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          // Prevent content from moving during transition
          transform: 'none !important',
          transition: 'none !important'
        }}>
          {/* Sidebar Header */}
          <div className="sidebar-header" style={{ 
            padding: collapsed && screenWidth > 767 ? '25px 15px 20px' : '25px 20px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            flexShrink: '0',
            // Prevent movement
            transform: 'none !important'
          }}>
            {!collapsed && screenWidth > 767 && (
              <div className="user-info" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '15px', 
                marginBottom: '20px',
                // Smooth transition for user info
                transition: 'opacity 0.2s ease',
                opacity: collapsed ? '0' : '1'
              }}>
                <div className="user-avatar" style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                  flexShrink: '0'
                }}>
                  <UserIcon active={false} />
                </div>
                <div className="user-details" style={{
                  minWidth: '0',
                  transition: 'opacity 0.2s ease',
                  opacity: collapsed ? '0' : '1'
                }}>
                  <h3 style={{ 
                    margin: '0', 
                    color: 'white', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    marginBottom: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    Ministry User
                  </h3>
                 
                </div>
              </div>
            )}
            
            {(collapsed || screenWidth <= 575) && (
              <div className="collapsed-avatar" style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                margin: '0 auto 25px',
                transition: 'all 0.3s ease'
              }}>
                <UserIcon active={false} />
              </div>
            )}
            
            {/* Collapse toggle - visible on larger screens */}
            {screenWidth > 767 && (
              <button 
                className="collapse-toggle"
                onClick={toggleSidebar}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                style={{
                  position: 'absolute',
                  top: '25px',
                  right: '-12px',
                  width: '24px',
                  height: '24px',
                  background: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                  zIndex: '2',
                  transition: 'transform 0.3s ease',
                  transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              >
                <ChevronRightIcon active={collapsed} />
              </button>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="sidebar-nav" style={{ 
            flex: '1',
            padding: collapsed && screenWidth > 767 ? '25px 10px' : '25px 15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            overflowX: 'hidden',
            // Prevent content movement
            transform: 'none !important'
          }}>
            {menuItems.map((item) => {
              const isActive = activeItem === item.path;
              const IconComponent = item.icon;
              const showText = shouldShowText();
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed && screenWidth > 767 ? 'center' : 'flex-start',
                    gap: collapsed && screenWidth > 767 ? '0' : '15px',
                    padding: collapsed && screenWidth > 767 ? '14px' : '14px 18px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    textDecoration: 'none',
                    borderRadius: '12px',
                    background: isActive ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.15))' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '15px',
                    fontWeight: '500',
                    width: '100%',
                    position: 'relative',
                    // Smooth transition
                    transition: 'all 0.3s ease',
                    transform: 'none !important'
                  }}
                >
                  <div className="nav-icon" style={{ 
                    width: '24px', 
                    height: '24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: '0',
                    transition: 'all 0.3s ease'
                  }}>
                    <IconComponent active={isActive} />
                  </div>
                  {showText && (
                    <span className="nav-label" style={{ 
                      flex: '1', 
                      textAlign: 'left', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      opacity: showText ? '1' : '0',
                      transition: 'opacity 0.2s ease',
                      marginLeft: collapsed && screenWidth > 767 ? '0' : '0'
                    }}>
                      {item.name}
                    </span>
                  )}
                  {showText && isActive && (
                    <div className="active-indicator" style={{
                      width: '8px',
                      height: '8px',
                      background: '#81C784',
                      borderRadius: '50%',
                      marginLeft: '10px',
                      animation: 'pulse 2s infinite',
                      flexShrink: '0',
                      opacity: showText ? '1' : '0',
                      transition: 'opacity 0.2s ease'
                    }}></div>
                  )}
                  {showText && !isActive && (
                    <div style={{ 
                      flexShrink: '0',
                      opacity: showText ? '1' : '0',
                      transition: 'opacity 0.2s ease'
                    }}>
                      <ChevronRightIcon active={false} />
                    </div>
                  )}
                </Link>
              );
            })}
            
            {/* Logout Button - Separate from menu items */}
            <button
              className="nav-item logout-btn"
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed && screenWidth > 767 ? 'center' : 'flex-start',
                gap: collapsed && screenWidth > 767 ? '0' : '15px',
                padding: collapsed && screenWidth > 767 ? '14px' : '14px 18px',
                color: 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '15px',
                fontWeight: '500',
                width: '100%',
                marginTop: 'auto',
                // Smooth transition
                transition: 'all 0.3s ease',
                transform: 'none !important'
              }}
            >
              <div className="nav-icon" style={{ 
                width: '24px', 
                height: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: '0',
                transition: 'all 0.3s ease'
              }}>
                <LogoutIcon active={false} />
              </div>
              {shouldShowText() && (
                <span className="nav-label" style={{ 
                  flex: '1', 
                  textAlign: 'left', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  opacity: shouldShowText() ? '1' : '0',
                  transition: 'opacity 0.2s ease',
                  marginLeft: collapsed && screenWidth > 767 ? '0' : '0'
                }}>
                  Logout
                </span>
              )}
            </button>
          </nav>

          {/* Sidebar Footer */}
          {!collapsed && screenWidth > 575 && (
            <div className="sidebar-footer" style={{ 
              padding: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              flexShrink: '0',
              opacity: collapsed ? '0' : '1',
              transition: 'opacity 0.2s ease'
            }}>
              <div className="ministry-badge" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '15px'
              }}>
                <div className="badge-text" style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="ministry-name" style={{ 
                    color: 'rgba(255, 255, 255, 0.9)', 
                    fontSize: '12px', 
                    fontWeight: '500'
                  }}>
                    Ministry of
                  </span>
                  <span className="ministry-dept" style={{ 
                    color: 'white', 
                    fontSize: '14px', 
                    fontWeight: '600'
                  }}>
                    Agriculture
                  </span>
                </div>
              </div>
              <div className="version-info" style={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                fontSize: '11px', 
                textAlign: 'center'
              }}>
                v2.0.1
              </div>
            </div>
          )}
          
          {collapsed && screenWidth > 575 && (
            <div className="collapsed-footer" style={{ 
              padding: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              opacity: collapsed ? '1' : '0',
              transition: 'opacity 0.2s ease'
            }}>
              <div className="ministry-icon" style={{ fontSize: '24px' }}>🌱</div>
            </div>
          )}
        </div>
      </div>

      {/* Add CSS animation for pulse effect */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
          }
          
          /* Prevent any global transitions from affecting sidebar */
          .sidebar-container * {
            transition: none !important;
            transform: none !important;
          }
          
          /* Only allow specific transitions */
          .sidebar-container {
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          .nav-item, .logout-btn, .user-info, .user-details, .collapsed-avatar {
            transition: all 0.3s ease !important;
          }
          
          .nav-label, .active-indicator {
            transition: opacity 0.2s ease !important;
          }
          
          .logout-btn:hover {
            background: rgba(255, 255, 255, 0.15) !important;
            transform: translateY(-1px) !important;
          }
        `}
      </style>
    </>
  );
}