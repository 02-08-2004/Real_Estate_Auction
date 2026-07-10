import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Squares2X2Icon, 
  MagnifyingGlassIcon, 
  ClockIcon, 
  UserCircleIcon,
  QueueListIcon,
  UsersIcon
} from "@heroicons/react/24/outline";
import { 
  Squares2X2Icon as SquaresSolid, 
  MagnifyingGlassIcon as SearchSolid, 
  ClockIcon as ClockSolid, 
  UserCircleIcon as UserSolid,
  QueueListIcon as QueueSolid,
  UsersIcon as UsersSolid
} from "@heroicons/react/24/solid";

export default function BottomNav() {
  const { userRole } = useAuth();
  const location = useLocation();
  
  const userItems = [
    { name: "DASHBOARD", path: "/dashboard", icon: Squares2X2Icon, activeIcon: SquaresSolid },
    { name: "MARKETPLACE", path: "/marketplace", icon: MagnifyingGlassIcon, activeIcon: SearchSolid },
    { name: "MY BIDS", path: "/bids", icon: ClockIcon, activeIcon: ClockSolid },
    { name: "PROFILE", path: "/profile", icon: UserCircleIcon, activeIcon: UserSolid },
  ];

  const adminItems = [
    { name: "ANALYTICS", path: "/admin-dashboard", icon: Squares2X2Icon, activeIcon: SquaresSolid },
    { name: "PENDING", path: "/admin-dashboard?tab=pending", icon: QueueListIcon, activeIcon: QueueSolid },
    { name: "USERS", path: "/admin-dashboard?tab=users", icon: UsersIcon, activeIcon: UsersSolid },
    { name: "PROFILE", path: "/profile", icon: UserCircleIcon, activeIcon: UserSolid },
  ];

  const navItems = userRole === "admin" ? adminItems : userItems;

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = (location.pathname + location.search) === item.path;
        const Icon = isActive ? item.activeIcon : item.icon;
        
        return (
          <Link 
            key={item.name} 
            to={item.path} 
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
