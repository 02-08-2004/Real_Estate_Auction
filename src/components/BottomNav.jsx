import { Link, useLocation } from "react-router-dom";
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  BanknotesIcon, 
  Squares2X2Icon 
} from "@heroicons/react/24/outline";
import { 
    HomeIcon as HomeSolid, 
    MagnifyingGlassIcon as SearchSolid, 
    BanknotesIcon as BidsSolid, 
    Squares2X2Icon as DashboardSolid 
} from "@heroicons/react/24/solid";

export default function BottomNav() {
  const location = useLocation();
  
  const navItems = [
    { name: "HOME", path: "/user-dashboard", icon: HomeIcon, activeIcon: HomeSolid },
    { name: "SEARCH", path: "/search", icon: MagnifyingGlassIcon, activeIcon: SearchSolid },
    { name: "MY BIDS", path: "/user-dashboard?tab=bids", icon: BanknotesIcon, activeIcon: BidsSolid },
    { name: "DASHBOARD", path: "/profile", icon: Squares2X2Icon, activeIcon: DashboardSolid },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || 
                        (item.name === "MY BIDS" && location.search.includes("tab=bids"));
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
