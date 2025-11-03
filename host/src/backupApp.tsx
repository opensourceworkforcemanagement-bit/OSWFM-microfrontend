/*import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import * as Tabs from '@radix-ui/react-tabs';
import styled from 'styled-components';
import { Menu, Home, ShoppingCart, Users, Settings, X, Bell, Share2, ChevronDown, Check } from 'lucide-react';

const Mfe_users_Comp = React.lazy(() => import('usermanagement/App'));


 const AppContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

 const Topbar = styled.div`
  height: 60px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  padding: 0 20px;
`;

 const Content = styled.div`
  flex: 1;
  padding: 20px;
`;


const App = () => (
 <AppContainer>
      <Topbar>Host Shell - Tabs</Topbar>
      <Content>
        <Suspense fallback={<div>Loading...</div>}>
          <Tabs.Root defaultValue="tab-0">
          <Tabs.Content value='tab-1'><Mfe_users_Comp/></Tabs.Content>
          </Tabs.Root>
        </Suspense>
      </Content>
    </AppContainer>
);

const root = ReactDOM.createRoot(document.getElementById("app") as HTMLElement);

root.render(<App />);

*/
import ReactDOM from "react-dom/client";

import React, { useState } from 'react';
import { Menu, Home, Settings, Package, Users, ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';

// Define the structure for remote applications
interface RemoteApp {
  id: string;
  name: string;
  path: string;
  icon: React.ReactNode;
  // This would be the actual federated module component
  component: React.ComponentType;
}

// Mock remote app components for demonstration
// In a real Module Federation setup, these would be dynamically imported
const DashboardApp = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold mb-4">Dashboard Application</h1>
    <p className="text-gray-600">This is a federated remote dashboard module.</p>
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Metric 1</h3>
        <p className="text-2xl font-bold text-blue-600">1,234</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Metric 2</h3>
        <p className="text-2xl font-bold text-green-600">5,678</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Metric 3</h3>
        <p className="text-2xl font-bold text-purple-600">9,012</p>
      </div>
    </div>
  </div>
);

const AnalyticsApp = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold mb-4">Analytics Application</h1>
    <p className="text-gray-600">This is a federated remote analytics module.</p>
  </div>
);

const UserManagementApp = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold mb-4">User Management Application</h1>
    <p className="text-gray-600">This is a federated remote user management module.</p>
  </div>
);

const SettingsApp = () => (
  <div className="p-8">
    <h1 className="text-3xl font-bold mb-4">Settings Application</h1>
    <p className="text-gray-600">This is a federated remote settings module.</p>
  </div>
);

// Configuration for all remote applications
const remoteApps: RemoteApp[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: <Home className="w-5 h-5" />,
    component: DashboardApp,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    path: '/analytics',
    icon: <Package className="w-5 h-5" />,
    component: AnalyticsApp,
  },
  {
    id: 'users',
    name: 'User Management',
    path: '/users',
    icon: <Users className="w-5 h-5" />,
    component: UserManagementApp,
  },
  {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    icon: <Settings className="w-5 h-5" />,
    component: SettingsApp,
  },
];

export default function ModuleFederationHost() {
  // Track which remote app is currently active
  const [activeApp, setActiveApp] = useState<RemoteApp>(remoteApps[0]);
  
  // Track sidebar collapsed state for desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Track mobile menu open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get the active component to render
  const ActiveComponent = activeApp.component;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50">
      {/* Header Section - Fixed at top */}
      <header className="bg-white border-b border-gray-200 shadow-sm z-20 flex-shrink-0">
        <div className="flex items-center justify-between px-4 md:px-6 py-4">
          <div className="flex items-center space-x-3">
            {/* Mobile menu toggle button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6 text-blue-600" />
            </button>
            
            <Menu className="hidden md:block w-6 h-6 text-blue-600" />
            <h1 className="text-lg md:text-xl font-bold text-gray-800">
              Module Federation Host
            </h1>
          </div>
          
          {/* Header right section */}
          <div className="flex items-center space-x-4">
            <span className="text-xs md:text-sm text-gray-600">
              <span className="hidden sm:inline">Current: </span>
              <span className="font-semibold">{activeApp.name}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main container with sidebar and content */}
      <div className="flex flex-row flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Left Sidebar Navigation using Radix UI NavigationMenu */}
        <aside
          className={`
            bg-white border-r border-gray-200 flex-shrink-0 z-40
            transition-all duration-300 ease-in-out
            fixed md:static h-full
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${isSidebarCollapsed ? 'md:w-16' : 'w-64'}
          `}
        >
          <NavigationMenu.Root
            className="flex flex-col h-full"
            orientation="vertical"
            value={activeApp.id}
            onValueChange={(value) => {
              const app = remoteApps.find(a => a.id === value);
              if (app) {
                setActiveApp(app);
                setIsMobileMenuOpen(false); // Close mobile menu on selection
              }
            }}
          >
            {/* Sidebar header with toggle button */}
            <div className="flex justify-between items-center p-2 border-b border-gray-200">
              {/* Desktop collapse button */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:block p-2 rounded-lg hover:bg-gray-100 transition-colors ml-auto"
                aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                )}
              </button>
              
              {/* Mobile close button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors ml-auto"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* NavigationMenu List containing all remote app menu items */}
            <NavigationMenu.List className="flex-1 py-4 overflow-y-auto flex flex-col space-y-1">
              {remoteApps.map((app) => (
                <NavigationMenu.Item key={app.id} value={app.id}>
                  <NavigationMenu.Link
                    className={`w-full flex items-center px-4 py-3 transition-colors cursor-pointer ${
                      activeApp.id === app.id
                        ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveApp(app)}
                    title={isSidebarCollapsed ? app.name : undefined}
                  >
                    {/* App icon */}
                    <span className={isSidebarCollapsed ? 'mx-auto' : ''}>
                      {app.icon}
                    </span>
                    
                    {/* App name - hidden when sidebar is collapsed on desktop */}
                    {!isSidebarCollapsed && (
                      <span className="ml-3 font-medium">{app.name}</span>
                    )}
                  </NavigationMenu.Link>
                </NavigationMenu.Item>
              ))}
            </NavigationMenu.List>

            {/* NavigationMenu Viewport (required by Radix UI) */}
            <NavigationMenu.Viewport />
          </NavigationMenu.Root>
        </aside>

        {/* Main Content Panel - Centered between sidebar and right edge */}
        <main className="flex-1 overflow-auto bg-gray-50 w-full">
          <div className="h-full w-full max-w-full">
            {/* 
              This is where the federated remote module is rendered.
              In a real Module Federation setup, this component would be
              lazy-loaded from a remote application.
            */}
            <ActiveComponent />
          </div>
        </main>
      </div>

      {/* Footer Section - Fixed at bottom */}
      <footer className="bg-white border-t border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-4 md:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs md:text-sm text-gray-600">
            <span>Powered by Module Federation</span>
          </div>
          
          <div className="text-xs md:text-sm text-gray-600">
            <span>© 2025 Your Company</span>
          </div>
          
          <div className="text-xs md:text-sm text-gray-600">
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app") as HTMLElement);

root.render(<ModuleFederationHost/>);