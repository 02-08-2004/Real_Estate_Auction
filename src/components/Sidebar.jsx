import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Squares2X2Icon, 
  PlusCircleIcon, 
  MagnifyingGlassIcon, 
  HeartIcon, 
  QueueListIcon, 
  UsersIcon, 
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  ClockIcon,
  TagIcon,
  ArchiveBoxIcon,
  UserCircleIcon,
  WrenchScrewdriverIcon
} from "@heroicons/react/24/outline";

export default function Sidebar({ isOpen }) {
  const { userRole, logout } = useAuth();
  const location = useLocation();

  const userLinks = [
    { label: "Dashboard", path: "/dashboard", icon: Squares2X2Icon },
    { label: "Marketplace", path: "/marketplace", icon: MagnifyingGlassIcon },
    { label: "My Property", path: "/listings", icon: PlusCircleIcon },
    { label: "My Bids", path: "/bids", icon: ClockIcon },
    { label: "My Profile", path: "/profile", icon: UserCircleIcon },
  ];

  const adminLinks = [
    { label: "Analytics", path: "/admin-dashboard", icon: Squares2X2Icon },
    { label: "Pending Review", path: "/admin-dashboard?tab=pending", icon: QueueListIcon },
    { label: "Auction List", path: "/admin-dashboard?tab=active", icon: TagIcon },
    { label: "Past Auctions", path: "/admin-dashboard?tab=ended", icon: ArchiveBoxIcon },
    { label: "Users", path: "/admin-dashboard?tab=users", icon: UsersIcon },
    { label: "Audit Logs", path: "/admin-dashboard?tab=logs", icon: ClipboardDocumentListIcon },
    { label: "Maintenance", path: "/admin-dashboard?tab=maintenance", icon: WrenchScrewdriverIcon },
  ];

  const links = userRole === "admin" ? adminLinks : userLinks;

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-links">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = (location.pathname + location.search) === link.path;

          return (
            <Link 
              key={link.path} 
              to={link.path} 
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <div className="link-icon">
                <Icon className="w-5 h-5" />
              </div>
              <span className="link-label">{link.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <button onClick={logout} className="sidebar-link logout-btn">
          <div className="link-icon">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </div>
          <span className="link-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
