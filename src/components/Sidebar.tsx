import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, PlusCircle } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      <div className="p-6 text-xl font-bold border-b border-gray-800">
        CMS Promotion
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/" className="flex items-center space-x-3 p-2 rounded hover:bg-gray-800 transition-colors">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/promotions/new" className="flex items-center space-x-3 p-2 rounded hover:bg-gray-800 transition-colors">
          <PlusCircle size={20} />
          <span>New Promotion</span>
        </Link>
        <Link href="/promotions" className="flex items-center space-x-3 p-2 rounded hover:bg-gray-800 transition-colors">
          <FileText size={20} />
          <span>All Promotions</span>
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <Link href="/settings" className="flex items-center space-x-3 p-2 rounded hover:bg-gray-800 transition-colors">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
