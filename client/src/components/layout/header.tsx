import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, memo, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminProfileWidget } from "@/components/admin/profile-widget";
import { useAuth } from "@/hooks/use-auth";
// REMOVED: import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { LogOut, Search, User, Wrench, Package, Building } from "lucide-react";
import { AppIcons } from "@/lib/app-icons";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface HeaderProps {
  toggleSidebar: () => void;
}

interface SearchResult {
  id: number;
  type: 'client' | 'service' | 'spare-part' | 'technician';
  title: string;
  subtitle: string;
  icon: any;
  path: string;
}

export const Header = memo(function Header({ toggleSidebar }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Debounced search query for API calls
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Global search API call
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: [`/api/search?q=${encodeURIComponent(debouncedQuery)}`, debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    retry: 1,
    select: (data: any[]) => {
      if (!Array.isArray(data)) return [];
      
      return data.map((item): SearchResult => {
        if (item.type === 'client') {
          return {
            id: item.id,
            type: 'client',
            title: item.fullName,
            subtitle: `📞 ${item.phone} • ${item.city || 'N/A'}`,
            icon: User,
            path: `/admin/clients/${item.id}`
          };
        } else if (item.type === 'service') {
          return {
            id: item.id,
            type: 'service',
            title: `Servis #${item.id}`,
            subtitle: `${item.clientName} • ${item.applianceName}`,
            icon: Wrench,
            path: `/admin/services?serviceId=${item.id}`
          };
        } else if (item.type === 'spare-part') {
          return {
            id: item.id,
            type: 'spare-part',
            title: item.partName,
            subtitle: `${item.status} • Količina: ${item.quantity}`,
            icon: Package,
            path: `/admin/spare-parts?partId=${item.id}`
          };
        } else if (item.type === 'technician') {
          return {
            id: item.id,
            type: 'technician',
            title: item.fullName,
            subtitle: `${item.specialization} • ${item.phone}`,
            icon: Building,
            path: `/admin/technician-services?technicianId=${item.id}`
          };
        }
        return {
          id: item.id,
          type: 'service',
          title: 'Nepoznato',
          subtitle: '',
          icon: Search,
          path: '/'
        };
      });
    }
  });

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsSearchOpen(value.length >= 2);
    setSelectedIndex(-1);
  };

  // Handle search result selection
  const handleResultSelect = (result: SearchResult) => {
    setSearchQuery("");
    setIsSearchOpen(false);
    setLocation(result.path);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleResultSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsSearchOpen(false);
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <header className="bg-white shadow-sm flex-shrink-0">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
          >
            <span className="material-icons">menu</span>
          </Button>
          <div className="flex items-center ml-2 md:hidden">
            <img src={AppIcons.admin.dashboard} alt="" className="w-6 h-6 mr-2" />
            <h1 className="text-xl font-medium text-primary">Frigo Sistem Todosijević</h1>
          </div>
        </div>
        
        <div className="flex-1 max-w-3xl mx-4 relative">
          <div className="relative">
            <Search className="absolute inset-y-0 left-0 flex items-center pl-3 w-5 h-5 text-gray-400 ml-3 top-3" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="🔍 Pretraži bilo šta... (klijenti, servisi, delovi)"
              className={cn(
                "w-full pl-12 pr-4 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-300 transition-all duration-200",
                isSearchOpen && "border-blue-300 bg-white shadow-lg"
              )}
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => searchQuery.length >= 2 && setIsSearchOpen(true)}
            />
            {isLoading && searchQuery.length >= 2 && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && searchQuery.length >= 2 && (
            <div 
              ref={searchDropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
            >
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  Pretražujem...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  Nema rezultata za "{searchQuery}"
                </div>
              ) : (
                <>
                  <div className="p-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      {searchResults.length} rezultat{searchResults.length !== 1 ? 'a' : ''}
                    </span>
                  </div>
                  {searchResults.map((result, index) => {
                    const IconComponent = result.icon;
                    return (
                      <div
                        key={`${result.type}-${result.id}`}
                        className={cn(
                          "flex items-center p-3 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0",
                          selectedIndex === index && "bg-blue-100"
                        )}
                        onClick={() => handleResultSelect(result)}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center mr-3",
                          result.type === 'client' && "bg-green-100 text-green-600",
                          result.type === 'service' && "bg-blue-100 text-blue-600",
                          result.type === 'spare-part' && "bg-orange-100 text-orange-600",
                          result.type === 'technician' && "bg-purple-100 text-purple-600"
                        )}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {result.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {result.subtitle}
                          </div>
                        </div>
                        <div className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          result.type === 'client' && "bg-green-100 text-green-700",
                          result.type === 'service' && "bg-blue-100 text-blue-700",
                          result.type === 'spare-part' && "bg-orange-100 text-orange-700",
                          result.type === 'technician' && "bg-purple-100 text-purple-700"
                        )}>
                          {result.type === 'client' && 'Klijent'}
                          {result.type === 'service' && 'Servis'}
                          {result.type === 'spare-part' && 'Deo'}
                          {result.type === 'technician' && 'Tehničar'}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* TEMPORARILY REMOVED: <NotificationsDropdown /> */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Odjavi se
          </Button>
          <AdminProfileWidget />
        </div>
      </div>
    </header>
  );
});
