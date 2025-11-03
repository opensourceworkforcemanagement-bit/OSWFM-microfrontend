import ReactDOM from "react-dom/client";
import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Menu, Home, Users, Settings, X, Bell, Share2, ChevronDown, Check, Activity, PersonStandingIcon  } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import * as Switch from '@radix-ui/react-switch';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import './index.css'
const UserManagementComp = React.lazy(() => import('usermanagement/App'));
const WorkCodeManagementComp = React.lazy(() => import('timesheetmanagement/WorkCodeManagement'));

// Shared State Context
const SharedStateContext = createContext();

// Event Bus
class EventBus {
  constructor() {
    this.events = {};
  }

  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  publish(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}

const eventBus = new EventBus();

// Shared State Provider
function SharedStateProvider({ children }) {
  const [sharedState, setSharedState] = useState({
    user: { name: 'John Doe', role: 'Admin', id: 1 },
    assignment: [],
    notifications: [],
    theme: 'light',
    selectedRole: null,
    selectedUser: null
  });

  const updateSharedState = (key, value) => {
    setSharedState(prev => ({ ...prev, [key]: value }));
    eventBus.publish('stateChanged', { key, value });
  };

  const assignEmployeeToRole = (role) => {
    setSharedState(prev => ({
      ...prev,
      assignment: [...prev.assignment, role]
    }));
    eventBus.publish('assignmentUpdated', { assignment: [...sharedState.assignment, role] });
    addNotification(`Added ${role.name} to assignment`);
  };

  const addNotification = (message) => {
    const notification = {
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setSharedState(prev => ({
      ...prev,
      notifications: [notification, ...prev.notifications].slice(0, 5)
    }));
  };

  const selectRole = (role) => {
    setSharedState(prev => ({ ...prev, selectedRole: role }));
    eventBus.publish('roleSelected', role);
  };

  const selectUser = (user) => {
    setSharedState(prev => ({ ...prev, selectedUser: user }));
    eventBus.publish('userSelected', user);
  };

  return (
    <SharedStateContext.Provider value={{
      sharedState,
      updateSharedState,
      assignEmployeeToRole,
      addNotification,
      selectRole,
      selectUser,
      eventBus
    }}>
      {children}
    </SharedStateContext.Provider>
  );
}

function useSharedState() {
  const context = useContext(SharedStateContext);
  if (!context) {
    throw new Error('useSharedState must be used within SharedStateProvider');
  }
  return context;
}

// Dashboard Module
const Dashboard = () => {
  const { sharedState } = useSharedState();
  const [stats, setStats] = useState({
    users: 1284,
    revenue: 45231,
    orders: 342
  });

  useEffect(() => {
    const unsubscribe = eventBus.subscribe('assignmentUpdated', () => {
      setStats(prev => ({
        ...prev,
        orders: prev.orders + 1,
        revenue: prev.revenue + 100
      }));
    });
    return unsubscribe;
  }, []);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-800">
          <Share2 size={16} className="flex-shrink-0" />
          <span className="break-words">Logged in as: <strong>{sharedState.user.name}</strong> ({sharedState.user.role})</span>
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-4">Dashboard Module</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-blue-100 p-4 sm:p-6 rounded-lg border-2 border-blue-300">
          <h3 className="font-semibold text-base sm:text-lg mb-2">Total Users</h3>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.users}</p>
        </div>
        <div className="bg-green-100 p-4 sm:p-6 rounded-lg border-2 border-green-300">
          <h3 className="font-semibold text-base sm:text-lg mb-2">Processed Timesheets</h3>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.revenue.toLocaleString()}</p>
        </div>
        <div className="bg-purple-100 p-4 sm:p-6 rounded-lg border-2 border-purple-300">
          <h3 className="font-semibold text-base sm:text-lg mb-2">Active Timesheets</h3>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.orders}</p>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold mb-2 text-sm sm:text-base">Role Assignment ({sharedState.assignment.length} items)</h3>
        {sharedState.assignment.length === 0 ? (
          <p className="text-gray-500 text-sm">No Roles Assigned</p>
        ) : (
          <ul className="space-y-2">
            {sharedState.assignment.map((item, idx) => (
              <li key={idx} className="text-xs sm:text-sm">{item.name} - {item.permission}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Roles Module
const Roles = () => {
  const { sharedState, assignEmployeeToRole, selectRole, addNotification } = useSharedState();
  const [roles] = useState([
    { id: 1, name: 'Admin', permission: 'Add Work Codes', totalusersassignedrole: 45 },
    { id: 2, name: 'Supervisor', permission: 'Create Accounts', totalusersassignedrole: 23 },
    { id: 3, name: 'DevOps Admin', permission: 'Generate API Keys', totalusersassignedrole: 67 },
    { id: 4, name: 'Work Force Admin', permission: 'Create Users', totalusersassignedrole: 156 }
  ]);

  const handleAssignEmployeeToRole = (role) => {
    assignEmployeeToRole(role);
  };

  const handleSelectRole = (role) => {
    selectRole(role);
    addNotification(`Viewing details for ${role.name}`);
  };

  useEffect(() => {
    const unsubscribe = eventBus.subscribe('userSelected', (user) => {
      addNotification(`User ${user.name} selected - showing personalized roles`);
    });
    return unsubscribe;
  }, [addNotification]);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-green-800">
          <Share2 size={16} className="flex-shrink-0" />
          <span>Shared State: Roles are assigned has <strong>{sharedState.assignment.length}</strong> items</span>
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-4">Roles Module</h2>
      
      {sharedState.selectedRole && (
        <div className="mb-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-sm sm:text-base">Currently Viewing:</h3>
          <p className="text-xs sm:text-sm">{sharedState.selectedRole.name} - {sharedState.selectedRole.permission}</p>
        </div>
      )}

      {/* Mobile: Card View */}
      <div className="block sm:hidden space-y-3">
        {roles.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-lg font-bold text-green-600">{p.permission}</p>
                <p className="text-sm text-gray-600">Total Employees Assigned Role: {p.totalusersassignedrole}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSelectRole(p)}
                className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
              >
                View
              </button>
              <button
                onClick={() => handleAssignEmployeeToRole(p)}
                className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
              >
                Assign Employee to Role
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table View */}
      <div className="hidden sm:block bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissiones</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Employees Assigned Role</th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {roles.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 lg:px-6 py-4">{p.name}</td>
                <td className="px-4 lg:px-6 py-4">{p.permission}</td>
                <td className="px-4 lg:px-6 py-4">{p.totalusersassignedrole}</td>
                <td className="px-4 lg:px-6 py-4">
                  <button
                    onClick={() => handleSelectRole(p)}
                    className="mr-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleAssignEmployeeToRole(p)}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                  >
                    Assign Role to employee
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Settings Module with Radix UI
const SettingsModule = () => {
  const { sharedState, updateSharedState, addNotification } = useSharedState();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  const handleThemeChange = (theme) => {
    updateSharedState('theme', theme);
    addNotification(`Theme changed to ${theme}`);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-orange-800">
          <Share2 size={16} className="flex-shrink-0" />
          <span>Current Theme: <strong>{sharedState.theme}</strong></span>
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-4">Settings Module</h2>
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow space-y-4 border border-gray-200">
        
        {/* Email Notifications Switch */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
          <label htmlFor="email-notifs" className="font-medium text-sm sm:text-base cursor-pointer">
            Email Notifications
          </label>
          <Switch.Root
            id="email-notifs"
            checked={emailNotifs}
            onCheckedChange={setEmailNotifs}
            className="w-11 h-6 bg-gray-300 rounded-full relative data-[state=checked]:bg-indigo-600 transition-colors cursor-pointer"
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>

        {/* Theme Select */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
          <span className="font-medium text-sm sm:text-base">Theme</span>
          <Select.Root value={sharedState.theme} onValueChange={handleThemeChange}>
            <Select.Trigger className="inline-flex items-center justify-between gap-2 px-4 py-2 bg-white border border-gray-300 rounded min-w-[120px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors">
              <Select.Value />
              <Select.Icon>
                <ChevronDown size={16} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <Select.Viewport className="p-1">
                  <Select.Item
                    value="light"
                    className="relative flex items-center px-8 py-2 rounded text-sm cursor-pointer hover:bg-indigo-50 focus:bg-indigo-50 outline-none data-[highlighted]:bg-indigo-50"
                  >
                    <Select.ItemIndicator className="absolute left-2">
                      <Check size={16} />
                    </Select.ItemIndicator>
                    <Select.ItemText>Light</Select.ItemText>
                  </Select.Item>
                  <Select.Item
                    value="dark"
                    className="relative flex items-center px-8 py-2 rounded text-sm cursor-pointer hover:bg-indigo-50 focus:bg-indigo-50 outline-none data-[highlighted]:bg-indigo-50"
                  >
                    <Select.ItemIndicator className="absolute left-2">
                      <Check size={16} />
                    </Select.ItemIndicator>
                    <Select.ItemText>Dark</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Auto-save Switch */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
          <label htmlFor="auto-save" className="font-medium text-sm sm:text-base cursor-pointer">
            Auto-save
          </label>
          <Switch.Root
            id="auto-save"
            checked={autoSave}
            onCheckedChange={setAutoSave}
            className="w-11 h-6 bg-gray-300 rounded-full relative data-[state=checked]:bg-indigo-600 transition-colors cursor-pointer"
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg transition-transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
        </div>
      </div>
    </div>
  );
};

// Micro Frontend Registry
const microFrontends = {
  dashboard: { component: Dashboard, name: 'Dashboard', icon: Home, path: '/' },
  roles: { component: Roles, name: 'Roles', icon: PersonStandingIcon, path: '/roles' },
  users: { component: UserManagementComp, name: 'Users', icon: Users, path: '/users' },
  workcodes: { component: WorkCodeManagementComp, name: 'Work Codes', icon: Activity, path: '/workcodes' },
  settings: { component: SettingsModule, name: 'Settings', icon: Settings, path: '/settings' }
};

// Mobile Menu Dialog
function MobileMenu({ open, onOpenChange }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-50 p-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="font-bold text-xl">Menu</Dialog.Title>
            <Dialog.Close className="p-2 hover:bg-gray-800 rounded transition-colors">
              <X size={20} />
            </Dialog.Close>
          </div>
          
          <nav className="space-y-2">
            {Object.entries(microFrontends).map(([key, mfe]) => {
              const Icon = mfe.icon;
              const isActive = location.pathname === mfe.path;
              return (
                <button
                  key={key}
                  onClick={() => handleNavigation(mfe.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-indigo-600' : 'hover:bg-gray-800'
                  }`}
                >
                  <Icon size={20} />
                  <span>{mfe.name}</span>
                </button>
              );
            })}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Layout Component (contains sidebar and header)
function Layout({ children }) {
  const { sharedState } = useSharedState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get current module name based on route
  const getCurrentModuleName = () => {
    const module = Object.values(microFrontends).find(mfe => mfe.path === location.pathname);
    return module ? module.name : 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 bg-gray-900 text-white flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="font-bold text-xl">OSWFM</h1>
        </div>
        
        <nav className="flex-1 px-2 py-4">
          {Object.entries(microFrontends).map(([key, mfe]) => {
            const Icon = mfe.icon;
            const isActive = location.pathname === mfe.path;
            return (
              <button
                key={key}
                onClick={() => navigate(mfe.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive ? 'bg-indigo-600' : 'hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                <span>{mfe.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-400 space-y-2">
            <div>Current Selection: <span className="text-white font-medium">{getCurrentModuleName()}</span></div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm p-3 sm:p-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded transition-colors"
            >
              <Menu size={24} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">
                {getCurrentModuleName()}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                Header
              </p>
            </div>
          </div>
          
          {/* Notifications Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="p-2 hover:bg-gray-100 rounded-full relative flex-shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <Bell size={24} />
              {sharedState.notifications.length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold">
                  {sharedState.notifications.length}
                </span>
              )}
            </DropdownMenu.Trigger>
            
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              >
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {sharedState.notifications.length === 0 ? (
                    <p className="p-4 text-gray-500 text-sm text-center">No notifications</p>
                  ) : (
                    sharedState.notifications.map(n => (
                      <DropdownMenu.Item
                        key={n.id}
                        className="p-3 border-b border-gray-100 hover:bg-gray-50 outline-none cursor-pointer focus:bg-gray-50"
                      >
                        <p className="text-sm">{n.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{n.timestamp}</p>
                      </DropdownMenu.Item>
                    ))
                  )}
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </header>
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// Main Host Application with Router
function MicroFrontendHost() {
  return (
    <BrowserRouter>
      <SharedStateProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users/*" element={<React.Suspense fallback={<div className="p-6">Loading...</div>}><UserManagementComp /></React.Suspense>} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/workcodes/*" element={<React.Suspense fallback={<div className="p-6">Loading...</div>}><WorkCodeManagementComp /></React.Suspense>} />
            <Route path="/settings" element={<SettingsModule />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </SharedStateProvider>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<MicroFrontendHost />);